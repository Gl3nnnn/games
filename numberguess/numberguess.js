const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const winScreen = document.getElementById('winScreen');
const hintText = document.getElementById('hintText');
const guessInput = document.getElementById('guessInput');
const attemptsEl = document.getElementById('attempts');
const bestAttemptsEl = document.getElementById('bestAttempts');
const secretNumberEl = document.getElementById('secretNumber');
const finalAttemptsEl = document.getElementById('finalAttempts');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const guessBtn = document.getElementById('guessBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

let secretNumber = 0;
let attempts = 0;
let gameStarted = false;

function getRandomNumber() {
    return Math.floor(Math.random() * 50) + 1;
}

function loadBestAttempts() {
    const bestAttempts = localStorage.getItem('numberGuessBest');
    if (bestAttempts) {
        bestAttemptsEl.textContent = bestAttempts;
    }
}

function saveBestAttempts(attemptsCount) {
    const currentBest = localStorage.getItem('numberGuessBest');
    if (!currentBest || attemptsCount < parseInt(currentBest)) {
        localStorage.setItem('numberGuessBest', attemptsCount);
        bestAttemptsEl.textContent = attemptsCount;
        showMessage('New Best! Fewer attempts!', 'success');
    }
}

function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 2000);
}

function startGame() {
    secretNumber = getRandomNumber();
    attempts = 0;
    gameStarted = true;
    
    attemptsEl.textContent = attempts;
    guessInput.value = '';
    hintText.textContent = 'Guess the number!';
    hintText.className = 'hint-text';
    
    startScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    guessInput.focus();
    console.log('Secret number (for testing):', secretNumber);
}

function makeGuess() {
    if (!gameStarted) return;
    
    const guess = parseInt(guessInput.value);
    
    if (isNaN(guess) || guess < 1 || guess > 50) {
        showMessage('Please enter a number between 1 and 50', 'error');
        return;
    }
    
    attempts++;
    attemptsEl.textContent = attempts;
    
    if (guess === secretNumber) {
        hintText.textContent = 'Correct!';
        hintText.className = 'hint-text correct';
        
        secretNumberEl.textContent = secretNumber;
        finalAttemptsEl.textContent = attempts;
        
        saveBestAttempts(attempts);
        
        gameScreen.classList.add('hidden');
        winScreen.classList.remove('hidden');
        
        showMessage('Congratulations! You won!', 'success');
    } else if (guess > secretNumber) {
        hintText.textContent = 'Too high! Try lower ↘';
        hintText.className = 'hint-text high';
    } else {
        hintText.textContent = 'Too low! Try higher ↗';
        hintText.className = 'hint-text low';
    }
    
    guessInput.value = '';
    guessInput.focus();
}

function resetGame() {
    gameStarted = false;
    secretNumber = 0;
    attempts = 0;
    
    attemptsEl.textContent = '0';
    guessInput.value = '';
    hintText.textContent = 'Guess the number!';
    hintText.className = 'hint-text';
    
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    
    messageEl.textContent = '';
    messageEl.className = 'message';
}

startBtn.addEventListener('click', startGame);
guessBtn.addEventListener('click', makeGuess);
playAgainBtn.addEventListener('click', () => {
    resetGame();
    setTimeout(startGame, 100);
});

guessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        makeGuess();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameStarted) {
        e.preventDefault();
        startGame();
    }
});

loadBestAttempts();
