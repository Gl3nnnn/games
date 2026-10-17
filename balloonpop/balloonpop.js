const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const poppedCountEl = document.getElementById('poppedCount');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const againBtn = document.getElementById('againBtn');

let score = 0;
let poppedCount = 0;
let lives = 3;
let gameRunning = false;
let spawnTimer = null;
let speedMultiplier = 1;

let highScore = parseInt(localStorage.getItem('balloonPopHighScore')) || 0;
highScoreEl.textContent = highScore;

const balloonColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

function createBalloon() {
    if (!gameRunning) return;
    
    const balloon = document.createElement('div');
    balloon.classList.add('balloon');
    
    const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    balloon.style.background = `linear-gradient(135deg, ${color} 0%, ${darkenColor(color)} 100%)`;
    
    const gameAreaRect = gameArea.getBoundingClientRect();
    const x = Math.random() * (gameAreaRect.width - 70);
    balloon.style.left = x + 'px';
    balloon.style.bottom = '-80px';
    
    const speed = (1.5 + Math.random() * 1) * speedMultiplier;
    const duration = 4000 / speed;
    
    balloon.style.transition = `bottom ${duration}ms linear`;
    
    balloon.addEventListener('click', () => popBalloon(balloon));
    
    gameArea.appendChild(balloon);
    
    requestAnimationFrame(() => {
        balloon.style.bottom = '420px';
    });
    
    setTimeout(() => {
        if (balloon.parentNode && !balloon.classList.contains('popped')) {
            balloon.remove();
            if (document.documentElement.dataset.arcPaused !== '1') loseLife();
        }
    }, duration);
}

function popBalloon(balloon) {
    if (!gameRunning || balloon.classList.contains('popped')) return;
    
    balloon.classList.add('popped');
    
    const rect = balloon.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();
    const x = rect.left - gameAreaRect.left + rect.width / 2;
    const y = rect.top - gameAreaRect.top + rect.height / 2;
    
    showPopEffect(x, y);
    
    score += 10;
    Sfx.play('hit');
    poppedCount++;
    scoreEl.textContent = score;
    poppedCountEl.textContent = poppedCount;
    
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('balloonPopHighScore', highScore);
    }
    
    setTimeout(() => {
        balloon.remove();
    }, 200);
}

function showPopEffect(x, y) {
    const effect = document.createElement('div');
    effect.classList.add('pop-effect');
    effect.textContent = '+10';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    gameArea.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
    }, 800);
}

function darkenColor(hex) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - 50);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 50);
    const b = Math.max(0, (num & 0x0000FF) - 50);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function loseLife() {
    if (!gameRunning) return;
    lives--;
    livesEl.textContent = Math.max(0, lives);
    Sfx.play('die');
    FX.shake(300, 6);
    if (lives <= 0) endGame();
}

function endGame() {
    stopGame();
    const balloons = gameArea.querySelectorAll('.balloon');
    balloons.forEach(b => b.remove());
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function scheduleSpawn() {
    spawnTimer = setTimeout(() => {
        if (!gameRunning) return;
        if (document.documentElement.dataset.arcPaused === '1') {
            scheduleSpawn();
            return;
        }
        createBalloon();
        speedMultiplier = Math.min(4.5, 1 + poppedCount / 15);
        scheduleSpawn();
    }, Math.max(300, 800 - poppedCount * 8));
}

function startGame() {
    Sfx.play('select');
    if (gameRunning) return;
    
    gameRunning = true;
    score = 0;
    poppedCount = 0;
    lives = 3;
    speedMultiplier = 1;
    scoreEl.textContent = 0;
    poppedCountEl.textContent = 0;
    livesEl.textContent = 3;
    
    startBtn.disabled = true;
    gameOverEl.classList.add('hidden');
    
    const balloons = gameArea.querySelectorAll('.balloon');
    balloons.forEach(b => b.remove());
    
    scheduleSpawn();
}

function stopGame() {
    gameRunning = false;
    if (typeof score !== 'undefined' && score > 0) Scores.submit('balloonPop', score);
    startBtn.disabled = false;
    
    if (spawnTimer) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
    }
}

function resetGame() {
    stopGame();
    
    score = 0;
    poppedCount = 0;
    lives = 3;
    speedMultiplier = 1;
    scoreEl.textContent = 0;
    poppedCountEl.textContent = 0;
    livesEl.textContent = 3;
    gameOverEl.classList.add('hidden');
    
    const balloons = gameArea.querySelectorAll('.balloon');
    balloons.forEach(b => b.remove());
    
    const effects = gameArea.querySelectorAll('.pop-effect');
    effects.forEach(e => e.remove());
}

startBtn.addEventListener('click', startGame);
againBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
