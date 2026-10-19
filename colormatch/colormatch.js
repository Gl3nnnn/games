const greenBtn = document.getElementById('green');
const redBtn = document.getElementById('red');
const yellowBtn = document.getElementById('yellow');
const blueBtn = document.getElementById('blue');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const levelEl = document.getElementById('level');
const bestLevelEl = document.getElementById('bestLevel');
const statusEl = document.getElementById('status');
const gameOverEl = document.getElementById('gameOver');
const finalLevelEl = document.getElementById('finalLevel');

const buttons = [greenBtn, redBtn, yellowBtn, blueBtn];
const colors = ['green', 'red', 'yellow', 'blue'];

let sequence = [];
let playerSequence = [];
let level = 1;
let isPlaying = false;
let isShowingSequence = false;
let pendingTimer = null;
let showTimer = null;

function clearTimers() {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    clearInterval(showTimer);
    showTimer = null;
}

function init() {
    loadBestLevel();
    setupEventListeners();
}

function loadBestLevel() {
    const best = localStorage.getItem('colorMatchBestLevel');
    if (best) {
        bestLevelEl.textContent = best;
    }
}

function setupEventListeners() {
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', () => {
        gameOverEl.classList.add('hidden');
        startGame();
    });
    
    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => handleButtonClick(index));
    });
}

function startGame() {
    Sfx.play('select');
    if (isPlaying) return;
    clearTimers();
    
    isPlaying = true;
    sequence = [];
    playerSequence = [];
    level = 1;
    levelEl.textContent = level;
    statusEl.textContent = 'Watch the pattern...';
    isShowingSequence = true;
    
    pendingTimer = setTimeout(() => {
        addToSequence();
    }, 500);
}

function addToSequence() {
    const randomColor = Math.floor(Math.random() * 4);
    sequence.push(randomColor);
    playerSequence = [];
    
    showSequence();
}

function showSequence() {
    isShowingSequence = true;
    statusEl.textContent = 'Watch the pattern...';
    startBtn.disabled = true;
    
    let i = 0;
    clearInterval(showTimer);
    showTimer = setInterval(() => {
        if (i >= sequence.length) {
            clearInterval(showTimer);
            showTimer = null;
            isShowingSequence = false;
            statusEl.textContent = 'Your turn!';
            return;
        }
        
        flashButton(sequence[i]);
        i++;
    }, 800);
}

function flashButton(index) {
    const btn = buttons[index];
    btn.classList.add('flash');
    
    playSound(index);
    
    setTimeout(() => {
        btn.classList.remove('flash');
    }, 400);
}

function playSound(index) {
    Sfx.play(['blip', 'select', 'coin', 'jump'][index] || 'blip');
}

function handleButtonClick(index) {
    if (!isPlaying || isShowingSequence) return;
    
    flashButton(index);
    playerSequence.push(index);
    
    const currentIndex = playerSequence.length - 1;
    
    if (playerSequence[currentIndex] !== sequence[currentIndex]) {
        gameOver();
        return;
    }
    
    if (playerSequence.length === sequence.length) {
        level++;
        levelEl.textContent = level;
        
        if (level > parseInt(bestLevelEl.textContent)) {
            bestLevelEl.textContent = level;
            localStorage.setItem('colorMatchBestLevel', level);
        }
        
        statusEl.textContent = 'Great! Next level...';
        isShowingSequence = true;
        
        pendingTimer = setTimeout(() => {
            addToSequence();
        }, 1000);
    }
}

function gameOver() {
    clearTimers();
    isShowingSequence = false;
    Sfx.play('gameover');
    Scores.submit('colorMatch', level, { unit: 'LVL' });
    isPlaying = false;
    statusEl.textContent = 'Game Over!';
    
    finalLevelEl.textContent = level;
    gameOverEl.classList.remove('hidden');
    
    startBtn.disabled = false;
}

function resetGame() {
    clearTimers();
    isPlaying = false;
    isShowingSequence = false;
    sequence = [];
    playerSequence = [];
    level = 1;
    levelEl.textContent = level;
    statusEl.textContent = 'Press START to begin';
    gameOverEl.classList.add('hidden');
    startBtn.disabled = false;
}

init();
