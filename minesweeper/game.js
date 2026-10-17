const boardEl = document.getElementById('board');
const mineCountEl = document.getElementById('mineCount');
const timerEl = document.getElementById('timer');
const bestTimeEl = document.getElementById('bestTime');
const overTitleEl = document.getElementById('overTitle');
const overMsgEl = document.getElementById('overMsg');
const gameOverEl = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const againBtn = document.getElementById('againBtn');

let SIZE = 10, MINES = 10;

let mines, revealed, flagged, revealedCount, firstClick, gameOver, timer, time;
let holdTimer = null, flagMode = false, suppressClick = false, overTimer = null;

let bestTime = parseInt(localStorage.getItem('minesweeperBestTime')) || 0;
bestTimeEl.textContent = bestTime ? bestTime + 's' : '--';

function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
    }
    return out;
}

function placeMines(safeR, safeC) {
    mines = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (mines[r][c] || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
        mines[r][c] = true;
        placed++;
    }
}

function countMines(r, c) {
    return neighbors(r, c).filter(([nr, nc]) => mines[nr][nc]).length;
}

function startTimer() {
    if (timer) return;
    time = 0;
    timer = setInterval(() => {
        time++;
        timerEl.textContent = time;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}

function reveal(r, c) {
    if (gameOver || revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    revealedCount++;
    const cell = boardEl.children[r * SIZE + c];
    cell.classList.add('revealed');
    if (mines[r][c]) {
        cell.classList.add('mine', 'boom');
        cell.textContent = '💣';
        Sfx.play('explode');
        endGame(false);
        return;
    }
    const n = countMines(r, c);
    if (n) {
        cell.textContent = n;
        cell.classList.add('n' + n);
        Sfx.play('blip');
    } else {
        neighbors(r, c).forEach(([nr, nc]) => reveal(nr, nc));
    }
    if (revealedCount >= SIZE * SIZE - MINES) endGame(true);
}

function toggleFlag(r, c) {
    if (gameOver || revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    Sfx.play('select');
    const cell = boardEl.children[r * SIZE + c];
    cell.textContent = flagged[r][c] ? '🚩' : '';
    cell.classList.toggle('flagged', flagged[r][c]);
    updateMineCount();
}

function updateMineCount() {
    const flags = flagged.flat().filter(Boolean).length;
    mineCountEl.textContent = MINES - flags;
}

function endGame(won) {
    if (gameOver) return;
    gameOver = true;
    Sfx.play(won ? 'win' : 'gameover');
    stopTimer();
    if (won) {
        overTitleEl.textContent = 'YOU WIN!';
        overMsgEl.textContent = `Cleared in ${time}s!`;
        if (!bestTime || time < bestTime) {
            bestTime = time;
            localStorage.setItem('minesweeperBestTime', bestTime);
            bestTimeEl.textContent = bestTime + 's';
        }
        Scores.submit('minesweeper', time, { lowerBetter: true });
    } else {
        overTitleEl.textContent = 'BOOM!';
        overMsgEl.textContent = 'You hit a mine!';
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (mines[r][c] && !revealed[r][c]) {
                const cell = boardEl.children[r * SIZE + c];
                cell.classList.add('revealed', 'mine');
                cell.textContent = '💣';
            }
        }
    }
    clearTimeout(overTimer);
    overTimer = setTimeout(() => gameOverEl.classList.remove('hidden'), won ? 300 : 500);
}

function cellPx() {
    let px = SIZE <= 10 ? 34 : SIZE <= 14 ? 28 : 24;
    return Math.max(16, Math.min(px, Math.floor((window.innerWidth - 60) / SIZE)));
}

function newGame() {
    Sfx.play('select');
    stopTimer();
    clearTimeout(overTimer);
    overTimer = null;
    mines = null;
    revealed = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    flagged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    revealedCount = 0;
    firstClick = true;
    gameOver = false;
    time = 0;
    timerEl.textContent = 0;
    mineCountEl.textContent = MINES;
    gameOverEl.classList.add('hidden');
    boardEl.innerHTML = '';
    const px = cellPx();
    const gap = 3;
    boardEl.style.gridTemplateColumns = 'repeat(' + SIZE + ', ' + px + 'px)';
    boardEl.style.gap = gap + 'px';
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.width = px + 'px';
        cell.style.height = px + 'px';
        cell.dataset.r = r;
        cell.dataset.c = c;
        boardEl.appendChild(cell);
    }
}

boardEl.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (flagMode) { flagMode = false; toggleFlag(r, c); return; }
    if (revealed[r][c]) {
        const n = countMines(r, c);
        if (!n) return;
        const flags = neighbors(r, c).filter(([nr, nc]) => flagged[nr][nc]).length;
        if (flags === n) {
            Sfx.play('blip');
            neighbors(r, c).forEach(([nr, nc]) => {
                if (!flagged[nr][nc] && !revealed[nr][nc]) {
                    if (firstClick) { placeMines(nr, nc); firstClick = false; startTimer(); }
                    reveal(nr, nc);
                }
            });
        }
        return;
    }
    if (firstClick) {
        placeMines(r, c);
        firstClick = false;
        startTimer();
    }
    reveal(r, c);
});

boardEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = e.target.closest('.cell');
    if (!cell) return;
    toggleFlag(+cell.dataset.r, +cell.dataset.c);
});

boardEl.addEventListener('touchstart', (e) => {
    suppressClick = false;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    holdTimer = setTimeout(() => {
        toggleFlag(+cell.dataset.r, +cell.dataset.c);
        holdTimer = 'fired';
        suppressClick = true;
    }, 450);
});

boardEl.addEventListener('touchend', () => {
    if (holdTimer && holdTimer !== 'fired') {
        clearTimeout(holdTimer);
        holdTimer = null;
    } else {
        holdTimer = null;
    }
});
boardEl.addEventListener('touchmove', () => {
    if (holdTimer && holdTimer !== 'fired') { clearTimeout(holdTimer); holdTimer = null; }
});

restartBtn.addEventListener('click', newGame);
againBtn.addEventListener('click', newGame);

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIZE = +btn.dataset.size;
        MINES = +btn.dataset.mines;
        newGame();
    });
});

newGame();
