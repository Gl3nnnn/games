const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nctx = nextCanvas.getContext('2d');

const COLS = 10, ROWS = 20, CELL = 30;

const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
};
const COLORS = {
    I: '#00ffff', O: '#ffff00', T: '#ff00ff',
    S: '#00ff00', Z: '#ff0000', J: '#4466ff', L: '#ff8800'
};
const LINE_POINTS = [0, 100, 300, 500, 800];

let board, current, next, score, lines, level;
let dropInterval, dropTimer, isGameOver, isPaused, isRunning;
let highScore = parseInt(localStorage.getItem('blockdropHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    return { type, shape: SHAPES[type].map(r => [...r]), x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2), y: 0 };
}

function rotate(piece) {
    const s = piece.shape;
    const N = s.length;
    const rotated = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => s[N - 1 - x][y]));
    return { ...piece, shape: rotated };
}

function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const nx = piece.x + x + dx, ny = piece.y + y + dy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
        }
    }
    return false;
}

function lockPiece() {
    Sfx.play('land');
    current.shape.forEach((row, y) => row.forEach((v, x) => {
        if (v && current.y + y >= 0) board[current.y + y][current.x + x] = COLORS[current.type];
    }));
    clearLines();
    current = next;
    next = randomPiece();
    drawNext();
    if (collides(current)) gameOver();
}

function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(c => c)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));
            cleared++;
            y++;
        }
    }
    if (cleared) {
        lines += cleared;
        score += LINE_POINTS[cleared] * level;
        Sfx.play('level');
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel !== level) {
            level = newLevel;
            dropInterval = Math.max(80, 700 - (level - 1) * 60);
            restartLoop();
        }
        updateUI();
    }
}

function updateUI() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
}

function ghostY() {
    let dy = 0;
    while (!collides(current, 0, dy + 1)) dy++;
    return current.y + dy;
}

function drawCell(c, x, y, color, size = CELL) {
    c.fillStyle = color;
    c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x * size + 1, y * size + 1, size - 2, 4);
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,255,255,0.08)';
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    }
    board.forEach((row, y) => row.forEach((c, x) => { if (c) drawCell(ctx, x, y, c); }));

    if (current) {
        const gy = ghostY();
        ctx.globalAlpha = 0.25;
        current.shape.forEach((row, y) => row.forEach((v, x) => {
            if (v && gy + y >= 0) drawCell(ctx, current.x + x, gy + y, COLORS[current.type]);
        }));
        ctx.globalAlpha = 1;
        ctx.shadowColor = COLORS[current.type];
        ctx.shadowBlur = 12;
        current.shape.forEach((row, y) => row.forEach((v, x) => {
            if (v && current.y + y >= 0) drawCell(ctx, current.x + x, current.y + y, COLORS[current.type]);
        }));
        ctx.shadowBlur = 0;
    }
}

function drawNext() {
    nctx.fillStyle = '#0a0a0f';
    nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const s = SHAPES[next.type];
    const size = 22;
    const offX = (nextCanvas.width - s[0].length * size) / 2 / size;
    const offY = (nextCanvas.height - s.length * size) / 2 / size;
    nctx.shadowColor = COLORS[next.type];
    nctx.shadowBlur = 8;
    s.forEach((row, y) => row.forEach((v, x) => {
        if (v) {
            nctx.fillStyle = COLORS[next.type];
            nctx.fillRect((x + offX) * size + 1, (y + offY) * size + 1, size - 2, size - 2);
        }
    }));
    nctx.shadowBlur = 0;
}

function softDrop() {
    if (!collides(current, 0, 1)) current.y++;
    else lockPiece();
}

function hardDrop() {
    while (!collides(current, 0, 1)) current.y++;
    lockPiece();
    draw();
}

function tryMove(dx, dy) {
    if (!collides(current, dx, dy)) { current.x += dx; current.y += dy; Sfx.play('move'); return true; }
    return false;
}

function tryRotate() {
    const r = rotate(current);
    for (const kick of [0, -1, 1, -2, 2]) {
        if (!collides(r, kick, 0)) { current.shape = r.shape; current.x += kick; Sfx.play('blip'); return; }
    }
}

function restartLoop() {
    if (dropTimer) clearInterval(dropTimer);
    dropTimer = setInterval(() => {
        if (!isPaused && !isGameOver) { if (!collides(current, 0, 1)) current.y++; else lockPiece(); draw(); }
    }, dropInterval);
}

function initGame() {
    board = emptyBoard();
    score = 0; lines = 0; level = 1;
    dropInterval = 700;
    isGameOver = false; isPaused = false;
    current = randomPiece(); next = randomPiece();
    updateUI(); drawNext(); draw();
}

function startGame() {
    if (isRunning) return;
    Sfx.play('select');
    initGame();
    isRunning = true;
    startScreenEl.classList.add('hidden');
    restartLoop();
}

function gameOver() {
    Sfx.play('gameover');
    isGameOver = true;
    isRunning = false;
    if (dropTimer) clearInterval(dropTimer);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('blockdropHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    if (e.key === 'p' || e.key === 'P') { isPaused = !isPaused; return; }
    if (isPaused) return;
    switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); tryMove(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); tryMove(1, 0); break;
        case 'ArrowDown': e.preventDefault(); softDrop(); score += 1; updateUI(); break;
        case 'ArrowUp': e.preventDefault(); tryRotate(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
    }
    draw();
});

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
    restartLoop();
});

initGame();
draw();
