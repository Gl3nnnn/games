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
const PYR = 7;
const TOP_X = 220, TOP_Y = 96, CW = 46, RH = 56;

let score, highScore = parseInt(localStorage.getItem('qbertHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let palette, cubes, player, coily, balls, keys = {};
let coilyTimer, ballTimer, fallTimer;

function paletteFor(l) {
    if (l <= 2) return ['#26374f', '#ffcc00'];
    if (l <= 4) return ['#26374f', '#00e5ff', '#ff3d7f'];
    if (l <= 6) return ['#26374f', '#7cff00', '#b366ff', '#ffcc00'];
    return ['#26374f', '#ff6a00', '#00e5ff', '#ff3d7f', '#ffcc00'];
}

const inPyr = (r, c) => r >= 0 && r < PYR && c >= 0 && c <= r;
function cellPx(r, c) {
    return { x: TOP_X + (c - r / 2) * CW, y: TOP_Y + r * RH };
}

function resetEntities() {
    player = { r: PYR - 1, c: 0, hop: null, falling: false, fx: 0, fy: 0 };
    const sp = cellPx(player.r, player.c);
    player.fx = sp.x; player.fy = sp.y;
    coily = { r: PYR - 1, c: PYR - 1, hop: null };
    balls = [];
    coilyTimer = 2200;
    ballTimer = 5000;
    fallTimer = 0;
}

function buildLevel() {
    palette = paletteFor(level);
    cubes = [];
    for (let r = 0; r < PYR; r++) {
        cubes.push([]);
        for (let c = 0; c <= r; c++) cubes[r].push(0);
    }
    resetEntities();
}

function startGame() {
    score = 0; level = 1; lives = 3;
    isRunning = true; isGameOver = false;
    scoreEl.textContent = 0; levelEl.textContent = 1; livesEl.textContent = 3;
    buildLevel();
    startScreen.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    Sfx.play('select');
}

function nextLevel() {
    score += 500 * level;
    scoreEl.textContent = score;
    level++;
    levelEl.textContent = level;
    Sfx.play('level');
    buildLevel();
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
            localStorage.setItem('qbertHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
        Scores.submit('qbert', score);
    } else {
        resetEntities();
    }
}

function startHop(e, r, c, dur) {
    e.hop = { fr: e.r, fc: e.c, tr: r, tc: c, t: 0, dur };
}

function playerMove(dr, dc) {
    if (player.hop || player.falling) return;
    const tr = player.r + dr, tc = player.c + dc;
    if (!inPyr(tr, tc)) {
        player.falling = true;
        const p = cellPx(player.r, player.c);
        player.fx = p.x; player.fy = p.y;
        fallTimer = 0;
        return;
    }
    startHop(player, tr, tc, 0.22);
    Sfx.play('jump');
}

function checkWin() {
    const target = palette.length - 1;
    for (let r = 0; r < PYR; r++)
        for (let c = 0; c <= r; c++)
            if (cubes[r][c] !== target) return false;
    return true;
}

function updatePlayer(dt) {
    if (player.falling) {
        fallTimer += dt;
        player.fy += 380 * dt;
        if (player.fy > H + 40) loseLife();
        return;
    }
    if (player.hop) {
        const h = player.hop;
        h.t += dt;
        if (h.t >= h.dur) {
            player.r = h.tr; player.c = h.tc;
            player.hop = null;
            const prev = cubes[player.r][player.c];
            cubes[player.r][player.c] = (prev + 1) % palette.length;
            score += 25;
            scoreEl.textContent = score;
            Sfx.play('eat');
            if (checkWin()) nextLevel();
        }
    }
}

function hopPos(r, c, hop) {
    const from = cellPx(hop.fr, hop.fc), to = cellPx(hop.tr, hop.tc);
    const t = Math.min(1, hop.t / hop.dur);
    const arc = Math.sin(Math.PI * t) * 22;
    return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t - arc
    };
}

function coilyMove() {
    if (coily.hop) return;
    const moves = [[-1, -1], [-1, 0], [1, 1], [1, 0]];
    let best = null, bestD = Infinity;
    for (const [dr, dc] of moves) {
        const tr = coily.r + dr, tc = coily.c + dc;
        if (!inPyr(tr, tc)) continue;
        const d = Math.abs(tr - player.r) + Math.abs(tc - player.c);
        if (d < bestD || (d === bestD && Math.random() < 0.5)) {
            bestD = d;
            best = [tr, tc];
        }
    }
    if (best) startHop(coily, best[0], best[1], 0.3);
}

function updateCoily(dt) {
    coilyTimer -= dt;
    if (coilyTimer <= 0 && !coily.hop) {
        coilyMove();
        coilyTimer = Math.max(320, 850 - level * 55);
    }
    if (coily.hop) {
        coily.hop.t += dt;
        if (coily.hop.t >= coily.hop.dur) {
            coily.r = coily.hop.tr;
            coily.c = coily.hop.tc;
            coily.hop = null;
        }
    }
    if (!player.hop && !player.falling && coily.r === player.r && coily.c === player.c) loseLife();
}

function updateBalls(dt) {
    ballTimer -= dt;
    if (ballTimer <= 0 && balls.length < 2) {
        balls.push({ r: 0, c: Math.floor(Math.random() * 1), hop: null, delay: 1200, falling: false, fy: 0 });
        ballTimer = Math.max(3500, 7000 - level * 400);
    }
    for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (!b) continue;
        if (b.falling) {
            b.fy += 300 * dt;
            if (b.fy > H + 40) balls.splice(i, 1);
            continue;
        }
        if (b.hop) {
            b.hop.t += dt;
            if (b.hop.t >= b.hop.dur) {
                b.r = b.hop.tr;
                b.c = b.hop.tc;
                b.hop = null;
                if (!inPyr(b.r, b.c)) {
                    b.falling = true;
                    const p = cellPx(Math.min(b.r, PYR - 1), Math.min(b.c, PYR - 1));
                    b.fy = p.y;
                }
            }
            continue;
        }
        b.delay -= dt;
        if (b.delay <= 0) {
            const dr = 1;
            const opts = [[dr, 0], [dr, 1]].filter(([rr, cc]) => inPyr(b.r + rr, b.c + cc));
            if (!opts.length) {
                b.falling = true;
                const p = cellPx(b.r, b.c);
                b.fy = p.y;
                continue;
            }
            const [rr, cc] = opts[Math.floor(Math.random() * opts.length)];
            startHop(b, b.r + rr, b.c + cc, 0.3);
            b.delay = Math.max(700, 2200 - level * 150);
        }
        if (!player.hop && !player.falling && b.r === player.r && b.c === player.c) loseLife();
    }
}

