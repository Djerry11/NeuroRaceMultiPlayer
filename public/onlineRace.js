// race.js
const socket = io();
let isCameraPlayer = true;
// Retrieve player data from sessionStorage.
const currentPlayer = JSON.parse(sessionStorage.getItem("currentPlayer"));
const opponent = JSON.parse(sessionStorage.getItem("opponent"));
// if (currentPlayer.playerNumber === 1) {
//   isCameraPlayer = true;
// }
// Immediately reconnect to the room using the persistent token.
socket.emit("reconnect-player", {
  playerToken: currentPlayer.playerId,
  roomId: currentPlayer.room,
});
socket.on("reconnect-success", () => {
  console.log("Reconnected successfully to the game room.");
});

// --- Cache DOM elements ---
const carCanvas = document.getElementById("carCanvas");
const cameraCanvas = document.getElementById("cameraCanvas");
const statisticsEl = document.getElementById("statistics");
const counterEl = document.getElementById("counter");

const miniMapWidth = 300;

document.body.style.flexDirection = "column";

// --- Set canvas dimensions ---
carCanvas.width = window.innerWidth;
carCanvas.height = 0; // FIX: use window.innerHeight instead of 0
cameraCanvas.width = window.innerWidth;
cameraCanvas.height = window.innerHeight;

// --- Cache canvas contexts ---
const carCtx = carCanvas.getContext("2d");
const cameraCtx = cameraCanvas.getContext("2d");

//---- miiniMap canvas
const miniMapCanvas = document.getElementById("miniMapCanvas");
miniMapCanvas.width = miniMapWidth;
miniMapCanvas.height = miniMapWidth;

// --- Assume global objects: world, Viewport, Car, Camera, etc. ---
const viewport = new Viewport(carCanvas, world.zoom, world.offset);
// --- Global control state (for local control events) ---
const currentControls = {
  forward: false,
  reverse: false,
  left: false,
  right: false,
};

// --- Create cars for the players ---
const cars = generateCars(currentPlayer, opponent);
const myCar = cars[0];
const opponentCar = cars[1];
const camera = new Camera(myCar);
// const miniMap = new MiniMap(miniMapCanvas, world.graph, miniMapWidth, cars);
// const miniMapGraph = new Graph([], world.corridor.skeleton);
const miniMap = new MiniMap(miniMapCanvas, world.graph, miniMapWidth, cars);

// --- Optionally load the best brain from sessionStorage ---
if (sessionStorage.getItem("bestBrain")) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(sessionStorage.getItem("bestBrain"));
    if (i > 0) {
      NeuralNetwork.mutate(cars[i].brain, 0.1);
    }
  }
}

// --- Create statistics UI for each car ---
for (let i = 0; i < cars.length; i++) {
  const div = document.createElement("div");
  div.id = "stat_" + i;
  div.innerText = i;
  div.style.color = cars[i].color;
  div.classList.add("stat");
  statisticsEl.appendChild(div);
}

// --- Setup road borders and corridor ---
let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
  world.generateCorridor(false);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
} else {
  world.generateCorridor(false);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
}

let frameCount = 0;
let started = false;
startCounter();
animate();

// --- Helper functions for saving/discarding the best brain ---
function save() {
  sessionStorage.setItem("bestBrain", JSON.stringify(myCar.brain));
}
function discard() {
  sessionStorage.removeItem("bestBrain");
}

// --- Function to generate car objects ---
function generateCars(currentPlayer, opponent) {
  const startPoints = world.markings.filter((m) => m instanceof Start);
  const startPoint = startPoints[0].center;
  const dir = startPoints[0].directionVector;
  const startAngle = -angle(dir) + Math.PI / 2;
  const cars = [];

  // Local player's car (controlled by keyboard)
  const localCar = new Car(
    startPoint.x,
    startPoint.y,
    30,
    50,
    "CAMERA",
    startAngle,
    currentPlayer.playerNumber === 1 ? "blue" : "green",
    true
  );
  localCar.name = currentPlayer.name;
  localCar.playerId = currentPlayer.playerId;
  localCar.controls = {
    forward: false,
    reverse: false,
    left: false,
    right: false,
  };
  cars.push(localCar);

  // Opponent's car (controlled via Socket.IO)
  const oppCar = new Car(
    startPoint.x,
    startPoint.y,
    30,
    50,
    "CAMERA",
    startAngle,
    currentPlayer.playerNumber === 1 ? "green" : "blue"
  );
  oppCar.name = opponent.name;
  oppCar.playerId = opponent.playerId;
  oppCar.controls = {
    forward: false,
    reverse: false,
    left: false,
    right: false,
  };
  cars.push(oppCar);

  return cars;
}

// --- Emit control state to server ---
// Now we include playerToken and roomId along with the controls.
function emitControls() {
  console.log("Emitting controls:", currentControls);
  // socket.emit("control", {
  //   controls: { ...currentControls },
  //   playerId: currentPlayer.playerId,
  //   roomId: currentPlayer.room,
  // });
  socket.emit("controlCar", {
    posX: myCar.x,
    posY: myCar.y,
    angle: myCar.angle,
    controls: { ...currentControls },
    playerId: currentPlayer.playerId,
    roomId: currentPlayer.room,
  });
}

//camera
function emitCameraControls() {
  socket.emit("cameraControlCar", {
    posX: myCar.x,
    posY: myCar.y,
    angle: myCar.angle,
    controls: { ...currentControls },
    playerId: currentPlayer.playerId,
    roomId: currentPlayer.room,
  });
}

// --- Receive opponent control updates ---

