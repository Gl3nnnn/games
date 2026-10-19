const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let ship, asteroids, bullets, particles, stars, saucers, sBullets;
let score, lives, wave, isGameOver, isPaused, isRunning, respawnTimer, saucerTimer;
let highScore = parseInt(localStorage.getItem('asteroidsHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

const keys = {};

function wrap(o) {
    if (o.x < -30) o.x = W + 30;
    if (o.x > W + 30) o.x = -30;
    if (o.y < -30) o.y = H + 30;
    if (o.y > H + 30) o.y = -30;
}

function makeStars() {
    stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3 }));
}

function makeAsteroid(x, y, size) {
    const verts = [];
    const n = 9 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = size * (0.7 + Math.random() * 0.3);
        verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return {
        x, y, size, verts,
        vx: (Math.random() - 0.5) * (2 + wave * 0.3),
        vy: (Math.random() - 0.5) * (2 + wave * 0.3),
        rot: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.04
    };
}

function spawnSaucer() {
    const big = wave < 2 || Math.random() < 0.7;
    const fromLeft = Math.random() < 0.5;
    saucers.push({
        x: fromLeft ? -30 : W + 30,
        y: 30 + Math.random() * 70,
        vx: (fromLeft ? 1 : -1) * (big ? 1.2 : 2.0) * (1 + wave * 0.04),
        size: big ? 17 : 10, big,
        fireTimer: 30 + Math.random() * 50,
        phase: Math.random() * Math.PI * 2
    });
    saucerTimer = 420 + Math.random() * 360;
}

function spawnWave() {
    const count = 3 + Math.min(wave - 1, 5);
    asteroids = [];
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.random() * W; y = Math.random() * H;
        } while (Math.hypot(x - ship.x, y - ship.y) < 130);
        asteroids.push(makeAsteroid(x, y, 40));
    }
    saucerTimer = 300 + Math.random() * 200;
    waveEl.textContent = wave;
}

function newShip() {
    return { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, inv: 120, thrusting: false };
}

function explode(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30, color });
    }
}

function shoot() {
    if (!isRunning || isGameOver || isPaused) return;
    if (bullets.length >= 5) return;
    Sfx.play('shoot');
    bullets.push({
        x: ship.x + Math.cos(ship.angle) * 14,
        y: ship.y + Math.sin(ship.angle) * 14,
        vx: Math.cos(ship.angle) * 8 + ship.vx * 0.5,
        vy: Math.sin(ship.angle) * 8 + ship.vy * 0.5,
        life: 60
    });
}

function splitAsteroid(i) {
    const a = asteroids[i];
    asteroids.splice(i, 1);
    const pts = a.size > 30 ? 20 : a.size > 18 ? 50 : 100;
    score += pts; scoreEl.textContent = score;
    explode(a.x, a.y, '#00ffff');
    Sfx.play('explode');
    FX.shake(140, 3);
    if (a.size > 18) {
        const ns = a.size * 0.55;
        for (let k = 0; k < 2; k++) {
            const na = makeAsteroid(a.x + (Math.random() - 0.5) * 20, a.y + (Math.random() - 0.5) * 20, ns);
            na.vx = a.vx + (Math.random() - 0.5) * 2;
            na.vy = a.vy + (Math.random() - 0.5) * 2;
            asteroids.push(na);
        }
    }
}

function killShip() {
    if (ship.inv > 0) return;
    if (isGameOver) return;
    Sfx.play('die');
    FX.shake(420, 10);
    FX.flash('#ff0044', 220);
    explode(ship.x, ship.y, '#00ff41', 24);
    lives--; livesEl.textContent = lives;
    if (lives <= 0) { gameOver(); return; }
    ship = newShip();
    respawnTimer = 60;
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    if (ship.inv > 0) ship.inv--;

    if (keys.ArrowLeft) ship.angle -= 0.06;
    if (keys.ArrowRight) ship.angle += 0.06;
    ship.thrusting = !!keys.ArrowUp;
    if (ship.thrusting) {
        ship.vx += Math.cos(ship.angle) * 0.12;
        ship.vy += Math.sin(ship.angle) * 0.12;
    }
    ship.vx *= 0.99; ship.vy *= 0.99;
    ship.x += ship.vx; ship.y += ship.vy;
    wrap(ship);

    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; wrap(b); });
    bullets = bullets.filter(b => b.life > 0);

    asteroids.forEach(a => {
        a.x += a.vx; a.y += a.vy; a.rot += a.rs;
        wrap(a);
    });

    if (saucers.length === 0) {
        saucerTimer--;
        if (saucerTimer <= 0) spawnSaucer();
    }
    saucers.forEach(s => {
        s.x += s.vx;
        s.phase += 0.05;
        s.y += Math.sin(s.phase) * 0.4;
        s.fireTimer--;
        if (s.fireTimer <= 0 && s.x > 0 && s.x < W && !isGameOver) {
            const spread = s.big ? 0.9 : 0.12;
            const ang = Math.atan2(ship.y - s.y, ship.x - s.x) + (Math.random() - 0.5) * spread;
            sBullets.push({ x: s.x, y: s.y, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, life: 110 });
            Sfx.play('shoot');
            s.fireTimer = s.big ? 70 + Math.random() * 60 : 35 + Math.random() * 30;
        }
    });
    saucers = saucers.filter(s => s.x > -40 && s.x < W + 40);
    sBullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    sBullets = sBullets.filter(b => b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.size * 0.8 + 10) {
            if (ship.inv <= 0) killShip();
        }
    }

    for (const s of saucers) {
        if (Math.hypot(s.x - ship.x, s.y - ship.y) < s.size + 10 && ship.inv <= 0) killShip();
    }
    for (let i = sBullets.length - 1; i >= 0; i--) {
        if (Math.hypot(sBullets[i].x - ship.x, sBullets[i].y - ship.y) < 10) {
            sBullets.splice(i, 1);
            if (ship.inv <= 0) killShip();
        }
    }

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        for (let si = saucers.length - 1; si >= 0; si--) {
            const s = saucers[si];
            if (Math.hypot(bullets[bi].x - s.x, bullets[bi].y - s.y) < s.size + 4) {
                bullets.splice(bi, 1);
                saucers.splice(si, 1);
                score += s.big ? 200 : 1000; scoreEl.textContent = score;
                explode(s.x, s.y, '#ff66ff', 18);
                Sfx.play('explode');
                FX.shake(200, 5);
                FX.flash('rgba(255,102,255,0.3)', 100);
                break;
            }
        }
    }

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        for (let si = sBullets.length - 1; si >= 0; si--) {
            if (Math.hypot(bullets[bi].x - sBullets[si].x, bullets[bi].y - sBullets[si].y) < 8) {
                const pb = bullets[bi];
                explode(pb.x, pb.y, '#ffffff', 5);
                bullets.splice(bi, 1);
                sBullets.splice(si, 1);
                break;
            }
        }
    }

    for (let si = sBullets.length - 1; si >= 0; si--) {
        for (let ai = asteroids.length - 1; ai >= 0; ai--) {
            const a = asteroids[ai];
            if (Math.hypot(sBullets[si].x - a.x, sBullets[si].y - a.y) < a.size * 0.85) {
                sBullets.splice(si, 1);
                splitAsteroid(ai);
                break;
            }
        }
    }

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        for (let ai = asteroids.length - 1; ai >= 0; ai--) {
            const a = asteroids[ai];
            if (Math.hypot(bullets[bi].x - a.x, bullets[bi].y - a.y) < a.size * 0.85) {
                bullets.splice(bi, 1);
                splitAsteroid(ai);
                break;
            }
        }
    }

    if (asteroids.length === 0) {
        wave++;
        Sfx.play('level');
        spawnWave();
    }
}

