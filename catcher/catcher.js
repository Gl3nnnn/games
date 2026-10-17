const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants - Easy mode settings
const BASKET_WIDTH = 80;
const BASKET_HEIGHT = 20;
const OBJECT_RADIUS = 12;
const INITIAL_OBJECT_SPEED = 2;

// Game state
let score = 0;
let lives = 3;
let highScore = parseInt(localStorage.getItem('catcherHighScore')) || 0;
let isGameRunning = false;
let isPaused = false;
let isGameOver = false;

// Basket position (player)
let basketX = (canvas.width - BASKET_WIDTH) / 2;
const basketY = canvas.height - BASKET_HEIGHT - 15;

// Falling objects array
let fallingObjects = [];
// Object spawn timer
let objectSpawnTimer = null;
// Current fall speed (gradually increases)
let currentObjectSpeed = INITIAL_OBJECT_SPEED;

// DOM elements 
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

// Spawn a new falling object
function spawnObject() {
    if (!isGameRunning || isPaused) return;
    
    const xPosition = Math.random() * (canvas.width - OBJECT_RADIUS * 2) + OBJECT_RADIUS;
    fallingObjects.push({
        x: xPosition,
        y: -OBJECT_RADIUS,
        color: getRandomColor()
    });
}

function getRandomColor() {
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Update all falling objects
function updateObjects() {
    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        const object = fallingObjects[i];
        object.y += currentObjectSpeed;
        
        // Check if caught by basket (only in the crossing band above the basket)
        if (object.y + OBJECT_RADIUS >= basketY && 
            object.y - OBJECT_RADIUS <= basketY &&
            object.x >= basketX && 
            object.x <= basketX + BASKET_WIDTH) {
            score += 10;
            scoreEl.textContent = score;
            // Increase speed gradually (gentle creep, capped)
            currentObjectSpeed = Math.min(7, currentObjectSpeed + 0.005);
            // Remove object from array
            fallingObjects.splice(i, 1);
            // Play catch sound
            playCatchSound();
            continue;
        }
        
        // Check if missed (fell off screen)
        if (object.y > canvas.height + OBJECT_RADIUS) {
            fallingObjects.splice(i, 1);
            loseLife();
        }
    }
}

function loseLife() {
    if (!isGameRunning) return;
    lives--;
    livesEl.textContent = Math.max(0, lives);
    Sfx.play('die');
    FX.shake(300, 6);
    if (lives <= 0) gameOver();
}

// Draw all falling objects
function drawObjects() {
    for (const object of fallingObjects) {
        ctx.beginPath();
        ctx.arc(object.x, object.y, OBJECT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = object.color;
        ctx.shadowColor = object.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.closePath();
    }
}

// Draw the basket
function drawBasket() {
    ctx.beginPath();
    ctx.rect(basketX, basketY, BASKET_WIDTH, BASKET_HEIGHT);
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function playCatchSound() {
    if (window.Sfx && Sfx.muted) return;
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

function gameOver() {
    Sfx.play('gameover');
    Scores.submit('catcher', score);
    isGameRunning = false;
    isGameOver = true;
    if (objectSpawnTimer) {
        clearTimeout(objectSpawnTimer);
        objectSpawnTimer = null;
    }
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('catcherHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function scheduleSpawn() {
    objectSpawnTimer = setTimeout(() => {
        if (!isGameRunning) return;
        if (document.documentElement.dataset.arcPaused === '1') {
            scheduleSpawn();
            return;
        }
        spawnObject();
        scheduleSpawn();
    }, Math.max(350, 800 - score / 2));
}

function resetGame() {
    score = 0;
    scoreEl.textContent = score;
    // Clear objects
    fallingObjects = [];
    currentObjectSpeed = INITIAL_OBJECT_SPEED;
    basketX = (canvas.width - BASKET_WIDTH) / 2;
    
    startGame();
}

function startGame() {
    Sfx.play('select');
    if (isGameRunning) return;
    
    score = 0;
    scoreEl.textContent = score;
    lives = 3;
    livesEl.textContent = 3;
    isGameRunning = true;
    isPaused = false;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    startScreenEl.classList.add('hidden');
    
    if (objectSpawnTimer) {
        clearTimeout(objectSpawnTimer);
        objectSpawnTimer = null;
    }
    scheduleSpawn();
    
    // Start gameloop
    gameLoop();
}

function gameLoop() {
    if (!isGameRunning) return;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 25) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    drawBasket();
    drawObjects();
    if (!isPaused) updateObjects();
    
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!isGameRunning && !isGameOver) {
        startGame();
        return;
    }
    
    if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        isPaused = !isPaused;
        return;
    }
    
    const step = 25;
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            basketX = Math.max(0, basketX - step);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            basketX = Math.min(canvas.width - BASKET_WIDTH, basketX + step);
            break;
    }
});

// Mouse/touch controls
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    basketX = relativeX - BASKET_WIDTH / 2;
    basketX = Math.max(0, Math.min(canvas.width - BASKET_WIDTH, basketX));
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.touches[0].clientX - rect.left;
    basketX = relativeX - BASKET_WIDTH / 2;
    basketX = Math.max(0, Math.min(canvas.width - BASKET_WIDTH, basketX));
}, { passive: false });

restartBtn.addEventListener('click', resetGame);

// Initial render before game starts
function initDraw() {
    // Clear and draw background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 25) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    drawBasket();
    requestAnimationFrame(initDraw);
}

initDraw();
