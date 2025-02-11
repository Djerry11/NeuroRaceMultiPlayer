class Car {
  constructor(
    x,
    y,
    width,
    height,
    controlType,
    angle = 0,
    color = "red",
    isMyCar = false,
    maxSpeed = 7,
    playerId = "ldsjf"
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.type = controlType;

    //collision detection
    this.collision = 0;

    // this.carId = carId;
    this.isMyCar = isMyCar;
    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = maxSpeed;
    this.friction = 0.1;
    this.angle = angle;
    this.damaged = false;

    this.fittness = 0;

    this.useBrain = controlType == "AI";
    this.playerId = playerId;

    if (controlType != "DUMMY") {
      this.sensor = new Sensor(this);
      this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
    }
    this.controls = new Controls(controlType);

    this.img = new Image();
    this.img.src = "car.png";

    this.mask = document.createElement("canvas");
    this.mask.width = width;
    this.mask.height = height;

    const maskCtx = this.mask.getContext("2d");
    this.img.onload = () => {
      maskCtx.fillStyle = color;
      maskCtx.rect(0, 0, this.width, this.height);
      maskCtx.fill();

      maskCtx.globalCompositeOperation = "destination-atop";
      maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
    };

    this.update([], []);
  }

  load(info) {
    this.brain = info.brain;
    // this.maxSpeed = info.maxSpeed;
    this.friction = info.friction;
    this.acceleration = info.acceleration;
    this.sensor.rayCount = info.sensor.rayCount;
    this.sensor.raySpread = info.sensor.raySpread;
    this.sensor.rayLength = info.sensor.rayLength;
    this.sensor.rayOffset = info.sensor.rayOffset;
  }

  update(roadBorders, traffic) {
    if (!this.damaged) {
      this.#move();
      this.fittness += this.speed;
      this.polygon = this.#createPolygon();
      this.damaged = this.#assessDamage(roadBorders, traffic);
      if (this.damaged) {
        this.speed = 0;
        this.collision += 1;
        console.log(this.collision);
        if (this.type == "KEYS" || (this.type == "CAMERA" && this.isMyCar)) {
          // console.log("COLLISION in car");
          explode();
        }
      }
    }
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset
      );
      // .concat([this.speed / this.maxSpeed]);
      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useBrain) {
        this.controls.forward = outputs[0];
        this.controls.left = outputs[1];
        this.controls.right = outputs[2];
        this.controls.reverse = outputs[3];
      }
    }
    if (this.engine && this.isMyCar) {
      const percent = Math.abs(this.speed / this.maxSpeed);
      // console.log("SOUND PERCENT", percent);
      // const percent = 0;
      this.engine.setVolume(percent);
      this.engine.setPitch(percent);
    }
  }

  #assessDamage(roadBorders, traffic) {
    for (let i = 0; i < roadBorders.length; i++) {
      if (polysIntersect(this.polygon, roadBorders[i])) {
        return true;
      }
    }
    for (let i = 0; i < traffic.length; i++) {
      if (polysIntersect(this.polygon, traffic[i].polygon)) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });
    return points;
  }

  #move() {
    //speed according to the gear
    if (this.type == "CAMERA") {
      if (this.controls.forward) {
        // if (this.speed <= 5) {
        //   this.speed += this.acceleration;
        // }

        if (this.controls.predictedOutput == 1) {
          if (this.speed <= 2) {
            this.speed += this.acceleration;
            console.log(this.speed);
          }
        } else if (this.controls.predictedOutput == 2) {
          if (this.speed <= 3) {
            this.speed += this.acceleration;
          }
        } else if (this.controls.predictedOutput == 3) {
          if (this.speed <= 5) {
            this.speed += this.acceleration;
          }
        } else if (this.controls.predictedOutput == 4) {
          if (this.speed <= 7) {
            this.speed += this.acceleration;
          }
        } else {
          if (this.speed <= 5) {
            this.speed += this.acceleration;
          }
        }
      }
    } else {
      if (this.controls.forward) {
        if (this.speed <= 5) {
          this.speed += this.acceleration;
        }
      }
    }
    if (this.controls.reverse) {
      if (this.speed >= -1) {
        this.speed -= this.acceleration;
      }
    }

    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed;
    }
    if (this.speed < -this.maxSpeed / 2) {
      this.speed = -this.maxSpeed / 2;
    }

    if (this.speed > 0) {
      this.speed -= this.friction;
    }
    if (this.speed < 0) {
      this.speed += this.friction;
    }
    if (Math.abs(this.speed) < this.friction) {
      this.speed = 0;
    }

    if (this.speed != 0) {
      if (this.controls.tilt) {
        if (this.speed > 0) {
          this.angle -= this.controls.tilt * 0.03;
        } else {
          this.angle += this.controls.tilt * 0.03;
        }
      } else {
        const flip = this.speed > 0 ? 1 : -1;
        if (this.controls.left) {
          this.angle += 0.03 * flip;
        }
        if (this.controls.right) {
          this.angle -= 0.03 * flip;
        }
      }
    }
    //measuring the speed
    // console.log(this.speed);

    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx, drawSensor = false) {
    if (this.sensor && drawSensor) {
      //this.sensor.draw(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    if (!this.damaged) {
      ctx.drawImage(
        this.mask,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      ctx.globalCompositeOperation = "multiply";
    }
    ctx.drawImage(
      this.img,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();
  }
}
