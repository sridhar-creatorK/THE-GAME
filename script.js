const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let y = 100;
let velocityY = 0;
let fuel = 100;
let angle = 0;

let keys = {};

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

function update() {
  if ((keys["Space"] || keys["ArrowUp"]) && fuel > 0) {
    velocityY -= 0.2;
    fuel -= 0.1;
  }

  if (keys["ArrowLeft"]) angle -= 2;
  if (keys["ArrowRight"]) angle += 2;

  velocityY += 0.1; // gravity
  y += velocityY;

  if (y > canvas.height - 20) {
    y = canvas.height - 20;
    velocityY = 0;
  }

  // update UI
  document.getElementById("altitude").innerText = Math.floor(canvas.height - y);
  document.getElementById("fuel").innerText = Math.floor(fuel);
  document.getElementById("vSpeed").innerText = velocityY.toFixed(2);
  document.getElementById("hSpeed").innerText = 0;
  document.getElementById("angle").innerText = angle;
  document.getElementById("status").innerText = "Flying";
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(210, y);
  ctx.rotate(angle * Math.PI / 180);

  ctx.fillStyle = "white";
  ctx.fillRect(-5, -10, 10, 20);

  ctx.restore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();