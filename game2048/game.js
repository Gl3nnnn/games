const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const overTitleEl = document.getElementById('overTitle');
const gameOverEl = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');

let grid, score, best = parseInt(localStorage.getItem('g2048HighScore')) || 0;
let animating = false;
let addTileTimer = null;
let undoSnap = null, undoUsed = false;

highScoreEl.textContent = best;

function emptyGrid() {
    return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addTile() {
    const empty = [];
    grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    render([`${r},${c}`]);
}

function canMove() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) return true;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
}

function slideLine(line) {
    const arr = line.filter(v => v);
    const out = [];
    const mergedIdx = [];
    let gained = 0;
    for (let i = 0; i < arr.length; i++) {
        if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
            out.push(arr[i] * 2);
            gained += arr[i] * 2;
            mergedIdx.push(out.length - 1);
            i++;
        } else {
            out.push(arr[i]);
        }
    }
    while (out.length < 4) out.push(0);
    return { out, gained, mergedIdx };
}

function move(dir) {
    if (animating || (gameOverEl && !gameOverEl.classList.contains('hidden'))) return;
    const snap = { grid: grid.map(r => r.slice()), score };
    let moved = false;
    const mergedCells = [];
    let gained = 0;

    for (let i = 0; i < 4; i++) {
        let line = [];
        for (let j = 0; j < 4; j++) {
            if (dir === 'left') line.push(grid[i][j]);
            if (dir === 'right') line.push(grid[i][3 - j]);
            if (dir === 'up') line.push(grid[j][i]);
            if (dir === 'down') line.push(grid[3 - j][i]);
        }
        const res = slideLine(line);
        gained += res.gained;
        if (res.gained) {
            res.mergedIdx.forEach(idx => {
                if (dir === 'left') mergedCells.push([i, idx]);
                if (dir === 'right') mergedCells.push([i, 3 - idx]);
                if (dir === 'up') mergedCells.push([idx, i]);
                if (dir === 'down') mergedCells.push([3 - idx, i]);
            });
        }
        for (let j = 0; j < 4; j++) {
            let val;
            if (dir === 'left') val = grid[i][j];
            if (dir === 'right') val = grid[i][3 - j];
            if (dir === 'up') val = grid[j][i];
            if (dir === 'down') val = grid[3 - j][i];
            if (val !== res.out[j]) moved = true;
        }
        for (let j = 0; j < 4; j++) {
            if (dir === 'left') grid[i][j] = res.out[j];
            if (dir === 'right') grid[i][3 - j] = res.out[j];
            if (dir === 'up') grid[j][i] = res.out[j];
            if (dir === 'down') grid[3 - j][i] = res.out[j];
        }
    }

    if (!moved) return;
    undoSnap = snap;
    Sfx.play('move');
    if (gained) {
        score += gained;
        scoreEl.textContent = score;
        Sfx.play('coin');
        if (score > best) {
            best = score;
            localStorage.setItem('g2048HighScore', best);
            highScoreEl.textContent = best;
        }
    }
    render(mergedCells.map(([r, c]) => `${r},${c}`));
    animating = true;
    clearTimeout(addTileTimer);
    addTileTimer = setTimeout(() => {
        animating = false;
        addTileTimer = null;
        addTile();
        if (!window._reached2048 && grid.some(row => row.some(v => v >= 2048))) {
            window._reached2048 = true;
            endGame(true);
        } else if (!canMove()) {
            endGame(false);
        }
    }, 130);
}

function endGame(won) {
    Sfx.play(won ? 'win' : 'gameover');
    Scores.submit('g2048', score);
    finalScoreEl.textContent = score;
    overTitleEl.textContent = won ? 'YOU WIN!' : 'GAME OVER';
    gameOverEl.classList.remove('hidden');
}

function render(popCells = []) {
    const popSet = new Set(popCells);
    boardEl.innerHTML = '';
    grid.forEach((row, r) => row.forEach((v, c) => {
        const div = document.createElement('div');
        if (v === 0) {
            div.className = 'tile empty';
        } else {
            const cls = v <= 2048 ? `v${v}` : 'vbig';
            div.className = `tile ${cls}` + (popSet.has(`${r},${c}`) ? ' pop' : '');
            div.textContent = v;
        }
        boardEl.appendChild(div);
    }));
}

function newGame() {
    Sfx.play('select');
    clearTimeout(addTileTimer);
    addTileTimer = null;
    animating = false;
    grid = emptyGrid();
    score = 0;
    window._reached2048 = false;
    undoSnap = null;
    undoUsed = false;
    if (undoBtn) { undoBtn.disabled = false; undoBtn.classList.remove('used'); }
    scoreEl.textContent = 0;
    gameOverEl.classList.add('hidden');
    addTile();
    addTile();
}

function undo() {
    if (!undoSnap || undoUsed || animating) return;
    grid = undoSnap.grid.map(r => r.slice());
    score = undoSnap.score;
    scoreEl.textContent = score;
    undoSnap = null;
    undoUsed = true;
    if (undoBtn) { undoBtn.disabled = true; undoBtn.classList.add('used'); }
    if (gameOverEl && !gameOverEl.classList.contains('hidden')) {
        gameOverEl.classList.add('hidden');
    }
    window._reached2048 = false;
    render();
    Sfx.play('select');
}

document.addEventListener('keydown', (e) => {
    const map = {
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down'
    };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    if (e.key === 'u' || e.key === 'U' || (e.ctrlKey && e.key === 'z')) { e.preventDefault(); undo(); }
});

let touchStart = null;
boardEl.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
boardEl.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
});

restartBtn.addEventListener('click', newGame);
newGameBtn.addEventListener('click', newGame);
if (undoBtn) undoBtn.addEventListener('click', undo);

newGame();
