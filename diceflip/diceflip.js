const diceModeBtn = document.getElementById('diceModeBtn');
const coinModeBtn = document.getElementById('coinModeBtn');
const oneDieBtn = document.getElementById('oneDieBtn');
const twoDiceBtn = document.getElementById('twoDiceBtn');
const dice1 = document.getElementById('dice1');
const dice2 = document.getElementById('dice2');
const coin = document.getElementById('coin');
const rollBtn = document.getElementById('rollBtn');
const lowBtn = document.getElementById('lowBtn');
const highBtn = document.getElementById('highBtn');
const result = document.getElementById('result');
const totalRollsEl = document.getElementById('totalRolls');
const coinWinsEl = document.getElementById('coinWins');
const gameScoreEl = document.getElementById('gameScore');

function pauseAwareTimeout(fn, ms) {
    return setTimeout(function tick() {
        if (Arcade.isPaused()) {
            setTimeout(tick, 100);
            return;
        }
        fn();
    }, ms);
}
const gameLivesEl = document.getElementById('gameLives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const againBtn = document.getElementById('againBtn');
const betControlsEl = document.querySelector('.bet-controls');

let mode = 'dice';
let oneDie = true;
let totalRolls = 0;
let coinWins = 0;
let isRolling = false;
let gameScore = 0;
let gameLives = 3;
let currentBet = null;

function init() {
    loadStats();
    setupEventListeners();
    updateBetLabels();
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
    lowBtn.addEventListener('click', () => placeBet('low'));
    highBtn.addEventListener('click', () => placeBet('high'));
    againBtn.addEventListener('click', resetGame);
}

function updateBetLabels() {
    if (oneDie) {
        lowBtn.textContent = 'LOW: 1-3';
        highBtn.textContent = 'HIGH: 4-6';
    } else {
        lowBtn.textContent = 'LOW: 2-6';
        highBtn.textContent = 'HIGH: 8-12';
    }
}

function placeBet(bet) {
    if (isRolling) return;
    if (gameOverEl && !gameOverEl.classList.contains('hidden')) return;
    if (mode !== 'dice') return;
    currentBet = bet;
    roll();
}

function resetGame() {
    gameScore = 0;
    gameLives = 3;
    currentBet = null;
    gameScoreEl.textContent = 0;
    gameLivesEl.textContent = 3;
    gameOverEl.classList.add('hidden');
    result.textContent = 'Ready to roll!';
}

function gameOver() {
    Sfx.play('gameover');
    if (gameScore > 0) Scores.submit('diceflip', gameScore);
    finalScoreEl.textContent = gameScore;
    currentBet = null;
    gameOverEl.classList.remove('hidden');
}

function resolveBet(total) {
    if (!currentBet) return;
    const bet = currentBet;
    currentBet = null;
    
    let outcome;
    if (!oneDie && total === 7) {
        outcome = 'push';
    } else if (oneDie ? total <= 3 : total <= 6) {
        outcome = bet === 'low' ? 'win' : 'lose';
    } else {
        outcome = bet === 'high' ? 'win' : 'lose';
    }
    
    if (outcome === 'push') {
        result.textContent += ' \u2014 PUSH!';
        Sfx.play('blip');
        return;
    }
    if (outcome === 'win') {
        const pts = oneDie ? 10 : 20;
        gameScore += pts;
        gameScoreEl.textContent = gameScore;
        result.textContent += ' \u2014 YOU WIN +' + pts + '!';
        Sfx.play('coin');
    } else {
        gameLives--;
        gameLivesEl.textContent = Math.max(0, gameLives);
        result.textContent += ' \u2014 YOU LOSE!';
        Sfx.play('die');
        FX.shake(300, 6);
        if (gameLives <= 0) gameOver();
    }
}

function setMode(newMode) {
    mode = newMode;
    Sfx.play('blip');
    
    if (mode === 'dice') {
        diceModeBtn.classList.add('active');
        coinModeBtn.classList.remove('active');
        document.querySelector('.dice-controls').style.display = 'flex';
        betControlsEl.style.display = 'flex';
        dice1.classList.remove('hidden');
        coin.classList.add('hidden');
        result.textContent = 'Ready to roll!';
    } else {
        coinModeBtn.classList.add('active');
        diceModeBtn.classList.remove('active');
        document.querySelector('.dice-controls').style.display = 'none';
        betControlsEl.style.display = 'none';
        dice1.classList.add('hidden');
        dice2.classList.add('hidden');
        coin.classList.remove('hidden');
        result.textContent = 'Ready to flip!';
    }
}

function setDiceCount(isOne) {
    oneDie = isOne;
    updateBetLabels();
    
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
    Sfx.play('select');
    
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
                resolveBet(final1 + final2);
            } else {
                result.textContent = `You rolled a ${final1}!`;
                resolveBet(final1);
            }
            
            isRolling = false;
        }
    }, 100);
}

function flipCoin() {
    result.textContent = 'Flipping...';
    
    coin.classList.add('flipping');
    
    pauseAwareTimeout(function () {
        const isHeads = Math.random() < 0.5;        
        if (isHeads) {
            coin.querySelector('.coin-front').textContent = 'H';
            coin.querySelector('.coin-back').textContent = 'T';
            result.textContent = 'Heads! You win!';
            coinWins++;
            coinWinsEl.textContent = coinWins;
            Sfx.play('coin');
        } else {
            coin.querySelector('.coin-front').textContent = 'T';
            coin.querySelector('.coin-back').textContent = 'H';
            result.textContent = 'Tails! No win.';
        }
        
        pauseAwareTimeout(function () {
            coin.classList.remove('flipping');
            isRolling = false;
        }, 600);
    }, 600);
}

init();
