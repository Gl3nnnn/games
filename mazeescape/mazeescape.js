const maze = document.getElementById('maze');
const timerEl = document.getElementById('timer');
const bestTimeEl = document.getElementById('bestTime');
const levelEl = document.getElementById('level');
const resetBtn = document.getElementById('resetBtn');
const winMessage = document.getElementById('winMessage');
const winLevelEl = document.getElementById('winLevel');
const finalTimeEl = document.getElementById('finalTime');
const nextBtn = document.getElementById('nextBtn');
const loseMessage = document.getElementById('loseMessage');
const loseLevelEl = document.getElementById('loseLevel');
const retryBtn = document.getElementById('retryBtn');

let mazeSize = 10;
let playerPos = { x: 0, y: 0 };
let level = 1;
let timeLimit = 45;
let timeLeftT = 0;
let timerInterval = null;
let gameWon = false;
let mazeLayout = [];

const exitPos = { x: 9, y: 9 };

function sizeForLevel(l) {
    return Math.min(9 + l, 25);
}

function limitForLevel(l) {
    return 30 + sizeForLevel(l) * 1.5;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateMaze(size) {
    const g = Array.from({ length: size }, () => Array(size).fill(1));
    
    function carve(cx, cy) {
        g[cy][cx] = 0;
        const dirs = shuffle([[0, -2], [0, 2], [-2, 0], [2, 0]]);
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < size && ny < size && g[ny][nx] === 1) {
                g[cy + dy / 2][cx + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }
    
    carve(0, 0);
    
    // Guarantee the exit (bottom-right) is carved and reachable
    g[size - 1][size - 1] = 0;
    g[size - 1][size - 2] = 0;
    g[size - 2][size - 1] = 0;
    
    return g;
}

function init() {
    loadBestTime();
    setupControls();
    resetBtn.addEventListener('click', resetGame);
    nextBtn.addEventListener('click', nextLevel);
    retryBtn.addEventListener('click', resetGame);
    startLevel();
}

function loadBestTime() {
    const best = localStorage.getItem('mazeBestTime');
    if (best) {
        bestTimeEl.textContent = best + 's';
    }
}

function renderMaze() {
    const cellPx = Math.max(14, Math.min(30, Math.floor(420 / mazeSize)));
    maze.style.gridTemplateColumns = 'repeat(' + mazeSize + ', ' + cellPx + 'px)';
    maze.innerHTML = '';
    for (let y = 0; y < mazeSize; y++) {
        for (let x = 0; x < mazeSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.width = cellPx + 'px';
            cell.style.height = cellPx + 'px';
            
            if (x === 0 && y === 0) {
                cell.classList.add('start');
            } else if (x === exitPos.x && y === exitPos.y) {
                cell.classList.add('exit');
            } else if (mazeLayout[y][x] === 1) {
                cell.classList.add('wall');
            } else {
                cell.classList.add('path');
            }
            
            if (x === playerPos.x && y === playerPos.y) {
                cell.classList.add('player');
            }
            
            maze.appendChild(cell);
        }
    }
}

function setupControls() {
    document.addEventListener('keydown', handleKeyPress);
    
    maze.addEventListener('click', handleTouch);
}

function handleKeyPress(e) {
    if (gameWon) return;
    
    let newX = playerPos.x;
    let newY = playerPos.y;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            newY--;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            newY++;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            newX--;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            newX++;
            break;
        default:
            return;
    }
    
    e.preventDefault();
    movePlayer(newX, newY);
}

function handleTouch(e) {
    if (gameWon) return;
    
    const rect = maze.getBoundingClientRect();
    const cellSize = rect.width / mazeSize;
    const clickX = Math.floor((e.clientX - rect.left) / cellSize);
    const clickY = Math.floor((e.clientY - rect.top) / cellSize);
    
    let newX = playerPos.x;
    let newY = playerPos.y;
    
    if (clickX > playerPos.x) newX++;
    else if (clickX < playerPos.x) newX--;
    else if (clickY > playerPos.y) newY++;
    else if (clickY < playerPos.y) newY--;
    
    movePlayer(newX, newY);
}

function movePlayer(x, y) {
    if (document.documentElement.dataset.arcPaused === '1') return;
    if (gameWon) return;
    if (x < 0 || x >= mazeSize || y < 0 || y >= mazeSize) return;
    if (mazeLayout[y][x] === 1) return;
    
    playerPos = { x, y };
    Sfx.play('move');
    renderMaze();
    
    if (!timerInterval) {
        startTimer();
    }
    
    if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
        winGame();
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeftT = Math.max(0, timeLeftT - 0.1);
        timerEl.textContent = timeLeftT.toFixed(1);
        if (timeLeftT <= 0) timeUp();
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function winGame() {
    if (gameWon) return;
    Sfx.play('win');
    gameWon = true;
    stopTimer();
    
    const thisTime = timeLimit - timeLeftT;
    finalTimeEl.textContent = thisTime.toFixed(1);
    winLevelEl.textContent = level;
    
    const best = localStorage.getItem('mazeBestTime');
    if (thisTime > 0 && (!best || thisTime < parseFloat(best))) {
        localStorage.setItem('mazeBestTime', thisTime.toFixed(1));
        bestTimeEl.textContent = thisTime.toFixed(1) + 's';
        Scores.submit('maze', parseFloat(thisTime.toFixed(1)), { lowerBetter: true });
    }
    
    winMessage.classList.remove('hidden');
}

function timeUp() {
    if (gameWon) return;
    Sfx.play('gameover');
    gameWon = true;
    stopTimer();
    loseLevelEl.textContent = level;
    loseMessage.classList.remove('hidden');
}

function nextLevel() {
    winMessage.classList.add('hidden');
    level++;
    startLevel();
}

function startLevel() {
    mazeSize = sizeForLevel(level);
    exitPos.x = mazeSize - 1;
    exitPos.y = mazeSize - 1;
    mazeLayout = generateMaze(mazeSize);
    playerPos = { x: 0, y: 0 };
    timeLimit = limitForLevel(level);
    timeLeftT = timeLimit;
    gameWon = false;
    stopTimer();
    levelEl.textContent = level;
    timerEl.textContent = timeLeftT.toFixed(1);
    timerEl.style.color = '';
    timerEl.style.textShadow = '';
    renderMaze();
}

function resetGame() {
    Sfx.play('select');
    stopTimer();
    level = 1;
    winMessage.classList.add('hidden');
    loseMessage.classList.add('hidden');
    startLevel();
}

init();
