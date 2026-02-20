// Simple word list for typing practice
const words = [
    'cat', 'dog', 'sun', 'run', 'box', 'cup', 'hat', 'pen', 'car', 'bus',
    'tree', 'bird', 'fish', 'jump', 'play', 'work', 'home', 'time', 'book', 'rain',
    'star', 'moon', 'light', 'sound', 'water', 'house', 'smile', 'happy', 'green', 'blue',
    'hello', 'world', 'games', 'neon', 'cyber', 'arcade', 'speed', 'typing', 'quick', 'flash',
    'brave', 'cosmic', 'digital', 'future', 'galaxy', 'laser', 'matrix', 'pixel', 'quantum', 'rocket',
    'shadow', 'thunder', 'vector', 'zebra', 'action', 'battle', 'chrome', 'dragon', 'energy', 'frozen',
    'golden', 'heroic', 'iron', 'jungle', 'knight', 'legend', 'magic', 'ninja', 'ocean', 'phoenix',
    'quest', 'royal', 'storm', 'tiger', 'ultra', 'viral', 'winter', 'xenon', 'young', 'zesty',
    'adventure', 'challenge', 'champion', 'dangerous', 'exciting', 'fantastic', 'glorious', 'incredible',
    'joyful', 'kingdom', 'legendary', 'mysterious', 'powerful', 'quest', 'radiant', 'stunning',
    'treasure', 'ultimate', 'victory', 'wonderful'
];

const wordDisplay = document.getElementById('wordDisplay');
const wordInput = document.getElementById('wordInput');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const wpmEl = document.getElementById('wpm');
const bestWpmEl = document.getElementById('bestWpm');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let currentWord = '';
let score = 0;
let timeLeft = 60;
let timerInterval = null;
let gameRunning = false;
let wordsTyped = 0;

function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

function loadBestWpm() {
    const bestWpm = localStorage.getItem('typingBestWpm');
    if (bestWpm) {
        bestWpmEl.textContent = bestWpm;
    }
}

function saveBestWpm(wpm) {
    const currentBest = localStorage.getItem('typingBestWpm');
    if (!currentBest || wpm > parseInt(currentBest)) {
        localStorage.setItem('typingBestWpm', wpm);
        bestWpmEl.textContent = wpm;
        showMessage('New Best WPM!', 'success');
    }
}

function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 1500);
}

function startGame() {
    gameRunning = true;
    score = 0;
    timeLeft = 60;
    wordsTyped = 0;
    
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    wpmEl.textContent = '0';
    
    wordInput.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    
    startBtn.style.display = 'none';
    restartBtn.style.display = 'inline-block';
    
    currentWord = getRandomWord();
    wordDisplay.textContent = currentWord;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            timerEl.style.color = '#ff0000';
            timerEl.style.textShadow = '0 0 10px #ff0000';
        } else {
            timerEl.style.color = '#ff6600';
            timerEl.style.textShadow = '0 0 10px #ff6600';
        }
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    
    wordInput.disabled = true;
    
    const finalWpm = Math.round((wordsTyped / 60) * 60);
    wpmEl.textContent = finalWpm;
    
    saveBestWpm(finalWpm);
    
    wordDisplay.textContent = 'GAME OVER!';
    wordDisplay.style.color = '#ff00ff';
    wordDisplay.style.textShadow = '0 0 20px #ff00ff';
    
    showMessage(`Final Score: ${score} words | WPM: ${finalWpm}`, 'success');
    
    restartBtn.textContent = 'PLAY AGAIN';
}

function checkInput() {
    if (!gameRunning) return;
    
    const typed = wordInput.value.trim().toLowerCase();
    
    if (typed === currentWord) {
        score++;
        wordsTyped++;
        scoreEl.textContent = score;
        
        const wpm = Math.round((wordsTyped / (60 - timeLeft)) * 60);
        wpmEl.textContent = wpm;
        
        wordDisplay.classList.add('correct');
        setTimeout(() => wordDisplay.classList.remove('correct'), 300);
        
        wordInput.value = '';
        currentWord = getRandomWord();
        wordDisplay.textContent = currentWord;
        
        showMessage('Correct!', 'success');
    }
}

function resetGame() {
    clearInterval(timerInterval);
    gameRunning = false;
    score = 0;
    timeLeft = 60;
    wordsTyped = 0;
    
    timerEl.textContent = '60';
    timerEl.style.color = '#ff6600';
    timerEl.style.textShadow = '0 0 10px #ff6600';
    scoreEl.textContent = '0';
    wpmEl.textContent = '0';
    
    wordInput.disabled = true;
    wordInput.value = '';
    wordDisplay.textContent = 'Press START to begin';
    wordDisplay.style.color = '#00ff00';
    wordDisplay.style.textShadow = '0 0 20px #00ff00';
    
    startBtn.style.display = 'inline-block';
    restartBtn.style.display = 'none';
    restartBtn.textContent = 'RESTART';
    
    messageEl.textContent = '';
    messageEl.className = 'message';
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    resetGame();
    startGame();
});

wordInput.addEventListener('input', checkInput);

wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkInput();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameRunning) {
        e.preventDefault();
        startGame();
    }
});

loadBestWpm();
