const gameArea = document.getElementById('gameArea');
const dot = document.getElementById('dot');
const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const newRecordEl = document.getElementById('newRecord');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

let score = 0;
let timeLeft = 30;
let timerInterval = null;
let moveTimeout = null;
let gameRunning = false;
let moveDelay = 1500; // Start with 1.5 seconds

const DOT_SIZE = 50;

function loadHighScore() {
    const highScore = localStorage.getItem('tapDotHighScore');
    if (highScore) {
        highScoreEl.textContent = highScore;
    }
}

function saveHighScore(newScore) {
    const currentBest = localStorage.getItem('tapDotHighScore');
    if (!currentBest || newScore > parseInt(currentBest)) {
        localStorage.setItem('tapDotHighScore', newScore);
        highScoreEl.textContent = newScore;
        return true;
    }
    return false;
}

function getRandomPosition() {
    const areaRect = gameArea.getBoundingClientRect();
    const maxX = areaRect.width - DOT_SIZE;
    const maxY = areaRect.height - DOT_SIZE;
    
    return {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY)
    };
}

function moveDot() {
    if (!gameRunning) return;
    
    const pos = getRandomPosition();
    dot.style.left = pos.x + 'px';
    dot.style.top = pos.y + 'px';
    
    // Gradually decrease move delay (increase speed)
    moveDelay = Math.max(600, moveDelay - 20);
    
    moveTimeout = setTimeout(moveDot, moveDelay);
}

function handleDotClick(e) {
    if (!gameRunning) return;
    
    e.stopPropagation();
    
    score++;
    scoreEl.textContent = score;
    
    // Visual feedback
    dot.classList.add('clicked');
    setTimeout(() => dot.classList.remove('clicked'), 200);
    
    // Move immediately to new position
    clearTimeout(moveTimeout);
    moveDot();
}

function startGame() {
    gameRunning = true;
    score = 0;
    timeLeft = 30;
    moveDelay = 1500;
    
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    dot.classList.remove('hidden');
    
    // Position dot initially
    const pos = getRandomPosition();
    dot.style.left = pos.x + 'px';
    dot.style.top = pos.y + 'px';
    
    // Start moving the dot
    moveTimeout = setTimeout(moveDot, moveDelay);
    
    // Start timer
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerEl.style.color = '#ff0000';
            timerEl.style.textShadow = '0 0 10px #ff0000';
        }
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    clearTimeout(moveTimeout);
    
    dot.classList.add('hidden');
    
    finalScoreEl.textContent = score;
    
    const isNewHigh = saveHighScore(score);
    if (isNewHigh && score > 0) {
        newRecordEl.classList.remove('hidden');
    } else {
        newRecordEl.classList.add('hidden');
    }
    
    endScreen.classList.remove('hidden');
}

function resetGame() {
    clearInterval(timerInterval);
    clearTimeout(moveTimeout);
    gameRunning = false;
    score = 0;
    timeLeft = 30;
    moveDelay = 1500;
    
    timerEl.textContent = '30';
    timerEl.style.color = '#ff0044';
    timerEl.style.textShadow = '0 0 10px #ff0044';
    scoreEl.textContent = '0';
    
    startScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    dot.classList.add('hidden');
}

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
    resetGame();
    setTimeout(startGame, 100);
});

dot.addEventListener('click', handleDotClick);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameRunning) {
        e.preventDefault();
        startGame();
    }
});

loadHighScore();
