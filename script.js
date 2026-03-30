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
