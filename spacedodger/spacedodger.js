const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const newRecordEl = document.getElementById('newRecord');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

let score = 0;
let gameRunning = false;
let playerX = 0;
let asteroids = [];
let gameLoop = null;
let asteroidSpawner = null;
let gameSpeed = 3;
let spawnRate = 1500;

const PLAYER_SIZE = 50;
const ASTEROID_SIZE = 35;
const PLAYER_SPEED = 25;

function loadHighScore() {
    const highScore = localStorage.getItem('spaceDodgerHighScore');
    if (highScore) {
        highScoreEl.textContent = highScore;
    }
}

function saveHighScore(newScore) {
    const currentBest = localStorage.getItem('spaceDodgerHighScore');
    if (!currentBest || newScore > parseInt(currentBest)) {
        localStorage.setItem('spaceDodgerHighScore', newScore);
        highScoreEl.textContent = newScore;
        return true;
    }
    return false;
}

function initPlayer() {
    const areaRect = gameArea.getBoundingClientRect();
    playerX = (areaRect.width - PLAYER_SIZE) / 2;
    player.style.left = playerX + 'px';
    player.style.bottom = '30px';
    player.classList.remove('hit');
}

function movePlayer(direction) {
    if (!gameRunning) return;
    
    const areaRect = gameArea.getBoundingClientRect();
    const maxX = areaRect.width - PLAYER_SIZE;
    
    if (direction === 'left') {
        playerX = Math.max(0, playerX - PLAYER_SPEED);
    } else if (direction === 'right') {
        playerX = Math.min(maxX, playerX + PLAYER_SPEED);
    }
    
    player.style.left = playerX + 'px';
}

function spawnAsteroid() {
    if (!gameRunning) return;
    
    const areaRect = gameArea.getBoundingClientRect();
    const maxX = areaRect.width - ASTEROID_SIZE;
    const x = Math.floor(Math.random() * maxX);
    
    const asteroid = document.createElement('div');
    asteroid.className = 'asteroid';
    asteroid.textContent = '🪨';
    asteroid.style.left = x + 'px';
    asteroid.style.top = '0px';
    
    gameArea.appendChild(asteroid);
    
    asteroids.push({
        element: asteroid,
        x: x,
        y: 0
    });
}

function updateAsteroids() {
    const areaRect = gameArea.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        asteroid.y += gameSpeed;
        asteroid.element.style.top = asteroid.y + 'px';
        
        // Check collision
        const asteroidRect = asteroid.element.getBoundingClientRect();
        
        if (
            playerRect.left < asteroidRect.right &&
            playerRect.right > asteroidRect.left &&
            playerRect.top < asteroidRect.bottom &&
            playerRect.bottom > asteroidRect.top
        ) {
            gameOver();
            return;
        }
        
        // Remove if off screen
        if (asteroid.y > areaRect.height) {
            asteroid.element.remove();
            asteroids.splice(i, 1);
        }
    }
}

function updateScore() {
    if (!gameRunning) return;
    
    score++;
    scoreEl.textContent = score;
    
    // Gradually increase difficulty
    if (score % 100 === 0) {
        gameSpeed = Math.min(8, gameSpeed + 0.5);
        spawnRate = Math.max(500, spawnRate - 100);
        
        clearInterval(asteroidSpawner);
        asteroidSpawner = setInterval(spawnAsteroid, spawnRate);
    }
}

function startGame() {
    gameRunning = true;
    score = 0;
    gameSpeed = 3;
    spawnRate = 1500;
    
    // Clear existing asteroids
    asteroids.forEach(a => a.element.remove());
    asteroids = [];
    
    scoreEl.textContent = '0';
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    initPlayer();
    
    // Start game loops
    gameLoop = setInterval(updateAsteroids, 30);
    asteroidSpawner = setInterval(spawnAsteroid, spawnRate);
    setInterval(updateScore, 100);
}

function gameOver() {
    gameRunning = false;
    
    clearInterval(gameLoop);
    clearInterval(asteroidSpawner);
    
    player.classList.add('hit');
    
    finalScoreEl.textContent = score;
    
    const isNewHigh = saveHighScore(score);
    if (isNewHigh && score > 0) {
        newRecordEl.classList.remove('hidden');
    } else {
        newRecordEl.classList.add('hidden');
    }
    
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

function resetGame() {
    gameRunning = false;
    score = 0;
    
    asteroids.forEach(a => a.element.remove());
    asteroids = [];
    
    clearInterval(gameLoop);
    clearInterval(asteroidSpawner);
    
    player.classList.remove('hit');
    player.style.left = '0px';
    
    scoreEl.textContent = '0';
    
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    newRecordEl.classList.add('hidden');
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameRunning) {
        e.preventDefault();
        startGame();
        return;
    }
    
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        movePlayer('left');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        movePlayer('right');
    }
});

// Touch/swipe controls for mobile
let touchStartX = 0;

gameArea.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});

gameArea.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;
    
    if (Math.abs(diff) > 10) {
        if (diff > 0) {
            movePlayer('right');
        } else {
            movePlayer('left');
        }
        touchStartX = touchX;
    }
}, { passive: false });

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
    resetGame();
    setTimeout(startGame, 100);
});

loadHighScore();
