const diceModeBtn = document.getElementById('diceModeBtn');
const coinModeBtn = document.getElementById('coinModeBtn');
const oneDieBtn = document.getElementById('oneDieBtn');
const twoDiceBtn = document.getElementById('twoDiceBtn');
const dice1 = document.getElementById('dice1');
const dice2 = document.getElementById('dice2');
const coin = document.getElementById('coin');
const rollBtn = document.getElementById('rollBtn');
const result = document.getElementById('result');
const totalRollsEl = document.getElementById('totalRolls');
const coinWinsEl = document.getElementById('coinWins');

let mode = 'dice';
let oneDie = true;
let totalRolls = 0;
let coinWins = 0;
let isRolling = false;

function init() {
    loadStats();
    setupEventListeners();
}

function loadStats() {
    const savedRolls = localStorage.getItem('diceflipTotalRolls');
    const savedWins = localStorage.getItem('diceflipCoinWins');
    
    if (savedRolls) {
        totalRolls = parseInt(savedRolls);
        totalRollsEl.textContent = totalRolls;
    }
    
    if (savedWins) {
        coinWins = parseInt(savedWins);
        coinWinsEl.textContent = coinWins;
    }
}

function saveStats() {
    localStorage.setItem('diceflipTotalRolls', totalRolls);
    localStorage.setItem('diceflipCoinWins', coinWins);
}

function setupEventListeners() {
    diceModeBtn.addEventListener('click', () => setMode('dice'));
    coinModeBtn.addEventListener('click', () => setMode('coin'));
    oneDieBtn.addEventListener('click', () => setDiceCount(true));
    twoDiceBtn.addEventListener('click', () => setDiceCount(false));
    rollBtn.addEventListener('click', roll);
}

function setMode(newMode) {
    mode = newMode;
    
    if (mode === 'dice') {
        diceModeBtn.classList.add('active');
        coinModeBtn.classList.remove('active');
        document.querySelector('.dice-controls').style.display = 'flex';
        dice1.classList.remove('hidden');
        coin.classList.add('hidden');
        result.textContent = 'Ready to roll!';
    } else {
        coinModeBtn.classList.add('active');
        diceModeBtn.classList.remove('active');
        document.querySelector('.dice-controls').style.display = 'none';
        dice1.classList.add('hidden');
        dice2.classList.add('hidden');
        coin.classList.remove('hidden');
        result.textContent = 'Ready to flip!';
    }
}

function setDiceCount(isOne) {
    oneDie = isOne;
    
    if (oneDie) {
        oneDieBtn.classList.add('active');
        twoDiceBtn.classList.remove('active');
        dice2.classList.add('hidden');
    } else {
        twoDiceBtn.classList.add('active');
        oneDieBtn.classList.remove('active');
        dice2.classList.remove('hidden');
    }
}

function roll() {
    if (isRolling) return;
    isRolling = true;
    
    totalRolls++;
    totalRollsEl.textContent = totalRolls;
    
    if (mode === 'dice') {
        rollDice();
    } else {
        flipCoin();
    }
    
    saveStats();
}

function rollDice() {
    result.textContent = 'Rolling...';
    
    dice1.classList.add('rolling');
    dice2.classList.add('rolling');
    
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        const value1 = Math.floor(Math.random() * 6) + 1;
        dice1.textContent = value1;
        
        if (!oneDie) {
            const value2 = Math.floor(Math.random() * 6) + 1;
            dice2.textContent = value2;
        }
        
        rollCount++;
        
        if (rollCount >= 5) {
            clearInterval(rollInterval);
            
            const final1 = Math.floor(Math.random() * 6) + 1;
            dice1.textContent = final1;
            dice1.classList.remove('rolling');
            
            if (!oneDie) {
                const final2 = Math.floor(Math.random() * 6) + 1;
                dice2.textContent = final2;
                dice2.classList.remove('rolling');
                result.textContent = `You rolled ${final1} and ${final2} (Total: ${final1 + final2})`;
            } else {
                result.textContent = `You rolled a ${final1}!`;
            }
            
            isRolling = false;
        }
    }, 100);
}

function flipCoin() {
    result.textContent = 'Flipping...';
    
    coin.classList.add('flipping');
    
    setTimeout(() => {
        const isHeads = Math.random() < 0.5;
        
        if (isHeads) {
            coin.querySelector('.coin-front').textContent = 'H';
            coin.querySelector('.coin-back').textContent = 'T';
            result.textContent = 'Heads!';
        } else {
            coin.querySelector('.coin-front').textContent = 'T';
            coin.querySelector('.coin-back').textContent = 'H';
            result.textContent = 'Tails!';
        }
        
        coinWins++;
        coinWinsEl.textContent = coinWins;
        
        setTimeout(() => {
            coin.classList.remove('flipping');
            isRolling = false;
        }, 600);
    }, 600);
}

init();
