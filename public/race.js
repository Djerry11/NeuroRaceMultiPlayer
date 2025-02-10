const rightPanelWidth = 300;
document.body.style.flexDirection = "column";
const carCanvas = document.getElementById("carCanvas");
carCanvas.width = window.innerWidth;
carCanvas.height = 0; //window.innerHeight / 2;
const cameraCanvas = document.getElementById("cameraCanvas");
cameraCanvas.width = window.innerWidth;
cameraCanvas.height = window.innerHeight;

statistics.style.width = rightPanelWidth + "px";
statistics.style.height = window.innerHeight - rightPanelWidth - 60 + "px";

const carCtx = carCanvas.getContext("2d");
const cameraCtx = cameraCanvas.getContext("2d");
const viewport = new Viewport(carCanvas, world.zoom, world.offset);
// const miniMap = new MiniMap(miniMapCanvas, world.graph, rightPanelWidth);

const N = 1;
const cars = generateCars(1, "KEYS").concat(generateCars(N, "AI"));
const myCar = cars[0];
const camera = new Camera(myCar);
if (localStorage.getItem("bestBrain")) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
    if (i > 1) {
      NeuralNetwork.mutate(cars[i].brain, 0.1);
    }
  }
}
for (let i = 0; i < cars.length; i++) {
  const div = document.createElement("div");
  div.id = "stat_" + i;
  div.innerText = i;
  div.style.color = cars[i].color;
  div.classList.add("stat");
  statistics.appendChild(div);
}

let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
// console.log(target);
if (target) {
  world.generateCorridor(false);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
} else {
  world.generateCorridor(false);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);

  // roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
}
let frameCount = 0;
let started = false;
startCounter();
animate();

function save() {
  localStorage.setItem("bestBrain", JSON.stringify(myCar.brain));
}

function discard() {
  localStorage.removeItem("bestBrain");
}

function generateCars(N, type) {
  const startPoints = world.markings.filter((m) => m instanceof Start);
  const startPoint =
    startPoints.length > 0 ? startPoints[0].center : new Point(100, 100);
  const dir =
    startPoints.length > 0 ? startPoints[0].directionVector : new Point(0, -1);
  const startAngle = -angle(dir) + Math.PI / 2;

  const cars = [];
  for (let i = 1; i <= N; i++) {
    const color = type == "AI" ? getRandomColor() : "blue";

    const car = new Car(
      startPoint.x,
      startPoint.y,
      30,
      50,
      type,
      startAngle,
      3,
      color
    );
    car.name = type == "AI" ? "AI" + i : "Me";
    // cars.push(
    //   new Car(startPoint.x, startPoint.y, 30, 50, type, startAngle, 3, color)
    // );
    cars.push(car);
  }
  return cars;
}

