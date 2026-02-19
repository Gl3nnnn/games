const gameBoard = document.getElementById('gameBoard');
const matchesEl = document.getElementById('matches');
const movesEl = document.getElementById('moves');
const bestMovesEl = document.getElementById('bestMoves');
const winDisplay = document.getElementById('winDisplay');
const finalMovesEl = document.getElementById('finalMoves');
const resetBtn = document.getElementById('resetBtn');

const emojis = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎬', '🎸', '🎺'];
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let canFlip = true;

let bestMoves = parseInt(localStorage.getItem('memoryBestMoves')) || 0;
if (bestMoves > 0) {
    bestMovesEl.textContent = bestMoves;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initGame() {
    cards = [...emojis, ...emojis];
    shuffleArray(cards);
    
    gameBoard.innerHTML = '';
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    canFlip = true;
    
    matchesEl.textContent = 0;
    movesEl.textContent = 0;
    winDisplay.classList.add('hidden');
    
    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.index = index;
        card.dataset.emoji = emoji;
        card.addEventListener('click', () => flipCard(card));
        gameBoard.appendChild(card);
    });
}

function flipCard(card) {
    if (!canFlip) return;
    if (card.classList.contains('flipped')) return;
    if (card.classList.contains('matched')) return;
    
    card.classList.add('flipped');
    card.textContent = card.dataset.emoji;
    flippedCards.push(card);
    
    if (flippedCards.length === 2) {
        moves++;
        movesEl.textContent = moves;
        checkMatch();
    }
}

function checkMatch() {
    canFlip = false;
    const [card1, card2] = flippedCards;
    
    if (card1.dataset.emoji === card2.dataset.emoji) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        matchedPairs++;
        matchesEl.textContent = matchedPairs;
        flippedCards = [];
        canFlip = true;
        
        if (matchedPairs === emojis.length) {
            winGame();
        }
    } else {
        setTimeout(() => {
            card1.classList.remove('flipped');
            card1.textContent = '';
            card2.classList.remove('flipped');
            card2.textContent = '';
            flippedCards = [];
            canFlip = true;
        }, 1000);
    }
}

function winGame() {
    winDisplay.classList.remove('hidden');
    finalMovesEl.textContent = moves;
    
    if (bestMoves === 0 || moves < bestMoves) {
        bestMoves = moves;
        bestMovesEl.textContent = bestMoves;
        localStorage.setItem('memoryBestMoves', bestMoves);
    }
}

resetBtn.addEventListener('click', initGame);

initGame();
