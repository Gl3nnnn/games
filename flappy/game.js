const canvas = document.getElementById('gameCanvas');

const ctx = canvas.getContext('2d');

// Easy & Casual settings:
// - Lighter gravity (0.28 vs 0.4) for easier flight
// - Easier jump (-5 vs -7)  
// - Slower pipes (1.5 vs 2)
// - Wider gaps (240 vs 180)
// - More spacing between pipe sets (150 vs 110)

const GRAVITY = 0.28;
const JUMP = -5;
const PIPE_SPEED = 1.5;
const PIPE_SPAWN_RATE = 150;
const PIPE_GAP = 240;
const BIRD_SIZE = 30;

let bird = { x: 80, y: 250, velocity: 0 };
let pipes = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let frameCount = 0;
let isGameRunning = false;
let isGameOver = false;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function initGame() {
    bird = { x: 80, y: 200, velocity: 0 };
    pipes = [];
    score = 0;
    frameCount = 0;
    scoreEl.textContent = score;
    isGameOver = false;
    isGameRunning = false;
    gameOverEl.classList.add('hidden');
}

function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    const pipeHeight = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
    
    pipes.push({
        x: canvas.width,
        topHeight: pipeHeight,
        bottomY: pipeHeight + PIPE_GAP,
        passed: false
    });
}

function update() {
    if (!isGameRunning || isGameOver) return;
    
    frameCount++;
    
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    
    if (bird.y + BIRD_SIZE > canvas.height || bird.y < 0) {
        gameOver();
        return;
    }
    
    if (frameCount % PIPE_SPAWN_RATE === 0) {
        spawnPipe();
    }
    
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        
        if (pipes[i].x + 60 < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        const birdRight = bird.x + BIRD_SIZE;
        const birdLeft = bird.x;
        const birdTop = bird.y;
        const birdBottom = bird.y + BIRD_SIZE;
        
        const pipeLeft = pipes[i].x;
        const pipeRight = pipes[i].x + 60;
        
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < pipes[i].topHeight || birdBottom > pipes[i].bottomY) {
                gameOver();
                return;
            }
        }
        
        if (!pipes[i].passed && birdLeft > pipeRight) {
            pipes[i].passed = true;
            score++;
            scoreEl.textContent = score;
        }
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#0a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 73) % canvas.width;
        const y = (i * 47) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (let pipe of pipes) {
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        
        ctx.fillRect(pipe.x, 0, 60, pipe.topHeight);
        
        ctx.fillRect(pipe.x, pipe.bottomY, 60, canvas.height - pipe.bottomY);
        
        ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.ellipse(
        bird.x + BIRD_SIZE / 2,
        bird.y + BIRD_SIZE / 2,
        BIRD_SIZE / 2,
        BIRD_SIZE / 2 - 5,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(bird.x + BIRD_SIZE / 2 + 5, bird.y + BIRD_SIZE / 2 - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.x + BIRD_SIZE / 2 + 7, bird.y + BIRD_SIZE / 2 - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function gameOver() {
    isGameOver = true;
    isGameRunning = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
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
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000 / 60);
}

function resetGame() {
    if (gameLoop) clearInterval(gameLoop);
    initGame();
    isGameRunning = true;
    isGameOver = false;
    gameOverEl.classList.add('hidden');
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000 / 60);
}

function jump() {
    if (!isGameRunning) {
        startGame();
    }
    if (!isGameOver) {
        bird.velocity = JUMP;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

canvas.addEventListener('click', jump);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});

restartBtn.addEventListener('click', resetGame);

draw();
