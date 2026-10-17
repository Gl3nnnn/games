const board = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const currentPlayerEl = document.getElementById('currentPlayer');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerText = document.getElementById('winnerText');
const resetBtn = document.getElementById('resetBtn');
const gameModeSelect = document.getElementById('gameMode');

const xWinsEl = document.getElementById('xWins');
const oWinsEl = document.getElementById('oWins');
const drawsEl = document.getElementById('draws');

let boardState = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let gameMode = 'pvp';
let difficulty = 'easy';

const difficultySelect = document.getElementById('difficultySelect');

let xWins = parseInt(localStorage.getItem('tttXWins')) || 0;
let oWins = parseInt(localStorage.getItem('tttOWins')) || 0;
let draws = parseInt(localStorage.getItem('tttDraws')) || 0;

xWinsEl.textContent = xWins;
oWinsEl.textContent = oWins;
drawsEl.textContent = draws;

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

gameModeSelect.addEventListener('change', (e) => {
    gameMode = e.target.value;
    difficultySelect.classList.toggle('hidden', gameMode !== 'pve');
    resetGame();
});

difficultySelect.classList.add('hidden');
difficultySelect.addEventListener('change', (e) => {
    difficulty = e.target.value;
    resetGame();
});

cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

resetBtn.addEventListener('click', resetGame);

function handleCellClick(e) {
    const cell = e.target;
    const index = parseInt(cell.dataset.index);
    
    if (boardState[index] !== '' || !gameActive) {
        return;
    }
    
    makeMove(index);
    
    if (gameActive && gameMode === 'pve' && currentPlayer === 'O') {
        setTimeout(makeAIMove, 500);
    }
}

function makeMove(index) {
    boardState[index] = currentPlayer;
    const cell = cells[index];
    cell.textContent = currentPlayer;
    cell.classList.add(currentPlayer.toLowerCase());
    Sfx.play('blip');
    
    if (checkWinner()) {
        endGame(currentPlayer);
    } else if (boardState.every(cell => cell !== '')) {
        endGame('draw');
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        currentPlayerEl.textContent = currentPlayer;
    }
}

function checkWinner() {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            highlightWinner(combo);
            return true;
        }
    }
    return false;
}

function highlightWinner(combo) {
    combo.forEach(index => {
        cells[index].classList.add('winner');
    });
}

function endGame(winner) {
    gameActive = false;
    Sfx.play(winner === 'draw' ? 'blip' : winner === 'X' ? 'win' : 'gameover');
    
    if (winner === 'draw') {
        winnerText.textContent = "It's a Draw!";
        winnerDisplay.classList.remove('hidden');
        winnerDisplay.classList.add('draw');
        draws++;
        drawsEl.textContent = draws;
        localStorage.setItem('tttDraws', draws);
    } else {
        winnerText.textContent = `${winner} Wins!`;
        winnerDisplay.classList.remove('hidden');
        winnerDisplay.classList.add(winner.toLowerCase());
        
        if (winner === 'X') {
            xWins++;
            xWinsEl.textContent = xWins;
            localStorage.setItem('tttXWins', xWins);
            Scores.submit('tictactoe', xWins, { unit: 'WINS' });
        } else {
            oWins++;
            oWinsEl.textContent = oWins;
            localStorage.setItem('tttOWins', oWins);
        }
    }
}

function findTacticalMove(player) {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        const vals = [boardState[a], boardState[b], boardState[c]];
        if (vals.filter(v => v === player).length === 2 && vals.includes('')) {
            return combo[vals.indexOf('')];
        }
    }
    return null;
}

function makeAIMove() {
    if (!gameActive) return;
    
    const emptyCells = boardState
        .map((cell, index) => cell === '' ? index : null)
        .filter(index => index !== null);
    
    if (emptyCells.length === 0) return;
    
    if (difficulty === 'hard') {
        let move = findTacticalMove('O');
        if (move === null) move = findTacticalMove('X');
        if (move === null && boardState[4] === '') move = 4;
        if (move === null) {
            const corners = [0, 2, 6, 8].filter(i => boardState[i] === '');
            if (corners.length > 0) {
                move = corners[Math.floor(Math.random() * corners.length)];
            }
        }
        if (move === null) {
            move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
        makeMove(move);
        return;
    }
    
    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    makeMove(randomIndex);
}

function resetGame() {
    Sfx.play('select');
    boardState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    
    currentPlayerEl.textContent = currentPlayer;
    winnerDisplay.classList.add('hidden');
    winnerDisplay.classList.remove('x', 'o', 'draw');
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'winner');
    });
}
