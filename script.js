(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var altitudeEl = document.getElementById('altitude');
  var fuelEl = document.getElementById('fuel');
  var vSpeedEl = document.getElementById('vSpeed');
  var hSpeedEl = document.getElementById('hSpeed');
  var angleEl = document.getElementById('angle');
  var statusEl = document.getElementById('status');
  var fuelBarEl = document.getElementById('fuelBar');

  var gravity = 80;
  var thrustPower = 195;
  var rotationSpeed = 130;
  var fuelBurnRate = 15;
  var airDrag = 0.018;

  var terrainY = canvas.height * 0.74;
  var landingPad = {
    x: canvas.width / 2 - 45,
    y: terrainY - 6,
    w: 90,
    h: 6
  };

  var rocket = {
    x: canvas.width / 2,
    y: 100,
    w: 16,
    h: 44,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: 100,
    thrusting: false,
    left: false,
    right: false,
    landed: false,
    crashed: false
  };

  var stars = [];
  var i;
  for (i = 0; i < 60; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (terrainY - 60),
      r: 0.5 + Math.random() * 1.5
    });
  }

  var lastTime = performance.now();

  function resetGame() {
    rocket.x = canvas.width * 0.5;
    rocket.y = 100;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.fuel = 100;
    rocket.thrusting = false;
    rocket.left = false;
    rocket.right = false;
    rocket.landed = false;
    rocket.crashed = false;
    statusEl.textContent = 'Ready';
  }

  function normalizeAngle(value) {
    var n = ((value % 360) + 360) % 360;
    if (n > 180) {
      n -= 360;
    }
    return n;
  }

  function onKeyDown(event) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      rocket.thrusting = true;
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      rocket.left = true;
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      rocket.right = true;
    } else if (event.code === 'KeyR') {
      resetGame();
    }
  }

  function onKeyUp(event) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      rocket.thrusting = false;
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      rocket.left = false;
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      rocket.right = false;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function updatePhysics(dt) {
    if (rocket.landed || rocket.crashed) {
      return;
    }

    if (rocket.left) {
      rocket.angle -= rotationSpeed * dt;
    }
    if (rocket.right) {
      rocket.angle += rotationSpeed * dt;
    }

    var ax = 0;
    var ay = gravity;

    if (rocket.thrusting && rocket.fuel > 0) {
      var rad = (rocket.angle * Math.PI) / 180;
      ax += Math.sin(rad) * thrustPower;
      ay -= Math.cos(rad) * thrustPower;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * dt);
    }

    rocket.vx += ax * dt;
    rocket.vy += ay * dt;

    rocket.vx *= 1 - airDrag * dt * 60;
    rocket.vy *= 1 - airDrag * dt * 22;

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    if (rocket.x < rocket.w / 2) {
      rocket.x = rocket.w / 2;
      rocket.vx = 0;
    } else if (rocket.x > canvas.width - rocket.w / 2) {
      rocket.x = canvas.width - rocket.w / 2;
      rocket.vx = 0;
    }

    var bottom = rocket.y + rocket.h / 2;
    if (bottom >= landingPad.y) {
      rocket.y = landingPad.y - rocket.h / 2;

      var angleAbs = Math.abs(normalizeAngle(rocket.angle));
      var inPad = rocket.x > landingPad.x && rocket.x < landingPad.x + landingPad.w;
      var safeV = Math.abs(rocket.vy) <= 30;
      var safeH = Math.abs(rocket.vx) <= 18;
      var safeAngle = angleAbs <= 8;

      if (inPad && safeV && safeH && safeAngle) {
        rocket.landed = true;
        statusEl.textContent = 'Successful landing';
      } else {
        rocket.crashed = true;
        statusEl.textContent = inPad ? 'Hard landing - crashed' : 'Missed pad - crashed';
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.thrusting = false;
    }
  }

  function drawSky() {
    var s;
    ctx.fillStyle = '#f8fafc';
    for (s = 0; s < stars.length; s += 1) {
      ctx.beginPath();
      ctx.arc(stars[s].x, stars[s].y, stars[s].r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTerrainAndPad() {
    ctx.fillStyle = '#355e3b';
    ctx.fillRect(0, terrainY, canvas.width, canvas.height - terrainY);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(landingPad.x, landingPad.y, landingPad.w, landingPad.h);

    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(landingPad.x + 8, landingPad.y - 10, 10, 4);
    ctx.fillRect(landingPad.x + landingPad.w - 18, landingPad.y - 10, 10, 4);
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

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -8, 6, 12);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-rocket.w / 2 - 3, rocket.h / 2 - 10, 3, 10);
    ctx.fillRect(rocket.w / 2, rocket.h / 2 - 10, 3, 10);

    if (rocket.thrusting && rocket.fuel > 0 && !rocket.landed && !rocket.crashed) {
      ctx.beginPath();
      ctx.moveTo(-5, rocket.h / 2);
      ctx.lineTo(0, rocket.h / 2 + 20 + Math.random() * 8);
      ctx.lineTo(5, rocket.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHud() {
    var altitude = Math.max(0, landingPad.y - (rocket.y + rocket.h / 2));
    var angle = normalizeAngle(rocket.angle);

    altitudeEl.textContent = altitude.toFixed(0);
    fuelEl.textContent = rocket.fuel.toFixed(0);
    vSpeedEl.textContent = rocket.vy.toFixed(1);
    hSpeedEl.textContent = rocket.vx.toFixed(1);
    angleEl.textContent = angle.toFixed(1);

    fuelBarEl.style.width = rocket.fuel.toFixed(2) + '%';

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
    drawSky();
    drawTerrainAndPad();
    drawRocket();
    updateHud();
  }

  function loop(now) {
    var dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    updatePhysics(dt);
    render();

    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();
