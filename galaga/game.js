const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const COLS = 8, ROWS = 5, FORM_X = 70, FORM_Y = 70, SPX = 45, SPY = 36;
const ROW_PTS = [100, 80, 60, 60, 40];
const ROW_COLORS = ['#ff00ff', '#ff5555', '#00ffff', '#00ffff', '#00ff41'];

let player, bullets, enemyBullets, enemies, stars;
let score, lives, stage, isGameOver, isPaused, isRunning;
let timeTick, fireCooldown, spawnTimer, spawnCount, divingAllowed;
let stageBanner = 0;
let highScore = parseInt(localStorage.getItem('galagaHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const stageEl = document.getElementById('stage');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

const keys = {};

function makeStars() {
    stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.3, s: Math.random() * 0.5 + 0.15 }));
}

function qbez(a, c, b, t) {
    const it = 1 - t;
    return {
        x: it * it * a.x + 2 * it * t * c.x + t * t * b.x,
        y: it * it * a.y + 2 * it * t * c.y + t * t * b.y
    };
}

function slotPos(col, row) {
    const sway = Math.sin(timeTick * 0.015) * 18;
    return { x: FORM_X + col * SPX + sway, y: FORM_Y + row * SPY };
}

function buildStage() {
    enemies = [];
    spawnCount = 0;
    spawnTimer = 20;
    enemyBullets = [];
}

function spawnPair() {
    const s1 = spawnCount * 2, s2 = spawnCount * 2 + 1;
    const slots = [s1, s2].map(i => ({ col: i % COLS, row: Math.floor(i / COLS) }));
    const fromLeft = spawnCount % 2 === 0;
    slots.forEach((slot, i) => {
        const sx = fromLeft ? -30 : W + 30;
        const ctrl = { x: fromLeft ? sx - 60 : sx + 60, y: H * 0.55 };
        const target = slotPos(slot.col, slot.row);
        enemies.push({
            state: 'entering', col: slot.col, row: slot.row,
            a: { x: sx, y: -30 - i * 40 },
            c: ctrl, b: target,
            t: i * -0.18 - Math.random() * 0.15,
            x: sx, y: -30, fireOK: true
        });
    });
    spawnCount++;
}

function startDive(e) {
    const slot = slotPos(e.col, e.row);
    const targetY = H - 60;
    const ctrl = {
        x: player.x + (Math.random() * 120 - 60),
        y: targetY + 80
    };
    e.state = 'diving';
    e.a = { x: e.x, y: e.y };
    e.c = ctrl;
    e.b = slot;
    e.t = 0;
    e.diveSpeed = 0.011 + stage * 0.0012 + Math.random() * 0.004;
}

function firePlayer() {
    if (bullets.length >= 2 || fireCooldown > 0 || isGameOver) return;
    Sfx.play('shoot');
    bullets.push({ x: player.x, y: player.y - 16, vy: -8.5 });
    fireCooldown = 10;
}

function killEnemy(e) {
    e.dead = true;
    Sfx.play('explode');
    score += ROW_PTS[e.row];
    scoreEl.textContent = score;
    for (let i = 0; i < 8; i++) {
        particles.push({ x: e.x, y: e.y, vx: Math.random() * 4 - 2, vy: Math.random() * 4 - 2, life: 20, color: ROW_COLORS[e.row] });
    }
}

function hitPlayer() {
    if (player.inv > 0) return;
    Sfx.play('hit');
    lives--;
    livesEl.textContent = lives;
    for (let i = 0; i < 20; i++)
        particles.push({ x: player.x, y: player.y, vx: Math.random() * 5 - 2.5, vy: Math.random() * 5 - 2.5, life: 30, color: '#00ff41' });
    if (lives <= 0) { gameOver(); return; }
    player.x = W / 2;
    player.inv = 150;
    bullets = [];
}

