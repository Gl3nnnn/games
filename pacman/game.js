const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MAZE = [
    '###################',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o##.###.#.###.##o#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.###.#.###.####',
    '####.#.......#.####',
    '####.#.##-##.#.####',
    '    .#.#   #.#.    ',
    '####.#.#####.#.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#...........#.o#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#.................#',
    '#.#####.###.#####.#',
    '###################'
];
const C = 22, COLS = 19, ROWS = 21;
const W = COLS * C, H = ROWS * C;
const TUNNEL_ROW = 10;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const GHOST_DEFS = [
    { name: 'blinky', color: '#ff2222', spawn: [7, 8], corner: [17, 1] },
    { name: 'pinky',  color: '#ffb8ff', spawn: [8, 8], corner: [1, 1] },
    { name: 'inky',   color: '#00ffff', spawn: [10, 8], corner: [17, 19] },
    { name: 'clyde',  color: '#ffb852', spawn: [11, 8], corner: [1, 19] }
];

let pac, ghosts, maze, dots, pelletCount, frightenedTimer, ghostCombo;
let fruit = null, dotsEaten = 0, fruitTimer = 0;
let score, lives, level, isGameOver, isPaused, isRunning, mouthPhase;
let highScore = parseInt(localStorage.getItem('pacmanHighScore')) || 0;

const canvasEl = canvas;
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

canvas.width = W; canvas.height = H;
highScoreEl.textContent = highScore;

function buildLevel() {
    maze = MAZE.map(r => r.split(''));
    dots = [];
    pelletCount = 0;
    dotsEaten = 0;
    mouthPhase = 0;
    fruit = null;
    fruitTimer = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (maze[r][c] === '.') { dots.push([c, r]); maze[r][c] = ' '; pelletCount++; }
            if (maze[r][c] === 'o') pelletCount++;
        }
    }
}

function canWalk(col, row, isGhost) {
    if (row === TUNNEL_ROW && (col < 0 || col >= COLS)) return true;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const t = maze[row][col];
    if (t === '#') return false;
    if (t === '-' && !isGhost) return false;
    return true;
}

function makeMover(col, row, speed) {
    return {
        col, row, fromCol: col, fromRow: row, toCol: col, toRow: row,
        p: 1, dir: null, queued: null, speed, moving: false
    };
}

function stepTo(m, dir) {
    const [dx, dy] = DIRS[dir];
    let nc = m.col + dx, nr = m.row + dy;
    let wrap = false;
    if (nr === TUNNEL_ROW) {
        if (nc < 0) { nc = COLS - 1; wrap = true; }
        else if (nc >= COLS) { nc = 0; wrap = true; }
    }
    if (!canWalk(nc, nr, m.isGhost)) return false;
    if (wrap) {
        m.col = nc; m.row = nr;
        m.fromCol = nc; m.fromRow = nr;
        m.toCol = nc; m.toRow = nr;
        m.p = 1; m.dir = dir; m.moving = false;
        if (m.facing !== undefined) m.facing = dir;
        return true;
    }
    m.fromCol = m.col; m.fromRow = m.row;
    m.toCol = nc; m.toRow = nr;
    m.p = 0; m.dir = dir; m.moving = true;
    return true;
}

function atCenter(m) { return !m.moving; }

function arrive(m) {
    m.col = m.toCol; m.row = m.toRow;
    m.moving = false; m.p = 1;
}

function drawPos(m) {
    const t = m.moving ? m.p : 1;
    return {
        x: (m.fromCol + (m.toCol - m.fromCol) * t + 0.5) * C,
        y: (m.fromRow + (m.toRow - m.fromRow) * t + 0.5) * C
    };
}

function ghostTarget(g) {
    if (g.eyes) return { col: 9, row: 9 };
    const [dx, dy] = DIRS[pac.dir || 'left'];
    if (g.name === 'blinky') return { col: pac.col, row: pac.row };
    if (g.name === 'pinky') return { col: pac.col + dx * 4, row: pac.row + dy * 4 };
    if (g.name === 'inky') return { col: pac.col + dx * 2 + (Math.random() < 0.5 ? 2 : -2), row: pac.row + dy * 2 };
    const dist = Math.hypot(pac.col - g.col, pac.row - g.row);
    if (dist > 7) return { col: pac.col, row: pac.row };
    return { col: g.corner[0], row: g.corner[1] };
}

