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
const CELL = 22, COLS = 20, ROWS = 20;
const P_SPEED = 1.7, E_SPEED = 1.1;

let score, highScore = parseInt(localStorage.getItem('digdugHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let dirt, player, enemies, shots, fires, keys = {};
let enemyStepTimer, digSoundTimer = 0;

const isWall = (c, r) => c <= 0 || r <= 0 || c >= COLS - 1 || r >= ROWS - 1;
const cellOf = (x, y) => [Math.floor(x / CELL), Math.floor(y / CELL)];
const cx = c => c * CELL + CELL / 2;
const cy = r => r * CELL + CELL / 2;

function buildLevel() {
    dirt = [];
    for (let r = 0; r < ROWS; r++) {
        dirt.push([]);
        for (let c = 0; c < COLS; c++) dirt[r].push(!isWall(c, r));
    }
    for (let r = 16; r <= 18; r++) for (let c = 1; c <= 3; c++) dirt[r][c] = false;
    for (let r = 2; r <= 3; r++) for (let c = 6; c <= 13; c++) dirt[r][c] = false;

    player = { x: cx(2), y: cy(17), face: { x: 1, y: 0 } };
    shots = [];
    fires = [];
    enemies = [];
    const count = Math.min(2 + level, 6);
    for (let i = 0; i < count; i++) {
        const c = 7 + (i % 4) * 2;
        enemies.push({
            x: cx(c), y: cy(2), tx: c, ty: 2, cell: [c, 2],
            type: i % 2 === 1 ? 'fygar' : 'pooka',
            inflate: 0, frozen: 0, fireCd: 2000 + Math.random() * 3000
        });
    }
    enemyStepTimer = 0;
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
    score += 100 * level;
    scoreEl.textContent = score;
    level++;
    levelEl.textContent = level;
    Sfx.play('level');
    buildLevel();
}

function loseLife() {
    lives--;
    livesEl.textContent = lives;
    Sfx.play('die');
    if (lives <= 0) {
        isGameOver = true; isRunning = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('digdugHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
    } else {
        player.x = cx(2); player.y = cy(17);
        shots = []; fires = [];
    }
}

function updatePlayer() {
    const p = player;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a) dx = -1;
    else if (keys.ArrowRight || keys.d) dx = 1;
    else if (keys.ArrowUp || keys.w) dy = -1;
    else if (keys.ArrowDown || keys.s) dy = 1;
    if (dx === 0 && dy === 0) return;
    p.face = { x: dx, y: dy };
    const nx = p.x + dx * P_SPEED, ny = p.y + dy * P_SPEED;
    const [c1, r1] = cellOf(nx + dx * 9, ny + dy * 9);
    if (isWall(c1, r1)) return;
    p.x = nx; p.y = ny;
    if (dirt[r1] && dirt[r1][c1]) {
        dirt[r1][c1] = false;
        const now = performance.now();
        if (now - digSoundTimer > 220) {
            Sfx.play('chomp');
            digSoundTimer = now;
        }
    }
}

function shoot() {
    const p = player;
    shots.push({ x: p.x, y: p.y, dx: p.face.x, dy: p.face.y, range: CELL * 4.5 });
    Sfx.play('shoot');
}

function enemyCanMove(e) {
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [c, r] = e.cell;
    const ok = opts.filter(([dc, dr]) => {
        const nc = c + dc, nr = r + dr;
        return !isWall(nc, nr) && dirt[nr] && !dirt[nr][nc];
    });
    if (!ok.length) return null;
    const [pc, pr] = cellOf(player.x, player.y);
    ok.sort((a, b) => {
        const da = Math.abs(c + a[0] - pc) + Math.abs(r + a[1] - pr);
        const db = Math.abs(c + b[0] - pc) + Math.abs(r + b[1] - pr);
        return da - db;
    });
    if (Math.random() < 0.75) return ok[0];
    return ok[Math.floor(Math.random() * ok.length)];
}

function updateEnemies(dt) {
    const stepEvery = Math.max(160, 420 - level * 25);
    enemyStepTimer += dt;
    const doStep = enemyStepTimer >= stepEvery;
    if (doStep) enemyStepTimer = 0;

    for (const e of enemies) {
        if (e.inflate > 0) continue;
        e.frozen = Math.max(0, e.frozen - dt);
        e.fireCd -= dt;

        const [ec, er] = cellOf(e.x, e.y);
        const arrived = Math.abs(e.x - cx(ec)) < 2 && Math.abs(e.y - cy(er)) < 2;
        if (arrived && (e.cell[0] !== ec || e.cell[1] !== er || doStep)) {
            e.cell = [ec, er];
            if (doStep) {
                const dir = enemyCanMove(e);
                if (dir) {
                    e.tx = ec + dir[0];
                    e.ty = er + dir[1];
                } else {
                    e.tx = ec; e.ty = er;
                }
            }
        }
        const tX = cx(e.tx), tY = cy(e.ty);
        const vx = Math.sign(tX - e.x) * E_SPEED, vy = Math.sign(tY - e.y) * E_SPEED;
        if (Math.abs(tX - e.x) > 2) e.x += vx;
        if (Math.abs(tY - e.y) > 2) e.y += vy;

        if (e.type === 'fygar' && e.fireCd <= 0 && e.inflate === 0) {
            const [pc, pr] = cellOf(player.x, player.y);
            if (er === pr && Math.abs(ec - pc) <= 5) {
                const dir = pc > ec ? 1 : -1;
                let clear = true;
                for (let c = ec + dir; c !== pc; c += dir) {
                    if (dirt[pr] && dirt[pr][c]) clear = false;
                }
                if (clear && ec !== pc) {
                    fires.push({ x: e.x, y: e.y, dir, life: 40 });
                    Sfx.play('pellet');
                    e.fireCd = 4000 + Math.random() * 4000;
                } else e.fireCd = 2000;
            } else e.fireCd = 1500;
        }

        if (Math.hypot(e.x - player.x, e.y - player.y) < 15) loseLife();
    }
    if (enemies.length === 0 && isRunning) nextLevel();
}

function updateShots() {
    for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.dx * 4.5;
        s.y += s.dy * 4.5;
        s.range -= 4.5;
        const [c, r] = cellOf(s.x, s.y);
        let dead = s.range <= 0 || isWall(c, r);
        if (!dead && dirt[r] && dirt[r][c]) dead = true;
        for (const e of enemies) {
            if (dead) break;
            if (Math.hypot(e.x - s.x, e.y - s.y) < 13) {
                e.inflate++;
                e.frozen = 700;
                dead = true;
                if (e.inflate >= 2) {
                    score += e.type === 'fygar' ? 400 : 200;
                    scoreEl.textContent = score;
                    enemies.splice(enemies.indexOf(e), 1);
                    Sfx.play('explode');
                } else {
                    Sfx.play('bounce');
                    e.tx = Math.round(e.x / CELL - 0.5);
                    e.ty = Math.round(e.y / CELL - 0.5);
                }
            }
        }
        if (dead) shots.splice(i, 1);
    }
}

function updateFires() {
    for (let i = fires.length - 1; i >= 0; i--) {
        const f = fires[i];
        f.x += f.dir * 2.6;
        f.life--;
        const [c, r] = cellOf(f.x, f.y);
        if (f.life <= 0 || isWall(c, r) || (dirt[r] && dirt[r][c])) {
            fires.splice(i, 1);
            continue;
        }
        if (Math.hypot(f.x - player.x, f.y - player.y) < 12) loseLife();
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (isWall(c, r)) {
                ctx.fillStyle = '#2f3542';
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
                ctx.fillStyle = '#444c5c';
                ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
            } else if (dirt[r][c]) {
                ctx.fillStyle = '#3a2410';
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
                ctx.fillStyle = '#4a3015';
                ctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
            }
        }
    }

    for (const f of fires) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ffae00' : '#ff4444';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 7 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const s of shots) {
        ctx.strokeStyle = '#ffe14d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x - s.dx * 8, s.y - s.dy * 8);
        ctx.lineTo(s.x + s.dx * 6, s.y + s.dy * 6);
        ctx.stroke();
    }

    for (const e of enemies) {
        const col = e.type === 'fygar' ? '#44ff66' : '#ff4455';
        ctx.fillStyle = col;
        const rr = 10 + (e.inflate > 0 ? 5 : 0);
        ctx.beginPath();
        ctx.arc(e.x, e.y - 2, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(e.x - 6, e.y - 6, 4, 4);
        ctx.fillRect(e.x + 2, e.y - 6, 4, 4);
        if (e.inflate > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y - 2, rr + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    const p = player;
    ctx.fillStyle = '#4dd2ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(p.x + p.face.x * 3 - 2, p.y + p.face.y * 3 - 2, 4, 4);
    ctx.strokeStyle = '#4dd2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.face.x * 13, p.y + p.face.y * 13);
    ctx.stroke();
}

let lastTime = 0;
function loop(t) {
    const dt = Math.min(50, t - lastTime);
    lastTime = t;
    if (isRunning && !isGameOver && !paused) {
        updatePlayer();
        updateEnemies(dt);
        updateShots();
        updateFires();
    }
    if (isRunning) draw();
    requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        if (isRunning && !isGameOver) {
            paused = !paused;
            pauseEl.classList.toggle('hidden', !paused);
            if (paused) Sfx.play('blip');
        }
        return;
    }
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (e.key === ' ' && isRunning && !paused) shoot();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});
canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (isRunning && !paused) shoot();
});
restartBtn.addEventListener('click', startGame);

highScoreEl.textContent = highScore;
requestAnimationFrame(loop);
