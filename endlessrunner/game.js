const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

let gameRunning = false;
let score = 0;
let highScore = 0;
let frameCount = 0;
let gameSpeed = 3;

function loadHighScore() {
    const savedScore = localStorage.getItem('endlessRunnerHighScore');
    if (savedScore) {
        highScore = parseInt(savedScore);
        highScoreEl.textContent = highScore;
    }
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('endlessRunnerHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

const player = {
    x: 50,
    y: 200,
    width: 30,
    height: 40,
    velocityY: 0,
    isJumping: false,
    jumpPower: -12,
    gravity: 0.6
};

const groundY = 250;
let obstacles = [];
let powerUps = [];

function resetGame() {
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.isJumping = false;
    obstacles = [];
    powerUps = [];
    score = 0;
    frameCount = 0;
    gameSpeed = 3;
    scoreEl.textContent = '0';
}

function jump() {
    if (!player.isJumping) {
        player.velocityY = player.jumpPower;
        player.isJumping = true;
    }
}

function updatePlayer() {
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    if (player.y >= groundY - player.height) {
        player.y = groundY - player.height;
        player.velocityY = 0;
        player.isJumping = false;
    }

    if (player.y < 20) {
        player.y = 20;
    }
}

function spawnObstacle() {
    if (frameCount % 120 === 0 && Math.random() > 0.3) {
        const heightMult = Math.random() > 0.7 ? 1.5 : 1;
        obstacles.push({
            x: canvas.width,
            y: groundY - 30 * heightMult,
            width: 25,
            height: 30 * heightMult
        });
    }
}

function spawnPowerUp() {
    if (Math.random() < 0.002 && frameCount % 100 === 0) {
        powerUps.push({
            x: canvas.width,
            y: groundY - 80 - Math.random() * 40,
            width: 20,
            height: 20,
            type: 'speed'
        });
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreEl.textContent = score;

            if (score % 500 === 0 && gameSpeed < 8) {
                gameSpeed += 0.2;
            }
        }
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].x -= gameSpeed;

        if (player.x < powerUps[i].x + powerUps[i].width &&
            player.x + player.width > powerUps[i].x &&
            player.y < powerUps[i].y + powerUps[i].height &&
            player.y + player.height > powerUps[i].y) {
            
            powerUps.splice(i, 1);
            gameSpeed += 1;
            setTimeout(() => { gameSpeed = Math.max(3, gameSpeed - 1); }, 3000);
            continue;
        }

        if (powerUps[i].x + powerUps[i].width < 0) {
            powerUps.splice(i, 1);
        }
    }
}

function checkCollisions() {
    for (let obs of obstacles) {
        if (player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {
            return true;
        }
    }
    return false;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, groundY, canvas.width, 3);
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff00';

    // Draw player
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw obstacles
    ctx.fillStyle = '#ff0066';
    ctx.shadowColor = '#ff0066';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw power-ups
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    for (let pu of powerUps) {
        ctx.beginPath();
        ctx.arc(pu.x + pu.width/2, pu.y + pu.height/2, pu.width/2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (!gameRunning) return;

    frameCount++;
    updatePlayer();
    spawnObstacle();
    spawnPowerUp();
    updateObstacles();
    updatePowerUps();
    draw();

    if (checkCollisions()) {
        gameRunning = false;
        saveHighScore();
        finalScoreEl.textContent = score;
        gameOverEl.classList.remove('hidden');
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    resetGame();
    gameRunning = true;
    startScreenEl.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    gameLoop();
}

restartBtn.onclick = startGame;

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameRunning && !gameOverEl.classList.contains('hidden') === false) {
            startGame();
        } else if (gameRunning) {
            jump();
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameRunning) {
        jump();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning) {
        jump();
    }
});

loadHighScore();