function chooseGhostDir(g) {
    const options = Object.keys(DIRS).filter(d => {
        if (d === OPPOSITE[g.dir]) return false;
        const [dx, dy] = DIRS[d];
        return canWalk(g.col + dx, g.row + dy, true);
    });
    const valid = options.length ? options :
        Object.keys(DIRS).filter(d => { const [dx, dy] = DIRS[d]; return canWalk(g.col + dx, g.row + dy, true); });
    if (!valid.length) return null;

    if (g.eyes || (frightenedTimer <= 0 && Math.random() < 0.12)) {
        const t = ghostTarget(g);
        valid.sort((a, b) => {
            const [ax, ay] = DIRS[a], [bx, by] = DIRS[b];
            const da = Math.hypot(g.col + ax - t.col, g.row + ay - t.row);
            const db = Math.hypot(g.col + bx - t.col, g.row + by - t.row);
            return da - db;
        });
        return valid[0];
    }
    if (frightenedTimer > 0 && !g.eyes) {
        return valid[Math.floor(Math.random() * valid.length)];
    }
    const t = ghostTarget(g);
    valid.sort((a, b) => {
        const [ax, ay] = DIRS[a], [bx, by] = DIRS[b];
        const da = Math.hypot(g.col + ax - t.col, g.row + ay - t.row);
        const db = Math.hypot(g.col + bx - t.col, g.row + by - t.row);
        return da - db;
    });
    return valid[0];
}

function resetPositions() {
    pac = makeMover(9, 18, 2.1);
    pac.isGhost = false;
    pac.facing = 'left';
    ghosts = GHOST_DEFS.map((def, i) => {
        const g = makeMover(def.spawn[0], def.spawn[1], 1.8);
        g.isGhost = true;
        g.name = def.name; g.color = def.color; g.corner = def.corner;
        g.eyes = false; g.release = i * 45;
        return g;
    });
    frightenedTimer = 0;
    ghostCombo = 0;
}

function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacmanHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function eatDot() {
    if (fruit && pac.col === fruit.col && pac.row === fruit.row) {
        addScore(fruit.value);
        Sfx.play('coin');
        fruit = null;
        fruitTimer = 0;
    }
    const key = `${pac.col},${pac.row}`;
    const idx = dots.findIndex(d => `${d[0]},${d[1]}` === key);
    if (idx >= 0) {
        dots.splice(idx, 1);
        pelletCount--;
        addScore(10);
        Sfx.play('chomp');
        dotsEaten++;
        if (dotsEaten === 70 || dotsEaten === 140) {
            fruit = { col: 9, row: 14, value: 100 + (level - 1) * 200 };
            fruitTimer = 60 * 14;
        }
        if (pelletCount <= 0) {
            level++;
            levelEl.textContent = level;
            Sfx.play('level');
            buildLevel();
            resetPositions();
        }
        return;
    }
    if (maze[pac.row] && maze[pac.row][pac.col] === 'o') {
        maze[pac.row][pac.col] = ' ';
        pelletCount--;
        addScore(50);
        Sfx.play('powerup');
        frightenedTimer = Math.max(4, 8 - (level - 1) * 0.7) * 60;
        ghostCombo = 0;
        ghosts.forEach(g => { if (!g.eyes) { g.dir = OPPOSITE[g.dir] || g.dir; } });
    }
}

function die() {
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { gameOver(); return; }
    resetPositions();
}

function gameOver() {
    Sfx.play('gameover');
    Scores.submit('pacman', score);
    isGameOver = true; isRunning = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    mouthPhase += 0.25;
    if (frightenedTimer > 0) frightenedTimer--;
    if (fruitTimer > 0) {
        fruitTimer--;
        if (fruitTimer <= 0) fruit = null;
    }

    if (!pac.moving) {
        const q = pac.queued;
        pac.queued = null;
        if (!(q && stepTo(pac, q))) {
            if (pac.dir) stepTo(pac, pac.dir);
        }
    }
    if (pac.moving) {
        pac.p += pac.speed / C;
        if (pac.p >= 1) { arrive(pac); pac.facing = pac.dir; eatDot(); }
    }

    ghosts.forEach(g => {
        if (g.release > 0) { g.release--; return; }
        if (!g.moving) {
            const d = chooseGhostDir(g);
            if (d) stepTo(g, d);
        } else {
            g.p += (g.eyes ? 3.6 : frightenedTimer > 0 ? 1.2 : 1.7 + level * 0.08) / C;
            if (g.p >= 1) {
                arrive(g);
                if (g.eyes && g.col === 9 && g.row === 9) g.eyes = false;
            }
        }
    });

    const pp = drawPos(pac);
    for (const g of ghosts) {
        if (g.release > 0) continue;
        const gp = drawPos(g);
        if (Math.hypot(pp.x - gp.x, pp.y - gp.y) < C * 0.65) {
            if (g.eyes) continue;
            if (frightenedTimer > 0) {
                ghostCombo++;
                addScore(200 * Math.pow(2, ghostCombo - 1));
                Sfx.play('coin');
                g.eyes = true;
            } else {
                die();
                return;
            }
        }
    }
}

