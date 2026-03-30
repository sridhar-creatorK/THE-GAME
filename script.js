(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var altitudeEl = document.getElementById('altitude');
  var velocityEl = document.getElementById('velocity');
  var angleEl = document.getElementById('angle');
  var statusEl = document.getElementById('status');
  var throttleEl = document.getElementById('throttle');
  var fuelEl = document.getElementById('fuel');
  var fuelBarEl = document.getElementById('fuelBar');
  var rotationSensitivityEl = document.getElementById('rotationSensitivity');

  // --- Real-world-style units ---
  // Internal simulation uses meters, seconds, kg, Newtons, radians.
  var PIXELS_PER_METER = 5.2;
  var WORLD_W_M = 170;
  var GROUND_Y_M = 240;

  var gravity = 9.81; // m/s^2
  var rocketMass = 1200; // kg
  var thrustForce = 16500; // N
  var fuelBurnRate = 0.55; // % per second at full throttle

  var linearDragCoeff = 0.018; // small, intentional damping
  var angularDragCoeff = 1.2; // rad/s damping

  var baseRotationAcceleration = 0.9; // rad/s^2

  var rocket = {
    x: WORLD_W_M * 0.5,
    y: 45,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    throttle: 0,
    widthM: 4.6,
    heightM: 14.0,
    fuel: 100,
    throttleUp: false,
    throttleDown: false,
    rotateLeft: false,
    rotateRight: false,
    landed: false,
    crashed: false
  };

  var pad = { x: WORLD_W_M * 0.5 - 12, y: GROUND_Y_M - 1.2, w: 24, h: 1.2 };
  var camera = { x: rocket.x, y: rocket.y };
  var stars = [];
  var particles = [];
  var rotationSensitivity = 1;

  var i;
  for (i = 0; i < 150; i += 1) {
    stars.push({
      x: Math.random() * WORLD_W_M,
      y: Math.random() * (GROUND_Y_M - 30),
      r: 0.5 + Math.random() * 1.3,
      a: 0.25 + Math.random() * 0.6
    });
  }

  function resetGame() {
    rocket.x = WORLD_W_M * 0.5;
    rocket.y = 45;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.angularVelocity = 0;
    rocket.throttle = 0;
    rocket.fuel = 100;
    rocket.throttleUp = false;
    rocket.throttleDown = false;
    rocket.rotateLeft = false;
    rocket.rotateRight = false;
    rocket.landed = false;
    rocket.crashed = false;
    particles = [];
    statusEl.textContent = 'Flying';
  }

  function normAngleDeg(rad) {
    var deg = (rad * 180) / Math.PI;
    var n = ((deg % 360) + 360) % 360;
    if (n > 180) {
      n -= 360;
    }
    return n;
  }

  function keyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      rocket.throttleUp = true;
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      rocket.throttleDown = true;
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rocket.rotateLeft = true;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      rocket.rotateRight = true;
    } else if (e.code === 'KeyR') {
      resetGame();
    }
  }

  function keyUp(e) {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      rocket.throttleUp = false;
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      rocket.throttleDown = false;
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rocket.rotateLeft = false;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      rocket.rotateRight = false;
    }
  }

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  rotationSensitivityEl.addEventListener('input', function () {
    rotationSensitivity = parseFloat(rotationSensitivityEl.value) || 1;
  });

  function spawnExplosion() {
    var p;
    for (p = 0; p < 45; p += 1) {
      var a = Math.random() * Math.PI * 2;
      var speed = 10 + Math.random() * 45; // m/s
      particles.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.6 + Math.random() * 0.8,
        size: 2 + Math.random() * 3.5,
        c: Math.random() > 0.45 ? '#f97316' : '#ef4444'
      });
    }
  }

  function updateParticles(deltaTime) {
    var p;
    for (p = particles.length - 1; p >= 0; p -= 1) {
      particles[p].life -= deltaTime;
      particles[p].x += particles[p].vx * deltaTime;
      particles[p].y += particles[p].vy * deltaTime;
      particles[p].vy += gravity * 0.45 * deltaTime;
      if (particles[p].life <= 0) {
        particles.splice(p, 1);
      }
    }
  }

  function update(deltaTime) {
    updateParticles(deltaTime);

    if (rocket.landed || rocket.crashed) {
      return;
    }

    // --- Rotation dynamics (rad/s, rad/s^2) ---
    var rotationAccel = baseRotationAcceleration * rotationSensitivity;
    if (rocket.rotateLeft) {
      rocket.angularVelocity -= rotationAccel * deltaTime;
    }
    if (rocket.rotateRight) {
      rocket.angularVelocity += rotationAccel * deltaTime;
    }

    // intentional small damping only
    rocket.angularVelocity += -rocket.angularVelocity * angularDragCoeff * deltaTime;
    rocket.angle += rocket.angularVelocity * deltaTime;

    // Manual throttle control (0..1), adjusted gradually by keys.
    if (rocket.throttleUp && rocket.fuel > 0) {
      rocket.throttle = Math.min(1, rocket.throttle + 0.55 * deltaTime);
    }
    if (rocket.throttleDown) {
      rocket.throttle = Math.max(0, rocket.throttle - 0.65 * deltaTime);
    }

    // --- Forces (Newtons) ---
    var forceX = 0;
    var forceY = rocketMass * gravity;

    if (rocket.throttle > 0 && rocket.fuel > 0) {
      var currentThrust = thrustForce * rocket.throttle;
      forceX += Math.sin(rocket.angle) * currentThrust;
      forceY += -Math.cos(rocket.angle) * currentThrust;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * rocket.throttle * deltaTime);
    }

    // Very small drag force opposite velocity
    forceX += -linearDragCoeff * rocket.vx;
    forceY += -linearDragCoeff * rocket.vy;

    // acceleration = force / mass
    var ax = forceX / rocketMass;
    var ay = forceY / rocketMass;

    // velocity += acceleration * dt
    rocket.vx += ax * deltaTime;
    rocket.vy += ay * deltaTime;

    // position += velocity * dt
    rocket.x += rocket.vx * deltaTime;
    rocket.y += rocket.vy * deltaTime;

    // Side boundaries: constrain position only (no velocity cap)
    var halfW = rocket.widthM * 0.5;
    if (rocket.x < halfW) {
      rocket.x = halfW;
      rocket.vx = 0;
    } else if (rocket.x > WORLD_W_M - halfW) {
      rocket.x = WORLD_W_M - halfW;
      rocket.vx = 0;
    }

    // Landing / crash logic based on real velocities
    var bottom = rocket.y + rocket.heightM * 0.5;
    if (bottom >= pad.y) {
      rocket.y = pad.y - rocket.heightM * 0.5;

      var verticalSpeed = Math.abs(rocket.vy);
      var horizontalSpeed = Math.abs(rocket.vx);
      var onPad = rocket.x > pad.x && rocket.x < pad.x + pad.w;
      var angleAbs = Math.abs(normAngleDeg(rocket.angle));

      var safeLanding = onPad && verticalSpeed < 6 && horizontalSpeed < 4 && angleAbs < 10;
      var hardLanding = onPad && verticalSpeed < 9 && horizontalSpeed < 6 && angleAbs < 15;

      if (safeLanding) {
        rocket.landed = true;
        statusEl.textContent = 'Successful Landing';
      } else if (hardLanding) {
        rocket.landed = true;
        statusEl.textContent = 'Hard Landing';
      } else {
        rocket.crashed = true;
        statusEl.textContent = 'Crashed';
        spawnExplosion();
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.angularVelocity = 0;
      rocket.throttle = 0;
      rocket.throttleUp = false;
      rocket.throttleDown = false;
    }

    camera.x += (rocket.x - camera.x) * Math.min(1, deltaTime * 4.8);
    camera.y += (rocket.y - camera.y) * Math.min(1, deltaTime * 4.8);
  }

  function worldToScreenX(xMeters) {
    return (xMeters - camera.x) * PIXELS_PER_METER + canvas.width / 2;
  }

  function worldToScreenY(yMeters) {
    return (yMeters - camera.y) * PIXELS_PER_METER + canvas.height / 2;
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#020617');
    g.addColorStop(0.55, '#0a1d46');
    g.addColorStop(1, '#2f5532');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var s;
    for (s = 0; s < stars.length; s += 1) {
      var sx = worldToScreenX(stars[s].x);
      var sy = worldToScreenY(stars[s].y);
      if (sx < -3 || sx > canvas.width + 3 || sy < -3 || sy > canvas.height + 3) {
        continue;
      }
      ctx.fillStyle = 'rgba(255,255,255,' + stars[s].a + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, stars[s].r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld() {
    var gy = worldToScreenY(GROUND_Y_M);
    var py = worldToScreenY(pad.y);

    ctx.fillStyle = '#2b4d2a';
    ctx.fillRect(0, gy, canvas.width, canvas.height - gy);

    var px = worldToScreenX(pad.x);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(px, py, pad.w * PIXELS_PER_METER, pad.h * PIXELS_PER_METER);
  }

  function drawRocket() {
    if (rocket.crashed) {
      return;
    }

    var x = worldToScreenX(rocket.x);
    var y = worldToScreenY(rocket.y);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rocket.angle);

    var scale = 1.25;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-8, -20, 16, 40);

    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(0, -34);
    ctx.lineTo(8, -20);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-13, 8, 5, 14);
    ctx.fillRect(8, 8, 5, 14);

    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, 20, 12, 6);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (rocket.throttle > 0.05 && rocket.fuel > 0 && !rocket.landed) {
      var flame = 8 + Math.random() * 10 * rocket.throttle;
      ctx.beginPath();
      ctx.moveTo(-4.5, 26);
      ctx.lineTo(0, 26 + flame);
      ctx.lineTo(4.5, 26);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-2.3, 26);
      ctx.lineTo(0, 24 + flame * 0.6);
      ctx.lineTo(2.3, 26);
      ctx.closePath();
      ctx.fillStyle = '#fde68a';
      ctx.fill();
    }

    ctx.restore();
  }

  function drawParticles() {
    var p;
    for (p = 0; p < particles.length; p += 1) {
      var px = worldToScreenX(particles[p].x);
      var py = worldToScreenY(particles[p].y);
      ctx.globalAlpha = Math.max(0, particles[p].life);
      ctx.fillStyle = particles[p].c;
      ctx.beginPath();
      ctx.arc(px, py, particles[p].size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateHud() {
    var altitude = Math.max(0, GROUND_Y_M - (rocket.y + rocket.heightM * 0.5));
    var totalVelocity = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);

    altitudeEl.textContent = altitude.toFixed(1) + ' m';
    velocityEl.textContent = totalVelocity.toFixed(2) + ' m/s';
    angleEl.textContent = normAngleDeg(rocket.angle).toFixed(1) + '°';
    throttleEl.textContent = (rocket.throttle * 100).toFixed(0) + '%';
    fuelEl.textContent = rocket.fuel.toFixed(0) + '%';
    fuelBarEl.style.width = rocket.fuel.toFixed(2) + '%';

    if (!rocket.landed && !rocket.crashed) {
      statusEl.textContent = 'Flying';
    }
  }

  function render() {
    drawBackground();
    drawWorld();
    drawRocket();
    drawParticles();
    updateHud();
  }

  var lastTime = performance.now();
  function loop(currentTime) {
    var deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime > 0.033) {
      deltaTime = 0.033;
    }
    lastTime = currentTime;

    update(deltaTime);
    render();

    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();
