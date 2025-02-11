// lobby.js

// Connect to Socket.IO
const socket = io();

// --- Cache DOM Elements ---
const formsContainer = document.querySelector(".forms-container");
const lobbySection = document.querySelector(".lobby-section");
const roomIdDisplay = document.getElementById("room-id-display");
const startGameBtn = document.getElementById("start-game-btn");
const playersListEl = document.getElementById("players-list");
const publicRoomsListEl = document.getElementById("public-rooms-list");
const createFormEl = document.getElementById("create-form");
const joinFormEl = document.getElementById("join-form");

// --- Set a Unique Token per Browser Tab using sessionStorage ---
if (!sessionStorage.getItem("playerToken")) {
  sessionStorage.setItem("playerToken", generateToken());
}
const playerToken = sessionStorage.getItem("playerToken");

let currentRoom = null;
let playerNumber = null;

// --- Utility: Generate a Short Random Token ---
function generateToken() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// --- UI Functions ---
function showCreateForm() {
  createFormEl.classList.remove("hidden");
  joinFormEl.classList.add("hidden");
}

function showJoinForm() {
  joinFormEl.classList.remove("hidden");
  createFormEl.classList.add("hidden");
}

function createRoom() {
  const playerName = document.getElementById("player-name").value.trim();
  const isPublic = document.getElementById("is-public").checked;
  if (!playerName) {
    return alert("Please enter your name");
  }
  socket.emit("create-room", { playerName, isPublic, playerToken });
}

function joinRoom() {
  const roomId = document.getElementById("room-id").value.trim();
  const playerName = document.getElementById("join-player-name").value.trim();
  if (!roomId || !playerName) {
    return alert("Please fill all fields");
  }
  socket.emit("join-room", { roomId, playerName, playerToken });
}

function joinPublicRoom(roomId) {
  const playerName = prompt("Enter your name:");
  if (!playerName) {
    return alert("Please enter your name");
  }
  socket.emit("join-room", { roomId, playerName, playerToken });
}

function updatePlayersList(players) {
  playersListEl.innerHTML = players
    .map((player, index) => {
      // Show a checkered flag for the host (first player) and a car icon for the other.
      const icon =
        index === 0
          ? '<i class="fas fa-flag-checkered"></i>'
          : '<i class="fas fa-car"></i>';
      return `<li class="player-item">${icon} ${player}</li>`;
    })
    .join("");
}

function updatePublicRoomsList(rooms) {
  publicRoomsListEl.innerHTML = rooms
    .map((room) => {
      // Do not show a Join button if the current user is the creator.
      let joinButton = "";
      if (
        room.creator !== playerToken &&
        room.status === "waiting" &&
        room.players.length < 2
      ) {
        joinButton = `<button onclick="joinPublicRoom('${room.roomId}')">
                        <i class="fas fa-sign-in-alt"></i> Join
                      </button>`;
      }
      return `<li class="room-item">
                <div class="room-info">
                  <span class="room-icon"><i class="fas fa-flag"></i></span>
                  <span class="room-id">Room: ${room.roomId}</span>
                  <span class="room-players">Players: ${room.players.join(
                    ", "
                  )}</span>
                  <span class="room-status">Status: ${room.status}</span>
                </div>
                <div class="room-action">
                  ${joinButton}
                </div>
              </li>`;
    })
    .join("");
}

// --- Socket Event Listeners ---
socket.on("room-created", ({ roomId, playerNumber: pNum }) => {
  currentRoom = roomId;
  playerNumber = pNum;
  formsContainer.classList.add("hidden");
  lobbySection.classList.remove("hidden");
  roomIdDisplay.textContent = roomId;
  const playerName = document.getElementById("player-name").value.trim();
  updatePlayersList([playerName]);
  // Hide the start game button (only the creator sees it once another player joins)
  startGameBtn.classList.add("hidden");
});

socket.on("join-success", ({ playerNumber: pNum }) => {
  playerNumber = pNum;
  formsContainer.classList.add("hidden");
  lobbySection.classList.remove("hidden");
  // Only the room creator (playerNumber 1) should ever see the Start Game button.
  if (playerNumber !== 1) {
    startGameBtn.classList.add("hidden");
  }
});

socket.on("player-joined", (data) => {
  updatePlayersList(data.players);
  // Only show the Start Game button for the room creator (playerNumber === 1)
  if (playerNumber === 1 && data.players.length === 2) {
    startGameBtn.classList.remove("hidden");
  }
});

socket.on("start-game", ({ player1, player2 }) => {
  // Determine the current player based on persistent token.
  const isPlayer1 = playerToken === player1.playerId;
  const currentPlayer = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;
  // Save game data in sessionStorage for the race page.
  sessionStorage.setItem("currentPlayer", JSON.stringify(currentPlayer));
  sessionStorage.setItem("opponent", JSON.stringify(opponent));
  window.location.href = "/race.html";
});

socket.on("update-rooms", (rooms) => {
  updatePublicRoomsList(rooms);
});

socket.on("error", (message) => {
  alert(message);
});

// --- Request the List of Public Rooms on Page Load ---
socket.emit("get-rooms");

// --- Called by the Host when clicking the Start Game button ---
function startGame() {
  if (playerNumber === 1) {
    socket.emit("host-start-game");
  }
}

// Expose functions for inline onclick handlers
window.startGame = startGame;
window.showCreateForm = showCreateForm;
window.showJoinForm = showJoinForm;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.joinPublicRoom = joinPublicRoom;
