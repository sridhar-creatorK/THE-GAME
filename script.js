(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  var altitudeEl = document.getElementById('altitude');
  var velocityEl = document.getElementById('velocity');
  var angleEl = document.getElementById('angle');
  var statusEl = document.getElementById('status');
  var fuelEl = document.getElementById('fuel');
  var fuelBarEl = document.getElementById('fuelBar');

  var WORLD_W = 900;
  var GROUND_Y = 1200;

  // Physics tuning (control + feel)
  var gravity = 0.075;
  var thrustPower = 0.14;
  var fuelBurnRate = 10;
  var rotationAcceleration = 0.002;
  var rotationDamping = 0.95;
  var maxRotationSpeed = 0.04;
  var airDamping = 0.999;

  var rocket = {
    x: WORLD_W * 0.5,
    y: 220,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    thrustLevel: 0,
    width: 24,
    height: 74,
    fuel: 100,
    thrusting: false,
    rotateLeft: false,
    rotateRight: false,
    landed: false,
    crashed: false
  };

  var pad = { x: WORLD_W * 0.5 - 70, y: GROUND_Y - 8, w: 140, h: 8 };
  var camera = { x: rocket.x, y: rocket.y };
  var stars = [];
  var particles = [];
  var i;

  for (i = 0; i < 150; i += 1) {
    stars.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * (GROUND_Y - 120),
      r: 0.5 + Math.random() * 1.3,
      a: 0.25 + Math.random() * 0.6
    });
  }

  function resetGame() {
    rocket.x = WORLD_W * 0.5;
    rocket.y = 220;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.angularVelocity = 0;
    rocket.thrustLevel = 0;
    rocket.fuel = 100;
    rocket.thrusting = false;
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

  function keyUp(e) {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
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

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  function spawnExplosion() {
    var p;
    for (p = 0; p < 45; p += 1) {
      var a = Math.random() * Math.PI * 2;
      var speed = 35 + Math.random() * 220;
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

  function updateParticles(dt) {
    var p;
    for (p = particles.length - 1; p >= 0; p -= 1) {
      particles[p].life -= dt;
      particles[p].x += particles[p].vx * dt;
      particles[p].y += particles[p].vy * dt;
      particles[p].vy += 25 * dt;
      particles[p].vx *= 0.988;
      if (particles[p].life <= 0) {
        particles.splice(p, 1);
      }
    }
  }

  function update(dt) {
    updateParticles(dt);

    if (rocket.landed || rocket.crashed) {
      return;
    }

    var dtMs = dt * 1000;

    // Heavy, damped rotation using angular velocity.
    if (rocket.rotateLeft) {
      rocket.angularVelocity -= rotationAcceleration * dtMs;
    }
    if (rocket.rotateRight) {
      rocket.angularVelocity += rotationAcceleration * dtMs;
    }

    if (rocket.angularVelocity > maxRotationSpeed) {
      rocket.angularVelocity = maxRotationSpeed;
    } else if (rocket.angularVelocity < -maxRotationSpeed) {
      rocket.angularVelocity = -maxRotationSpeed;
    }

    rocket.angularVelocity *= rotationDamping;
    rocket.angle += rocket.angularVelocity * dtMs;

    // Smooth throttle spool up/down (prevents instant full thrust)
    if (rocket.thrusting && rocket.fuel > 0) {
      rocket.thrustLevel = Math.min(1, rocket.thrustLevel + dt * 2.2);
    } else {
      rocket.thrustLevel = Math.max(0, rocket.thrustLevel - dt * 2.8);
    }

    var ax = 0;
    var ay = gravity;

    if (rocket.thrustLevel > 0 && rocket.fuel > 0) {
      var thrust = thrustPower * rocket.thrustLevel;
      ax += Math.sin(rocket.angle) * thrust;
      ay -= Math.cos(rocket.angle) * thrust;
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurnRate * dt * rocket.thrustLevel);
    }

    rocket.vx += ax * dtMs;
    rocket.vy += ay * dtMs;

    // Stability damping (air resistance)
    rocket.vx *= Math.pow(airDamping, dtMs);
    rocket.vy *= Math.pow(airDamping, dtMs);

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    if (rocket.x < rocket.width * 0.5) {
      rocket.x = rocket.width * 0.5;
      rocket.vx = 0;
    } else if (rocket.x > WORLD_W - rocket.width * 0.5) {
      rocket.x = WORLD_W - rocket.width * 0.5;
      rocket.vx = 0;
    }

    var bottom = rocket.y + rocket.height * 0.5;
    if (bottom >= pad.y) {
      rocket.y = pad.y - rocket.height * 0.5;
      var speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
      var onPad = rocket.x > pad.x && rocket.x < pad.x + pad.w;
      var upright = Math.abs(normAngleDeg(rocket.angle)) < 8;

      if (onPad && speed < 26 && upright) {
        rocket.landed = true;
        statusEl.textContent = 'Successful Landing';
      } else {
        rocket.crashed = true;
        statusEl.textContent = 'Crashed';
        spawnExplosion();
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.angularVelocity = 0;
      rocket.thrusting = false;
      rocket.thrustLevel = 0;
    }

    camera.x += (rocket.x - camera.x) * 0.08;
    camera.y += (rocket.y - camera.y) * 0.08;
  }

  function worldToScreenX(x) {
    return x - camera.x + canvas.width / 2;
  }

  function worldToScreenY(y) {
    return y - camera.y + canvas.height / 2;
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
    var gy = worldToScreenY(GROUND_Y);
    var py = worldToScreenY(pad.y);

    ctx.fillStyle = '#2b4d2a';
    ctx.fillRect(0, gy, canvas.width, canvas.height - gy);

    var px = worldToScreenX(pad.x);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(px, py, pad.w, pad.h);
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

    if (rocket.thrustLevel > 0.05 && rocket.fuel > 0 && !rocket.landed) {
      var flame = 8 + Math.random() * 10 * rocket.thrustLevel;
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
    var altitude = Math.max(0, GROUND_Y - (rocket.y + rocket.height * 0.5));
    var velocity = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);

    altitudeEl.textContent = altitude.toFixed(0) + ' m';
    velocityEl.textContent = velocity.toFixed(1) + ' m/s';
    angleEl.textContent = normAngleDeg(rocket.angle).toFixed(1) + '°';
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

  var last = performance.now();
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
