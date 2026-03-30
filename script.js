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
  var menuSceneEl = document.getElementById('menuScene');
  var buildSceneEl = document.getElementById('buildScene');
  var postFlightSceneEl = document.getElementById('postFlightScene');
  var postFlightTextEl = document.getElementById('postFlightText');
  var startBuildBtn = document.getElementById('startBuildBtn');
  var addEngineBtn = document.getElementById('addEngineBtn');
  var addFuelBtn = document.getElementById('addFuelBtn');
  var launchBtn = document.getElementById('launchBtn');
  var returnBuildBtn = document.getElementById('returnBuildBtn');
  var engineCountEl = document.getElementById('engineCount');
  var fuelTankCountEl = document.getElementById('fuelTankCount');

  var PIXELS_PER_METER = 5.2;
  var WORLD_W_M = 170;
  var GROUND_Y_M = 240;

  var gravity = 9.81;
  var rocketMass = 1800;
  var thrustForce = 22000;
  var fuelBurnRate = 0.55;

  var linearDragCoeff = 0.01;
  var angularDragCoeff = 0.4;
  var baseRotationAcceleration = 0.9;

  var state = 'READY'; // READY | FLYING | CRASHED
  var readyStatus = 'Ready';
  var scene = 'MENU'; // MENU | BUILD | FLIGHT

  var buildConfig = {
    engines: 1,
    fuelTanks: 1
  };

  var rocket = {
    x: WORLD_W_M * 0.5,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    throttle: 0,
    widthM: 4.6,
    heightM: 14,
    maxFuel: 100,
    fuel: 100,
    throttleUp: false,
    throttleDown: false,
    rotateLeft: false,
    rotateRight: false
  };

  var pad = { x: WORLD_W_M * 0.5 - 12, y: GROUND_Y_M - 1.2, w: 24, h: 1.2 };
  var camera = { x: rocket.x, y: rocket.y };
  var stars = [];
  var particles = [];
  var rotationSensitivity = 1;
  var zoom = 1;
  var targetZoom = 1;

  var i;
  for (i = 0; i < 150; i += 1) {
    stars.push({
      x: Math.random() * WORLD_W_M,
      y: Math.random() * (GROUND_Y_M - 30),
      r: 0.5 + Math.random() * 1.3,
      a: 0.25 + Math.random() * 0.6
    });
  }

  function getGroundY(x) {
    if (x >= pad.x && x <= pad.x + pad.w) {
      return pad.y;
    }
    return GROUND_Y_M + Math.sin(x * 0.08) * 2.2 + Math.sin(x * 0.027) * 4.8 + Math.sin(x * 0.19) * 0.7;
  }

  function resetGame() {
    rocket.x = WORLD_W_M * 0.5;
    rocket.y = getGroundY(rocket.x) - rocket.heightM * 0.5;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.angularVelocity = 0;
    rocket.throttle = 0;
    rocket.fuel = rocket.maxFuel;
    rocket.throttleUp = false;
    rocket.throttleDown = false;
    rocket.rotateLeft = false;
    rocket.rotateRight = false;
    state = 'READY';
    readyStatus = 'Ready';
    particles = [];
    statusEl.textContent = readyStatus;
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
    if (e.code === 'KeyW') {
      e.preventDefault();
      rocket.throttleUp = true;
    } else if (e.code === 'KeyS') {
      e.preventDefault();
      rocket.throttleDown = true;
    } else if (e.code === 'KeyA') {
      e.preventDefault();
      rocket.rotateLeft = true;
    } else if (e.code === 'KeyD') {
      e.preventDefault();
      rocket.rotateRight = true;
    } else if (e.code === 'KeyR') {
      resetGame();
    }
  }

  function keyUp(e) {
    if (e.code === 'KeyW') {
      e.preventDefault();
      rocket.throttleUp = false;
    } else if (e.code === 'KeyS') {
      e.preventDefault();
      rocket.throttleDown = false;
    } else if (e.code === 'KeyA') {
      e.preventDefault();
      rocket.rotateLeft = false;
    } else if (e.code === 'KeyD') {
      e.preventDefault();
      rocket.rotateRight = false;
    }
  }

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  rotationSensitivityEl.addEventListener('input', function () {
    rotationSensitivity = parseFloat(rotationSensitivityEl.value) || 1;
  });
  canvas.addEventListener('wheel', function (e) {
    if (scene !== 'FLIGHT') {
      return;
    }
    e.preventDefault();
    var step = e.deltaY > 0 ? -0.12 : 0.12;
    targetZoom = Math.max(0.3, Math.min(2.5, targetZoom + step));
  }, { passive: false });

  function spawnExplosion() {
    var p;
    for (p = 0; p < 45; p += 1) {
      var a = Math.random() * Math.PI * 2;
      var speed = 10 + Math.random() * 45;
      particles.push({ x: rocket.x, y: rocket.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.6 + Math.random() * 0.8, size: 2 + Math.random() * 3.5, c: Math.random() > 0.45 ? '#f97316' : '#ef4444' });
    }
  }

  function updateScenePanels() {
    menuSceneEl.classList.toggle('hidden', scene !== 'MENU');
    buildSceneEl.classList.toggle('hidden', scene !== 'BUILD');
    postFlightSceneEl.classList.toggle('hidden', !(scene === 'FLIGHT' && (state === 'READY' || state === 'CRASHED') && readyStatus !== 'Ready'));
    engineCountEl.textContent = buildConfig.engines;
    fuelTankCountEl.textContent = buildConfig.fuelTanks;
    if (state === 'CRASHED') {
      postFlightTextEl.textContent = 'Crashed';
    } else {
      postFlightTextEl.textContent = readyStatus;
    }
  }

  function getBuildStats() {
    return {
      mass: 1000 + buildConfig.engines * 320 + buildConfig.fuelTanks * 520,
      thrust: 9000 + buildConfig.engines * 7200,
      fuel: 30 + buildConfig.fuelTanks * 35
    };
  }

  function startFlightFromBuild() {
    var stats = getBuildStats();
    rocketMass = stats.mass;
    thrustForce = stats.thrust;
    rocket.maxFuel = stats.fuel;
    scene = 'FLIGHT';
    targetZoom = 1;
    resetGame();
    updateScenePanels();
  }

  startBuildBtn.addEventListener('click', function () {
    scene = 'BUILD';
    updateScenePanels();
  });
  addEngineBtn.addEventListener('click', function () {
    buildConfig.engines = Math.min(6, buildConfig.engines + 1);
    updateScenePanels();
  });
  addFuelBtn.addEventListener('click', function () {
    buildConfig.fuelTanks = Math.min(8, buildConfig.fuelTanks + 1);
    updateScenePanels();
  });
  launchBtn.addEventListener('click', function () {
    startFlightFromBuild();
  });
  returnBuildBtn.addEventListener('click', function () {
    scene = 'BUILD';
    readyStatus = 'Ready';
    updateScenePanels();
  });

  function updateParticles(dt) {
    var p;
    for (p = particles.length - 1; p >= 0; p -= 1) {
      particles[p].life -= dt;
      particles[p].x += particles[p].vx * dt;
      particles[p].y += particles[p].vy * dt;
      particles[p].vy += gravity * 0.45 * dt;
      if (particles[p].life <= 0) {
        particles.splice(p, 1);
      }
    }
  }

  function update(dt) {
    if (scene !== 'FLIGHT') {
      return;
    }
    updateParticles(dt);
    if (state === 'CRASHED') {
      return;
    }

    var rotationAccel = baseRotationAcceleration * rotationSensitivity;
    if (rocket.rotateLeft) {
      rocket.angularVelocity -= rotationAccel * dt;
    }
    if (rocket.rotateRight) {
      rocket.angularVelocity += rotationAccel * dt;
    }
    rocket.angularVelocity += -rocket.angularVelocity * angularDragCoeff * dt;
    rocket.angle += rocket.angularVelocity * dt;

    if (rocket.throttleUp && rocket.fuel > 0) {
      rocket.throttle = Math.min(1, rocket.throttle + 0.55 * dt);
    }
    if (rocket.throttleDown) {
      rocket.throttle = Math.max(0, rocket.throttle - 0.65 * dt);
    }

    var fx = 0;
    var fy = rocketMass * gravity;
    if (rocket.throttle > 0 && rocket.fuel > 0) {
      var currentThrust = thrustForce * rocket.throttle;
      fx += Math.sin(rocket.angle) * currentThrust;
      fy += -Math.cos(rocket.angle) * currentThrust;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * rocket.throttle * dt);
    }

    fx += -linearDragCoeff * rocket.vx;
    fy += -linearDragCoeff * rocket.vy;

    rocket.vx += (fx / rocketMass) * dt;
    rocket.vy += (fy / rocketMass) * dt;
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    var terrainY = getGroundY(rocket.x);
    var bottom = rocket.y + rocket.heightM * 0.5;
    var touchingGround = bottom >= terrainY;

    if (state === 'READY') {
      if (touchingGround) {
        rocket.y = terrainY - rocket.heightM * 0.5;
        if (rocket.vy > 0) {
          rocket.vy = 0;
        }
        rocket.vx = 0;
      }
      if (rocket.throttle > 0 && !touchingGround) {
        state = 'FLYING';
        readyStatus = 'Ready';
      }
    } else if (state === 'FLYING') {
      if (touchingGround && rocket.vy > 0) {
        rocket.y = terrainY - rocket.heightM * 0.5;

        var verticalSpeed = Math.abs(rocket.vy);
        var safeLanding = verticalSpeed <= 7;
        var hardLanding = verticalSpeed >= 13 && verticalSpeed <= 17;

        if (safeLanding) {
          state = 'READY';
          readyStatus = 'Successful Landing';
        } else if (hardLanding) {
          state = 'READY';
          readyStatus = 'Hard Landing';
        } else {
          state = 'CRASHED';
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
    }

    camera.x += (rocket.x - camera.x) * 0.1;
    camera.y += (rocket.y - camera.y) * 0.1;
    updateScenePanels();
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#020617');
    g.addColorStop(0.55, '#0a1d46');
    g.addColorStop(1, '#2f5532');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawStars() {
    var s;
    for (s = 0; s < stars.length; s += 1) {
      ctx.fillStyle = 'rgba(255,255,255,' + stars[s].a + ')';
      ctx.beginPath();
      ctx.arc(stars[s].x * PIXELS_PER_METER, stars[s].y * PIXELS_PER_METER, stars[s].r / zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld() {
    var startX = camera.x - canvas.width / PIXELS_PER_METER;
    var endX = camera.x + canvas.width / PIXELS_PER_METER;
    var step = 1.2;
    var x;

    ctx.fillStyle = '#2b4d2a';
    ctx.beginPath();
    ctx.moveTo(startX * PIXELS_PER_METER, canvas.height * 4);
    for (x = startX; x <= endX; x += step) {
      ctx.lineTo(x * PIXELS_PER_METER, getGroundY(x) * PIXELS_PER_METER);
    }
    ctx.lineTo(endX * PIXELS_PER_METER, canvas.height * 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(pad.x * PIXELS_PER_METER, pad.y * PIXELS_PER_METER, pad.w * PIXELS_PER_METER, pad.h * PIXELS_PER_METER);
  }

  function drawBuildPreview() {
    var cx = canvas.width / 2;
    var cy = canvas.height * 0.7;
    var i;
    ctx.fillStyle = '#64748b';
    for (i = 0; i < buildConfig.fuelTanks; i += 1) {
      ctx.fillRect(cx - 22, cy - 24 - i * 18, 44, 16);
    }
    ctx.fillStyle = '#334155';
    for (i = 0; i < buildConfig.engines; i += 1) {
      ctx.fillRect(cx - (buildConfig.engines * 7) / 2 + i * 7, cy - 6, 6, 10);
    }
  }

  function drawRocket() {
    if (state === 'CRASHED') {
      return;
    }

    var x = rocket.x * PIXELS_PER_METER;
    var y = rocket.y * PIXELS_PER_METER;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rocket.angle);
    ctx.scale(1.25, 1.25);

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

    if (rocket.throttle > 0.05 && rocket.fuel > 0 && state !== 'CRASHED') {
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
      ctx.globalAlpha = Math.max(0, particles[p].life);
      ctx.fillStyle = particles[p].c;
      ctx.beginPath();
      ctx.arc(particles[p].x * PIXELS_PER_METER, particles[p].y * PIXELS_PER_METER, particles[p].size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateHud() {
    var altitude = Math.max(0, getGroundY(rocket.x) - (rocket.y + rocket.heightM * 0.5));
    var totalVelocity = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);

    altitudeEl.textContent = altitude.toFixed(1) + ' m';
    velocityEl.textContent = totalVelocity.toFixed(2) + ' m/s';
    angleEl.textContent = normAngleDeg(rocket.angle).toFixed(1) + '°';
    throttleEl.textContent = (rocket.throttle * 100).toFixed(0) + '%';
    fuelEl.textContent = rocket.fuel.toFixed(0) + '%';
    fuelBarEl.style.width = rocket.fuel.toFixed(2) + '%';

    if (state === 'READY') {
      statusEl.textContent = readyStatus;
    } else if (state === 'FLYING') {
      statusEl.textContent = 'Flying';
    }
  }

  function render() {
    if (scene === 'MENU' || scene === 'BUILD') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();
      if (scene === 'BUILD') {
        drawBuildPreview();
      }
      updateHud();
      updateScenePanels();
      return;
    }

    zoom += (targetZoom - zoom) * 0.12;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    ctx.setTransform(
      zoom,
      0,
      0,
      zoom,
      canvas.width / 2 - camera.x * PIXELS_PER_METER * zoom,
      canvas.height / 2 - camera.y * PIXELS_PER_METER * zoom
    );

    drawStars();
    drawWorld();
    drawRocket();
    drawParticles();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    updateHud();
    updateScenePanels();
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
  updateScenePanels();
  requestAnimationFrame(loop);
})();
