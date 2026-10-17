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
const ROWS = [80, 160, 240, 320, 400, 480];
const WALK = 3, CLIMB = 2, GRAV = 0.55, JUMP_V = -10;
const BARREL_R = 10;

let score, highScore = parseInt(localStorage.getItem('barrelrunHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let player, barrels, ladders, spawnTimer, spawnEvery;
let keys = {};
let lastClimbSound = 0;

function resetLevel() {
    player = { x: 42, row: 5, y: ROWS[5], climbing: null, vy: 0, jumping: false, face: 1 };
    barrels = [];
    spawnTimer = 0;
    spawnEvery = Math.max(500, 1500 - level * 100);
    ladders = [];
    const spots = [70, 220, 370, 130, 300, 60, 250];
    for (let gap = 1; gap <= 5; gap++) {
        const x = spots[(gap + level) % spots.length];
        ladders.push({ x, top: gap - 1, bot: gap });
    }
}

function startGame() {
    score = 0; level = 1; lives = 3;
    isRunning = true; isGameOver = false;
    scoreEl.textContent = 0; levelEl.textContent = 1; livesEl.textContent = 3;
    resetLevel();
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
    resetLevel();
}

function loseLife() {
    lives--;
    livesEl.textContent = lives;
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    if (lives <= 0) {
        isGameOver = true; isRunning = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('barrelrunHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
        Scores.submit('barrelrun', score);
    } else {
        player = { x: 42, row: 5, y: ROWS[5], climbing: null, vy: 0, jumping: false, face: 1 };
        barrels = [];
        spawnTimer = 0;
    }
}

function spawnBarrel() {
    barrels.push({ x: W - 16, y: ROWS[0] - BARREL_R, row: 0, dir: -1, falling: null, passed: false });
    Sfx.play('blip');
}

function updatePlayer() {
    const p = player;
    if (p.climbing) {
        const c = p.climbing;
        p.y += c.dir * CLIMB;
        if ((c.dir < 0 && p.y <= ROWS[c.target]) || (c.dir > 0 && p.y >= ROWS[c.target])) {
            p.y = ROWS[c.target];
            p.row = c.target;
            p.climbing = null;
        }
        const now = performance.now();
        if (now - lastClimbSound > 140) {
            Sfx.play('move');
            lastClimbSound = now;
        }
        return;
    }

    if (p.jumping) {
        p.vy += GRAV;
        p.y += p.vy;
        if (p.y >= ROWS[p.row]) {
            p.y = ROWS[p.row];
            p.vy = 0;
            p.jumping = false;
        }
    }

    let mv = 0;
    if (keys.ArrowLeft || keys.a) mv = -1;
    if (keys.ArrowRight || keys.d) mv = 1;
    if (mv !== 0 && !p.jumping) {
        p.x = Math.max(14, Math.min(W - 14, p.x + mv * WALK));
        p.face = mv;
    }

    if (keys.ArrowUp || keys.w) {
        const lad = ladders.find(l => l.bot === p.row && Math.abs(p.x - l.x) < 15);
        if (lad && p.row > 0) {
            p.climbing = { dir: -1, target: p.row - 1 };
            p.x = lad.x;
        }
    }
    if (keys.ArrowDown || keys.s) {
        const lad = ladders.find(l => l.top === p.row && Math.abs(p.x - l.x) < 15);
        if (lad && p.row < 5) {
            p.climbing = { dir: 1, target: p.row + 1 };
            p.x = lad.x;
        }
    }

    if (p.row === 0 && p.x < 75 && !p.climbing) nextLevel();
}

function updateBarrels(dt) {
    spawnTimer += dt;
    if (spawnTimer >= spawnEvery) {
        spawnTimer = 0;
        spawnBarrel();
    }

    for (let i = barrels.length - 1; i >= 0; i--) {
        const b = barrels[i];
        if (b.falling) {
            b.y += 3.2;
            if (b.y >= ROWS[b.falling.to] - BARREL_R) {
                b.y = ROWS[b.falling.to] - BARREL_R;
                b.row = b.falling.to;
                b.dir = -b.dir;
                b.falling = null;
            }
        } else {
            b.x += b.dir * (1.5 + level * 0.25);
            const lad = ladders.find(l => l.top === b.row && Math.abs(b.x - l.x) < 7);
            if (lad && Math.random() < 0.45 && b.row < 5) {
                b.x = lad.x;
                b.falling = { to: b.row + 1 };
            } else if (b.row < 5 && (b.x <= 12 || b.x >= W - 12)) {
                b.x = Math.max(12, Math.min(W - 12, b.x));
                b.falling = { to: b.row + 1 };
            } else if (b.row >= 5 && (b.x <= 12 || b.x >= W - 12)) {
                barrels.splice(i, 1);
                continue;
            }
        }

        const p = player;
        if (!p.climbing && b.row === p.row && !b.passed && Math.abs(b.x - p.x) < 18 && p.jumping) {
            b.passed = true;
            score += 10;
            scoreEl.textContent = score;
            Sfx.play('blip');
        }

        const dy = Math.abs(b.y - (p.y - 17));
        if (Math.abs(b.x - p.x) < 20 && dy < 22) loseLife();
    }
}

function drawGirder(y) {
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, y, W, 7);
    ctx.fillStyle = '#ff9a00';
    for (let x = 8; x < W; x += 26) ctx.fillRect(x, y + 1, 10, 2);
}

function drawLadder(l) {
    const yT = ROWS[l.top], yB = ROWS[l.bot];
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l.x - 9, yT); ctx.lineTo(l.x - 9, yB);
    ctx.moveTo(l.x + 9, yT); ctx.lineTo(l.x + 9, yB);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let y = yT + 8; y < yB; y += 14) {
        ctx.beginPath();
        ctx.moveTo(l.x - 9, y); ctx.lineTo(l.x + 9, y);
        ctx.stroke();
    }
}

