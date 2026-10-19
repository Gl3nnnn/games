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
const ZONE_Y = 420;
const P_SPEED = 3.6, SHOT_SPEED = 6.5, SEG_R = 10;

let score, highScore = parseInt(localStorage.getItem('centipedeHighScore')) || 0;
let level, lives, isRunning = false, isGameOver = false, paused = false;
let player, trains, mushrooms, bullets, keys = {};

function buildLevel() {
    mushrooms = [];
    for (let c = 1; c < 19; c++) {
        for (let r = 2; r < 18; r++) {
            if (Math.random() < 0.16) {
                mushrooms.push({ x: c * 22 + 11, y: r * 22 + 11, hp: Math.random() < 0.5 ? 1 : 2 });
            }
        }
    }
    const size = Math.min(9 + level, 14);
    const xs = [];
    for (let i = 0; i < size; i++) xs.push(W - 10 - i * 16);
    trains = [{ xs, dir: -1, y: 44, speed: 1.1 + level * 0.12 }];
    bullets = [];
    player = { x: W / 2, y: 470 };
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
    if (isGameOver) return;
    lives--;
    livesEl.textContent = lives;
    Sfx.play('die');
    if (lives <= 0) {
        isGameOver = true; isRunning = false;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('centipedeHighScore', highScore);
            highScoreEl.textContent = highScore;
        }
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
        Sfx.play('gameover');
        Scores.submit('centipede', score);
    } else {
        player.x = W / 2;
        player.y = 470;
    }
}

function shoot() {
    bullets.push({ x: player.x, y: player.y - 14 });
    Sfx.play('shoot');
}

function updatePlayer() {
    const p = player;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a) dx = -1;
    if (keys.ArrowRight || keys.d) dx = 1;
    if (keys.ArrowUp || keys.w) dy = -1;
    if (keys.ArrowDown || keys.s) dy = 1;
    p.x = Math.max(16, Math.min(W - 16, p.x + dx * P_SPEED));
    p.y = Math.max(ZONE_Y + 12, Math.min(H - 16, p.y + dy * P_SPEED));
}

function splitTrain(t, idx) {
    score += 10;
    scoreEl.textContent = score;
    Sfx.play('hit');
    const before = t.xs.slice(0, idx);
    const after = t.xs.slice(idx + 1);
    const newTrains = [];
    if (before.length) newTrains.push({ xs: before, dir: t.dir, y: t.y, speed: t.speed });
    if (after.length) newTrains.push({ xs: after, dir: t.dir, y: t.y, speed: t.speed });
    trains.splice(trains.indexOf(t), 1, ...newTrains);
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= SHOT_SPEED;
        if (b.y < -8) { bullets.splice(i, 1); continue; }
        let dead = false;
        for (let m = mushrooms.length - 1; m >= 0; m--) {
            const mo = mushrooms[m];
            if (Math.abs(mo.x - b.x) < 11 && Math.abs(mo.y - b.y) < 11) {
                mo.hp--;
                dead = true;
                Sfx.play('bounce');
                if (mo.hp <= 0) {
                    mushrooms.splice(m, 1);
                    score += 5;
                    scoreEl.textContent = score;
                }
                break;
            }
        }
        if (!dead) {
            for (const t of trains) {
                const hitIdx = t.xs.findIndex(x => Math.abs(x - b.x) < 10 && Math.abs(t.y - b.y) < 12);
                if (hitIdx >= 0) {
                    splitTrain(t, hitIdx);
                    dead = true;
                    break;
                }
            }
        }
        if (dead) bullets.splice(i, 1);
    }
}

function updateTrains() {
    for (let ti = trains.length - 1; ti >= 0; ti--) {
        const t = trains[ti];
        let headIdx = t.dir < 0 ? t.xs.length - 1 : 0;
        let headX = t.xs[headIdx] + t.dir * t.speed;

        const hitMush = mushrooms.find(m => m.hp > 0 && Math.abs(m.x - headX) < 13 && Math.abs(m.y - t.y) < 13);
        if (hitMush) {
            t.dir = -t.dir;
            t.y += 20;
            hitMush.hp--;
            Sfx.play('bounce');
            if (hitMush.hp <= 0) {
                mushrooms.splice(mushrooms.indexOf(hitMush), 1);
                score += 5;
                scoreEl.textContent = score;
            }
            headIdx = t.dir < 0 ? t.xs.length - 1 : 0;
            headX = t.xs[headIdx] + t.dir * t.speed;
        }

        const min = Math.min(...t.xs) + t.dir * t.speed;
        const max = Math.max(...t.xs) + t.dir * t.speed;
        if (t.dir < 0 && min < 12) {
            const shift = 12 - min;
            t.xs = t.xs.map(x => x + shift);
            t.y += 20;
            t.dir = 1;
        } else if (t.dir > 0 && max > W - 12) {
            const shift = (W - 12) - max;
            t.xs = t.xs.map(x => x + shift);
            t.y += 20;
            t.dir = -1;
        } else {
            t.xs = t.xs.map(x => x + t.dir * t.speed);
        }
        if (t.y > ZONE_Y + 20) t.y = ZONE_Y + 20;

        for (const x of t.xs) {
            if (Math.hypot(x - player.x, t.y - player.y) < SEG_R + 6) loseLife();
        }
    }
    if (trains.length === 0 && isRunning) nextLevel();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(179,102,255,0.07)';
    ctx.fillRect(0, ZONE_Y, W, H - ZONE_Y);
    ctx.strokeStyle = 'rgba(179,102,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ZONE_Y); ctx.lineTo(W, ZONE_Y);
    ctx.stroke();

    for (const m of mushrooms) {
        ctx.fillStyle = m.hp > 1 ? '#33ddff' : '#1f8fb3';
        ctx.beginPath();
        ctx.arc(m.x, m.y - 2, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(m.x - 3, m.y - 2, 6, 7);
    }

    for (const t of trains) {
        const headIdx = t.dir < 0 ? t.xs.length - 1 : 0;
        t.xs.forEach((x, i) => {
            ctx.fillStyle = i === headIdx ? '#ff2244' : '#ff7733';
            ctx.beginPath();
            ctx.arc(x, t.y, SEG_R - 1, 0, Math.PI * 2);
            ctx.fill();
            if (i === headIdx) {
                ctx.fillStyle = '#fff';
                const eOff = t.dir < 0 ? -4 : 4;
                ctx.fillRect(x + eOff - 2, t.y - 5, 3, 3);
                ctx.fillRect(x + eOff + 2, t.y - 5, 3, 3);
            }
        });
    }

    ctx.fillStyle = '#ffe14d';
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 6, 4, 8);

    const p = player;
    ctx.fillStyle = '#ff66cc';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 14);
    ctx.lineTo(p.x - 10, p.y + 8);
    ctx.lineTo(p.x + 10, p.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(p.x - 3, p.y - 4, 6, 6);
}

function loop() {
    if (isRunning && !isGameOver && !paused) {
        updatePlayer();
        updateTrains();
        updateBullets();
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
    else if (e.key === ' ' && isRunning && !paused && !e.repeat) shoot();
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
