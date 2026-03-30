(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var menuBtn = document.getElementById('menuBtn');
  var clearBtn = document.getElementById('clearBtn');
  var launchBtn = document.getElementById('launchBtn');
  var modeLabel = document.getElementById('modeLabel');
  var partButtons = Array.prototype.slice.call(document.querySelectorAll('.part-btn'));

  var mode = 'BUILD';
  var selectedPart = 'engine';
  var placedParts = [];

  var PARTS = {
    engine: { width: 24, height: 16, mass: 320, thrust: 9000, fuel: 0, color: '#f97316' },
    tank: { width: 26, height: 44, mass: 620, thrust: 0, fuel: 45, color: '#64748b' },
    capsule: { width: 28, height: 22, mass: 260, thrust: 0, fuel: 0, color: '#f1f5f9' },
    legs: { width: 40, height: 12, mass: 120, thrust: 0, fuel: 0, color: '#22c55e' },
    solar: { width: 56, height: 8, mass: 90, thrust: 0, fuel: 0, color: '#38bdf8' }
  };

  var rocket = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    av: 0,
    throttle: 0,
    throttleUp: false,
    throttleDown: false,
    left: false,
    right: false,
    mass: 1400,
    thrust: 10000,
    fuel: 60,
    maxFuel: 60,
    width: 26,
    height: 80
  };

  var gravity = 9.81;
  var drag = 0.015;
  var ppm = 4.5;
  var camX = 0;
  var camY = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setPart(type) {
    selectedPart = type;
    partButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-part') === type);
    });
  }

  function placePartAt(x, y) {
    var def = PARTS[selectedPart];
    var snapX = Math.round(x / 8) * 8;

    if (placedParts.length > 0) {
      var top = placedParts[placedParts.length - 1];
      y = top.y - top.def.height / 2 - def.height / 2;
      snapX = top.x;
    }

    placedParts.push({ type: selectedPart, x: snapX, y: y, def: def });
  }

  function clearBuild() {
    placedParts = [];
  }

  function computeStats() {
    var mass = 900;
    var thrust = 0;
    var fuel = 12;
    var p;
    for (p = 0; p < placedParts.length; p += 1) {
      mass += placedParts[p].def.mass;
      thrust += placedParts[p].def.thrust;
      fuel += placedParts[p].def.fuel;
    }
    rocket.mass = mass;
    rocket.thrust = Math.max(4000, thrust);
    rocket.fuel = fuel;
    rocket.maxFuel = fuel;
  }

  function launch() {
    computeStats();
    rocket.x = 0;
    rocket.y = -20;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.av = 0;
    rocket.throttle = 0;
    camX = rocket.x;
    camY = rocket.y;
    mode = 'FLIGHT';
    modeLabel.textContent = 'FLIGHT MODE';
  }

  function getGroundY(x) {
    return 300 + Math.sin(x * 0.02) * 22 + Math.sin(x * 0.07) * 7;
  }

  function updateFlight(dt) {
    if (rocket.throttleUp && rocket.fuel > 0) {
      rocket.throttle = Math.min(1, rocket.throttle + dt * 0.8);
    }
    if (rocket.throttleDown) {
      rocket.throttle = Math.max(0, rocket.throttle - dt * 0.9);
    }

    if (rocket.left) {
      rocket.av -= dt * 1.25;
    }
    if (rocket.right) {
      rocket.av += dt * 1.25;
    }

    rocket.av *= 0.95;
    rocket.angle += rocket.av * dt;

    var fx = Math.sin(rocket.angle) * rocket.thrust * rocket.throttle;
    var fy = rocket.mass * gravity - Math.cos(rocket.angle) * rocket.thrust * rocket.throttle;

    if (rocket.throttle > 0 && rocket.fuel > 0) {
      rocket.fuel = Math.max(0, rocket.fuel - dt * rocket.throttle * 0.6);
    }

    fx += -drag * rocket.vx;
    fy += -drag * rocket.vy;

    rocket.vx += (fx / rocket.mass) * dt;
    rocket.vy += (fy / rocket.mass) * dt;
    rocket.x += rocket.vx * dt * 60;
    rocket.y += rocket.vy * dt * 60;

    var groundY = getGroundY(rocket.x);
    var bottom = rocket.y + rocket.height / 2;
    if (bottom >= groundY && rocket.vy > 0) {
      rocket.y = groundY - rocket.height / 2;
      rocket.vx = 0;
      rocket.vy = 0;
      rocket.throttle = 0;
    }

    camX += (rocket.x - camX) * 0.08;
    camY += (rocket.y - camY) * 0.08;
  }

  function drawBuild() {
    ctx.fillStyle = '#0a1428';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    var gx;
    for (gx = 0; gx < canvas.width; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }

    var gy;
    for (gy = 0; gy < canvas.height; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    var i;
    for (i = 0; i < placedParts.length; i += 1) {
      var part = placedParts[i];
      var x = canvas.width * 0.5 + part.x;
      var y = canvas.height * 0.75 - (placedParts.length - 1 - i) * 26;
      ctx.fillStyle = part.def.color;
      ctx.fillRect(x - part.def.width / 2, y - part.def.height / 2, part.def.width, part.def.height);
    }
  }

  function drawFlight() {
    ctx.fillStyle = '#050b17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var i;
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < 70; i += 1) {
      var sx = (i * 73) % canvas.width;
      var sy = (i * 131) % canvas.height;
      ctx.fillRect(sx, sy, 1, 1);
    }

    ctx.save();
    ctx.translate(canvas.width / 2 - camX, canvas.height / 2 - camY);

    ctx.fillStyle = '#355e3b';
    ctx.beginPath();
    ctx.moveTo(-10000, getGroundY(-10000));
    for (i = -1000; i <= 1000; i += 8) {
      ctx.lineTo(i, getGroundY(i));
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
    if (rocket.throttle > 0 && rocket.fuel > 0) {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-4, 30);
      ctx.lineTo(0, 44 + Math.random() * 8);
      ctx.lineTo(4, 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    modeLabel.textContent = 'FLIGHT MODE | Fuel ' + rocket.fuel.toFixed(0) + '%';
  }

  function render() {
    if (mode === 'BUILD') {
      drawBuild();
      modeLabel.textContent = 'BUILD MODE';
    } else {
      drawFlight();
    }
  }

  function loop(now) {
    if (!loop.last) {
      loop.last = now;
    }
    var dt = Math.min((now - loop.last) / 1000, 0.033);
    loop.last = now;

    if (mode === 'FLIGHT') {
      updateFlight(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  partButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setPart(btn.getAttribute('data-part'));
    });
  });

  canvas.addEventListener('click', function (e) {
    if (mode !== 'BUILD') {
      return;
    }
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left - rect.width * 0.5;
    var y = e.clientY - rect.top;
    placePartAt(x, y);
  });

  menuBtn.addEventListener('click', function () {
    mode = 'BUILD';
  });
  clearBtn.addEventListener('click', clearBuild);
  launchBtn.addEventListener('click', launch);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyB') {
      mode = 'BUILD';
    } else if (e.code === 'KeyC') {
      mode = 'FLIGHT';
    } else if (e.code === 'KeyW') {
      rocket.throttleUp = true;
    } else if (e.code === 'KeyS') {
      rocket.throttleDown = true;
    } else if (e.code === 'KeyA') {
      rocket.left = true;
    } else if (e.code === 'KeyD') {
      rocket.right = true;
    } else if (e.code === 'KeyR') {
      launch();
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'KeyW') {
      rocket.throttleUp = false;
    } else if (e.code === 'KeyS') {
      rocket.throttleDown = false;
    } else if (e.code === 'KeyA') {
      rocket.left = false;
    } else if (e.code === 'KeyD') {
      rocket.right = false;
    }
  });

  resize();
  setPart(selectedPart);
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