function drawBarrel(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate((b.x + b.y) * 0.05);
    ctx.strokeStyle = '#ff9a00';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, BARREL_R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffce7a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-BARREL_R + 2, 0); ctx.lineTo(BARREL_R - 2, 0); ctx.stroke();
    ctx.restore();
}

function drawPlayer() {
    const p = player;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p.x - 11, p.y - 32, 22, 32);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(p.x - 7, p.y - 26, 14, 7);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(p.x + (p.face > 0 ? 1 : -7), p.y - 25, 6, 5);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p.x - 11, p.y - 38, 22, 6);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#00ff88';
    ctx.fillRect(0, ROWS[0] - 30, 70, 30);
    ctx.fillStyle = '#0a0a0f';
    ctx.font = '10px Orbitron';
    ctx.fillText('GOAL', 16, ROWS[0] - 12);

    for (const y of ROWS) drawGirder(y);
    for (const l of ladders) drawLadder(l);
    for (const b of barrels) drawBarrel(b);
    drawPlayer();
}

let lastTime = 0;
function loop(t) {
    const dt = Math.min(50, t - lastTime);
    lastTime = t;
    if (isRunning && !isGameOver && !paused) {
        updatePlayer();
        updateBarrels(dt);
    }
    if (isRunning) draw();
    requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
    if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
        if (isRunning && !isGameOver) {
            paused = !paused;
            pauseEl.classList.toggle('hidden', !paused);
            if (paused) Sfx.play('blip');
        }
        return;
    }
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true;
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    if ((e.key === ' ' || e.key.startsWith('Arrow')) && isRunning && !player.jumping && !player.climbing) {
        player.jumping = true;
        player.vy = JUMP_V;
        Sfx.play('jump');
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
});
canvas.addEventListener('click', () => {
    if (!isRunning && !isGameOver && startScreen && !startScreen.classList.contains('hidden')) startGame();
    else if (isRunning && !player.jumping && !player.climbing) {
        player.jumping = true;
        player.vy = JUMP_V;
        Sfx.play('jump');
    }
});
restartBtn.addEventListener('click', startGame);

highScoreEl.textContent = highScore;
requestAnimationFrame(loop);
