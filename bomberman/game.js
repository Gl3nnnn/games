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

const CELL = 32, COLS = 13, ROWS = 11;
const W = canvas.width, H = canvas.height;
const P_SPEED = 2, E_SPEED = 1.2, MAX_BOMBS = 2, BOMB_TIME = 2000, BLAST_RANGE = 2;

let score, highScore = parseInt(localStorage.getItem('bombermanHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let grid, bombs, flames, enemies, player, exitC, exitR;
let keys = {};

const cx = c => c * CELL + CELL / 2;
const cy = r => r * CELL + CELL / 2;
const inGrid = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

function buildLevel() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid.push([]);
        for (let c = 0; c < COLS; c++) {
            if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) grid[r].push(1);
            else if (r % 2 === 0 && c % 2 === 0) grid[r].push(1);
            else grid[r].push(0);
        }
    }
    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            if (grid[r][c] === 0 && !(r <= 2 && c <= 2) && Math.random() < 0.55) grid[r][c] = 2;
        }
    }
    grid[1][2] = 0; grid[2][1] = 0; grid[3][1] = 0; grid[1][3] = 0;

    const softCells = [];
    for (let r = 1; r < ROWS - 1; r++)
        for (let c = 1; c < COLS - 1; c++)
            if (grid[r][c] === 2) softCells.push([c, r]);
    if (softCells.length) {
        const [ec, er] = softCells[Math.floor(Math.random() * softCells.length)];
        exitC = ec; exitR = er;
    } else {
        exitC = COLS - 2; exitR = ROWS - 2;
        grid[exitR][exitC] = 3;
    }

    bombs = [];
    flames = [];
    player = { x: cx(1), y: cy(1), inv: 0 };

    enemies = [];
    const eCount = Math.min(3 + level, 7);
    for (let i = 0; i < eCount; i++) {
        let c, r, tries = 0;
        do {
            c = 1 + Math.floor(Math.random() * (COLS - 2));
            r = 1 + Math.floor(Math.random() * (ROWS - 2));
            tries++;
        } while (tries < 100 && (grid[r][c] !== 0 || (c < 5 && r < 5)));
        if (grid[r][c] === 0) {
            enemies.push({ x: cx(c), y: cy(r), c, r, tx: c, ty: r, dx: 0, dy: 0, think: 0 });
        }
    }
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
    score += 200 * level;
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
    FX.shake(400, 9);
    FX.flash('#ff2244', 200);
    if (lives <= 0) {
        isGameOver = true; isRunning = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('bombermanHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
        Scores.submit('bomberman', score);
    } else {
        player.x = cx(1); player.y = cy(1);
        player.inv = 1500;
        bombs = [];
        flames = [];
    }
}

function solidForPlayer(c, r) {
    if (!inGrid(c, r)) return true;
    const cell = grid[r][c];
    if (cell === 1 || cell === 2) return true;
    const bomb = bombs.find(b => !b.exploded && b.c === c && b.r === r);
    if (bomb) return !bomb.passable;
    return false;
}

function enemyPassable(c, r) {
    if (!inGrid(c, r)) return false;
    const cell = grid[r][c];
    if (cell !== 0 && cell !== 3) return false;
    if (bombs.some(b => !b.exploded && b.c === c && b.r === r)) return false;
    return true;
}

function blocked(x, y) {
    const rad = 11;
    const corners = [[x - rad, y - rad], [x + rad, y - rad], [x - rad, y + rad], [x + rad, y + rad]];
    return corners.some(([px, py]) => solidForPlayer(Math.floor(px / CELL), Math.floor(py / CELL)));
}

function placeBomb() {
    const c = Math.floor(player.x / CELL), r = Math.floor(player.y / CELL);
    if (bombs.some(b => !b.exploded && b.c === c && b.r === r)) return;
    if (bombs.filter(b => !b.exploded).length >= MAX_BOMBS) return;
    bombs.push({ c, r, timer: BOMB_TIME, range: BLAST_RANGE + Math.min(1, Math.floor(level / 3)), passable: true, exploded: false });
    Sfx.play('land');
}

