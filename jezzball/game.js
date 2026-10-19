const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const pauseEl = document.getElementById('pauseOverlay');

const W = canvas.width, H = canvas.height;
const M = 14;
const P_SPEED = 3, BALL_R = 9, LINE_T = 3;

let score, highScore = parseInt(localStorage.getItem('jezzballHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let player, balls, solidLines, grow, lastAxis;
let linesThisLevel, linesNeeded, keys = {};

const BALL_COLORS = ['#ff66cc', '#7cff00', '#ffcc00', '#00e5ff', '#ff9a00'];

function spawnBalls(n) {
    balls = [];
    for (let i = 0; i < n; i++) {
        const speed = 2 + level * 0.25 + Math.random() * 0.6;
        const ang = Math.random() * Math.PI * 2;
        let x, y, tries = 0;
        do {
            x = M + 40 + Math.random() * (W - 2 * M - 80);
            y = M + 40 + Math.random() * (H - 2 * M - 80);
            tries++;
        } while (Math.hypot(x - player.x, y - player.y) < 90 && tries < 40);
        balls.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            color: BALL_COLORS[i % BALL_COLORS.length]
        });
    }
}

function resetLevelField() {
    solidLines = [];
    grow = null;
    linesThisLevel = 0;
    linesNeeded = 4 + level;
    player.x = W / 2;
    player.y = H / 2;
    spawnBalls(Math.min(1 + Math.floor(level / 2), 6));
}

function startGame() {
    score = 0; level = 1; lives = 3;
    isRunning = true; isGameOver = false;
    scoreEl.textContent = 0; levelEl.textContent = 1; livesEl.textContent = 3;
    player = { x: W / 2, y: H / 2 };
    lastAxis = 'v';
    resetLevelField();
    startScreen.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    Sfx.play('select');
}

function nextLevel() {
    score += 200 * level;
    scoreEl.textContent = score;
    level++;
    levelEl.textContent = level;
    Sfx.play('level');
    resetLevelField();
}

function loseLife() {
    if (isGameOver) return;
    lives--;
    livesEl.textContent = lives;
    Sfx.play('die');
    if (lives <= 0) {
        isGameOver = true; isRunning = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('jezzballHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
        Scores.submit('jezzball', score);
    } else {
        grow = null;
        player.x = W / 2;
        player.y = H / 2;
    }
}

function shootLine() {
    if (grow || !isRunning || paused) return;
    if (lastAxis === 'h') {
        grow = { axis: 'v', ox: player.x, oy: player.y, a: { len: 0, done: false }, b: { len: 0, done: false } };
    } else {
        grow = { axis: 'h', ox: player.x, oy: player.y, a: { len: 0, done: false }, b: { len: 0, done: false } };
    }
    Sfx.play('shoot');
}

function updatePlayer() {
    const p = player;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a) dx = -P_SPEED;
    else if (keys.ArrowRight || keys.d) dx = P_SPEED;
    else if (keys.ArrowUp || keys.w) dy = -P_SPEED;
    else if (keys.ArrowDown || keys.s) dy = P_SPEED;

    if (dx !== 0) {
        lastAxis = 'h';
        const nx = Math.max(M + 11, Math.min(W - M - 11, p.x + dx));
        const lead = nx + Math.sign(dx) * 11;
        const hit = solidLines.some(l => l.axis === 'v' && Math.abs(l.c - lead) <= LINE_T + 3);
        if (!hit) p.x = nx;
    } else if (dy !== 0) {
        lastAxis = 'v';
        const ny = Math.max(M + 11, Math.min(H - M - 11, p.y + dy));
        const lead = ny + Math.sign(dy) * 11;
        const hit = solidLines.some(l => l.axis === 'h' && Math.abs(l.c - lead) <= LINE_T + 3);
        if (!hit) p.y = ny;
    }
}

function updateBalls() {
    for (const b of balls) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < M + BALL_R) { b.x = M + BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x > W - M - BALL_R) { b.x = W - M - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y < M + BALL_R) { b.y = M + BALL_R; b.vy = Math.abs(b.vy); }
        if (b.y > H - M - BALL_R) { b.y = H - M - BALL_R; b.vy = -Math.abs(b.vy); }

        for (const l of solidLines) {
            if (l.axis === 'v' && Math.abs(b.x - l.c) < BALL_R + LINE_T) {
                if (b.x < l.c) { b.x = l.c - (BALL_R + LINE_T); b.vx = -Math.abs(b.vx); }
                else { b.x = l.c + (BALL_R + LINE_T); b.vx = Math.abs(b.vx); }
            } else if (l.axis === 'h' && Math.abs(b.y - l.c) < BALL_R + LINE_T) {
                if (b.y < l.c) { b.y = l.c - (BALL_R + LINE_T); b.vy = -Math.abs(b.vy); }
                else { b.y = l.c + (BALL_R + LINE_T); b.vy = Math.abs(b.vy); }
            }
        }

        if (Math.hypot(b.x - player.x, b.y - player.y) < BALL_R + 9) loseLife();
    }
}

