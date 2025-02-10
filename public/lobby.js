// lobby.js
const socket = io();

// --- Cache DOM elements ---
const createJoinDiv = document.querySelector(".create-join");
const lobbyDiv = document.querySelector(".lobby");
const roomIdDisplay = document.getElementById("room-id-display");
const startGameBtn = document.getElementById("start-game-btn");
const playersListEl = document.getElementById("players-list");
const publicRoomsListEl = document.getElementById("public-rooms-list");
const createFormEl = document.getElementById("create-form");
const joinFormEl = document.getElementById("join-form");

// --- Use sessionStorage so each browser tab gets its own token ---
if (!sessionStorage.getItem("playerToken")) {
  sessionStorage.setItem("playerToken", generateToken());
}
const playerToken = sessionStorage.getItem("playerToken");

let currentRoom = null;
let playerNumber = null;

// --- Utility: Generate a short random token ---
function generateToken() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// --- UI functions ---
function showCreateForm() {
  createFormEl.style.display = "block";
  joinFormEl.style.display = "none";
}

function showJoinForm() {
  joinFormEl.style.display = "block";
  createFormEl.style.display = "none";
}

function createRoom() {
  const playerName = document.getElementById("player-name").value.trim();
  const isPublic = document.getElementById("is-public").checked;
  if (!playerName) return alert("Please enter your name");
  socket.emit("create-room", { playerName, isPublic, playerToken });
}

function joinRoom() {
  const roomId = document.getElementById("room-id").value.trim();
  const playerName = document.getElementById("join-player-name").value.trim();
  if (!roomId || !playerName) return alert("Please fill all fields");
  socket.emit("join-room", { roomId, playerName, playerToken });
}

function joinPublicRoom(roomId) {
  const playerName = prompt("Enter your name:");
  if (!playerName) return alert("Please enter your name");
  socket.emit("join-room", { roomId, playerName, playerToken });
}

function updatePlayersList(players) {
  playersListEl.innerHTML = players
    .map((player, index) => `<li>Player ${index + 1}: ${player}</li>`)
    .join("");
}

function updatePublicRoomsList(rooms) {
  publicRoomsListEl.innerHTML = rooms
    .map((room) => {
      const joinButton =
        room.status === "waiting"
          ? `<button onclick="joinPublicRoom('${room.roomId}')">Join</button>`
          : "";
      return `<li>
              Room ID: ${room.roomId} - Players: ${room.players.join(
        ", "
      )} - Status: ${room.status}
              ${joinButton}
            </li>`;
    })
    .join("");
}

// --- Socket event listeners ---
socket.on("room-created", ({ roomId, playerNumber: pNum }) => {
  currentRoom = roomId;
  playerNumber = pNum;
  createJoinDiv.style.display = "none";
  lobbyDiv.style.display = "block";
  roomIdDisplay.textContent = roomId;
  const playerName = document.getElementById("player-name").value.trim();
  updatePlayersList([playerName]);
});

socket.on("join-success", ({ playerNumber: pNum }) => {
  playerNumber = pNum;
  createJoinDiv.style.display = "none";
  lobbyDiv.style.display = "block";
});

socket.on("player-joined", (data) => {
  updatePlayersList(data.players);
  // Show the Start Game button if you are the host and two players are present.
  if (playerNumber === 1 && data.players.length === 2) {
    startGameBtn.style.display = "block";
  }
});

socket.on("start-game", ({ player1, player2 }) => {
  // Compare using the persistent token rather than socket.id.
  const isPlayer1 = playerToken === player1.playerId;
  const currentPlayer = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;
  // Save game data in sessionStorage.
  sessionStorage.setItem("currentPlayer", JSON.stringify(currentPlayer));
  sessionStorage.setItem("opponent", JSON.stringify(opponent));
  window.location.href = `/race.html`;
});

socket.on("update-rooms", (rooms) => {
  updatePublicRoomsList(rooms);
});

socket.on("error", (message) => {
  alert(message);
});

// --- Request public rooms on load ---
socket.emit("get-rooms");

// --- Called by the host when clicking the Start Game button ---
function startGame() {
  if (playerNumber === 1) {
    socket.emit("host-start-game");
  }
}
window.startGame = startGame;
