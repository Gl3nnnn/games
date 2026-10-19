const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const PLAYER_W = 36, PLAYER_H = 22, ALIEN_W = 30, ALIEN_H = 20, ALIEN_GAP = 14;
const COLS = 11, ROWS = 5;

const ALIEN_TYPES = [
    { color: '#ff00ff', points: 30 },
    { color: '#00ffff', points: 20 },
    { color: '#00ff41', points: 10 }
];

let player, aliens, playerBullets, alienBullets, stars, ufo;
let score, lives, wave, dir, stepDown, isGameOver, isPaused, isRunning;
let alienMoveTimer, fireTimer, animFrame;
let highScore = parseInt(localStorage.getItem('spaceinvadersHighScore')) || 0;

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

function makeStars() {
    stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3, s: Math.random() * 0.4 + 0.1
    }));
}

function spawnWave() {
    aliens = [];
    const totalW = COLS * (ALIEN_W + ALIEN_GAP) - ALIEN_GAP;
    const offX = (W - totalW) / 2;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const type = r === 0 ? 0 : r < 3 ? 1 : 2;
            aliens.push({
                x: offX + c * (ALIEN_W + ALIEN_GAP),
                y: 70 + r * (ALIEN_H + ALIEN_GAP),
                type, alive: true
            });
        }
    }
    dir = 1; stepDown = false;
    const interval = Math.max(90, 550 - (wave - 1) * 55);
    if (alienMoveTimer) clearInterval(alienMoveTimer);
    alienMoveTimer = setInterval(moveAliens, interval);
    ufo = { active: false, x: 0, y: 32, timer: 0 };
}

function moveAliens() {
    if (isPaused || isGameOver || !isRunning) return;
    const alive = aliens.filter(a => a.alive);
    if (!alive.length) return;
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    alive.forEach(a => { minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y); });
    let dx = dir * (10 + wave * 1.5);
    if ((dir > 0 && maxX + ALIEN_W + dx > W - 8) || (dir < 0 && minX + dx < 8)) {
        dir *= -1; dx = 0; alive.forEach(a => a.y += 16);
    } else {
        alive.forEach(a => a.x += dx);
    }
    if (maxY + ALIEN_H >= player.y - 10) gameOver();
}

function alienFire() {
    if (isPaused || isGameOver) return;
    const alive = aliens.filter(a => a.alive);
    if (!alive.length) return;
    const bottom = {};
    alive.forEach(a => {
        const key = Math.round((a.x + ALIEN_W / 2) / 10);
        if (!bottom[key] || a.y > bottom[key].y) bottom[key] = a;
    });
    const shooters = Object.values(bottom);
    const n = Math.min(1 + Math.floor(wave / 3), 3);
    for (let i = 0; i < n; i++) {
        const s = shooters[Math.floor(Math.random() * shooters.length)];
        if (alienBullets.length < 4 + wave)
            alienBullets.push({ x: s.x + ALIEN_W / 2, y: s.y + ALIEN_H, speed: 2.5 + wave * 0.3 });
    }
    ufo.timer++;
    if (!ufo.active && ufo.timer > 14) {
        ufo.active = true; ufo.timer = 0;
        ufo.x = Math.random() < 0.5 ? -40 : W + 40;
        ufo.dir = ufo.x < 0 ? 1 : -1;
    }
}

function playerShoot() {
    if (playerBullets.length < 2 && !isGameOver && !isPaused) {
        playerBullets.push({ x: player.x + PLAYER_W / 2, y: player.y - 8, speed: 7 });
        Sfx.play('shoot');
    }
}

function hitPlayer() {
    if (isGameOver) return;
    Sfx.play('hit');
    FX.shake(350, 8);
    FX.flash('#ff2244', 180);
    lives--;
    livesEl.textContent = lives;
    playerBullets = []; alienBullets = [];
    player.x = W / 2 - PLAYER_W / 2;
    player.inv = 90;
    if (lives <= 0) gameOver();
}

function update() {
    if (isPaused || isGameOver) return;

    if (keys.ArrowLeft || keys.a) player.x = Math.max(6, player.x - 5);
    if (keys.ArrowRight || keys.d) player.x = Math.min(W - PLAYER_W - 6, player.x + 5);
    if (player.inv > 0) player.inv--;

    playerBullets.forEach(b => b.y -= b.speed);
    playerBullets = playerBullets.filter(b => b.y > -10);

    alienBullets.forEach(b => b.y += b.speed);
    alienBullets = alienBullets.filter(b => b.y < H + 10);

    if (ufo.active) {
        ufo.x += ufo.dir * 2.2;
        if (ufo.x < -50 || ufo.x > W + 50) ufo.active = false;
    }

    for (const b of playerBullets) {
        if (ufo.active && b.x > ufo.x && b.x < ufo.x + 36 && b.y < ufo.y + 16 && b.y > ufo.y) {
            score += 100; scoreEl.textContent = score;
            Sfx.play('powerup');
            ufo.active = false; b.y = -100;
        }
        for (const a of aliens) {
            if (!a.alive) continue;
            if (b.x > a.x && b.x < a.x + ALIEN_W && b.y > a.y && b.y < a.y + ALIEN_H) {
                a.alive = false; b.y = -100;
                score += ALIEN_TYPES[a.type].points; scoreEl.textContent = score;
                Sfx.play('explode');
                FX.flash('rgba(0,255,255,0.3)', 80);
                break;
            }
        }
    }

    for (const b of alienBullets) {
        if (player.inv > 0) break;
        if (b.x > player.x && b.x < player.x + PLAYER_W && b.y > player.y && b.y < player.y + PLAYER_H) {
            b.y = H + 100; hitPlayer(); break;
        }
    }

    if (aliens.filter(a => a.alive).length === 0) {
        wave++; waveEl.textContent = wave;
        Sfx.play('level');
        if (alienMoveTimer) clearInterval(alienMoveTimer);
        spawnWave();
        alienBullets = [];
    }
}

