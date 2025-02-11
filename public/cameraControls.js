// class CameraControls {
//   constructor(canvas) {
//     this.canvas = canvas;
//     this.ctx = canvas.getContext("2d");

//     this.tmpCanvas = document.createElement("canvas");
//     this.tmpCtx = this.tmpCanvas.getContext("2d");

//     this.tilt = 0;
//     this.forward = false;
//     this.reverse = false;
//     //for gears
//     this.predictedOutput = null;
//     this.closedHands = false;

//     this.hands = new Hands({
//       locateFile: (file) =>
//         `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
//     });
//     this.hands.setOptions({
//       maxNumHands: 2,
//       modelComplexity: 1,
//       minDetectionConfidence: 0.7,
//       minTrackingConfidence: 0.7,
//     });

//     this.hands.onResults(this.#processHands.bind(this));

//     this.loadOnnxModel();

//     navigator.mediaDevices
//       .getUserMedia({ video: true })
//       .then((rawData) => {
//         this.video = document.createElement("video");
//         this.video.srcObject = rawData;
//         this.video.play();
//         this.video.onloadeddata = () => {
//           this.canvas.width = this.video.videoWidth;
//           this.canvas.height = this.video.videoHeight;
//           this.tmpCanvas.width = this.canvas.width;
//           this.tmpCanvas.height = this.canvas.height;

//           const drawHands = async () => {
//             this.ctx.save();
//             this.ctx.translate(this.canvas.width, 1);
//             this.ctx.scale(-1, 1);
//             this.ctx.drawImage(
//               this.video,
//               0,
//               0,
//               this.canvas.width,
//               this.canvas.height
//             );
//             this.ctx.restore();

//             await this.hands.send({ image: this.video });
//             requestAnimationFrame(drawHands);
//           };
//           drawHands();
//         };
//       })
//       .catch((err) => {
//         alert(err);
//       });
//   }

//   async loadOnnxModel() {
//     const modelPath = "./models/keypoint.onnx"; // Path to the ONNX model
//     this.onnxModel = await ort.InferenceSession.create(modelPath);
//     console.log("ONNX model loaded");
//   }

//   preprocessLandmarks(landmarks) {
//     const baseX = landmarks[0].x;
//     const baseY = landmarks[0].y;

//     // Convert to relative coordinates
//     const relativeLandmarks = landmarks.map((landmark) => ({
//       x: landmark.x - baseX,
//       y: landmark.y - baseY,
//     }));

//     // Flatten to 1D array
//     const flattened = relativeLandmarks.flatMap(({ x, y }) => [x, y]);

//     // Normalize
//     const maxVal = Math.max(...flattened.map(Math.abs));
//     return flattened.map((value) => value / maxVal);
//   }

//   async predictGesture(landmarks) {
//     if (!this.onnxModel) return "None";

//     const inputLandmarks = this.preprocessLandmarks(landmarks);
//     const inputTensor = new ort.Tensor(
//       "float32",
//       new Float32Array(inputLandmarks),
//       [1, 42]
//     );

//     const output = await this.onnxModel.run({ input: inputTensor });
//     const gestureScores = output.output.data;
//     //  const gestureLabels = [
//     //    "Stop",
//     //    "Gear 1",
//     //    "Gear 2",
//     //    "Gear 3",
//     //    "Gear 4",
//     //    "None",
//     //  ];
//     const gestureIndex = gestureScores.indexOf(Math.max(...gestureScores));
//     return gestureIndex;
//   }

//   async #processHands(results) {
//     const hands = results.multiHandLandmarks;

//     if (!hands || hands.length === 0) {
//       // No hands detected, reset values
//       this.tilt = 0;
//       this.forward = false;
//       this.reverse = false;
//       return;
//     }

//     if (hands.length >= 2) {
//       const hand1 = hands[0][0]; // Wrist landmark for first hand
//       const hand2 = hands[1][0]; // Wrist landmark for second hand

//       const leftHand = hand1.x < hand2.x ? hand1 : hand2;
//       const rightHand = hand1.x < hand2.x ? hand2 : hand1;

//       const recognizedGesture = await this.predictGesture(hands[0]);
//       this.#processGestures({
//         leftHand,
//         rightHand,
//         recognizedGesture,
//       });
//     }
//   }

//   #processGestures({ leftHand, rightHand, recognizedGesture }) {
//     // Calculate tilt using wrist positions
//     this.tilt =
//       1.2 * Math.atan2(-(rightHand.y - leftHand.y), rightHand.x - leftHand.x);
//     // console.log(recognizedGesture);

//     // Gesture-based gear control
//     if (recognizedGesture == 1) {
//       this.forward = true;
//       this.reverse = false;
//       this.predictedOutput = 1;
//     } else if (recognizedGesture == 0) {
//       //reverse
//       this.predictedOutput = 0;
//       this.forward = false;
//       this.reverse = true;
//     } else if (recognizedGesture == 2) {
//       this.predictedOutput = 2;
//       this.forward = true;
//       this.reverse = false;
//     } else if (recognizedGesture == 3) {
//       this.predictedOutput = 3;
//       this.forward = true;
//       this.reverse = false;
//     } else if (recognizedGesture == 4) {
//       this.predictedOutput = 4;
//       this.forward = true;
//       this.reverse = false;
//     } else if (recognizedGesture == 5) {
//       this.forward = false;
//       this.reverse = false;
//     }

