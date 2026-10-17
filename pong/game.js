const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const PADDLE_W = 10, PADDLE_H = 70, WIN_SCORE = 7, BALL_R = 7;

let p1, p2, ball, s1, s2, twoPlayer, isGameOver, isPaused, isRunning;
let mouseActive = false;
let highScore = parseInt(localStorage.getItem('pongHighScore')) || 0;

const scoreP1El = document.getElementById('scoreP1');
const scoreP2El = document.getElementById('scoreP2');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const winTextEl = document.getElementById('winText');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

const keys = {};

function resetBall(direction) {
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    const speed = 5;
    ball = {
        x: W / 2, y: H / 2,
        vx: Math.cos(angle) * speed * direction,
        vy: Math.sin(angle) * speed
    };
}

function initGame() {
    p1 = { y: H / 2 - PADDLE_H / 2 };
    p2 = { y: H / 2 - PADDLE_H / 2 };
    s1 = 0; s2 = 0;
    isGameOver = false; isPaused = false;
    scoreP1El.textContent = 0;
    scoreP2El.textContent = 0;
    resetBall(Math.random() < 0.5 ? 1 : -1);
}

function scorePoint(who) {
    Sfx.play('coin');
    if (who === 1) { s1++; scoreP1El.textContent = s1; resetBall(1); }
    else { s2++; scoreP2El.textContent = s2; resetBall(-1); }
    if (s1 >= WIN_SCORE || s2 >= WIN_SCORE) endGame();
}

function endGame() {
    Sfx.play('gameover');
    isGameOver = true;
    const p1Won = s1 >= WIN_SCORE;
    winTextEl.textContent = twoPlayer
        ? (p1Won ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!')
        : (p1Won ? 'YOU WIN!' : 'CPU WINS!');
    winTextEl.style.color = p1Won ? '#00ff41' : '#ff00ff';
    winTextEl.style.textShadow = `0 0 15px ${p1Won ? '#00ff41' : '#ff00ff'}`;
    if (p1Won && !twoPlayer) {
        highScore++;
        localStorage.setItem('pongHighScore', highScore);
        highScoreEl.textContent = highScore;
        Scores.submit('pong', highScore);
    }
    finalScoreEl.textContent = `${s1} - ${s2}`;
    gameOverEl.classList.remove('hidden');
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    if (twoPlayer) {
        if (keys.w) p1.y -= 6;
        if (keys.s) p1.y += 6;
        if (keys.ArrowUp) p2.y -= 6;
        if (keys.ArrowDown) p2.y += 6;
    } else {
        if (!mouseActive) {
            if (keys.w || keys.ArrowUp) p1.y -= 6;
            if (keys.s || keys.ArrowDown) p1.y += 6;
        }
        const target = ball.vx > 0 ? ball.y - PADDLE_H / 2 : H / 2 - PADDLE_H / 2;
        const diff = target - p2.y;
        p2.y += Math.max(-3.2, Math.min(3.2, diff * 0.5));
    }

    p1.y = Math.max(4, Math.min(H - PADDLE_H - 4, p1.y));
    p2.y = Math.max(4, Math.min(H - PADDLE_H - 4, p2.y));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; }
    if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy *= -1; }

    if (ball.x - BALL_R < 24 && ball.x > 14 &&
        ball.y > p1.y && ball.y < p1.y + PADDLE_H && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.05;
        ball.vy += ((ball.y - (p1.y + PADDLE_H / 2)) / PADDLE_H) * 4;
        capSpeed();
        Sfx.play('bounce');
    }
    if (ball.x + BALL_R > W - 24 && ball.x < W - 14 &&
        ball.y > p2.y && ball.y < p2.y + PADDLE_H && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.05;
        ball.vy += ((ball.y - (p2.y + PADDLE_H / 2)) / PADDLE_H) * 4;
        capSpeed();
        Sfx.play('bounce');
    }

    if (ball.x < -20) scorePoint(2);
    if (ball.x > W + 20) scorePoint(1);
}

function capSpeed() {
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > 13) { ball.vx *= 13 / sp; ball.vy *= 13 / sp; }
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = 'rgba(0,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 48px Orbitron';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'center';
    ctx.fillText(s1, W / 2 - 70, 60);
    ctx.fillText(s2, W / 2 + 70, 60);

    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#00ff41';
    ctx.fillRect(16, p1.y, PADDLE_W, PADDLE_H);

    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(W - 16 - PADDLE_W, p2.y, PADDLE_W, PADDLE_H);

    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
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

document.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!isRunning && !isGameOver && k !== '2') { startGame(); }
    if (isGameOver) return;
    if (k === '2') { twoPlayer = true; if (!isRunning) startGame(); }
    if (k === 'p' || k === 'P') { if (!e.repeat) isPaused = !isPaused; }
    if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(k)) mouseActive = false;
    keys[k] = true;
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (twoPlayer || isGameOver) return;
    mouseActive = true;
    const r = canvas.getBoundingClientRect();
    const y = (e.clientY - r.top) * (H / r.height) - PADDLE_H / 2;
    p1.y = Math.max(4, Math.min(H - PADDLE_H - 4, y));
});

canvas.addEventListener('touchmove', (e) => {
    if (twoPlayer || isGameOver) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const y = (e.touches[0].clientY - r.top) * (H / r.height) - PADDLE_H / 2;
    p1.y = Math.max(4, Math.min(H - PADDLE_H - 4, y));
}, { passive: false });

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

initGame();
draw();
loop();