function drawShip(x, y, color, w, h) {
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillRect(x, y + h - 6, w, 6);
    ctx.fillRect(x + 6, y + h - 14, w - 12, 8);
    ctx.fillRect(x + w / 2 - 4, y, 8, 8);
    ctx.shadowBlur = 0;
}

function drawAlien(a) {
    const t = ALIEN_TYPES[a.type];
    ctx.shadowColor = t.color; ctx.shadowBlur = 8;
    ctx.fillStyle = t.color;
    ctx.fillRect(a.x + 4, a.y + 4, ALIEN_W - 8, ALIEN_H - 8);
    ctx.fillRect(a.x, a.y + 8, 4, 8);
    ctx.fillRect(a.x + ALIEN_W - 4, a.y + 8, 4, 8);
    ctx.fillRect(a.x + 6, a.y, ALIEN_W - 12, 4);
    ctx.fillRect(a.x + 6, a.y + ALIEN_H - 4, 5, 4);
    ctx.fillRect(a.x + ALIEN_W - 11, a.y + ALIEN_H - 4, 5, 4);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(a.x + 8, a.y + 7, 4, 4);
    ctx.fillRect(a.x + ALIEN_W - 12, a.y + 7, 4, 4);
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
        s.y += s.s;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(s.x, s.y, s.r, s.r);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, H - 34, W, 2);
    for (let i = 0; i < lives - 1; i++) drawShip(10 + i * 34, H - 26, '#00ff41', 26, 14);

    if (ufo.active) {
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ufo.x + 4, ufo.y + 8, 28, 8);
        ctx.fillRect(ufo.x + 10, ufo.y + 3, 16, 5);
        ctx.fillRect(ufo.x, ufo.y + 12, 36, 4);
        ctx.shadowBlur = 0;
    }

    aliens.forEach(a => { if (a.alive) drawAlien(a); });

    drawShip(player.x, player.y, '#00ff41', PLAYER_W, PLAYER_H);

    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ff41';
    playerBullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 12));
    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff00ff';
    alienBullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 12));
    ctx.shadowBlur = 0;
}

function gameOver() {
    if (isGameOver) return;
    Sfx.play('gameover');
    Scores.submit('spaceinvaders', score);
    isGameOver = true; isRunning = false;
    if (alienMoveTimer) clearInterval(alienMoveTimer);
    if (fireTimer) clearInterval(fireTimer);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceinvadersHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function initGame() {
    player = { x: W / 2 - PLAYER_W / 2, y: H - 60, inv: 0 };
    score = 0; lives = 3; wave = 1;
    playerBullets = []; alienBullets = [];
    isGameOver = false; isPaused = false;
    if (window.ArcadePause) ArcadePause.hide();
    scoreEl.textContent = 0; livesEl.textContent = 3; waveEl.textContent = 1;
    spawnWave();
}

function gameLoop() {
    update();
    draw();
    animFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
    Sfx.play('select');
    if (isRunning) return;
    initGame();
    isRunning = true;
    startScreenEl.classList.add('hidden');
    if (fireTimer) clearInterval(fireTimer);
    fireTimer = setInterval(alienFire, 900);
    gameLoop();
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
    if (e.key === ' ') { e.preventDefault(); playerShoot(); }
    if (e.key === 'p' || e.key === 'P') { if (!e.repeat) { isPaused = !isPaused; if (window.ArcadePause) ArcadePause.set(isPaused); } }
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});

canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width);
    if (tx < W / 2) keys.ArrowLeft = true, keys.ArrowRight = false;
    else keys.ArrowRight = true, keys.ArrowLeft = false;
    playerShoot();
});
canvas.addEventListener('touchmove', (e) => {
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width) - PLAYER_W / 2;
    player.x = Math.max(6, Math.min(W - PLAYER_W - 6, tx));
});
canvas.addEventListener('touchend', () => { keys.ArrowLeft = false; keys.ArrowRight = false; });

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
    if (fireTimer) clearInterval(fireTimer);
    fireTimer = setInterval(alienFire, 900);
});

makeStars();
initGame();
draw();
