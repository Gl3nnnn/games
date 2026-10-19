const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const PADDLE_WIDTH = 100;
const WIDE_PADDLE = 165;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 4;
const BRICK_COLUMN_COUNT = 7;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 35;

const actualBrickWidth = (canvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;
const actualBrickHeight = 20;

const BALL_SPEED = 4.5;
const POWERUP_TYPES = ['multi', 'laser', 'wide', 'sticky', 'life'];
const POWERUP_COLORS = { multi: '#00ffff', laser: '#ff4444', wide: '#00ff00', sticky: '#ff00ff', life: '#ffcc00' };
const POWERUP_LABELS = { multi: 'M', laser: 'L', wide: 'W', sticky: 'S', life: '+' };

let paddleX = (canvas.width - PADDLE_WIDTH) / 2;
let paddleW = PADDLE_WIDTH;
let balls = [];
let powerups = [];
let lasers = [];
let laserTimer = 0, wideTimer = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('breakoutHighScore')) || 0;
let isGameRunning = false;
let isPaused = false;
let isGameOver = false;
let gameLoop = null;
let lives = 3;
let bricksBroken = 0;

function boostSpeed() {
    return BALL_SPEED + Math.floor(bricksBroken / 10) * 0.3;
}

function scaleBallsToBoost() {
    const target = boostSpeed();
    balls.forEach(b => {
        const cur = Math.hypot(b.vx, b.vy);
        if (cur > 0) {
            b.vx *= target / cur;
            b.vy *= target / cur;
        }
    });
}

let bricks = [];

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const gameOverTitle = document.getElementById('gameOverTitle');
const livesEl = document.getElementById('lives');

highScoreEl.textContent = highScore;

function makeBall(stuck = true) {
    return { x: canvas.width / 2, y: canvas.height - 30, vx: 0, vy: 0, stuck, stuckTimer: 90 };
}

function launchBall(b, hitPoint = 0) {
    b.stuck = false;
    const angle = -Math.PI / 2 + hitPoint * 0.002;
    const sp = boostSpeed();
    b.vx = Math.cos(angle) * sp;
    b.vy = Math.sin(angle) * sp;
}

function syncStuckBalls() {
    balls.forEach(b => {
        if (b.stuck) {
            b.x = Math.min(Math.max(paddleX + paddleW / 2, paddleX + 12), paddleX + paddleW - 12);
            b.y = canvas.height - PADDLE_HEIGHT - 10 - BALL_RADIUS - 2;
        }
    });
}

function initBricks() {
    bricks = [];
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        bricks[c] = [];
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            bricks[c][r] = {
                x: 0, y: 0, status: 1,
                color: r === 0 ? '#ff0000' : r === 1 ? '#ff6600' : r === 2 ? '#ffff00' : '#00ff00'
            };
        }
    }
}

function resetBall() {
    balls = [makeBall(true)];
}

function drawBall(b) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - PADDLE_HEIGHT - 10, paddleW, PADDLE_HEIGHT);
    ctx.fillStyle = laserTimer > 0 ? '#ff4444' : '#00ff00';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
    if (laserTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(paddleX + 8, canvas.height - PADDLE_HEIGHT - 16, 5, 8);
        ctx.fillRect(paddleX + paddleW - 13, canvas.height - PADDLE_HEIGHT - 16, 5, 8);
    }
}

function drawBricks() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (actualBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (actualBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, actualBrickWidth, actualBrickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.shadowColor = bricks[c][r].color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
        }
    }
}

function maybeDropPowerup(bx, by) {
    if (Math.random() > 0.18) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({ x: bx + actualBrickWidth / 2, y: by + actualBrickHeight / 2, type, vy: 2.2 });
}