function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.floor(((n >> 16) & 255) * f);
    const g = Math.floor(((n >> 8) & 255) * f);
    const b = Math.floor((n & 255) * f);
    return `rgb(${r},${g},${b})`;
}

function drawCube(r, c) {
    const p = cellPx(r, c);
    const col = palette[cubes[r][c]];
    const top = [[p.x, p.y - 20], [p.x + 26, p.y - 8], [p.x, p.y + 4], [p.x - 26, p.y - 8]];
    const left = [[p.x - 26, p.y - 8], [p.x, p.y + 4], [p.x, p.y + 26], [p.x - 26, p.y + 14]];
    const right = [[p.x, p.y + 4], [p.x + 26, p.y - 8], [p.x + 26, p.y + 14], [p.x, p.y + 26]];
    const poly = (pts, fill) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fill();
    };
    poly(left, shade(col, 0.55));
    poly(right, shade(col, 0.75));
    poly(top, col);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
    ctx.closePath();
    ctx.stroke();
}

function drawChar(x, y, bodyCol, eyeCol) {
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.arc(x, y - 6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 4, y + 3, 8, 7);
    ctx.fillStyle = eyeCol;
    ctx.beginPath();
    ctx.arc(x - 4, y - 9, 4, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 9, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(x - 5, y - 10, 2, 3);
    ctx.fillRect(x + 3, y - 10, 2, 3);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < PYR; r++)
        for (let c = 0; c <= r; c++)
            drawCube(r, c);

    let pp;
    if (player.hop) pp = hopPos(player.r, player.c, player.hop);
    else if (player.falling) pp = { x: player.fx, y: player.fy };
    else pp = cellPx(player.r, player.c);
    drawChar(pp.x, pp.y - 10, '#ff9a00', '#fff');

    let cp;
    if (coily.hop) cp = hopPos(coily.r, coily.c, coily.hop);
    else cp = cellPx(coily.r, coily.c);
    drawChar(cp.x, cp.y - 10, '#b366ff', '#fff');

    for (const b of balls) {
        let bp;
        if (b.hop) bp = hopPos(b.r, b.c, b.hop);
        else bp = cellPx(Math.min(b.r, PYR - 1), Math.min(b.c, PYR - 1));
        if (b.falling) bp = { x: bp.x, y: b.fy };
        ctx.fillStyle = '#ff3355';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y - 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(bp.x - 4, bp.y - 11, 3, 3);
        ctx.fillRect(bp.x + 2, bp.y - 11, 3, 3);
    }
}

let lastTime = 0;
function loop(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    if (isRunning && !isGameOver && !paused) {
        updatePlayer(dt);
        updateCoily(dt);
        updateBalls(dt);
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
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) {
        startGame();
        return;
    }
    if (!isRunning || paused) return;
    if (e.key === 'ArrowUp' || e.key === 'w') playerMove(-1, -1);
    else if (e.key === 'ArrowRight' || e.key === 'd') playerMove(-1, 0);
    else if (e.key === 'ArrowDown' || e.key === 's') playerMove(1, 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a') playerMove(1, 0);
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});
canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
});
restartBtn.addEventListener('click', startGame);

highScoreEl.textContent = highScore;
requestAnimationFrame(loop);
