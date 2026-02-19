const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants - Easy mode settings
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 4;
const BRICK_COLUMN_COUNT = 7;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 35;
const BRICK_WIDTH = 65;
const BRICK_HEIGHT = 20;

// Calculate brick dimensions to fit canvas
const actualBrickWidth = (canvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;
const actualBrickHeight = 20;

// Ball speed - slow for easy mode
let ballSpeedX = 3;
let ballSpeedY = -3;

// Game state
let score = 0;
let highScore = parseInt(localStorage.getItem('breakoutHighScore')) || 0;
let isGameRunning = false;
let isPaused = false;
let isGameOver = false;
let gameLoop = null;

// Paddle position
let paddleX = (canvas.width - PADDLE_WIDTH) / 2;

// Ball position
let ballX = canvas.width / 2;
let ballY = canvas.height - 30;

// Bricks array
let bricks = [];

// DOM elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const gameOverTitle = document.getElementById('gameOverTitle');

highScoreEl.textContent = highScore;

// Initialize bricks
function initBricks() {
    bricks = [];
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        bricks[c] = [];
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            bricks[c][r] = { 
                x: 0, 
                y: 0, 
                status: 1,
                // Different colors for different rows
                color: r === 0 ? '#ff0000' : r === 1 ? '#ff6600' : r === 2 ? '#ffff00' : '#00ff00'
            };
        }
    }
}

// Draw the ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Draw the paddle
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Draw the bricks
function drawBricks() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (actualBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (actualBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, actualBrickWidth, actualBrickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.shadowColor = bricks[c][r].color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
        }
    }
}

// Collision detection for bricks
function collisionDetection() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ballX > b.x && ballX < b.x + actualBrickWidth && 
                    ballY > b.y && ballY < b.y + actualBrickHeight) {
                    ballSpeedY = -ballSpeedY;
                    b.status = 0;
                    score += 10;
                    scoreEl.textContent = score;
                    
                    // Check win condition
                    checkWin();
                }
            }
        }
    }
}

// Check if player won
function checkWin() {
    let remainingBricks = 0;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                remainingBricks++;
            }
        }
    }
    
    if (remainingBricks === 0) {
        gameOver(true);
    }
}

// Draw everything
function draw() {
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
    
    drawBricks();
    drawBall();
    drawPaddle();
    
    if (isGameRunning && !isPaused && !isGameOver) {
        // Ball collision with walls
        if (ballX + ballSpeedX > canvas.width - BALL_RADIUS || ballX + ballSpeedX < BALL_RADIUS) {
            ballSpeedX = -ballSpeedX;
        }
        
        if (ballY + ballSpeedY < BALL_RADIUS) {
            ballSpeedY = -ballSpeedY;
        } else if (ballY + ballSpeedY > canvas.height - BALL_RADIUS - PADDLE_HEIGHT - 10) {
            // Check paddle collision
            if (ballX > paddleX && ballX < paddleX + PADDLE_WIDTH) {
                ballSpeedY = -ballSpeedY;
                // Add some angle based on where it hit the paddle
                const hitPoint = ballX - (paddleX + PADDLE_WIDTH / 2);
                ballSpeedX = hitPoint * 0.1;
            } else if (ballY + ballSpeedY > canvas.height - BALL_RADIUS) {
                // Ball fell - game over
                gameOver(false);
                return;
            }
        }
        
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        collisionDetection();
    }
}

// Game over function
function gameOver(won) {
    isGameOver = true;
    isGameRunning = false;
    
    if (won) {
        gameOverTitle.textContent = 'YOU WIN!';
        gameOverTitle.style.color = '#00ff00';
        gameOverTitle.style.textShadow = '0 0 20px #00ff00';
    } else {
        gameOverTitle.textContent = 'GAME OVER';
        gameOverTitle.style.color = '#ff0000';
        gameOverTitle.style.textShadow = '0 0 20px #ff0000';
    }
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('breakoutHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

// Start the game
function startGame() {
    if (isGameRunning) return;
    
    // Reset game state
    score = 0;
    scoreEl.textContent = score;
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    ballSpeedX = 3;
    ballSpeedY = -3;
    paddleX = (canvas.width - PADDLE_WIDTH) / 2;
    
    initBricks();
    
    isGameRunning = true;
    isPaused = false;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    startScreenEl.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, 1000 / 60);
}

// Reset the game
function resetGame() {
    startGame();
}

// Keyboard controls
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
    
    const step = 25;
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            paddleX = Math.max(0, paddleX - step);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            paddleX = Math.min(canvas.width - PADDLE_WIDTH, paddleX + step);
            break;
    }
});

// Mouse/touch controls
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    paddleX = relativeX - PADDLE_WIDTH / 2;
    paddleX = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, paddleX));
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.touches[0].clientX - rect.left;
    paddleX = relativeX - PADDLE_WIDTH / 2;
    paddleX = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, paddleX));
}, { passive: false });

restartBtn.addEventListener('click', resetGame);

// Initialize bricks for initial draw
initBricks();
draw();
