// Game state
let score = 0;
let highScore = parseInt(localStorage.getItem('whackamoleHighScore')) || 0;
let timeLeft = 30;
let lives = 3;
let isGameRunning = false;
let moleTimer = null;
let countdownTimer = null;
let currentMoleIndex = -1;
let pendingEscape = new Set();

// DOM elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const timerEl = document.getElementById('timer');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const holes = document.querySelectorAll('.hole');

highScoreEl.textContent = highScore;

function dwellTime() {
    return Math.max(450, 1500 - (30 - timeLeft) * 40);
}

function finalizeMoles() {
    pendingEscape.forEach(i => {
        const hole = holes[i];
        if (hole.classList.contains('active') && !hole.classList.contains('whacked')) {
            loseLife();
        }
    });
    pendingEscape.clear();
    holes.forEach(h => h.classList.remove('active', 'whacked'));
    currentMoleIndex = -1;
}

// Show random mole(s): two moles during the final 15 seconds
function showMole() {
    if (!isGameRunning) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    
    finalizeMoles();
    if (!isGameRunning) return;
    
    const count = timeLeft <= 15 ? 2 : 1;
    const chosen = new Set();
    while (chosen.size < Math.min(count, holes.length)) {
        chosen.add(Math.floor(Math.random() * holes.length));
    }
    
    pendingEscape = new Set(chosen);
    chosen.forEach(i => holes[i].classList.add('active'));
    currentMoleIndex = chosen.values().next().value;
}

function loseLife() {
    if (!isGameRunning) return;
    lives--;
    livesEl.textContent = Math.max(0, lives);
    Sfx.play('die');
    FX.shake(250, 5);
    if (lives <= 0) endGame();
}

// Hide current mole
function hideMole() {
    finalizeMoles();
}

// Handle click on hole/mole
function handleWhack(e) {
    if (!isGameRunning) return;
    if (document.documentElement.dataset.arcPaused === '1') return;

    const targetHole = e.target.closest('.hole');
    if (!targetHole) return;

    // Check if this is an active mole
    if (targetHole.classList.contains('active') && !targetHole.classList.contains('whacked')) {
        // Hit!
        targetHole.classList.remove('active');
        targetHole.classList.add('whacked');
        
        const idx = [...holes].indexOf(targetHole);
        pendingEscape.delete(idx);
        
        // Increase score
        score += 10;
        scoreEl.textContent = score;
        
        // Play hit sound effect
        playHitSound();
    }
}

// Play hit sound effect using the shared arcade synth
function playHitSound() {
    Sfx.play('hit');
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
    if (!isGameRunning) return;
    Sfx.play('gameover');
    Scores.submit('whackamole', score);
    isGameRunning = false;
    clearInterval(countdownTimer);
    clearTimeout(moleTimer);
    pendingEscape.clear();
    holes.forEach(h => h.classList.remove('active', 'whacked'));
    currentMoleIndex = -1;
    
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
    if (isGameRunning) return;
    score = 0;
    scoreEl.textContent = score;
    lives = 3;
    livesEl.textContent = 3;
    pendingEscape.clear();
    
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
    Sfx.play('select');
    if (isGameRunning) return;
    
    score = 0;
    scoreEl.textContent = score;
    lives = 3;
    livesEl.textContent = 3;
    pendingEscape.clear();
    isGameRunning = true;
    startScreenEl.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    
    // Start countdown
    startCountdown();
    
    // Show first mole and start the cycle
    showMole();
    scheduleNextMole();
}

function scheduleNextMole() {
    if (!isGameRunning) return;
    
    // Schedule next mole to appear after the current dwell time
    moleTimer = setTimeout(() => {
        if (isGameRunning) {
            if (document.documentElement.dataset.arcPaused === '1') {
                scheduleNextMole();
                return;
            }
            showMole();
            // Keep showing moles until game ends
            scheduleNextMole();
        }
    }, dwellTime());
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
    if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName || '')) return;
    if (!isGameRunning && !document.querySelector('.game-over:not(.hidden)')) {
        e.preventDefault();
        startGame();
    }
});

// Initial state
startScreenEl.classList.remove('hidden');