//     // Draw a circle representing the tilt and control
//     //  const wheelCenter = {
//     //    x: (leftHand.x + rightHand.x) / 2,
//     //    y: (leftHand.y + rightHand.y) / 2,
//     //  };
//     //  const wheelRadius = 50;

//     //  this.ctx.beginPath();
//     //  this.ctx.fillStyle = this.forward ? "blue" : this.reverse ? "red" : "gray";
//     //  this.ctx.arc(wheelCenter.x, wheelCenter.y, wheelRadius, 0, Math.PI * 2);
//     //  this.ctx.fill();
//   }
// }

class CameraControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.tmpCanvas = document.createElement("canvas");
    this.tmpCtx = this.tmpCanvas.getContext("2d");
    this.predictedOutput = null;
    this.closedHands = false;

    this.tilt = 0;
    this.forward = false;
    this.reverse = false;

    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    this.hands.onResults(this.#processHands.bind(this));

    this.loadOnnxModel();

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((rawData) => {
        this.video = document.createElement("video");
        this.video.srcObject = rawData;
        this.video.play();
        this.video.onloadeddata = () => {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          this.tmpCanvas.width = this.canvas.width;
          this.tmpCanvas.height = this.canvas.height;

          const drawHands = async () => {
            this.ctx.save();
            this.ctx.translate(this.canvas.width, 1);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(
              this.video,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
            this.ctx.restore();

            await this.hands.send({ image: this.video });
            requestAnimationFrame(drawHands);
          };
          drawHands();
        };
      })
      .catch((err) => {
        alert(err);
      });
  }

  async loadOnnxModel() {
    const modelPath = "./models/keypoint.onnx"; // Path to the ONNX model
    this.onnxModel = await ort.InferenceSession.create(modelPath);
    // console.log("ONNX model loaded");
  }

  preprocessLandmarks(landmarks) {
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;

    // Convert to relative coordinates
    const relativeLandmarks = landmarks.map((landmark) => ({
      x: landmark.x - baseX,
      y: landmark.y - baseY,
    }));

    // Flatten to 1D array
    const flattened = relativeLandmarks.flatMap(({ x, y }) => [x, y]);

    // Normalize
    const maxVal = Math.max(...flattened.map(Math.abs));
    return flattened.map((value) => value / maxVal);
  }

  async predictGesture(landmarks) {
    if (!this.onnxModel) return "None";

    const inputLandmarks = this.preprocessLandmarks(landmarks);
    const inputTensor = new ort.Tensor(
      "float32",
      new Float32Array(inputLandmarks),
      [1, 42]
    );

    const output = await this.onnxModel.run({ input: inputTensor });
    const gestureScores = output.output.data;
    //  const gestureLabels = [
    //    "Stop",
    //    "Gear 1",
    //    "Gear 2",
    //    "Gear 3",
    //    "Gear 4",
    //    "None",
    //  ];
    const gestureIndex = gestureScores.indexOf(Math.max(...gestureScores));
    return gestureIndex;
  }

  async #processHands(results) {
    const hands = results.multiHandLandmarks;

    if (!hands || hands.length < 2) {
      // Require two hands for motion
      this.tilt = 0;
      this.forward = false;
      this.reverse = false;
      return;
    }

    // Identify left and right hand
    const hand1 = hands[0][0];
    const hand2 = hands[1][0];

    const leftHand = hand1.x < hand2.x ? hands[0] : hands[1];
    const rightHand = hand1.x < hand2.x ? hands[1] : hands[0];

    // Only recognize gestures from the right hand
    const recognizedGesture = await this.predictGesture(leftHand);
    this.#processGestures({
      leftHand: leftHand[0],
      rightHand: rightHand[0],
      recognizedGesture,
    });
  }

  #processGestures({ leftHand, rightHand, recognizedGesture }) {
    // Calculate tilt using wrist positions
    this.tilt =
      1.2 * Math.atan2(-(rightHand.y - leftHand.y), rightHand.x - leftHand.x);
    currentControls.tilt = this.tilt;
    // Gesture-based gear control
    // console.log(recognizedGesture);
    if (recognizedGesture == 0) {
      this.forward = false;
      this.reverse = true;
      this.predictedOutput = 0;
      currentControls.predictedOutput = 0;
      emitControls();
    } else if (recognizedGesture == 1) {
      this.forward = true;
      this.reverse = false;
      this.predictedOutput = 1;
      currentControls.forward = true;
      currentControls.reverse = false;
      currentControls.predictedOutput = 1;
      emitControls();
    } else if (recognizedGesture == 2) {
      this.forward = true;
      this.reverse = false;
      this.predictedOutput = 2;
      currentControls.forward = true;
      currentControls.reverse = false;
      currentControls.predictedOutput = 2;
      emitControls();
    } else if (recognizedGesture == 4) {
      this.forward = true;
      this.reverse = false;
      this.predictedOutput = 4;
      currentControls.forward = true;
      currentControls.reverse = false;
      currentControls.predictedOutput = 4;
      emitControls();
    } else if (recognizedGesture == 3) {
      this.forward = true;
      this.reverse = false;
      this.predictedOutput = 3;
      currentControls.forward = true;
      currentControls.reverse = false;
      currentControls.predictedOutput = 3;
      emitControls();
    } else if (recognizedGesture == 5) {
      this.forward = false;
      this.reverse = false;
      this.predictedOutput = 5;
      currentControls.forward = false;
      currentControls.reverse = false;
      currentControls.predictedOutput = 5;
      emitControls();
    }
  }
}
