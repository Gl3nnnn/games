const maze = document.getElementById('maze');
const timerEl = document.getElementById('timer');
const bestTimeEl = document.getElementById('bestTime');
const resetBtn = document.getElementById('resetBtn');
const winMessage = document.getElementById('winMessage');
const finalTimeEl = document.getElementById('finalTime');

const MAZE_SIZE = 10;
let playerPos = { x: 0, y: 0 };
let startTime = null;
let timerInterval = null;
let gameWon = false;

// 0 = path, 1 = wall
const mazeLayout = [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
];

const exitPos = { x: 9, y: 9 };

function init() {
    loadBestTime();
    renderMaze();
    setupControls();
    resetBtn.addEventListener('click', resetGame);
}

function loadBestTime() {
    const best = localStorage.getItem('mazeBestTime');
    if (best) {
        bestTimeEl.textContent = best + 's';
    }
}

function renderMaze() {
    maze.innerHTML = '';
    for (let y = 0; y < MAZE_SIZE; y++) {
        for (let x = 0; x < MAZE_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
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
    const cellSize = rect.width / MAZE_SIZE;
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
    if (x < 0 || x >= MAZE_SIZE || y < 0 || y >= MAZE_SIZE) return;
    if (mazeLayout[y][x] === 1) return;
    
    playerPos = { x, y };
    renderMaze();
    
    if (!startTime) {
        startTimer();
    }
    
    if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
        winGame();
    }
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1);
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function winGame() {
    gameWon = true;
    stopTimer();
    
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    finalTimeEl.textContent = finalTime;
    
    const best = localStorage.getItem('mazeBestTime');
    if (!best || parseFloat(finalTime) < parseFloat(best)) {
        localStorage.setItem('mazeBestTime', finalTime);
        bestTimeEl.textContent = finalTime + 's';
    }
    
    winMessage.classList.remove('hidden');
    
    setTimeout(() => {
        winMessage.addEventListener('click', () => {
            winMessage.classList.add('hidden');
        });
    }, 500);
}

function resetGame() {
    stopTimer();
    playerPos = { x: 0, y: 0 };
    startTime = null;
    gameWon = false;
    timerEl.textContent = '0.0';
    winMessage.classList.add('hidden');
    renderMaze();
}

init();
