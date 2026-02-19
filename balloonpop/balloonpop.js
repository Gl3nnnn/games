const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const poppedCountEl = document.getElementById('poppedCount');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

let score = 0;
let poppedCount = 0;
let gameRunning = false;
let balloonInterval = null;
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

function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    score = 0;
    poppedCount = 0;
    speedMultiplier = 1;
    scoreEl.textContent = 0;
    poppedCountEl.textContent = 0;
    
    startBtn.disabled = true;
    
    const balloons = gameArea.querySelectorAll('.balloon');
    balloons.forEach(b => b.remove());
    
    balloonInterval = setInterval(() => {
        createBalloon();
        
        if (poppedCount > 0 && poppedCount % 10 === 0) {
            speedMultiplier = Math.min(2.5, 1 + (poppedCount / 50));
        }
    }, 800);
}

function stopGame() {
    gameRunning = false;
    startBtn.disabled = false;
    
    if (balloonInterval) {
        clearInterval(balloonInterval);
        balloonInterval = null;
    }
}

function resetGame() {
    stopGame();
    
    score = 0;
    poppedCount = 0;
    speedMultiplier = 1;
    scoreEl.textContent = 0;
    poppedCountEl.textContent = 0;
    
    const balloons = gameArea.querySelectorAll('.balloon');
    balloons.forEach(b => b.remove());
    
    const effects = gameArea.querySelectorAll('.pop-effect');
    effects.forEach(e => e.remove());
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