function gameOver() {
    Sfx.play('gameover');
    isGameOver = true; isRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('galagaHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

let particles = [];

function update() {
    if (isPaused || isGameOver || !isRunning) return;
    timeTick++;
    if (fireCooldown > 0) fireCooldown--;
    if (player.inv > 0) player.inv--;

    if (stageBanner > 0) { stageBanner--; return; }

    if (keys.ArrowLeft || keys.a) player.x = Math.max(14, player.x - 5);
    if (keys.ArrowRight || keys.d) player.x = Math.min(W - 14, player.x + 5);

    if (spawnCount * 2 < COLS * ROWS) {
        spawnTimer--;
        if (spawnTimer <= 0) { spawnPair(); spawnTimer = 45 - Math.min(stage * 3, 25); }
    } else {
        const entering = enemies.filter(e => !e.dead && e.state === 'entering').length;
        const inFormation = enemies.filter(e => !e.dead && (e.state === 'formation' || e.state === 'returning')).length;
        const divingCount = enemies.filter(e => !e.dead && e.state === 'diving').length;
        const maxDive = Math.min(1 + Math.floor(stage / 2), 4);
        if (divingCount < maxDive && Math.random() < 0.01 + stage * 0.004) {
            const candidates = enemies.filter(e => !e.dead && e.state === 'formation');
            if (candidates.length) startDive(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        if (inFormation === 0 && divingCount === 0 && entering === 0) {
            stage++;
            stageEl.textContent = stage;
            stageBanner = 90;
            Sfx.play('level');
            buildStage();
        }
    }

    enemies.forEach(e => {
        if (e.dead) return;
        if (e.state === 'entering') {
            e.t += 0.02;
            if (e.t >= 1) { e.state = 'formation'; e.x = e.b.x; e.y = e.b.y; }
            else { const p = qbez(e.a, e.c, e.b, e.t); e.x = p.x; e.y = p.y; }
        } else if (e.state === 'formation') {
            const slot = slotPos(e.col, e.row);
            e.x = slot.x; e.y = slot.y;
        } else if (e.state === 'diving') {
            e.t += e.diveSpeed;
            if (e.t >= 1) { e.state = 'formation'; }
            else { const p = qbez(e.a, e.c, e.b, e.t); e.x = p.x; e.y = p.y; }
        }

        if (!e.dead && e.state !== 'entering' && Math.random() < 0.0025 + stage * 0.0008) {
            const dx = player.x - e.x, dy = player.y - e.y;
            const d = Math.hypot(dx, dy) || 1;
            enemyBullets.push({ x: e.x, y: e.y + 10, vx: dx / d * (3 + stage * 0.3), vy: Math.abs(dy / d) * (3 + stage * 0.3) });
        }
    });

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y > -10);

    enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    enemyBullets = enemyBullets.filter(b => b.y < H + 10 && b.x > -10 && b.x < W + 10);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    for (const b of bullets) {
        for (const e of enemies) {
            if (e.dead) continue;
            if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 14) {
                b.hit = true;
                killEnemy(e);
                break;
            }
        }
    }
    bullets = bullets.filter(b => !b.hit);

    for (const b of enemyBullets) {
        if (Math.abs(b.x - player.x) < 13 && Math.abs(b.y - player.y) < 13) {
            b.dead = true;
            hitPlayer();
        }
    }
    enemyBullets = enemyBullets.filter(b => !b.dead);

    for (const e of enemies) {
        if (e.dead || e.state === 'entering') continue;
        if (Math.abs(e.x - player.x) < 17 && Math.abs(e.y - player.y) < 15) {
            killEnemy(e);
            hitPlayer();
        }
    }

    enemies = enemies.filter(e => !e.dead);
}

function drawEnemy(e) {
    const color = ROW_COLORS[e.row];
    const flap = Math.sin(timeTick * 0.25 + e.col) > 0 ? 1 : -1;
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillRect(e.x - 8, e.y - 6, 16, 12);
    ctx.fillRect(e.x - 13, e.y - 2 - flap * 3, 5, 8);
    ctx.fillRect(e.x + 8, e.y - 2 - flap * 3, 5, 8);
    ctx.fillRect(e.x - 5, e.y - 10, 10, 4);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(e.x - 4, e.y - 4, 3, 3);
    ctx.fillRect(e.x + 1, e.y - 4, 3, 3);
    ctx.shadowBlur = 0;
}

function drawPlayerShip(x, y) {
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#00ff41';
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x + 7, y - 4);
    ctx.lineTo(x + 15, y + 8);
    ctx.lineTo(x + 5, y + 6);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 5, y + 6);
    ctx.lineTo(x - 15, y + 8);
    ctx.lineTo(x - 7, y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
        s.y += s.s;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(s.x, s.y, s.r, s.r);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, H - 36, W, 2);
    ctx.fillStyle = 'rgba(0,255,65,0.5)';
    ctx.font = '11px Orbitron';
    ctx.textAlign = 'left';
    for (let i = 0; i < Math.max(lives - 1, 0); i++) drawPlayerShip(22 + i * 36, H - 18);

    enemies.forEach(e => { if (!e.dead) drawEnemy(e); });

    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    bullets.forEach(b => ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12));
    ctx.shadowColor = '#ff5555';
    ctx.fillStyle = '#ff5555';
    enemyBullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 4, 4, 9));
    ctx.shadowBlur = 0;

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    if (!isGameOver && (player.inv <= 0 || Math.floor(player.inv / 6) % 2 === 0)) drawPlayerShip(player.x, player.y);

    if (stageBanner > 0) {
        ctx.fillStyle = '#4488ff';
        ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
        ctx.font = 'bold 30px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE ' + stage, W / 2, H / 2);
        ctx.shadowBlur = 0;
    }
}

function loop() {
    if (!isGameOver && isRunning) update();
    draw();
    requestAnimationFrame(loop);
}

function initGame() {
    player = { x: W / 2, y: H - 60, inv: 0 };
    bullets = []; enemyBullets = []; particles = [];
    score = 0; lives = 3; stage = 1;
    timeTick = 0; fireCooldown = 0; stageBanner = 90;
    isGameOver = false; isPaused = false;
    scoreEl.textContent = 0; livesEl.textContent = 3; stageEl.textContent = 1;
    buildStage();
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
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (e.key === ' ') { e.preventDefault(); firePlayer(); }
    if (k === 'p') isPaused = !isPaused;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = false;
});

canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    e.preventDefault();
    firePlayer();
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width);
    player.x = Math.max(14, Math.min(W - 14, tx));
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width);
    player.x = Math.max(14, Math.min(W - 14, tx));
}, { passive: false });

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

makeStars();
initGame();
draw();
loop();
