const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Easy & Casual settings: bigger grid squares (28 vs 20)
const GRID_SIZE = 28;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameLoop = null;
let isPaused = false;
let isGameRunning = false;
let isGameOver = false;

// Easy & Casual: 3 lives instead of instant death
let lives = 3;
const MAX_LIVES = 3;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
// Lives display element
const livesEl = document.getElementById('lives');

highScoreEl.textContent = highScore;

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    lives = MAX_LIVES;
    scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = lives;
    isPaused = false;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    spawnFood();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            spawnFood();
            break;
        }
    }
}

function update() {
    if (isPaused || !isGameRunning || isGameOver) return;
    
    direction = nextDirection;
    
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    
    // Check wall collision - lose a life instead of instant death
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        loseLife();
        return;
    }
    
    // Check self collision - lose a life instead of instant death
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            loseLife();
            return;
        }
    }
    
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        spawnFood();
    } else {
        snake.pop();
    }
}

// Easy & Casual: Lose a life instead of instant game over
function loseLife() {
    lives--;
    if (livesEl) livesEl.textContent = lives;
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset snake position but keep score
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        spawnFood();
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }
    
    for (let i = 0; i < snake.length; i++) {
        const segment = snake[i];
        const isHead = i === 0;
        
        if (isHead) {
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = `rgba(0, 255, 0, ${1 - i / snake.length * 0.5})`;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 5;
        }
        
        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    }
    
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function gameOver() {
    isGameOver = true;
    isGameRunning = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function startGame() {
    if (isGameRunning) return;
    
    initGame();
    isGameRunning = true;
    startScreenEl.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    // Easy & Casual: slower game speed (180ms vs 100ms)
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 180);
}

function resetGame() {
    initGame();
    isGameRunning = true;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    // Easy & Casual: slower game speed (180ms vs 100ms)
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 180);
}

document.addEventListener('keydown', (e) => {
    if (!isGameRunning && !isGameOver) {
        startGame();
        return;
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        isPaused = !isPaused;
        return;
    }
    
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
});

restartBtn.addEventListener('click', resetGame);

draw();