function drawMaze() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = MAZE[r][c];
            if (t === '#') {
                ctx.fillStyle = '#0d1030';
                ctx.fillRect(c * C, r * C, C, C);
                ctx.strokeStyle = '#3355ff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#3355ff';
                ctx.shadowBlur = 6;
                const n = r > 0 && MAZE[r - 1][c] === '#', s = r < ROWS - 1 && MAZE[r + 1][c] === '#';
                const l = c > 0 && MAZE[r][c - 1] === '#', ri = c < COLS - 1 && MAZE[r][c + 1] === '#';
                ctx.beginPath();
                if (!n) { ctx.moveTo(c * C + 3, r * C + 3); ctx.lineTo(c * C + C - 3, r * C + 3); }
                if (!s) { ctx.moveTo(c * C + 3, r * C + C - 3); ctx.lineTo(c * C + C - 3, r * C + C - 3); }
                if (!l) { ctx.moveTo(c * C + 3, r * C + 3); ctx.lineTo(c * C + 3, r * C + C - 3); }
                if (!ri) { ctx.moveTo(c * C + C - 3, r * C + 3); ctx.lineTo(c * C + C - 3, r * C + C - 3); }
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (t === '-') {
                ctx.fillStyle = '#ffb8ff';
                ctx.fillRect(c * C + 2, r * C + C / 2 - 2, C - 4, 4);
            }
        }
    }
    ctx.fillStyle = '#ffcc00';
    dots.forEach(([c, r]) => {
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(c * C + C / 2, r * C + C / 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    const pulse = 4 + Math.sin(Date.now() / 180) * 2;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (maze[r][c] === 'o') {
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(c * C + C / 2, r * C + C / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

function drawPac() {
    const { x, y } = drawPos(pac);
    const angles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const base = angles[pac.moving ? pac.dir : pac.facing] || Math.PI;
    const mouth = 0.25 + Math.abs(Math.sin(mouthPhase)) * 0.35;
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, C * 0.45, base + mouth, base - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawGhost(g) {
    const { x, y } = drawPos(g);
    const r = C * 0.45;
    const fright = frightenedTimer > 0 && !g.eyes;
    const flash = fright && frightenedTimer < 120 && Math.floor(frightenedTimer / 10) % 2 === 0;

    if (!g.eyes) {
        ctx.fillStyle = fright ? (flash ? '#ffffff' : '#2233ff') : g.color;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y - 2, r, Math.PI, 0);
        ctx.lineTo(x + r, y + r * 0.75);
        for (let i = 0; i < 3; i++) {
            const bx = x + r - (i + 0.5) * (r * 2 / 3);
            ctx.quadraticCurveTo(bx + r / 6, y + r * 0.4, bx, y + r * 0.75);
        }
        ctx.lineTo(x - r, y + r * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    const [dx, dy] = DIRS[g.moving ? g.dir : (g.dir || 'left')] || [0, 0];
    const eyeOff = 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 4, y - 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fright && !g.eyes ? '#ff2222' : '#2233ff';
    ctx.beginPath(); ctx.arc(x - 4 + dx * 1.5, y - 3 + dy * 1.5, 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 + dx * 1.5, y - 3 + dy * 1.5, 1.9, 0, Math.PI * 2); ctx.fill();
}

function draw() {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);
    drawMaze();
    if (fruit) {
        const fx = fruit.col * C + C / 2, fy = fruit.row * C + C / 2;
        ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff2222';
        ctx.beginPath(); ctx.arc(fx - 4, fy + 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(fx + 4, fy + 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00cc44'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fx, fy - 2); ctx.quadraticCurveTo(fx + 2, fy - 8, fx + 6, fy - 8); ctx.stroke();
        ctx.shadowBlur = 0;
    }
    drawPac();
    ghosts.forEach(drawGhost);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(14 + i * 20, H - 9, 7, 0.45 * Math.PI, 1.55 * Math.PI);
        ctx.closePath();
        ctx.fill();
    }
}

function loop() {
    if (!isGameOver && isRunning && !isPaused) update();
    draw();
    requestAnimationFrame(loop);
}

function initGame() {
    score = 0; lives = 3; level = 1;
    isGameOver = false; isPaused = false;
    if (window.ArcadePause) ArcadePause.hide();
    scoreEl.textContent = 0; livesEl.textContent = 3; levelEl.textContent = 1;
    buildLevel();
    resetPositions();
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
    if (e.key === 'p' || e.key === 'P') { if (!e.repeat) { isPaused = !isPaused; if (window.ArcadePause) ArcadePause.set(isPaused); } return; }
    const map = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right'
    };
    if (map[e.key]) {
        e.preventDefault();
        pac.queued = map[e.key];
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    e.preventDefault();
    window._touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});
canvas.addEventListener('touchend', (e) => {
    if (!window._touchStart || isGameOver || !isRunning) return;
    const s = window._touchStart;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    let dir = null;
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';
    pac.queued = dir;
    window._touchStart = null;
});

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

initGame();
draw();
loop();
