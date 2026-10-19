const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const CELL = 40, COLS = 11, ROWS = 12;

const GOAL_COLS = [1, 3, 5, 7, 9];

let frog, cars, logs, homes, score, lives, level, isGameOver, isPaused, isRunning;
let animFrame;
let highScore = parseInt(localStorage.getItem('froggerHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function speedMul() { return 1 + (level - 1) * 0.25; }

function buildEntities() {
    cars = [];
    logs = [];

    const addCar = (row, dir, speed, len, color) =>
        cars.push({ row, dir, speed, len, color, x: Math.random() * W });

    addCar(5, 1, 1.6, 2, '#ffff00');
    addCar(5, 1, 1.6, 2, '#ffff00');
    addCar(6, -1, 2.2, 1, '#ff00ff');
    addCar(6, -1, 2.2, 1, '#ff00ff');
    addCar(7, 1, 1.8, 1, '#00ffff');
    addCar(7, 1, 1.8, 1, '#00ffff');
    addCar(8, -1, 3, 1, '#ff5500');
    addCar(8, -1, 3, 1, '#ff5500');
    addCar(9, 1, 2.5, 2, '#7cff00');
    addCar(9, 1, 2.5, 2, '#7cff00');
    cars.forEach(c => { c.x = Math.random() * W; });

    const addLog = (row, dir, speed, len, color, isTurtle) =>
        logs.push({ row, dir, speed, len, color, isTurtle, x: Math.random() * (W - len * CELL) });

    addLog(1, 1, 1.6, 3, '#ff8800', false);
    addLog(1, 1, 1.6, 2, '#ff8800', false);
    addLog(2, -1, 1.3, 3, '#00ffff', true);
    addLog(2, -1, 1.3, 2, '#00ffff', true);
    addLog(3, 1, 2.2, 4, '#ff00ff', false);
    addLog(3, 1, 2.2, 2, '#ff8800', false);
}

function initGame() {
    frog = { x: 5 * CELL + CELL / 2, row: 11, maxRow: 11 };
    homes = [false, false, false, false, false];
    score = 0; lives = 3; level = 1;
    isGameOver = false; isPaused = false;
    if (window.ArcadePause) ArcadePause.hide();
    scoreEl.textContent = 0; livesEl.textContent = 3; levelEl.textContent = 1;
    buildEntities();
}

function resetFrog() {
    frog.x = 5 * CELL + CELL / 2;
    frog.row = 11;
    frog.maxRow = 11;
}

function die() {
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) gameOver();
    else resetFrog();
}

function reachHome(slot) {
    if (homes[slot]) { die(); return; }
    homes[slot] = true;
    Sfx.play('coin');
    score += 100;
    if (homes.every(h => h)) {
        score += 500;
        level++;
        levelEl.textContent = level;
        Sfx.play('level');
        homes = [false, false, false, false, false];
    }
    scoreEl.textContent = score;
    resetFrog();
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;
    const mul = speedMul();

    cars.forEach(c => {
        c.x += c.dir * c.speed * mul;
        if (c.dir > 0 && c.x > W) c.x = -c.len * CELL;
        if (c.dir < 0 && c.x + c.len * CELL < 0) c.x = W;
    });
    logs.forEach(l => {
        l.x += l.dir * l.speed * mul;
        if (l.dir > 0 && l.x > W) l.x = -l.len * CELL;
        if (l.dir < 0 && l.x + l.len * CELL < 0) l.x = W;
    });

    const fy = frog.row * CELL;

    if (frog.row >= 5 && frog.row <= 9) {
        for (const c of cars) {
            if (c.row !== frog.row) continue;
            if (frog.x + 12 > c.x && frog.x - 12 < c.x + c.len * CELL) { die(); return; }
        }
    }

    if (frog.row >= 1 && frog.row <= 3) {
        const log = logs.find(l => l.row === frog.row &&
            frog.x + 10 > l.x && frog.x - 10 < l.x + l.len * CELL);
        if (log) {
            frog.x += log.dir * log.speed * mul;
            if (frog.x < -6 || frog.x > W + 6) { die(); return; }
        } else {
            die(); return;
        }
    }

    if (frog.x < 6 || frog.x > W - 6) { die(); return; }
}

function move(dir) {
    if (isGameOver || isPaused || !isRunning) return;
    Sfx.play('move');
    if (dir === 'up') frog.row--;
    if (dir === 'down') frog.row = Math.min(11, frog.row + 1);
    if (dir === 'left') frog.x -= CELL;
    if (dir === 'right') frog.x += CELL;

    if (frog.row < 0) { frog.row = 0; }

    if (frog.row < frog.maxRow && dir === 'up') {
        score += 10;
        frog.maxRow = frog.row;
        scoreEl.textContent = score;
    }

    if (frog.row === 0) {
        const slotIdx = Math.floor(frog.x / CELL);
        if (slotIdx % 2 === 1 && slotIdx <= 9) reachHome((slotIdx - 1) / 2);
        else die();
        return;
    }
}

function drawFrog(x, y) {
    ctx.shadowColor = '#7cff00'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#7cff00';
    ctx.beginPath(); ctx.arc(x, y + 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 7, y - 7, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, y - 7, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(x - 6, y - 9, 3, 3);
    ctx.fillRect(x + 3, y - 9, 3, 3);
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#051a05';
    ctx.fillRect(0, 0, W, CELL);
    homes.forEach((h, i) => {
        if (h) drawFrog(GOAL_COLS[i] * CELL + CELL / 2, CELL / 2);
    });
    for (let i = 0; i <= COLS; i++) {
        ctx.fillStyle = 'rgba(124,255,0,0.25)';
        ctx.fillRect(i * CELL - 1, 0, 2, CELL);
    }

    ctx.fillStyle = '#001a33';
    ctx.fillRect(0, CELL, W, CELL * 3);
    ctx.shadowBlur = 0;
    logs.forEach(l => {
        for (let i = 0; i < l.len; i++) {
            ctx.shadowColor = l.color; ctx.shadowBlur = 8;
            ctx.fillStyle = l.color;
            if (l.isTurtle) {
                ctx.fillRect(l.x + i * CELL + 4, l.row * CELL + 8, CELL - 8, CELL - 16);
                ctx.fillStyle = 'rgba(10,10,15,0.5)';
                ctx.fillRect(l.x + i * CELL + 12, l.row * CELL + 14, 6, 6);
            } else {
                ctx.fillRect(l.x + i * CELL + 2, l.row * CELL + 10, CELL - 4, CELL - 20);
            }
        }
    });
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, CELL * 4, W, CELL);
    ctx.fillStyle = 'rgba(124,255,0,0.35)';
    ctx.font = '11px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE', W / 2, CELL * 4 + 24);

    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, CELL * 5, W, CELL * 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.setLineDash([12, 14]);
    for (let r = 6; r <= 10; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
    }
    ctx.setLineDash([]);

    cars.forEach(c => {
        const y = c.row * CELL;
        ctx.shadowColor = c.color; ctx.shadowBlur = 10;
        ctx.fillStyle = c.color;
        ctx.fillRect(c.x + 2, y + 8, c.len * CELL - 4, CELL - 16);
        ctx.fillStyle = 'rgba(10,10,15,0.6)';
        if (c.len === 2) ctx.fillRect(c.x + 8, y + 12, CELL - 8, CELL - 24);
        else ctx.fillRect(c.x + 12, y + 12, CELL - 24, CELL - 24);
        ctx.shadowBlur = 0;
    });

    ctx.fillStyle = '#051a05';
    ctx.fillRect(0, CELL * 10, W, CELL);
    ctx.fillRect(0, CELL * 11, W, CELL);

    drawFrog(frog.x, frog.row * CELL + CELL / 2);
}

function loop() {
    if (!isGameOver && isRunning) update();
    draw();
    animFrame = requestAnimationFrame(loop);
}

function gameOver() {
    Sfx.play('gameover');
    Scores.submit('frogger', score);
    isGameOver = true; isRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('froggerHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
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
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
});

canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    const x = (t.clientX - r.left) / r.width;
    const y = (t.clientY - r.top) / r.height;
    if (y < 0.25 && x > 0.25 && x < 0.75) move('up');
    else if (y > 0.75 && x > 0.25 && x < 0.75) move('down');
    else if (x < 0.35) move('left');
    else if (x > 0.65) move('right');
    else move('up');
}, { passive: false });

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

initGame();
draw();
loop();