function applyPowerup(type) {
    Sfx.play('powerup');
    if (type === 'multi') {
        const src = balls[0];
        for (let i = 0; i < 2; i++) {
            const a = (i ? 0.5 : -0.5);
            const sp = Math.hypot(src.vx, src.vy) || BALL_SPEED;
            const ang = Math.atan2(src.vy, src.vx) + a;
            balls.push({ x: src.x, y: src.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, stuck: false });
        }
    } else if (type === 'laser') {
        laserTimer = 8 * 60;
    } else if (type === 'wide') {
        const center = paddleX + paddleW / 2;
        paddleW = WIDE_PADDLE;
        paddleX = Math.min(canvas.width - paddleW, Math.max(0, center - paddleW / 2));
        wideTimer = 10 * 60;
    } else if (type === 'sticky') {
        balls.forEach(b => { if (!b.stuck && Math.random() < 0.6) { b.stuck = true; b.vx = 0; b.vy = 0; b.stuckTimer = 150; } });
        if (balls.every(b => !b.stuck)) {
            balls.push(makeBall(true));
        }
    } else if (type === 'life') {
        lives++;
        if (livesEl) livesEl.textContent = lives;
    }
}

function checkBrickHit(b) {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const br = bricks[c][r];
            if (br.status === 1) {
                const bx = (c * (actualBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const by = (r * (actualBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                if (b.x > bx && b.x < bx + actualBrickWidth && b.y > by && b.y < by + actualBrickHeight) {
                    b.vy = -b.vy;
                    br.status = 0;
                    score += 10;
                    bricksBroken++;
                    if (bricksBroken % 10 === 0) scaleBallsToBoost();
                    Sfx.play('bounce');
                    scoreEl.textContent = score;
                    maybeDropPowerup(bx, by);
                    checkWin();
                    return true;
                }
            }
        }
    }
    return false;
}

function checkLaserHit() {
    for (let li = lasers.length - 1; li >= 0; li--) {
        const L = lasers[li];
        let hit = false;
        for (let c = 0; c < BRICK_COLUMN_COUNT && !hit; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                const br = bricks[c][r];
                if (br.status === 1) {
                    const bx = (c * (actualBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                    const by = (r * (actualBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                    if (L.x > bx && L.x < bx + actualBrickWidth && L.y > by && L.y < by + actualBrickHeight) {
                        br.status = 0;
                        score += 10;
                        bricksBroken++;
                        if (bricksBroken % 10 === 0) scaleBallsToBoost();
                        scoreEl.textContent = score;
                        Sfx.play('bounce');
                        maybeDropPowerup(bx, by);
                        hit = true;
                        checkWin();
                        break;
                    }
                }
            }
        }
        if (hit || L.y < 0) lasers.splice(li, 1);
    }
}

function checkWin() {
    let remainingBricks = 0;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) remainingBricks++;
        }
    }
    if (remainingBricks === 0) gameOver(true);
}

function loseLife() {
    if (isGameOver) return;
    lives--;
    if (livesEl) livesEl.textContent = lives;
    Sfx.play('die');
    FX.shake(350, 8);
    FX.flash('#ff2244', 180);
    if (lives <= 0) {
        gameOver(false);
        return;
    }
    resetBall();
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 25) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 25) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    drawBricks();
    balls.forEach(drawBall);
    drawPaddle();

    powerups.forEach(p => {
        ctx.fillStyle = POWERUP_COLORS[p.type];
        ctx.shadowColor = POWERUP_COLORS[p.type];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0a0f';
        ctx.font = 'bold 11px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(POWERUP_LABELS[p.type], p.x, p.y + 4);
    });

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 8;
    lasers.forEach(L => ctx.fillRect(L.x - 1.5, L.y - 8, 3, 10));
    ctx.shadowBlur = 0;

    if (isGameRunning && !isPaused && !isGameOver) {
        if (laserTimer > 0) {
            laserTimer--;
            if (laserTimer % 12 === 0) {
                lasers.push({ x: paddleX + 10, y: canvas.height - PADDLE_HEIGHT - 12 });
                lasers.push({ x: paddleX + paddleW - 10, y: canvas.height - PADDLE_HEIGHT - 12 });
            }
        }
        if (wideTimer > 0) {
            wideTimer--;
            if (wideTimer === 0) {
                const center = paddleX + paddleW / 2;
                paddleW = PADDLE_WIDTH;
                paddleX = Math.min(canvas.width - paddleW, Math.max(0, center - paddleW / 2));
            }
        }

        lasers.forEach(L => L.y -= 7);
        checkLaserHit();

        powerups.forEach(p => p.y += p.vy);
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            if (p.y > canvas.height - PADDLE_HEIGHT - 20 && p.y < canvas.height && p.x > paddleX && p.x < paddleX + paddleW) {
                applyPowerup(p.type);
                powerups.splice(i, 1);
            } else if (p.y > canvas.height + 15) {
                powerups.splice(i, 1);
            }
        }

        syncStuckBalls();

        for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i];
            if (b.stuck) {
                b.stuckTimer--;
                if (b.stuckTimer <= 0) launchBall(b, 0);
                continue;
            }
            if (b.x + b.vx > canvas.width - BALL_RADIUS || b.x + b.vx < BALL_RADIUS) b.vx = -b.vx;
            if (b.y + b.vy < BALL_RADIUS) {
                b.vy = -b.vy;
            } else if (b.y + b.vy > canvas.height - BALL_RADIUS - PADDLE_HEIGHT - 10) {
                if (b.x > paddleX && b.x < paddleX + paddleW) {
                    b.vy = -Math.abs(b.vy);
                    const hitPoint = b.x - (paddleX + paddleW / 2);
                    b.vx = hitPoint * 0.1;
                    Sfx.play('blip');
                } else if (b.y + b.vy > canvas.height - BALL_RADIUS) {
                    balls.splice(i, 1);
                    if (balls.length === 0) {
                        loseLife();
                        return;
                    }
                    continue;
                }
            }
            b.x += b.vx;
            b.y += b.vy;
            checkBrickHit(b);
        }
    }
}

