< codex/create-2d-rocket-simulation-game
(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var altitudeEl = document.getElementById('altitude');
  var fuelEl = document.getElementById('fuel');
  var vSpeedEl = document.getElementById('vSpeed');
  var hSpeedEl = document.getElementById('hSpeed');
  var angleEl = document.getElementById('angle');
  var statusEl = document.getElementById('status');

  var gravity = 70;
  var thrustPower = 180;
  var rotationSpeed = 120;
  var fuelBurnRate = 14;
  var drag = 0.04;

  var pad = {
    x: canvas.width / 2 - 35,
    y: canvas.height * 0.7,
    w: 70,
    h: 8
  };

  var rocket = {
    x: canvas.width / 2,
    y: 110,
    w: 16,
    h: 46,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: 100,
    thrusting: false,
    rotateLeft: false,
    rotateRight: false,
    landed: false,
    crashed: false
  };

  var stars = [];
  var i;
  for (i = 0; i < 55; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.66),
      r: 0.6 + Math.random() * 1.4
    });
  }

  var last = performance.now();

  function resetGame() {
    rocket.x = canvas.width / 2;
    rocket.y = 110;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.fuel = 100;
    rocket.thrusting = false;
    rocket.rotateLeft = false;
    rocket.rotateRight = false;
    rocket.landed = false;
    rocket.crashed = false;
    statusEl.textContent = 'Ready';
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      rocket.thrusting = true;
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

  function onKeyUp(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      rocket.thrusting = false;
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rocket.rotateLeft = false;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      rocket.rotateRight = false;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function update(dt) {
    if (rocket.landed || rocket.crashed) {
      return;
    }

    if (rocket.rotateLeft) {
      rocket.angle -= rotationSpeed * dt;
    }
    if (rocket.rotateRight) {
      rocket.angle += rotationSpeed * dt;
    }

    var accelX = 0;
    var accelY = gravity;

    if (rocket.thrusting && rocket.fuel > 0) {
      var rad = (rocket.angle * Math.PI) / 180;
      accelX += Math.sin(rad) * thrustPower;
      accelY -= Math.cos(rad) * thrustPower;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * dt);
    }

    rocket.vx += accelX * dt;
    rocket.vy += accelY * dt;

    rocket.vx *= (1 - drag * dt * 60);
    rocket.vy *= (1 - drag * dt * 15);

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    var halfW = rocket.w / 2;
    if (rocket.x - halfW < 0) {
      rocket.x = halfW;
      rocket.vx = 0;
    } else if (rocket.x + halfW > canvas.width) {
      rocket.x = canvas.width - halfW;
      rocket.vx = 0;
    }

    var rocketBottom = rocket.y + rocket.h / 2;
    if (rocketBottom >= pad.y) {
      rocket.y = pad.y - rocket.h / 2;

      var withinPad = rocket.x > pad.x && rocket.x < pad.x + pad.w;
      var safeVertical = Math.abs(rocket.vy) < 34;
      var safeHorizontal = Math.abs(rocket.vx) < 24;
      var safeAngle = Math.abs(rocket.angle % 360) < 10 || Math.abs(Math.abs(rocket.angle % 360) - 360) < 10;

      if (withinPad && safeVertical && safeHorizontal && safeAngle) {
        rocket.landed = true;
        statusEl.textContent = 'Successful landing';
      } else {
        rocket.crashed = true;
        statusEl.textContent = 'Crash landing';
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.thrusting = false;
    }
  }

  function drawBackground() {
    var s;
    ctx.fillStyle = '#f8fafc';
    for (s = 0; s < stars.length; s += 1) {
      ctx.beginPath();
      ctx.arc(stars[s].x, stars[s].y, stars[s].r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPad() {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);

    ctx.fillStyle = '#355e3b';
    ctx.fillRect(0, pad.y + pad.h, canvas.width, canvas.height - (pad.y + pad.h));
  }

  function drawRocket() {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate((rocket.angle * Math.PI) / 180);

    ctx.fillStyle = rocket.crashed ? '#ef4444' : '#e2e8f0';
    ctx.fillRect(-rocket.w / 2, -rocket.h / 2, rocket.w, rocket.h);

    ctx.beginPath();
    ctx.moveTo(-rocket.w / 2, -rocket.h / 2);
    ctx.lineTo(0, -rocket.h / 2 - 12);
    ctx.lineTo(rocket.w / 2, -rocket.h / 2);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.fillRect(-rocket.w / 2 - 3, rocket.h / 2 - 9, 3, 9);
    ctx.fillRect(rocket.w / 2, rocket.h / 2 - 9, 3, 9);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -8, 6, 12);

    if (rocket.thrusting && rocket.fuel > 0 && !rocket.landed && !rocket.crashed) {
      ctx.beginPath();
      ctx.moveTo(-5, rocket.h / 2);
      ctx.lineTo(0, rocket.h / 2 + 18 + Math.random() * 10);
      ctx.lineTo(5, rocket.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHud() {
    var altitude = Math.max(0, pad.y - (rocket.y + rocket.h / 2));

    altitudeEl.textContent = altitude.toFixed(0);
    fuelEl.textContent = rocket.fuel.toFixed(0);
    vSpeedEl.textContent = rocket.vy.toFixed(1);
    hSpeedEl.textContent = rocket.vx.toFixed(1);

    var normalizedAngle = ((rocket.angle % 360) + 360) % 360;
    if (normalizedAngle > 180) {
      normalizedAngle -= 360;
    }
    angleEl.textContent = normalizedAngle.toFixed(1);

    if (!rocket.landed && !rocket.crashed) {
      if (rocket.fuel <= 0) {
        statusEl.textContent = 'Out of fuel';
      } else if (rocket.thrusting) {
        statusEl.textContent = 'Burning';
      } else {
        statusEl.textContent = 'Coasting';
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPad();
    drawRocket();
    updateHud();
  }

  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();

(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var altitudeEl = document.getElementById('altitude');
  var velocityEl = document.getElementById('velocity');
  var fuelEl = document.getElementById('fuel');
  var statusEl = document.getElementById('status');

  var gravity = 220; // px/s^2
  var thrustPower = 380; // px/s^2
  var fuelBurnRate = 22; // % per second

  var rocket = {
    x: canvas.width / 2,
    y: 120,
    w: 18,
    h: 40,
    vy: 0,
    fuel: 100,
    thrusting: false,
    landed: false,
    crashed: false
  };

  var last = performance.now();

  function resetGame() {
    rocket.x = canvas.width / 2;
    rocket.y = 120;
    rocket.vy = 0;
    rocket.fuel = 100;
    rocket.thrusting = false;
    rocket.landed = false;
    rocket.crashed = false;
    statusEl.textContent = 'Flying';
  }

  function onKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      rocket.thrusting = true;
    } else if (e.code === 'KeyR') {
      resetGame();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      rocket.thrusting = false;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function update(dt) {
    if (rocket.landed || rocket.crashed) {
      return;
    }

    var accel = gravity;

    if (rocket.thrusting && rocket.fuel > 0) {
      accel -= thrustPower;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * dt);
    }

    rocket.vy += accel * dt;
    rocket.y += rocket.vy * dt;

    var groundY = canvas.height * 0.58;
    var rocketBottom = rocket.y + rocket.h / 2;

    if (rocketBottom >= groundY) {
      rocket.y = groundY - rocket.h / 2;

      if (Math.abs(rocket.vy) <= 70) {
        rocket.landed = true;
        statusEl.textContent = 'Safe landing';
      } else {
        rocket.crashed = true;
        statusEl.textContent = 'Crashed';
      }

      rocket.vy = 0;
      rocket.thrusting = false;
    }
  }

  function drawGround() {
    var groundY = canvas.height * 0.58;
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, groundY - 3, canvas.width, 3);
  }

  function drawRocket() {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);

    ctx.fillStyle = rocket.crashed ? '#ef4444' : '#e2e8f0';
    ctx.fillRect(-rocket.w / 2, -rocket.h / 2, rocket.w, rocket.h);

    ctx.beginPath();
    ctx.moveTo(-rocket.w / 2, -rocket.h / 2);
    ctx.lineTo(0, -rocket.h / 2 - 14);
    ctx.lineTo(rocket.w / 2, -rocket.h / 2);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-3, -6, 6, 10);

    if (rocket.thrusting && rocket.fuel > 0 && !rocket.landed && !rocket.crashed) {
      ctx.beginPath();
      ctx.moveTo(-5, rocket.h / 2);
      ctx.lineTo(0, rocket.h / 2 + 20 + Math.random() * 8);
      ctx.lineTo(5, rocket.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#f97316';
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHud() {
    var groundY = canvas.height * 0.58;
    var altitude = Math.max(0, groundY - (rocket.y + rocket.h / 2));

    altitudeEl.textContent = altitude.toFixed(0);
    velocityEl.textContent = rocket.vy.toFixed(1);
    fuelEl.textContent = rocket.fuel.toFixed(0);

    if (!rocket.landed && !rocket.crashed) {
      if (rocket.fuel <= 0) {
        statusEl.textContent = 'Out of fuel';
      } else if (rocket.thrusting) {
        statusEl.textContent = 'Thrusting';
      } else {
        statusEl.textContent = 'Falling';
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGround();
    drawRocket();
    updateHud();
  }

  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();
> main