socket.on("opponent-carData", (data) => {
  // data includes { posX, posY, angle,playerId, roomId }
  console.log("Received opponent car data:", data);
  if (
    data.playerId === opponent.playerId &&
    data.roomId === currentPlayer.room
  ) {
    opponentCar.controls = data.controls;
    if (
      opponentCar.x != data.posX ||
      opponentCar.y != data.posY ||
      opponentCar.angle != data.angle
    ) {
      opponentCar.x = data.posX;
      opponentCar.y = data.posY;
      opponentCar.angle = data.angle;
    }
  }
});

// --- Update car progress along the corridor ---
function updateCarProgress(car) {
  if (!car.finishTime) {
    car.progress = 0;
    const carSeg = getNearestSegment(car, world.corridor.skeleton);
    for (let i = 0; i < world.corridor.skeleton.length; i++) {
      const s = world.corridor.skeleton[i];
      if (s.equals(carSeg)) {
        const proj = s.projectPoint(car);
        const firstPartOfSegment = new Segment(s.p1, proj.point);
        car.progress += firstPartOfSegment.length();
        break;
      } else {
        car.progress += s.length();
      }
    }
    const totalDistance = world.corridor.skeleton.reduce(
      (acc, s) => acc + s.length(),
      0
    );
    car.progress /= totalDistance;
    if (car.progress >= 0.98) {
      car.progress = 1;
      car.finishTime = frameCount;
      if (car === myCar) {
        taDaa();
      }
    }
  }
}

// --- Handle collisions with road borders ---
function handleCollisionWithRoadBorder(car) {
  const seg = getNearestSegment(car, world.corridor.skeleton);
  const correctors = car.polygon.map((p) => {
    const proj = seg.projectPoint(p);
    const projPoint =
      proj.offset < 0 ? seg.p1 : proj.offset > 1 ? seg.p2 : proj.point;
    return subtract(projPoint, p);
  });
  const maxMagnitude = Math.max(...correctors.map((p) => magnitude(p)));
  const corrector = correctors.find((p) => magnitude(p) === maxMagnitude);
  const normCorrector = normalize(corrector);
  if (corrector === correctors[0] || corrector === correctors[2]) {
    car.angle += 0.1;
  } else {
    car.angle -= 0.1;
  }
  car.x += normCorrector.x;
  car.y += normCorrector.y;
  car.damaged = false;
}

// --- Countdown before starting the race ---
function startCounter() {
  counterEl.innerText = "3";
  beep(400);
  setTimeout(() => {
    counterEl.innerText = "2";
    beep(400);
    setTimeout(() => {
      counterEl.innerText = "1";
      beep(400);
      setTimeout(() => {
        counterEl.innerText = "Go!";
        beep(800);
        setTimeout(() => {
          counterEl.innerText = "";
          started = true;
          frameCount = 0;
          myCar.engine = new Engine();
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}

// --- Main animation loop ---
function animate() {
  if (started) {
    cars.forEach((car) => {
      car.update(roadBorders, []);
    });
  }
  for (const car of cars) {
    if (car.damaged) {
      handleCollisionWithRoadBorder(car);
    }
  }
  world.cars = cars;
  world.bestCar = myCar;
  viewport.offset.x = -myCar.x;
  viewport.offset.y = -myCar.y;
  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  //world.draw(carCtx, viewPoint,false);
  miniMap.update(viewPoint);
  // miniMapCanvas.style.transform = "rotate(" + myCar.angle + "rad)";
  cars.forEach((car) => updateCarProgress(car));
  cars.sort((a, b) => b.progress - a.progress);
  for (let i = 0; i < cars.length; i++) {
    const stat = document.getElementById("stat_" + i);
    stat.style.color = cars[i].color;
    stat.innerText = `${i + 1}: ${cars[i].name}${cars[i].damaged ? " 💀" : ""}`;
    stat.style.backgroundColor = cars[i] === opponentCar ? "black" : "gray";
    if (cars[i].finishTime) {
      stat.innerHTML += `<span style='float:right;'>${(
        cars[i].finishTime / 60
      ).toFixed(1)}s</span>`;
    }
  }
  camera.move(myCar);
  // camera.draw(carCtx);
  camera.render(cameraCtx, world);
  frameCount++;
  requestAnimationFrame(animate);
}

// --- Key event handlers ---
if (!isCameraPlayer) {
  document.addEventListener("keydown", (event) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
    }
    let changed = false;
    if (event.key === "ArrowUp" && !currentControls.forward) {
      currentControls.forward = true;
      changed = true;
    }
    if (event.key === "ArrowDown" && !currentControls.reverse) {
      currentControls.reverse = true;
      changed = true;
    }
    if (event.key === "ArrowLeft" && !currentControls.left) {
      currentControls.left = true;
      changed = true;
    }
    if (event.key === "ArrowRight" && !currentControls.right) {
      currentControls.right = true;
      changed = true;
    }
    if (changed) {
      myCar.controls.forward = currentControls.forward;
      myCar.controls.reverse = currentControls.reverse;
      myCar.controls.left = currentControls.left;
      myCar.controls.right = currentControls.right;
      emitControls();
    }
  });

  document.addEventListener("keyup", (event) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
    }
    let changed = false;
    if (event.key === "ArrowUp" && currentControls.forward) {
      currentControls.forward = false;
      changed = true;
    }
    if (event.key === "ArrowDown" && currentControls.reverse) {
      currentControls.reverse = false;
      changed = true;
    }
    if (event.key === "ArrowLeft" && currentControls.left) {
      currentControls.left = false;
      changed = true;
    }
    if (event.key === "ArrowRight" && currentControls.right) {
      currentControls.right = false;
      changed = true;
    }
    if (changed) {
      myCar.controls.forward = currentControls.forward;
      myCar.controls.reverse = currentControls.reverse;
      myCar.controls.left = currentControls.left;
      myCar.controls.right = currentControls.right;
      emitControls();
    }
  });
}
