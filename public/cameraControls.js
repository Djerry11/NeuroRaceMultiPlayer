const gestureLabels = ["R", "1", "2", "3", "4", "None"];
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
      leftHand: leftHand[17],
      rightHand: rightHand[17],
      recognizedGesture,
    });
  }

  #processGestures({ leftHand, rightHand, recognizedGesture }) {
    const tiltAngle =
      // Calculate tilt using wrist positions
      Math.atan2(-(rightHand.y - leftHand.y), rightHand.x - leftHand.x);
    this.tilt = tiltAngle * 1.2;
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
    // Draw a wheel of car representing the tilt and control
    this.#drawSteeringWheel(
      leftHand,
      rightHand,
      tiltAngle,
      gestureLabels[recognizedGesture]
    );
  }
  #drawSteeringWheel(leftHand, rightHand, tilt, gearLabel) {
    const ctx = this.ctx;

    // Convert normalized hand positions to canvas coordinates
    const leftX = leftHand.x * this.canvas.width;
    const leftY = leftHand.y * this.canvas.height;
    const rightX = rightHand.x * this.canvas.width;
    const rightY = rightHand.y * this.canvas.height;

    // Calculate dimensions
    const handDistance = Math.hypot(rightX - leftX, rightY - leftY);
    const wheelRadius = handDistance * 0.65;
    const baseThickness = wheelRadius * 0.3;
    const centerX = (leftX + rightX) / 2;
    const centerY = (leftY + rightY) / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(tilt);

    // Upside-down arc (270-degree arc starting from top)
    const startAngle = Math.PI * 1.85; // Start at 10 o'clock position
    const endAngle = Math.PI * 3.15; // End at 2 o'clock position

    // Main cylindrical arc (3D blue metallic)
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, startAngle, endAngle, false); // Outer arc
    ctx.arc(0, 0, wheelRadius - baseThickness, endAngle, startAngle, true); // Inner arc
    ctx.closePath();

    // 3D metallic blue gradient
    const rimGradient = ctx.createRadialGradient(
      -wheelRadius * 0.3,
      -wheelRadius * 0.3,
      wheelRadius * 0.1,
      wheelRadius * 0.3,
      wheelRadius * 0.3,
      wheelRadius
    );
    rimGradient.addColorStop(0, "#1a4a8a");
    rimGradient.addColorStop(0.5, "#2c6fd1");
    rimGradient.addColorStop(1, "#153b6b");
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Thicker grip at starting points (10% on both sides)
    const gripThicknessMultiplier = 3; // 3x thicker at the starting points
    const gripStartAngle = startAngle + Math.PI * 0.1; // 10% of the arc
    const gripEndAngle = endAngle - Math.PI * 0.1; // 10% of the arc

    // Left grip (thicker)
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, startAngle, gripStartAngle, false);
    ctx.arc(
      0,
      0,
      wheelRadius - baseThickness * gripThicknessMultiplier,
      gripStartAngle,
      startAngle,
      true
    );
    ctx.closePath();
    ctx.fillStyle = "#1a1a1a"; // Leather texture color
    ctx.fill();

    // Right grip (thicker)
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, gripEndAngle, endAngle, false);
    ctx.arc(
      0,
      0,
      wheelRadius - baseThickness * gripThicknessMultiplier,
      endAngle,
      gripEndAngle,
      true
    );
    ctx.closePath();
    ctx.fillStyle = "#1a1a1a"; // Leather texture color
    ctx.fill();

    // Inner depth effect for hollow center
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius - baseThickness * 0.8, 0, Math.PI * 2);
    const holeGradient = ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      wheelRadius - baseThickness * 0.8
    );
    holeGradient.addColorStop(0, "rgba(0,0,0,0.0)");
    holeGradient.addColorStop(1, "rgba(10,30,80,0.0)");
    ctx.fillStyle = holeGradient;
    ctx.fill();

    // Leather-wrapped grip (3D cylindrical effect)
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius - baseThickness * 0.3, startAngle, endAngle);
    ctx.lineWidth = baseThickness * 0.6;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();

    // Stitching details
    ctx.setLineDash([5, 10]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4a4a4a";
    ctx.stroke();

    // 3D specular highlights
    const highlightGradient = ctx.createLinearGradient(
      -wheelRadius,
      -wheelRadius,
      wheelRadius,
      wheelRadius
    );
    highlightGradient.addColorStop(0, "rgba(255,255,255,0.3)");
    highlightGradient.addColorStop(0.5, "rgba(255,255,255,0)");
    highlightGradient.addColorStop(1, "rgba(255,255,255,0.3)");

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // Dynamic shadow
    ctx.globalCompositeOperation = "multiply";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 15 * Math.sin(tilt);
    ctx.shadowOffsetY = 15 * Math.cos(tilt);

    // Control buttons (3D embossed)
    const drawButton = (angle) => {
      ctx.save();
      ctx.rotate(angle);

      // Button base
      ctx.beginPath();
      ctx.arc(wheelRadius * 0.7, 0, baseThickness * 0.2, 0, Math.PI * 2);
      const buttonGradient = ctx.createRadialGradient(
        wheelRadius * 0.7,
        0,
        0,
        wheelRadius * 0.7,
        0,
        baseThickness * 0.2
      );
      buttonGradient.addColorStop(0, "#2c6fd1");
      buttonGradient.addColorStop(1, "#0f2a4d");
      ctx.fillStyle = buttonGradient;
      ctx.fill();

      // Button highlight
      ctx.beginPath();
      ctx.arc(wheelRadius * 0.7 + 2, -2, baseThickness * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fill();

      ctx.restore();
    };

    // Add buttons at 10 and 2 o'clock positions
    drawButton(Math.PI * 1.85);
    drawButton(Math.PI * 3.15);

    // Draw Tesla-style polygonal base
    const baseRadius = wheelRadius * 0.4; // Base radius
    const numSides = 6; // Hexagon for Tesla-style base
    const angleStep = (Math.PI * 2) / numSides;

    ctx.beginPath();
    for (let i = 0; i < numSides; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * baseRadius;
      const y = Math.sin(angle) * baseRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Base gradient
    const baseGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
    baseGradient.addColorStop(0, "#1a1a1a");
    baseGradient.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = baseGradient;
    ctx.fill();

    // Add 3D effect to the base
    ctx.beginPath();
    for (let i = 0; i < numSides; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * baseRadius * 0.9;
      const y = Math.sin(angle) * baseRadius * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // const baseHighlightGradient = ctx.createRadialGradient(
    //   0,
    //   0,
    //   0,
    //   0,
    //   0,
    //   baseRadius * 0.9
    // );
    // baseHighlightGradient.addColorStop(0, "rgba(255,255,255,0.2)");
    // baseHighlightGradient.addColorStop(1, "rgba(255,255,255,0)");
    // ctx.fillStyle = baseHighlightGradient;
    // ctx.fill();

    // Draw extended grips at 4.5 and 7.5 o'clock positions
    const drawExtendedGrip = (angle) => {
      ctx.save();
      ctx.rotate(angle);

      // Grip shape (submerged into the wheel)
      ctx.beginPath();
      ctx.arc(0, 0, wheelRadius, -Math.PI * 0.1, Math.PI * 0.1, false); // Arc to blend with the wheel
      ctx.lineTo(wheelRadius * 0.8, baseThickness * 0.5);
      ctx.lineTo(wheelRadius * 0.8, -baseThickness * 0.5);
      ctx.closePath();

      // Grip gradient
      const gripGradient = ctx.createLinearGradient(0, 0, wheelRadius * 0.8, 0);
      gripGradient.addColorStop(0, "#1a1a1a");
      gripGradient.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = gripGradient;
      ctx.fill();

      ctx.restore();
    };

    // Add extended grips at 4.5 and 7.5 o'clock positions
    drawExtendedGrip(Math.PI * -1.25); // 4.5 o'clock
    drawExtendedGrip(Math.PI * -1.75); // 7.5 o'clock

    // Draw embossed gear label (in front of the base)
    // ctx.font = `${baseRadius * 0.8}px Arial`;
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";

    // Emboss effect using shadow
    // ctx.fillStyle = "#ffffff";
    // ctx.shadowColor = "rgba(0,0,0,0.5)";
    // ctx.shadowBlur = 5;
    // ctx.shadowOffsetX = 2;
    // ctx.shadowOffsetY = 2;

    ctx.fillText(gearLabel, 0, 0);

    // Reset shadow

    ctx.restore();
  }
}
