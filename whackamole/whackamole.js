// Game state
let score = 0;
let highScore = parseInt(localStorage.getItem('whackamoleHighScore')) || 0;
let timeLeft = 30;
let isGameRunning = false;
let moleTimer = null;
let countdownTimer = null;
let currentMoleIndex = -1;

// DOM elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const timerEl = document.getElementById('timer');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const holes = document.querySelectorAll('.hole');

highScoreEl.textContent = highScore;

// Show a random mole
function showMole() {
    if (!isGameRunning) return;
    
    // Hide current mole if any
    hideMole();
    
    // Pick a random hole (different from previous)
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * holes.length);
    } while (newIndex === currentMoleIndex);
    
    currentMoleIndex = newIndex;
    holes[currentMoleIndex].classList.add('active');
}

// Hide current mole
function hideMole() {
    if (currentMoleIndex >= 0) {
        holes[currentMoleIndex].classList.remove('active', 'whacked');
        currentMoleIndex = -1;
    }
}

// Handle click on hole/mole
function handleWhack(e) {
    if (!isGameRunning) return;

    const targetHole = e.target.closest('.hole');
    if (!targetHole) return;

    // Check if this is the active mole
    if (targetHole.classList.contains('active') && !targetHole.classList.contains('whacked')) {
        // Hit!
        targetHole.classList.remove('active');
        targetHole.classList.add('whacked');
        
        // Increase score
        score += 10;
        scoreEl.textContent = score;
        
        // Play hit sound effect
        playHitSound();
    }
}

// Play hit sound effect using Web Audio API
function playHitSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'square';
        
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch(e) {
        console.log('Audio not supported');
    }
}

function startCountdown() {
    timeLeft = 30;
    timerEl.textContent = timeLeft;
    
    countdownTimer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    isGameRunning = false;
    clearInterval(countdownTimer);
    clearTimeout(moleTimer);
    
    // Save high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('whackamoleHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function resetGame() {
    score = 0;
    scoreEl.textContent = score;
    
    // Reset all holes
    holes.forEach(hole => {
        hole.classList.remove('active', 'whacked');
    });
    
    // Hide any remaining moles
    hideMole();
    
    timeLeft = 30;
    timerEl.textContent = timeLeft;
    
    // Start game
    startGame();
}

function startGame() {
    if (isGameRunning) return;
    
    score = 0;
    scoreEl.textContent = score;
    isGameRunning = true;
    startScreenEl.classList.add('hidden');
    
    // Start countdown
    startCountdown();
    
    // Show first mole and start the cycle
    showMole();
    scheduleNextMole();
}

function scheduleNextMole() {
    if (!isGameRunning) return;
    
    // Schedule next mole to appear after current one is visible
    moleTimer = setTimeout(() => {
        if (isGameRunning) {
            showMole();
            // Keep showing moles until game ends
            scheduleNextMole();
        }
    }, 1500); // Mole stays for 1.5 seconds, then next one appears
}

// Event listeners
holes.forEach(hole => {
    hole.addEventListener('click', handleWhack);
    // Also support touch
    hole.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleWhack(e);
    });
});

restartBtn.addEventListener('click', resetGame);

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!isGameRunning && !document.querySelector('.game-over:not(.hidden)')) {
        startGame();
    }
});

// Initial state
startScreenEl.classList.remove('hidden');
