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

  var gravity = 78;
  var thrustPower = 196;
  var rotationSpeed = 125;
  var fuelBurn = 15;
  var drag = 0.012;

  var groundY = canvas.height * 0.78;
  var landingPad = {
    x: canvas.width / 2 - 48,
    y: groundY - 8,
    w: 96,
    h: 8
  };

  var rocket = {
    x: canvas.width / 2,
    y: 120,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: 100,
    width: 18,
    height: 52,
    thrusting: false,
    left: false,
    right: false,
    landed: false,
    crashed: false
  };

  var stars = [];
  var particles = [];
  var i;

  for (i = 0; i < 75; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (groundY - 35),
      r: 0.4 + Math.random() * 1.3,
      a: 0.35 + Math.random() * 0.65
    });
  }

  function resetGame() {
    rocket.x = canvas.width / 2;
    rocket.y = 120;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angle = 0;
    rocket.fuel = 100;
    rocket.thrusting = false;
    rocket.left = false;
    rocket.right = false;
    rocket.landed = false;
    rocket.crashed = false;
    particles = [];
    statusEl.textContent = 'Flying';
  }

  function normAngle(a) {
    var n = ((a % 360) + 360) % 360;
    if (n > 180) {
      n -= 360;
    }
    return n;
  }

  function handleKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      rocket.thrusting = true;
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rocket.left = true;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      rocket.right = true;
    } else if (e.code === 'KeyR') {
      resetGame();
    }
  }

  function handleKeyUp(e) {
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      e.preventDefault();
      rocket.thrusting = false;
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rocket.left = false;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      rocket.right = false;
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  function makeExplosion() {
    var count;
    for (count = 0; count < 36; count += 1) {
      var speed = 50 + Math.random() * 180;
      var angle = Math.random() * Math.PI * 2;
      particles.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.6,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#fb923c' : '#ef4444'
      });
    }
  }

  function updateParticles(dt) {
    var p;
    for (p = particles.length - 1; p >= 0; p -= 1) {
      particles[p].life -= dt;
      particles[p].x += particles[p].vx * dt;
      particles[p].y += particles[p].vy * dt;
      particles[p].vy += gravity * 0.35 * dt;
      particles[p].vx *= 0.99;
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
      rocket.fuel = Math.max(0, rocket.fuel - fuelBurn * dt);
    }

    rocket.vx += ax * dt;
    rocket.vy += ay * dt;

    rocket.vx *= 1 - drag;
    rocket.vy *= 1 - drag * 0.35;

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    var halfW = rocket.width / 2;
    if (rocket.x < halfW) {
      rocket.x = halfW;
      rocket.vx = 0;
    } else if (rocket.x > canvas.width - halfW) {
      rocket.x = canvas.width - halfW;
      rocket.vx = 0;
    }

    var bottom = rocket.y + rocket.height / 2;
    if (bottom >= landingPad.y) {
      rocket.y = landingPad.y - rocket.height / 2;
      var safeVertical = Math.abs(rocket.vy) < 28;
      var safeHorizontal = Math.abs(rocket.vx) < 16;
      var safeAngle = Math.abs(normAngle(rocket.angle)) < 9;
      var onPad = rocket.x > landingPad.x && rocket.x < landingPad.x + landingPad.w;

      if (onPad && safeVertical && safeHorizontal && safeAngle) {
        rocket.landed = true;
        statusEl.textContent = 'Landed';
      } else {
        rocket.crashed = true;
        statusEl.textContent = 'Crashed';
        makeExplosion();
      }

      rocket.vx = 0;
      rocket.vy = 0;
      rocket.thrusting = false;
    }
  }

  function drawBackground() {
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(0.55, '#0a1d46');
    gradient.addColorStop(1, '#365a2d');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var s;
    for (s = 0; s < stars.length; s += 1) {
      ctx.fillStyle = 'rgba(255,255,255,' + stars[s].a + ')';
      ctx.beginPath();
      ctx.arc(stars[s].x, stars[s].y, stars[s].r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#2f4b28';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(landingPad.x, landingPad.y, landingPad.w, landingPad.h);
  }

  function drawRocket() {
    if (rocket.crashed) {
      return;
    }

    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate((rocket.angle * Math.PI) / 180);

    // Body
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-7, -18, 14, 32);

    // Nose cone
    ctx.beginPath();
    ctx.moveTo(-7, -18);
    ctx.lineTo(0, -30);
    ctx.lineTo(7, -18);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    // Fins
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-11, 8, 4, 12);
    ctx.fillRect(7, 8, 4, 12);

    // Engine bell
    ctx.fillStyle = '#334155';
    ctx.fillRect(-5, 14, 10, 6);

    // Window
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Flame (animated only while thrusting)
    if (rocket.thrusting && rocket.fuel > 0 && !rocket.landed) {
      var jitter = Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-4, 20);
      ctx.lineTo(0, 28 + jitter);
      ctx.lineTo(4, 20);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-2, 20);
      ctx.lineTo(0, 24 + jitter * 0.6);
      ctx.lineTo(2, 20);
      ctx.closePath();
      ctx.fillStyle = '#fde68a';
      ctx.fill();
    }

    ctx.restore();
  }

  function drawExplosion() {
    var p;
    for (p = 0; p < particles.length; p += 1) {
      ctx.globalAlpha = Math.max(0, particles[p].life);
      ctx.fillStyle = particles[p].color;
      ctx.beginPath();
      ctx.arc(particles[p].x, particles[p].y, particles[p].size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateHud() {
    var altitude = Math.max(0, landingPad.y - (rocket.y + rocket.height / 2));
    altitudeEl.textContent = altitude.toFixed(0) + ' m';
    fuelEl.textContent = rocket.fuel.toFixed(0) + '%';
    vSpeedEl.textContent = rocket.vy.toFixed(1) + ' m/s';
    hSpeedEl.textContent = rocket.vx.toFixed(1) + ' m/s';
    angleEl.textContent = normAngle(rocket.angle).toFixed(1) + '°';

    if (!rocket.landed && !rocket.crashed) {
      statusEl.textContent = 'Flying';
    }

    fuelBarEl.style.width = rocket.fuel.toFixed(2) + '%';
  }

  function render() {
    drawBackground();
    drawRocket();
    drawExplosion();
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