function updateGrow(dt) {
    if (!grow) return;
    const step = 320 * dt;
    const g = grow;
    let aborted = false;

    for (const key of ['a', 'b']) {
        const s = g[key];
        if (s.done) continue;
        s.len += step;
        if (g.axis === 'v') {
            const edge = key === 'a' ? g.oy - s.len : g.oy + s.len;
            if (edge <= M) { s.len = g.oy - M; s.done = true; }
            else if (edge >= H - M) { s.len = H - M - g.oy; s.done = true; }
        } else {
            const edge = key === 'a' ? g.ox - s.len : g.ox + s.len;
            if (edge <= M) { s.len = g.ox - M; s.done = true; }
            else if (edge >= W - M) { s.len = W - M - g.ox; s.done = true; }
        }
        if (s.done) continue;
        const hitBall = balls.some(b => {
            if (g.axis === 'v') {
                const lo = key === 'a' ? g.oy - s.len : g.oy;
                const hi = key === 'a' ? g.oy : g.oy + s.len;
                return Math.abs(b.x - g.ox) < BALL_R + LINE_T + 2 &&
                    b.y > lo - 4 && b.y < hi + 4;
            }
            const lo = key === 'a' ? g.ox - s.len : g.ox;
            const hi = key === 'a' ? g.ox : g.ox + s.len;
            return Math.abs(b.y - g.oy) < BALL_R + LINE_T + 2 &&
                b.x > lo - 4 && b.x < hi + 4;
        });
        if (hitBall) aborted = true;
    }

    if (aborted) {
        grow = null;
        loseLife();
        return;
    }

    if (g.a.done && g.b.done) {
        solidLines.push({ axis: g.axis, c: g.axis === 'v' ? g.ox : g.oy });
        grow = null;
        linesThisLevel++;
        score += 25;
        scoreEl.textContent = score;
        Sfx.play('coin');
        if (linesThisLevel >= linesNeeded) nextLevel();
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1118';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#00333d';
    ctx.fillRect(M, M, W - 2 * M, H - 2 * M);

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, M);
    ctx.fillRect(0, H - M, W, M);
    ctx.fillRect(0, 0, M, H);
    ctx.fillRect(W - M, 0, M, H);

    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillRect(0, H - 3, W, 3);
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);

    for (const l of solidLines) {
        ctx.fillStyle = '#00e5ff';
        if (l.axis === 'v') ctx.fillRect(l.c - LINE_T, M, LINE_T * 2, H - 2 * M);
        else ctx.fillRect(M, l.c - LINE_T, W - 2 * M, LINE_T * 2);
    }

    if (grow) {
        ctx.fillStyle = '#ffe14d';
        for (const key of ['a', 'b']) {
            const s = grow[key];
            if (grow.axis === 'v') {
                const lo = key === 'a' ? Math.max(M, grow.oy - s.len) : grow.oy;
                const hi = key === 'a' ? grow.oy : Math.min(H - M, grow.oy + s.len);
                ctx.fillRect(grow.ox - 2, lo, 4, Math.max(0, hi - lo));
            } else {
                const lo = key === 'a' ? Math.max(M, grow.ox - s.len) : grow.ox;
                const hi = key === 'a' ? grow.ox : Math.min(W - M, grow.ox + s.len);
                ctx.fillRect(lo, grow.oy - 2, Math.max(0, hi - lo), 4);
            }
        }
    }

    for (const b of balls) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#ff9a00';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.arc(player.x - 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#556';
    ctx.font = '11px Orbitron';
    ctx.fillText(`LINES ${linesThisLevel}/${linesNeeded}`, M + 8, H - M + 0 + 11);
}

let lastTime = 0;
function loop(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    if (isRunning && !isGameOver && !paused) {
        updatePlayer();
        updateBalls();
        updateGrow(dt);
    }
    if (isRunning) draw();
    requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        if (!e.repeat && isRunning && !isGameOver) {
            paused = !paused;
            pauseEl.classList.toggle('hidden', !paused);
            if (paused) Sfx.play('blip');
        }
        return;
    }
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (e.key === ' ' && isRunning && !e.repeat) shootLine();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});
canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (isRunning) shootLine();
});
restartBtn.addEventListener('click', startGame);

highScoreEl.textContent = highScore;
requestAnimationFrame(loop);