function drawShipShape(alpha = 1) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(15, 0); ctx.lineTo(-11, -10); ctx.lineTo(-6, 0); ctx.lineTo(-11, 10); ctx.closePath();
    ctx.stroke();
    if (ship.thrusting && Math.random() > 0.3) {
        ctx.strokeStyle = '#ff8800';
        ctx.shadowColor = '#ff8800';
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-18 - Math.random() * 8, 0); ctx.lineTo(-8, 4); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.r, s.r));

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8;
    asteroids.forEach(a => {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
        ctx.beginPath();
        a.verts.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]));
        ctx.closePath(); ctx.stroke();
        ctx.restore();
    });
    ctx.shadowBlur = 0;

    ctx.shadowColor = '#ff66ff';
    ctx.shadowBlur = 10;
    saucers.forEach(s => {
        ctx.strokeStyle = '#ff66ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x - s.size, s.y + s.size * 0.4);
        ctx.lineTo(s.x + s.size, s.y + s.size * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - s.size * 0.05, s.size * 0.55, s.size * 0.42, 0, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x - s.size * 0.75, s.y + s.size * 0.4);
        ctx.lineTo(s.x - s.size * 0.5, s.y + s.size * 0.12);
        ctx.moveTo(s.x + s.size * 0.75, s.y + s.size * 0.4);
        ctx.lineTo(s.x + s.size * 0.5, s.y + s.size * 0.12);
        ctx.stroke();
    });
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ff3355';
    sBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowBlur = 0;

    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowBlur = 0;

    if (respawnTimer > 0) respawnTimer--;
    if (!isGameOver) {
        if (ship.inv <= 0 || Math.floor(ship.inv / 6) % 2 === 0) drawShipShape();
    }

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'left';
    for (let i = 0; i < lives - 1; i++) {
        ctx.save();
        ctx.translate(20 + i * 24, H - 20);
        ctx.rotate(-Math.PI / 2);
        ctx.strokeStyle = '#00ff41';
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6); ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

function gameOver() {
    if (isGameOver) return;
    Sfx.play('gameover');
    Scores.submit('asteroids', score);
    isGameOver = true; isRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('asteroidsHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function initGame() {
    ship = newShip();
    score = 0; lives = 3; wave = 1;
    bullets = []; particles = [];
    saucers = []; sBullets = []; saucerTimer = 400;
    isGameOver = false; isPaused = false;
    if (window.ArcadePause) ArcadePause.hide();
    scoreEl.textContent = 0; livesEl.textContent = 3;
    spawnWave();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    Sfx.play('select');
    if (isRunning) return;
    initGame();
    isRunning = true;
    startScreenEl.classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    keys[e.key] = true;
    if (e.key === ' ') { e.preventDefault(); shoot(); }
    if (e.key === 'p' || e.key === 'P') { if (!e.repeat) { isPaused = !isPaused; if (window.ArcadePause) ArcadePause.set(isPaused); } }
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

canvas.addEventListener('mousedown', () => { if (isRunning) shoot(); });
canvas.addEventListener('touchstart', (e) => {
    if (!isRunning) { startGame(); return; }
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width);
    keys.ArrowLeft = tx < W * 0.4;
    keys.ArrowRight = tx > W * 0.6;
    if (tx >= W * 0.4 && tx <= W * 0.6) shoot();
});
canvas.addEventListener('touchend', () => { keys.ArrowLeft = false; keys.ArrowRight = false; });

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

makeStars();
initGame();
draw();
loop();
