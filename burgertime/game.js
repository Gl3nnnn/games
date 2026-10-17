const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const COLS = 14;
const CELL = 40;
const OX = 30;
const FLOOR_Y = [48, 138, 228, 318];
const BOTTOM = 3;
const LADDERS = [
    [3, 10],
    [1, 6, 12],
    [3, 10]
];
const LAYER_TYPES = [
    { id: 'bb', color: '#c8863c' },
    { id: 'patty', color: '#8b4513' },
    { id: 'cheese', color: '#ffd700' },
    { id: 'lettuce', color: '#32cd32' },
    { id: 'tomato', color: '#ff4444' },
    { id: 'bt', color: '#e8c07a' }
];
const ENEMY_DEFS = [
    { name: 'hotdog', color: '#ff6633' },
    { name: 'egg', color: '#fff8dc' },
    { name: 'pickle', color: '#66bb33' },
    { name: 'hotdog', color: '#ff6633' }
];

let player, enemies, layers, particles;
let score, lives, pepper, level, burgersLeft;
let isGameOver, isPaused, isRunning;
let killRespawn;
let highScore = parseInt(localStorage.getItem('burgerTimeHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const livesEl = document.getElementById('lives');
const pepperEl = document.getElementById('pepper');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function colX(c) { return OX + c * CELL + CELL / 2; }
function xCol(x) { return Math.round((x - OX - CELL / 2) / CELL); }
function onLadder(f, c) { return f >= 0 && f < LADDERS.length && LADDERS[f].includes(c); }
function ladderTo(f, dir) {
    if (dir < 0) return onLadder(f - 1, xCol(player.x)) ? f - 1 : -1;
    return onLadder(f, xCol(player.x)) ? f + 1 : -1;
}

function slotFree(col, floor, exceptBurger) {
    return !layers.some(l => l.col === col && l.floor === floor && l.burger !== exceptBurger);
}

function initLevel() {
    layers = [];
    enemies = [];
    particles = [];
    killRespawn = [];
    const taken = new Set();
    for (let b = 0; b < 3; b++) {
        for (let i = 0; i < 6; i++) {
            let col, floor, key, tries = 0;
            do {
                col = Math.floor(Math.random() * COLS);
                floor = Math.floor(Math.random() * 3);
                key = col + ',' + floor;
                tries++;
            } while (taken.has(key) && tries < 80);
            taken.add(key);
            layers.push({
                burger: b, idx: i, type: LAYER_TYPES[i],
                col, floor, cool: 0, yLerp: 0
            });
        }
    }
    const ec = Math.min(2 + level - 1, 4);
    for (let i = 0; i < ec; i++) {
        const def = ENEMY_DEFS[i % ENEMY_DEFS.length];
        enemies.push({
            x: colX(Math.floor(Math.random() * COLS)),
            floor: Math.floor(Math.random() * 3),
            dir: Math.random() < 0.5 ? -1 : 1,
            stun: 0, def,
            climbing: null
        });
    }
    burgersLeft = 3;
    player = { x: colX(0), floor: BOTTOM, climbing: null, inv: 90 };
    pepper = 5;
    pepperEl.textContent = pepper;
}

function initGame() {
    score = 0; lives = 3; level = 1;
    isGameOver = false; isPaused = false;
    scoreEl.textContent = 0; livesEl.textContent = 3;
    initLevel();
    pauseOverlay.classList.add('hidden');
}

function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('burgerTimeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function explode(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 2.5 + 0.8;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 22, color });
    }
}

function loseLife() {
    if (player.inv > 0) return;
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    explode(player.x, FLOOR_Y[player.floor] - 14, '#00ffff', 16);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { endGame(); return; }
    player = { x: colX(0), floor: BOTTOM, climbing: null, inv: 120 };
}

function endGame() {
    Sfx.play('gameover');
    Scores.submit('burgerTime', score);
    isGameOver = true; isRunning = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function usePepper() {
    if (pepper <= 0 || !isRunning || isGameOver) return;
    pepper--;
    pepperEl.textContent = pepper;
    Sfx.play('pellet');
    FX.flash('rgba(255,255,255,0.25)', 120);
    enemies.forEach(e => {
        if (Math.abs(e.x - player.x) < 150 && Math.abs(e.floor - player.floor) <= 1) {
            e.stun = 200;
        }
    });
}

function checkAssembly() {
    for (let b = 0; b < 3; b++) {
        const bl = layers.filter(l => l.burger === b);
        if (!bl.length) continue;
        if (bl.every(l => l.floor === BOTTOM)) {
            const cols = {};
            bl.forEach(l => { cols[l.col] = (cols[l.col] || 0) + 1; });
            if (Object.values(cols).some(n => n >= 6)) {
                layers = layers.filter(l => l.burger !== b);
                burgersLeft--;
                addScore(500);
                Sfx.play('win');
                if (burgersLeft <= 0) {
                    addScore(1000);
                    Sfx.play('level');
                    level++;
                    initLevel();
                }
            }
        }
    }
}

function dropOrSlide(layer) {
    if (layer.cool > 0) return;
    if (layer.floor < BOTTOM) {
        const nf = layer.floor + 1;
        if (slotFree(layer.col, nf, layer.burger)) {
            layer.floor = nf;
            layer.cool = 25;
            Sfx.play('bounce');
            checkAssembly();
        }
    } else {
        const mates = layers.filter(l => l.burger === layer.burger && l.floor === BOTTOM);
        const avg = mates.reduce((s, l) => s + l.col, 0) / mates.length;
        const dir = Math.sign(avg - layer.col);
        if (dir !== 0) {
            const nc = layer.col + dir;
            if (nc >= 0 && nc < COLS && !layers.some(l => l.col === nc && l.floor === BOTTOM && l.burger !== layer.burger)) {
                layer.col = nc;
                layer.cool = 22;
                Sfx.play('blip');
                checkAssembly();
            }
        }
    }
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    if (player.inv > 0) player.inv--;
    layers.forEach(l => { if (l.cool > 0) l.cool--; });

    if (player.climbing) {
        player.climbing.t += 1 / 28;
        const cl = player.climbing;
        player.x = colX(cl.col);
        player.floor = cl.toF;
        if (cl.t >= 1) {
            player.climbing = null;
            player.floor = cl.toF;
        }
    } else {
        if (keys.ArrowLeft || keys.a || keys.A) player.x -= 2.9;
        if (keys.ArrowRight || keys.d || keys.D) player.x += 2.9;
        player.x = Math.max(colX(0), Math.min(colX(COLS - 1), player.x));
        if (keys.ArrowUp || keys.w || keys.W) {
            keys.ArrowUp = keys.w = keys.W = false;
            const tf = ladderTo(player.floor, -1);
            if (tf >= 0) { player.climbing = { fromF: player.floor, toF: tf, col: xCol(player.x), t: 0 }; Sfx.play('move'); }
        }
        if (keys.ArrowDown || keys.s || keys.S) {
            keys.ArrowDown = keys.s = keys.S = false;
            const tf = ladderTo(player.floor, 1);
            if (tf >= 0 && tf <= BOTTOM) { player.climbing = { fromF: player.floor, toF: tf, col: xCol(player.x), t: 0 }; Sfx.play('move'); }
        }
        if (!player.climbing) {
            layers.forEach(l => {
                if (l.floor === player.floor && Math.abs(colX(l.col) - player.x) < 18) dropOrSlide(l);
            });
        }
    }

    enemies.forEach(e => {
        if (Math.abs(e.x - player.x) < 16 && e.floor === player.floor && !player.climbing) {
            if (e.stun > 0) {
                addScore(200);
                Sfx.play('hit');
                explode(e.x, FLOOR_Y[e.floor] - 12, e.def.color, 12);
                e.x = colX(Math.floor(Math.random() * COLS));
                e.floor = Math.floor(Math.random() * 3);
                e.stun = 60;
            } else if (player.inv <= 0) {
                loseLife();
            }
        }
        if (e.stun > 0) { e.stun--; return; }
        if (e.climbing) {
            e.climbing.t += 1 / 32;
            e.floor = e.climbing.toF;
            e.x = colX(e.climbing.col);
            if (e.climbing.t >= 1) e.climbing = null;
            return;
        }
        const pf = player.floor;
        const speed = 1.15 + level * 0.1;
        if (e.floor !== pf) {
            const wantDown = pf > e.floor;
            const li = wantDown ? e.floor : e.floor - 1;
            if (li >= 0 && li < LADDERS.length) {
                const lcols = LADDERS[li];
                const nearest = lcols.reduce((a, b) =>
                    Math.abs(colX(b) - e.x) < Math.abs(colX(a) - e.x) ? b : a);
                const lx = colX(nearest);
                if (Math.abs(e.x - lx) < 8) {
                    e.climbing = { fromF: e.floor, toF: wantDown ? e.floor + 1 : e.floor - 1, col: nearest, t: 0 };
                    return;
                }
                e.x += Math.sign(lx - e.x) * speed;
            }
        } else {
            e.x += Math.sign(player.x - e.x) * speed;
            e.x += e.dir * 0.3;
            if (e.x < colX(0) || e.x > colX(COLS - 1)) e.dir *= -1;
            e.x = Math.max(colX(0), Math.min(colX(COLS - 1), e.x));
        }
    });

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);
}

const keys = {};

function draw() {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);

    for (let f = 0; f <= BOTTOM; f++) {
        const y = FLOOR_Y[f];
        ctx.strokeStyle = f === BOTTOM ? '#ffcc00' : '#00aaaa';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, y); ctx.lineTo(W - 10, y);
        ctx.stroke();
        for (let x = 20; x < W; x += 60) {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 10);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    for (let f = 0; f < LADDERS.length; f++) {
        LADDERS[f].forEach(c => {
            const x = colX(c);
            const y1 = FLOOR_Y[f], y2 = FLOOR_Y[f + 1];
            ctx.strokeStyle = '#8888ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y1); ctx.lineTo(x - 6, y2);
            ctx.moveTo(x + 6, y1); ctx.lineTo(x + 6, y2);
            for (let y = y1 + 8; y < y2; y += 12) {
                ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
            }
            ctx.stroke();
        });
    }

    layers.forEach(l => {
        const x = colX(l.col), y = FLOOR_Y[l.floor] - 10;
        ctx.fillStyle = l.type.color;
        ctx.shadowColor = l.type.color;
        ctx.shadowBlur = 8;
        if (l.type.id === 'bb' || l.type.id === 'bt') {
            ctx.beginPath();
            ctx.ellipse(x, y, 17, 8, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(x - 17, y - 3, 34, 4);
        } else if (l.type.id === 'cheese') {
            ctx.fillRect(x - 16, y - 4, 32, 7);
            ctx.beginPath(); ctx.arc(x - 10, y + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 6, y + 2, 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (l.type.id === 'lettuce') {
            ctx.beginPath();
            for (let i = -16; i <= 16; i += 8) ctx.arc(x + i, y, 5, 0, Math.PI);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    });

    if (!(player.inv > 0 && Math.floor(player.inv / 5) % 2 === 0)) {
        const py = FLOOR_Y[player.floor] - 14;
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(player.x, py - 8, 9, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(player.x - 9, py - 9, 18, 3);
        ctx.beginPath();
        ctx.arc(player.x, py + 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(player.x - 4, py, 2.5, 2.5);
        ctx.fillRect(player.x + 2, py, 2.5, 2.5);
    }

    enemies.forEach(e => {
        const ey = FLOOR_Y[e.floor] - 12;
        const stunned = e.stun > 0 && Math.floor(e.stun / 6) % 2 === 0;
        ctx.fillStyle = stunned ? '#ffffff' : e.def.color;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 9;
        if (e.def.name === 'egg') {
            ctx.beginPath(); ctx.arc(e.x, ey, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = stunned ? '#ccc' : '#ffcc00';
            ctx.beginPath(); ctx.arc(e.x, ey, 4.5, 0, Math.PI * 2); ctx.fill();
        } else if (e.def.name === 'pickle') {
            ctx.beginPath();
            ctx.ellipse(e.x, ey, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(e.x, ey, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = stunned ? '#ddd' : '#ffcc66';
            ctx.beginPath(); ctx.arc(e.x - 5, ey, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 5, ey, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    });

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 22;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText('LEVEL ' + level + '  BURGERS ' + burgersLeft, 12, 18);
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

function togglePause() {
    if (!isRunning || isGameOver) return;
    isPaused = !isPaused;
    pauseOverlay.classList.toggle('hidden', !isPaused);
    Sfx.play('blip');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') { if (!e.repeat) { e.preventDefault(); togglePause(); } return; }
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    if (e.key === ' ') { if (e.repeat) return; e.preventDefault(); usePepper(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        keys[e.key] = true;
        return;
    }
    keys[e.key] = true;
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

startScreenEl.addEventListener('click', () => { if (!isRunning) startGame(); });
startScreenEl.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isRunning) startGame(); }, { passive: false });

let tStart = null;
function clearMoveKeys() {
    keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = false;
}
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clearMoveKeys();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!tStart) return;
    const dx = e.touches[0].clientX - tStart.x;
    const dy = e.touches[0].clientY - tStart.y;
    keys.ArrowLeft = dx < -10;
    keys.ArrowRight = dx > 10;
    keys.ArrowUp = dy < -10;
    keys.ArrowDown = dy > 10;
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    if (!tStart) return;
    const dx = e.changedTouches[0].clientX - tStart.x;
    const dy = e.changedTouches[0].clientY - tStart.y;
    tStart = null;
    clearMoveKeys();
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) usePepper();
});

pauseOverlay.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

initGame();
draw();
loop();