function gameOver(won) {
    if (isGameOver) return;
    Sfx.play(won ? 'win' : 'gameover');
    Scores.submit('breakout', score);
    isGameOver = true;
    isGameRunning = false;
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }

    if (won) {
        gameOverTitle.textContent = 'YOU WIN!';
        gameOverTitle.style.color = '#00ff00';
        gameOverTitle.style.textShadow = '0 0 20px #00ff00';
    } else {
        gameOverTitle.textContent = 'GAME OVER';
        gameOverTitle.style.color = '#ff0000';
        gameOverTitle.style.textShadow = '0 0 20px #ff0000';
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('breakoutHighScore', highScore);
        highScoreEl.textContent = highScore;
    }

    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function startGame() {
    Sfx.play('select');
    if (isGameRunning) return;

    score = 0;
    lives = 3;
    bricksBroken = 0;
    if (livesEl) livesEl.textContent = lives;
    scoreEl.textContent = score;
    paddleW = PADDLE_WIDTH;
    paddleX = (canvas.width - paddleW) / 2;
    laserTimer = 0; wideTimer = 0;
    powerups = []; lasers = [];
    resetBall();

    initBricks();

    isGameRunning = true;
    isPaused = false;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    startScreenEl.classList.add('hidden');

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, 1000 / 60);
}

function resetGame() {
    startGame();
}

document.addEventListener('keydown', (e) => {
    if (!isGameRunning && !isGameOver) {
        startGame();
        return;
    }

    if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        isPaused = !isPaused;
        return;
    }

    const step = 25;
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            paddleX = Math.max(0, paddleX - step);
            balls.forEach(b => { if (b.stuck) b.stuckTimer = Math.min(b.stuckTimer, 30); });
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            paddleX = Math.min(canvas.width - paddleW, paddleX + step);
            balls.forEach(b => { if (b.stuck) b.stuckTimer = Math.min(b.stuckTimer, 30); });
            break;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    paddleX = relativeX - paddleW / 2;
    paddleX = Math.max(0, Math.min(canvas.width - paddleW, paddleX));
});

canvas.addEventListener('mousedown', () => {
    balls.forEach(b => { if (b.stuck) b.stuckTimer = Math.min(b.stuckTimer, 5); });
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.touches[0].clientX - rect.left;
    paddleX = relativeX - paddleW / 2;
    paddleX = Math.max(0, Math.min(canvas.width - paddleW, paddleX));
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    balls.forEach(b => { if (b.stuck) b.stuckTimer = Math.min(b.stuckTimer, 5); });
});

restartBtn.addEventListener('click', resetGame);

initBricks();
resetBall();
draw();