function explodeBomb(b) {
    if (b.exploded) return;
    b.exploded = true;
    flames.push({ c: b.c, r: b.r, life: 500 });
    Sfx.play('explode');
    FX.shake(180, 5);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dc, dr] of dirs) {
        for (let i = 1; i <= b.range; i++) {
            const c = b.c + dc * i, r = b.r + dr * i;
            if (!inGrid(c, r)) break;
            const cell = grid[r][c];
            if (cell === 1) break;
            flames.push({ c, r, life: 500 });
            if (cell === 2) {
                grid[r][c] = 0;
                score += 10;
                scoreEl.textContent = score;
                Sfx.play('hit');
                if (c === exitC && r === exitR) {
                    grid[r][c] = 3;
                    Sfx.play('powerup');
                }
                break;
            }
            const nb = bombs.find(x => !x.exploded && x.c === c && x.r === r);
            if (nb) explodeBomb(nb);
        }
    }
}

function updatePlayer() {
    const p = player;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a) dx = -P_SPEED;
    else if (keys.ArrowRight || keys.d) dx = P_SPEED;
    else if (keys.ArrowUp || keys.w) dy = -P_SPEED;
    else if (keys.ArrowDown || keys.s) dy = P_SPEED;

    if (dx !== 0) {
        const nx = p.x + dx;
        if (!blocked(nx, p.y)) p.x = nx;
        else {
            const laneY = cy(Math.floor(p.y / CELL));
            const d = laneY - p.y;
            if (Math.abs(d) > 1) p.y += Math.sign(d) * Math.min(2, Math.abs(d));
        }
    }
    if (dy !== 0) {
        const ny = p.y + dy;
        if (!blocked(p.x, ny)) p.y = ny;
        else {
            const laneX = cx(Math.floor(p.x / CELL));
            const d = laneX - p.x;
            if (Math.abs(d) > 1) p.x += Math.sign(d) * Math.min(2, Math.abs(d));
        }
    }

    for (const b of bombs) {
        const onIt = Math.abs(cx(b.c) - p.x) < 14 && Math.abs(cy(b.r) - p.y) < 14;
        if (onIt) b.passable = true;
        else b.passable = false;
    }

    const pc = Math.floor(p.x / CELL), pr = Math.floor(p.y / CELL);

    if (flames.some(f => Math.hypot(f.c * CELL + CELL / 2 - p.x, f.r * CELL + CELL / 2 - p.y) < 17)) loseLife();
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const atCenter = Math.abs(e.x - cx(e.tx)) < 2 && Math.abs(e.y - cy(e.ty)) < 2;
        if (atCenter) {
            e.c = e.tx; e.r = e.ty;
            e.think -= dt;
            if (e.think <= 0) {
                e.think = 180;
                const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                    .filter(([dc, dr]) => enemyPassable(e.c + dc, e.r + dr));
                if (opts.length) {
                    let pick;
                    const forward = opts.find(o => o[0] === e.dx && o[1] === e.dy);
                    if (forward && Math.random() < 0.7) pick = forward;
                    else pick = opts[Math.floor(Math.random() * opts.length)];
                    e.dx = pick[0]; e.dy = pick[1];
                    e.tx = e.c + pick[0];
                    e.ty = e.r + pick[1];
                }
            }
        }
        const tX = cx(e.tx), tY = cy(e.ty);
        if (Math.abs(tX - e.x) > 1.5) e.x += Math.sign(tX - e.x) * E_SPEED;
        if (Math.abs(tY - e.y) > 1.5) e.y += Math.sign(tY - e.y) * E_SPEED;

        if (flames.some(f => Math.hypot(f.c * CELL + CELL / 2 - e.x, f.r * CELL + CELL / 2 - e.y) < 17)) {
            enemies.splice(i, 1);
            score += 100;
            scoreEl.textContent = score;
            Sfx.play('coin');
            continue;
        }
        if (player.inv <= 0 && Math.hypot(e.x - player.x, e.y - player.y) < 17) loseLife();
    }
    if (enemies.length === 0 && isRunning) {
        const pc = Math.floor(player.x / CELL), pr = Math.floor(player.y / CELL);
        if (grid[pr][pc] === 3) nextLevel();
    }
}

