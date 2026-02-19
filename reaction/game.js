const gameArea = document.getElementById('gameArea');
const waitingEl = document.getElementById('waiting');
const readyEl = document.getElementById('ready');
const tooEarlyEl = document.getElementById('tooEarly');
const currentTimeEl = document.getElementById('currentTime');
const bestTimeEl = document.getElementById('bestTime');
const attemptsEl = document.getElementById('attempts');
const retryBtn = document.getElementById('retryBtn');

let gameState = 'idle';
let startTime = 0;
let timeoutIds = [];
let attemptsCount = 0;

function loadBestScore() {
    const bestScore = localStorage.getItem('reactionBestScore');
    if (bestScore) {
        bestTimeEl.textContent = bestScore;
    }
}

function saveBestScore(time) {
    const currentBest = localStorage.getItem('reactionBestScore');
    if (!currentBest || time < parseInt(currentBest)) {
        localStorage.setItem('reactionBestScore', time);
        bestTimeEl.textContent = time;
    }
}

function clearAllTimeouts() {
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];
}

function setWaitingState() {
    gameState = 'waiting';
    waitingEl.classList.remove('hidden');
    readyEl.classList.add('hidden');
    tooEarlyEl.classList.add('hidden');
    gameArea.className = 'game-area waiting';
}

function setReadyState() {
    gameState = 'ready';
    startTime = Date.now();
    waitingEl.classList.add('hidden');
    readyEl.classList.remove('hidden');
    tooEarlyEl.classList.add('hidden');
    gameArea.className = 'game-area ready';
}

function setTooEarlyState() {
    gameState = 'tooearly';
    waitingEl.classList.add('hidden');
    readyEl.classList.add('hidden');
    tooEarlyEl.classList.remove('hidden');
    gameArea.className = 'game-area';
}

function handleClick(e) {
    e.preventDefault();
    
    if (gameState === 'idle') {
        startGame();
        return;
    }
    
    if (gameState === 'waiting') {
        setTooEarlyState();
        clearAllTimeouts();
        return;
    }
    
    if (gameState === 'ready') {
        const responseTime = Date.now() - startTime;
        currentTimeEl.textContent = responseTime;
        attemptsCount++;
        attemptsEl.textContent = attemptsCount;
        saveBestScore(responseTime);
        gameState = 'recorded';
        
        gameArea.className = 'game-area record';
        
        setTimeout(() => {
            startGame();
        }, 1500);
    }
}

function startGame() {
    gameState = 'starting';
    setWaitingState();
    
    const randomDelay = Math.floor(Math.random() * 3000) + 1000;
    
    const timeoutId = setTimeout(() => {
        if (gameState === 'waiting') {
            setReadyState();
        }
    }, randomDelay);
    
    timeoutIds.push(timeoutId);
}

function resetGame() {
    clearAllTimeouts();
    gameState = 'idle';
    waitingEl.classList.add('hidden');
    readyEl.classList.add('hidden');
    tooEarlyEl.classList.add('hidden');
    gameArea.className = 'game-area';
    currentTimeEl.textContent = '--';
}

retryBtn.onclick = () => {
    resetGame();
    startGame();
};

loadBestScore();

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        handleClick(new Event('click'));
    }
});

gameArea.onclick = handleClick;
