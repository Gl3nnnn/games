const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const timeLeftEl = document.getElementById('timeLeft');
const targetsLeftEl = document.getElementById('targetsLeft');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const gameOverTitleEl = document.getElementById('gameOverTitle');

let gameRunning = false;
let score = 0;
let highScore = 0;
let timeLeft = 30;
let targetsLeft = 15;
let timerInterval = null;
let targets = [];
const targetColors = ['#ff0066', '#00ff66', '#6600ff', '#ff6600', '#00ffff', '#ff00ff'];

function loadHighScore() {
    const savedScore = localStorage.getItem('shootingGalleryHighScore');
    if (savedScore) {
        highScore = parseInt(savedScore);
        highScoreEl.textContent = highScore;
    }
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('shootingGalleryHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function createTarget() {
    const size = 30 + Math.random() * 40;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    targets.push({
        x: direction === 1 ? -size : canvas.width + size,
        y: 50 + Math.random() * (canvas.height - 100 - size),
        size: size,
        speed: (1 + Math.random() * 1.5) * direction,
        color: targetColors[Math.floor(Math.random() * targetColors.length)],
        points: Math.floor(size / 10),
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1
    });
}

function resetGame() {
    score = 0;
    timeLeft = 30;
    targetsLeft = 15;
    targets = [];
    
    scoreEl.textContent = '0';
    timeLeftEl.textContent = timeLeft;
    targetsLeftEl.textContent = targetsLeft;
    
    // Spawn initial targets
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createTarget(), i * 300);
    }
}

function updateTargets() {
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        target.x += target.speed;
        target.rotation += target.rotationSpeed;
        
        // Remove targets that are off screen
        if ((target.speed > 0 && target.x > canvas.width + target.size) ||
            (target.speed < 0 && target.x < -target.size)) {
            targets.splice(i, 1);
            targetsLeft--;
            targetsLeftEl.textContent = targetsLeft;
            
            // Spawn new target
            if (targetsLeft > 0 && targets.length < 5) {
                createTarget();
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw targets
    for (let target of targets) {
        ctx.save();
        ctx.translate(target.x + target.size/2, target.y + target.size/2);
        ctx.rotate(target.rotation);
        
        // Outer glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = target.color;
        
        // Draw target circle
        ctx.fillStyle = target.color;
        ctx.beginPath();
        ctx.arc(0, 0, target.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner rings
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, target.size/3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = target.color;
        ctx.beginPath();
        ctx.arc(0, 0, target.size/6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (!gameRunning) return;
    
    updateTargets();
    draw();
    
    if (timeLeft <= 0 || targetsLeft <= 0) {
        endGame();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    resetGame();
    gameRunning = true;
    startScreenEl.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftEl.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    gameLoop();
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    saveHighScore();
    
    if (targetsLeft <= 0) {
        gameOverTitleEl.textContent = 'ALL TARGETS HIT!';
    } else {
        gameOverTitleEl.textContent = 'TIME UP!';
    }
    
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function handleClick(e) {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        const dx = clickX - (target.x + target.size/2);
        const dy = clickY - (target.y + target.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= target.size/2) {
            // Hit!
            score += target.points;
            scoreEl.textContent = score;
            
            // Create hit effect
            createHitEffect(target.x + target.size/2, target.y + target.size/2, target.color);
            
            targets.splice(i, 1);
            targetsLeft--;
            targetsLeftEl.textContent = targetsLeft;
            
            // Spawn new target
            if (targetsLeft > 0) {
                setTimeout(createTarget, 500);
            }
            
            break;
        }
    }
}

function createHitEffect(x, y, color) {
    // Simple visual feedback - flash the canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleClick({ clientX: touch.clientX, clientY: touch.clientY });
});

restartBtn.onclick = startGame;
startScreenEl.onclick = startGame;

loadHighScore();
