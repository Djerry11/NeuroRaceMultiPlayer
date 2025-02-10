const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const uuid = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/lobby.html");
});

// Data storage:
// - rooms: keyed by room id, each room holds an array of playerTokens, game status, and public flag.
// - players: keyed by playerToken (the persistent id), each holds info including current socketId.
const rooms = {};
const players = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // --- Reconnection Handler ---
  // When switching pages (e.g. from lobby to race), the client reconnects with its persistent token.
  socket.on("reconnect-player", ({ playerToken, roomId }) => {
    console.log(
      `Reconnection attempt: playerToken=${playerToken}, roomId=${roomId}`
    );
    if (rooms[roomId] && rooms[roomId].players.includes(playerToken)) {
      // Update the stored socketId for this player.
      if (players[playerToken]) {
        players[playerToken].socketId = socket.id;
      } else {
        // (Edge case) Create a minimal record if missing.
        players[playerToken] = {
          token: playerToken,
          room: roomId,
          socketId: socket.id,
        };
      }
      socket.join(roomId);
      socket.emit("reconnect-success");
      console.log(
        `Player ${playerToken} reconnected with new socket id ${socket.id}`
      );
    } else {
      socket.emit("error", "Reconnection failed. Player not found.");
    }
  });
  // --- End Reconnection Handler ---

  // Handle room creation.
  socket.on("create-room", ({ playerName, isPublic, playerToken }) => {
    const roomId = uuid.v4().substr(0, 6); // Generate a short room ID.
    rooms[roomId] = {
      players: [playerToken], // Save the persistent token.
      status: "waiting",
      isPublic: !!isPublic,
    };

    players[playerToken] = {
      token: playerToken,
      name: playerName,
      room: roomId,
      playerNumber: 1,
      socketId: socket.id,
      playerId: playerToken, // Persistent id for client comparisons.
    };

    socket.join(roomId);
    socket.emit("room-created", { roomId, playerNumber: 1 });

    // Update all clients with the list of public rooms.
    io.emit("update-rooms", getPublicRooms());
  });

  // Handle joining an existing room.
  socket.on("join-room", ({ roomId, playerName, playerToken }) => {
    if (!rooms[roomId]) {
      return socket.emit("error", "Room not found");
    }
    if (rooms[roomId].status === "playing") {
      return socket.emit("error", "Game already in progress");
    }
    if (rooms[roomId].players.length >= 2) {
      return socket.emit("error", "Room is full");
    }

    rooms[roomId].players.push(playerToken);
    players[playerToken] = {
      token: playerToken,
      name: playerName,
      room: roomId,
      playerNumber: 2,
      socketId: socket.id,
      playerId: playerToken,
    };

    socket.join(roomId);
    socket.emit("join-success", { playerNumber: 2 });

    // Notify all players in the room that a new player has joined.
    io.to(roomId).emit("player-joined", {
      players: rooms[roomId].players.map((token) => players[token].name),
    });

    // Update the public room list.
    io.emit("update-rooms", getPublicRooms());
  });

  // Host starts the game.
  socket.on("host-start-game", () => {
    // Identify the player by matching the current socket id.
    const playerToken = Object.keys(players).find(
      (token) => players[token].socketId === socket.id
    );
    if (!playerToken) return;
    const roomId = players[playerToken].room;
    if (!rooms[roomId] || rooms[roomId].players.length < 2) {
      return socket.emit("error", "Need two players to start game");
    }
    rooms[roomId].status = "playing";
    const [player1Token, player2Token] = rooms[roomId].players;
    io.to(roomId).emit("start-game", {
      player1: players[player1Token],
      player2: players[player2Token],
    });
  });

  // Provide public room list.
  socket.on("get-rooms", () => {
    socket.emit("update-rooms", getPublicRooms());
  });

  // --- Updated Control Relay Handler ---
  // The server broadcasts the control update to all other players
  socket.on("controlCar", (data) => {
    console.log("Received control data:", data);
    const { posX, posY, angle, controls, playerId, roomId } = data;

    // console.log("Relaying controls to other players:", otherPlayerTokens);
    io.emit("opponent-carData", {
      posX,
      posY,
      angle,
      controls,
      playerId,
      roomId,
    });
  });
  socket.on("cameraControlCar", (data) => {
    // console.log("Received control data:", data);
    const { posX, posY, angle, controls, playerId, roomId } = data;

    // console.log("Relaying controls to other players:", otherPlayerTokens);
    io.emit("opponent-carData", {
      posX,
      posY,
      angle,
      controls,
      playerId,
      roomId,
    });
  });

  // Handle disconnection.
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    // Find the player by matching the socket id.
    const playerToken = Object.keys(players).find(
      (token) => players[token].socketId === socket.id
    );
    if (playerToken) {
      const roomId = players[playerToken].room;
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter(
          (token) => token !== playerToken
        );
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit("player-left", players[playerToken].name);
        }
      }
      delete players[playerToken];
    }
    io.emit("update-rooms", getPublicRooms());
  });
});

// Utility: Return an array of public rooms.
function getPublicRooms() {
  return Object.keys(rooms)
    .filter((roomId) => rooms[roomId].isPublic)
    .map((roomId) => ({
      roomId,
      players: rooms[roomId].players.map((token) => players[token]?.name || ""),
      status: rooms[roomId].status,
    }));
}

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