function updateBombs(dt) {
    for (const b of bombs) {
        if (b.exploded) continue;
        b.timer -= dt;
        if (b.timer <= 0) explodeBomb(b);
    }
    bombs = bombs.filter(b => !b.exploded);
    for (let i = flames.length - 1; i >= 0; i--) {
        flames[i].life -= dt;
        if (flames[i].life <= 0) flames.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL, y = r * CELL;
            const cell = grid[r][c];
            if (cell === 1) {
                ctx.fillStyle = '#39404d';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.fillStyle = '#4c5568';
                ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
            } else if (cell === 2) {
                ctx.fillStyle = '#8a5a1e';
                ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
                ctx.strokeStyle = '#c8862c';
                ctx.lineWidth = 3;
                ctx.strokeRect(x + 5, y + 5, CELL - 10, CELL - 10);
                ctx.beginPath();
                ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + CELL - 5, y + CELL - 5);
                ctx.moveTo(x + CELL - 5, y + 5); ctx.lineTo(x + 5, y + CELL - 5);
                ctx.stroke();
            } else if (cell === 3) {
                ctx.fillStyle = '#0f2a14';
                ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
                ctx.strokeStyle = '#3dff7a';
                ctx.lineWidth = 3;
                ctx.strokeRect(x + 5, y + 5, CELL - 10, CELL - 10);
                ctx.fillStyle = '#3dff7a';
                ctx.font = 'bold 16px Orbitron';
                ctx.fillText('★', x + 11, y + 22);
            }
        }
    }

    for (const b of bombs) {
        const x = cx(b.c), y = cy(b.r);
        const blink = b.timer < 700 && Math.floor(b.timer / 120) % 2 === 0;
        ctx.fillStyle = blink ? '#ff4444' : '#1c1c28';
        ctx.beginPath();
        ctx.arc(x, y + 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, y - 8);
        ctx.quadraticCurveTo(x + 10, y - 16, x + 6, y - 18);
        ctx.stroke();
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x + 5, y - 20, 3, 3);
    }

    for (const f of flames) {
        const x = cx(f.c), y = cy(f.r);
        const a = Math.min(1, f.life / 300);
        ctx.fillStyle = `rgba(255,140,0,${0.65 * a})`;
        ctx.fillRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = `rgba(255,240,120,${0.8 * a})`;
        ctx.beginPath();
        ctx.arc(x, y, 9 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const e of enemies) {
        ctx.fillStyle = '#ff66cc';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(e.x - 10, e.y, 20, 8);
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(e.x - 5, e.y - 4, 3, 3);
        ctx.fillRect(e.x + 2, e.y - 4, 3, 3);
    }

    ctx.fillStyle = '#4dd2ff';
    ctx.fillRect(player.x - 11, player.y - 13, 22, 24);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(player.x - 7, player.y - 8, 14, 7);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(player.x - 5, player.y - 7, 4, 4);
    ctx.fillRect(player.x + 2, player.y - 7, 4, 4);
    ctx.fillStyle = '#4dd2ff';
    ctx.fillRect(player.x - 11, player.y - 17, 22, 5);
}

let lastTime = 0;
function loop(t) {
    const dt = Math.min(50, t - lastTime);
    lastTime = t;
    if (isRunning && !isGameOver && !paused) {
        if (player.inv > 0) player.inv -= dt;
        updatePlayer();
        updateEnemies(dt);
        updateBombs(dt);
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
    else if (e.key === ' ' && isRunning && !paused && !e.repeat) placeBomb();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});
canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (isRunning && !paused) placeBomb();
});
restartBtn.addEventListener('click', startGame);

highScoreEl.textContent = highScore;
requestAnimationFrame(loop);
