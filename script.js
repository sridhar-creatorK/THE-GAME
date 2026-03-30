(function () {
  // ---------------------------
  // DOM
  // ---------------------------
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var menuBtn = document.getElementById('menuBtn');
  var clearBtn = document.getElementById('clearBtn');
  var launchBtn = document.getElementById('launchBtn');
  var modeLabel = document.getElementById('modeLabel');
  var partsPanel = document.getElementById('partsPanel');
  var partButtons = Array.prototype.slice.call(document.querySelectorAll('.part-btn'));

  // ---------------------------
  // Game state
  // ---------------------------
  var gameState = 'BUILD'; // BUILD | FLIGHT
  var flightState = 'FLYING'; // FLYING | LANDED | CRASHED
  var selectedPartType = 'engine';

  // ---------------------------
  // Build system
  // ---------------------------
  var PARTS = {
    engine: { type: 'engine', width: 28, height: 16, color: '#f97316', mass: 380, thrust: 9000, fuel: 0 },
    tank: { type: 'tank', width: 30, height: 50, color: '#64748b', mass: 650, thrust: 0, fuel: 60 },
    capsule: { type: 'capsule', width: 30, height: 24, color: '#f8fafc', mass: 260, thrust: 0, fuel: 0 },
    legs: { type: 'legs', width: 44, height: 12, color: '#22c55e', mass: 130, thrust: 0, fuel: 0 },
    solar: { type: 'solar', width: 62, height: 10, color: '#38bdf8', mass: 90, thrust: 0, fuel: 0 }
  };

  var builtRocket = [];
  var dragState = { active: false, index: -1, dx: 0, dy: 0 };

  // ---------------------------
  // Flight system
  // ---------------------------
  var rocket = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    throttle: 0,
    throttleUp: false,
    throttleDown: false,
    rotateLeft: false,
    rotateRight: false,
    mass: 1200,
    thrust: 9000,
    fuel: 50,
    maxFuel: 50,
    width: 34,
    height: 90
  };

  var gravity = 9.81;
  var dragCoeff = 0.016;
  var angularDamping = 0.93;
  var cameraX = 0;
  var cameraY = 0;

  function getTerrainY(x) {
    return 340 + Math.sin(x * 0.012) * 16 + Math.sin(x * 0.035) * 8;
  }

  // ---------------------------
  // Canvas sizing
  // ---------------------------
  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  function setSelectedPart(type) {
    selectedPartType = type;
    partButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-part') === type);
    });
  }

  function updateUIState() {
    partsPanel.style.opacity = gameState === 'BUILD' ? '1' : '0.45';
    partsPanel.style.pointerEvents = gameState === 'BUILD' ? 'auto' : 'none';

    if (gameState === 'BUILD') {
      modeLabel.textContent = 'BUILD MODE';
    } else {
      if (flightState === 'FLYING') {
        modeLabel.textContent = 'FLIGHT MODE | Fuel ' + rocket.fuel.toFixed(0) + '%';
      } else if (flightState === 'LANDED') {
        modeLabel.textContent = 'SAFE LANDING / HARD LANDING | Press Menu to Build';
      } else {
        modeLabel.textContent = 'CRASHED | Press Menu to Build';
      }
    }
  }

  function getMouseCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function findPartAt(px, py) {
    var i;
    for (i = builtRocket.length - 1; i >= 0; i -= 1) {
      var p = builtRocket[i];
      var left = p.x - p.def.width / 2;
      var right = p.x + p.def.width / 2;
      var top = p.y - p.def.height / 2;
      var bottom = p.y + p.def.height / 2;
      if (px >= left && px <= right && py >= top && py <= bottom) {
        return i;
      }
    }
    return -1;
  }

  // ---------------------------
  // Build interactions
  // ---------------------------
  function placePart(px, py) {
    var def = PARTS[selectedPartType];
    builtRocket.push({
      type: selectedPartType,
      def: def,
      x: px,
      y: py
    });
  }

  function clearBuild() {
    builtRocket = [];
  }

  function computeRocketFromBuild() {
    var mass = 900;
    var thrust = 0;
    var fuel = 20;
    var i;

    for (i = 0; i < builtRocket.length; i += 1) {
      mass += builtRocket[i].def.mass;
      thrust += builtRocket[i].def.thrust;
      fuel += builtRocket[i].def.fuel;
    }

    rocket.mass = mass;
    rocket.thrust = Math.max(5000, thrust);
    rocket.fuel = fuel;
    rocket.maxFuel = fuel;
  }

  function startFlight() {
    computeRocketFromBuild();
    rocket.x = 0;
    rocket.y = 120;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.angularVelocity = 0;
    rocket.throttle = 0;
    rocket.throttleUp = false;
    rocket.throttleDown = false;
    rocket.rotateLeft = false;
    rocket.rotateRight = false;
    cameraX = rocket.x;
    cameraY = rocket.y;
    flightState = 'FLYING';
    gameState = 'FLIGHT';
  }

  // ---------------------------
  // Flight update
  // ---------------------------
  function updateFlight(dt) {
    if (flightState !== 'FLYING') {
      return;
    }

    if (rocket.throttleUp && rocket.fuel > 0) {
      rocket.throttle = Math.min(1, rocket.throttle + 0.8 * dt);
    }
    if (rocket.throttleDown) {
      rocket.throttle = Math.max(0, rocket.throttle - 0.9 * dt);
    }

    if (rocket.rotateLeft) {
      rocket.angularVelocity -= 1.3 * dt;
    }
    if (rocket.rotateRight) {
      rocket.angularVelocity += 1.3 * dt;
    }

    rocket.angularVelocity *= angularDamping;
    rocket.angle += rocket.angularVelocity;

    var fx = 0;
    var fy = rocket.mass * gravity;

    if (rocket.throttle > 0 && rocket.fuel > 0) {
      var thrustForce = rocket.thrust * rocket.throttle;
      fx += Math.sin(rocket.angle) * thrustForce;
      fy += -Math.cos(rocket.angle) * thrustForce;
      rocket.fuel = Math.max(0, rocket.fuel - 0.65 * rocket.throttle * dt * 60);
    }

    fx += -dragCoeff * rocket.vx;
    fy += -dragCoeff * rocket.vy;

    rocket.vx += (fx / rocket.mass) * dt * 60;
    rocket.vy += (fy / rocket.mass) * dt * 60;

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    var terrainY = getTerrainY(rocket.x);
    var bottom = rocket.y + rocket.height / 2;
    if (bottom >= terrainY && rocket.vy > 0) {
      rocket.y = terrainY - rocket.height / 2;

      var impactSpeed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
      if (impactSpeed <= 7) {
        flightState = 'LANDED';
      } else if (impactSpeed <= 13) {
        flightState = 'LANDED';
      } else {
        flightState = 'CRASHED';
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.throttle = 0;
    }

    cameraX += (rocket.x - cameraX) * 0.09;
    cameraY += (rocket.y - cameraY) * 0.09;
  }

  // ---------------------------
  // Rendering
  // ---------------------------
  function drawBuildMode() {
    ctx.fillStyle = '#0a1428';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.strokeStyle = '#1e293b';
    var x;
    for (x = 0; x < canvas.clientWidth; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.clientHeight);
      ctx.stroke();
    }

    var y;
    for (y = 0; y < canvas.clientHeight; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.clientWidth, y);
      ctx.stroke();
    }

    var i;
    for (i = 0; i < builtRocket.length; i += 1) {
      var part = builtRocket[i];
      ctx.fillStyle = part.def.color;
      ctx.fillRect(part.x - part.def.width / 2, part.y - part.def.height / 2, part.def.width, part.def.height);
    }
  }

  function drawFlightMode() {
    ctx.fillStyle = '#050b17';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.save();
    ctx.translate(canvas.clientWidth / 2 - cameraX, canvas.clientHeight / 2 - cameraY);

    ctx.fillStyle = '#355e3b';
    ctx.beginPath();
    ctx.moveTo(-10000, getTerrainY(-10000));
    var i;
    for (i = -2000; i <= 2000; i += 8) {
      ctx.lineTo(i, getTerrainY(i));
    }
    ctx.lineTo(10000, 10000);
    ctx.lineTo(-10000, 10000);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(rocket.angle);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-10, -30, 20, 60);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(0, -45);
    ctx.lineTo(10, -30);
    ctx.closePath();
    ctx.fill();

    if (rocket.throttle > 0 && rocket.fuel > 0 && flightState === 'FLYING') {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-4, 30);
      ctx.lineTo(0, 45 + Math.random() * 8);
      ctx.lineTo(4, 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  function render() {
    if (gameState === 'BUILD') {
      drawBuildMode();
    } else {
      drawFlightMode();
    }
    updateUIState();
  }

  // ---------------------------
  // Input wiring
  // ---------------------------
  partButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setSelectedPart(btn.getAttribute('data-part'));
    });
  });

  canvas.addEventListener('mousedown', function (e) {
    if (gameState !== 'BUILD') {
      return;
    }
    var pos = getMouseCanvasPos(e);
    var idx = findPartAt(pos.x, pos.y);
    if (idx >= 0) {
      dragState.active = true;
      dragState.index = idx;
      dragState.dx = builtRocket[idx].x - pos.x;
      dragState.dy = builtRocket[idx].y - pos.y;
    } else {
      placePart(pos.x, pos.y);
    }
  });

  canvas.addEventListener('mousemove', function (e) {
    if (!dragState.active || gameState !== 'BUILD') {
      return;
    }
    var pos = getMouseCanvasPos(e);
    var part = builtRocket[dragState.index];
    if (!part) {
      return;
    }
    part.x = pos.x + dragState.dx;
    part.y = pos.y + dragState.dy;
  });

  window.addEventListener('mouseup', function () {
    dragState.active = false;
    dragState.index = -1;
  });

  menuBtn.addEventListener('click', function () {
    gameState = 'BUILD';
  });
  clearBtn.addEventListener('click', clearBuild);
  launchBtn.addEventListener('click', startFlight);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyW') {
      rocket.throttleUp = true;
    } else if (e.code === 'KeyS') {
      rocket.throttleDown = true;
    } else if (e.code === 'KeyA') {
      rocket.rotateLeft = true;
    } else if (e.code === 'KeyD') {
      rocket.rotateRight = true;
    } else if (e.code === 'KeyB') {
      gameState = 'BUILD';
    } else if (e.code === 'KeyC') {
      if (gameState === 'BUILD') {
        gameState = 'FLIGHT';
      }
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'KeyW') {
      rocket.throttleUp = false;
    } else if (e.code === 'KeyS') {
      rocket.throttleDown = false;
    } else if (e.code === 'KeyA') {
      rocket.rotateLeft = false;
    } else if (e.code === 'KeyD') {
      rocket.rotateRight = false;
    }
  });

  // ---------------------------
  // Loop
  // ---------------------------
  function loop(ts) {
    if (!loop.last) {
      loop.last = ts;
    }
    var dt = Math.min((ts - loop.last) / 1000, 0.033);
    loop.last = ts;

    if (gameState === 'FLIGHT') {
      updateFlight(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  setSelectedPart(selectedPartType);
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(loop);
})();