function updateCarProgress(car) {
  if (!car.finishTime) {
    car.progress = 0;
    const carSeg = getNearestSegment(car, world.corridor.skeleton);
    for (let i = 0; i < world.corridor.skeleton.length; i++) {
      const s = world.corridor.skeleton[i];
      if (s.equals(carSeg)) {
        const proj = s.projectPoint(car);

        // proj.point.draw(carCtx);
        const firstPartOfSegment = new Segment(s.p1, proj.point);
        // firstPartOfSegment.draw(carCtx, { color: "red", width: 5 });
        car.progress += firstPartOfSegment.length();

        break;
      } else {
        // s.draw(carCtx, { color: "red", width: 5 });
        car.progress += s.length();
      }
    }
    const totalDistance = world.corridor.skeleton.reduce(
      (acc, s) => acc + s.length(),
      0
    );
    car.progress /= totalDistance;
    if (car.progress >= 0.85) {
      car.progress = 1;
      car.finishTime = frameCount;
    }
    // carSeg.draw(carCtx, { color: "red", width: 5 });
    // console.log(car.progress);
  }
}
function handleCollisionWithRoadBorder(car) {
  const seg = getNearestSegment(car, world.corridor.skeleton);

  const correctors = car.polygon.map((p) => {
    const proj = seg.projectPoint(p);
    const projPoint =
      proj.offset < 0 ? seg.p1 : proj.offset > 1 ? seg.p2 : proj.point;
    return subtract(projPoint, p);
  });

  const maxMagnitude = Math.max(...correctors.map((p) => magnitude(p)));
  const corrector = correctors.find((p) => magnitude(p) == maxMagnitude);
  const normCorrector = normalize(corrector);

  if (corrector == correctors[0] || corrector == correctors[2]) {
    car.angle += 0.1;
  } else {
    car.angle -= 0.1;
  }

  car.x += normCorrector.x;
  car.y += normCorrector.y;
  car.damaged = false;
}
function startCounter() {
  counter.innerText = "3";
  setTimeout(() => {
    counter.innerText = "2";
    setTimeout(() => {
      counter.innerText = "1";
      setTimeout(() => {
        counter.innerText = "1";
        setTimeout(() => {
          counter.innerText = "Go!";
          setTimeout(() => {
            counter.innerText = "";
            started = true;
            frameCount = 0;
            myCar.engine = new Engine();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}
function animate(time) {
  if (started) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].update(roadBorders, []);
    }
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
  // world.draw(carCtx, viewPoint, false);
  for (let i = 0; i < cars.length; i++) {
    updateCarProgress(cars[i]);
  }
  cars.sort((a, b) => b.progress - a.progress);
  for (let i = 0; i < cars.length; i++) {
    const stat = document.getElementById("stat_" + i);
    stat.style.color = cars[i].color;
    stat.innerText =
      i + 1 + ": " + cars[i].name + (cars[i].damaged ? " 💀" : "");
    stat.style.backgroundColor = cars[i].type == "AI" ? "black" : "white";
    if (cars[i].finishTime) {
      // console.log(cars[i].finishTime);
      stat.innerHTML +=
        "<span style='float:right;'>" +
        (cars[i].finishTime / 60).toFixed(1) +
        "s</span>";
    }
  }
  camera.move(myCar);
  camera.draw(carCtx);
  camera.render(cameraCtx, world);
  frameCount++;
  requestAnimationFrame(animate);
}

// const socket = io(); // Ensure Socket.io client is connected
// // Updated race.js
// const currentPlayer = JSON.parse(localStorage.getItem("currentPlayer"));
// const opponent = JSON.parse(localStorage.getItem("opponent"));

// const rightPanelWidth = 300;
// document.body.style.flexDirection = "column";
// const carCanvas = document.getElementById("carCanvas");
// carCanvas.width = window.innerWidth;
// // carCanvas.height = window.innerHeight ;
// carCanvas.height = 0;
// const cameraCanvas = document.getElementById("cameraCanvas");
// cameraCanvas.width = window.innerWidth;
// cameraCanvas.height = window.innerHeight;

// statistics.style.width = rightPanelWidth + "px";
// statistics.style.height = window.innerHeight - rightPanelWidth - 60 + "px";

// const carCtx = carCanvas.getContext("2d");
// const cameraCtx = cameraCanvas.getContext("2d");
// const viewport = new Viewport(carCanvas, world.zoom, world.offset);
// // const miniMap = new MiniMap(miniMapCanvas, world.graph, rightPanelWidth);

// const cars = generateCars(currentPlayer, opponent);
// const myCar = cars[0];
// const camera = new Camera(myCar);
// if (localStorage.getItem("bestBrain")) {
//   for (let i = 0; i < cars.length; i++) {
//     cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
//     if (i > 1) {
//       NeuralNetwork.mutate(cars[i].brain, 0.1);
//     }
//   }
// }
// for (let i = 0; i < cars.length; i++) {
//   const div = document.createElement("div");
//   div.id = "stat_" + i;
//   div.innerText = i;
//   div.style.color = cars[i].color;
//   div.classList.add("stat");
//   statistics.appendChild(div);
// }

// let roadBorders = [];
// const target = world.markings.find((m) => m instanceof Target);
// // console.log(target);
// if (target) {
//   world.generateCorridor(false);
//   roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
// } else {
//   world.generateCorridor(false);
//   roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
// }
// let frameCount = 0;
// let started = false;
// startCounter();
// animate();

// function save() {
//   localStorage.setItem("bestBrain", JSON.stringify(myCar.brain));
// }

// function discard() {
//   localStorage.removeItem("bestBrain");
// }

// function generateCars(currentPlayer, opponent) {
//   const startPoints = world.markings.filter((m) => m instanceof Start);
//   const startPoint = startPoints[0].center;
//   const dir = startPoints[0].directionVector;
//   const startAngle = -angle(dir) + Math.PI / 2;

//   // Local player's car (controlled by keyboard)
//   const localCar = new Car(
//     startPoint.x,
//     startPoint.y,
//     30,
//     50,
//     "KEYS",
//     startAngle,
//     3,
//     currentPlayer.playerNumber === 1 ? "blue" : "green"
//   );
//   localCar.name = currentPlayer.name;
//   localCar.playerId = currentPlayer.playerId;

//   // Opponent's car (controlled via socket)
//   const opponentCar = new Car(
//     startPoint.x,
//     startPoint.y,
//     30,
//     50,
//     "SOCKET",
//     startAngle,
//     currentPlayer.playerNumber === 1 ? "green" : "blue"
//   );
//   opponentCar.name = opponent.name;
//   opponentCar.playerId = opponent.playerId;

//   // Emit control changes for local car
//   localCar.controls.onChange = (controls) => {
//     socket.emit("control", controls);
//   };

//   return [localCar, opponentCar];
// }
// // Update opponent's controls when receiving data
// socket.on("opponent-control", (controls) => {
//   const opponentCar = cars.find((c) => c.playerId === opponent.playerId);
//   if (opponentCar) {
//     opponentCar.controls.forward = controls.forward;
//     opponentCar.controls.left = controls.left;
//     opponentCar.controls.right = controls.right;
//     opponentCar.controls.reverse = controls.reverse;
//   }
// });

// function updateCarProgress(car) {
//   if (!car.finishTime) {
//     car.progress = 0;
//     const carSeg = getNearestSegment(car, world.corridor.skeleton);
//     for (let i = 0; i < world.corridor.skeleton.length; i++) {
//       const s = world.corridor.skeleton[i];
//       if (s.equals(carSeg)) {
//         const proj = s.projectPoint(car);

//         // proj.point.draw(carCtx);
//         const firstPartOfSegment = new Segment(s.p1, proj.point);
//         // firstPartOfSegment.draw(carCtx, { color: "red", width: 5 });
//         car.progress += firstPartOfSegment.length();

//         break;
//       } else {
//         // s.draw(carCtx, { color: "red", width: 5 });
//         car.progress += s.length();
//       }
//     }
//     const totalDistance = world.corridor.skeleton.reduce(
//       (acc, s) => acc + s.length(),
//       0
//     );
//     car.progress /= totalDistance;
//     if (car.progress >= 0.85) {
//       car.progress = 1;
//       car.finishTime = frameCount;
//     }
//     carSeg.draw(carCtx, { color: "red", width: 5 });
//     // console.log(car.progress);
//   }
// }
// function handleCollisionWithRoadBorder(car) {
//   const seg = getNearestSegment(car, world.corridor.skeleton);

//   const correctors = car.polygon.map((p) => {
//     const proj = seg.projectPoint(p);
//     const projPoint =
//       proj.offset < 0 ? seg.p1 : proj.offset > 1 ? seg.p2 : proj.point;
//     return subtract(projPoint, p);
//   });

//   const maxMagnitude = Math.max(...correctors.map((p) => magnitude(p)));
//   const corrector = correctors.find((p) => magnitude(p) == maxMagnitude);
//   const normCorrector = normalize(corrector);

//   if (corrector == correctors[0] || corrector == correctors[2]) {
//     car.angle += 0.1;
//   } else {
//     car.angle -= 0.1;
//   }

//   car.x += normCorrector.x;
//   car.y += normCorrector.y;
//   car.damaged = false;
// }
// function startCounter() {
//   counter.innerText = "3";
//   setTimeout(() => {
//     counter.innerText = "2";
//     setTimeout(() => {
//       counter.innerText = "1";
//       setTimeout(() => {
//         counter.innerText = "1";
//         setTimeout(() => {
//           counter.innerText = "Go!";
//           setTimeout(() => {
//             counter.innerText = "";
//             started = true;
//             frameCount = 0;
//             // myCar.engine = new Engine();
//           }, 1000);
//         }, 1000);
//       }, 1000);
//     }, 1000);
//   }, 1000);
// }

// function animate(time) {
//   if (started) {
//     for (let i = 0; i < cars.length; i++) {
//       cars[i].update(roadBorders, []);
//     }
//   }
//   for (const car of cars) {
//     if (car.damaged) {
//       handleCollisionWithRoadBorder(car);
//     }
//   }

//   world.cars = cars;
//   world.bestCar = myCar;

//   viewport.offset.x = -myCar.x;
//   viewport.offset.y = -myCar.y;

//   viewport.reset();
//   // const viewPoint = scale(viewport.getOffset(), -1);
//   // world.draw(carCtx, viewPoint, false);
//   for (let i = 0; i < cars.length; i++) {
//     updateCarProgress(cars[i]);
//   }
//   cars.sort((a, b) => b.progress - a.progress);
//   for (let i = 0; i < cars.length; i++) {
//     const stat = document.getElementById("stat_" + i);
//     stat.style.color = cars[i].color;
//     stat.innerText =
//       i + 1 + ": " + cars[i].name + (cars[i].damaged ? " 💀" : "");
//     stat.style.backgroundColor = cars[i].type == "SOCKET" ? "black" : "white";
//     if (cars[i].finishTime) {
//       // console.log(cars[i].finishTime);
//       stat.innerHTML +=
//         "<span style='float:right;'>" +
//         (cars[i].finishTime / 60).toFixed(1) +
//         "s</span>";
//     }
//   }
//   camera.move(myCar);

//   camera.draw(carCtx);
//   camera.render(cameraCtx, world);
//   frameCount++;
//   requestAnimationFrame(animate);
// }
