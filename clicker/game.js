let score = 0;
let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;
let totalClicks = parseInt(localStorage.getItem('totalClicks')) || 0;

let clickPower = 1;
let autoClick = 0;
let clickPowerCost = 10;
let autoClickCost = 50;
let megaClickCost = 200;
let superAutoCost = 500;

let timeLeft = 60;
let roundActive = false;
let roundTimer = null;
let targetShown = false;
let bestAtStart = 0;
let roundTarget = 100;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const totalClicksEl = document.getElementById('totalClicks');
const autoClickEl = document.getElementById('autoClick');
const clickPowerEl = document.getElementById('clickPower');
const clickPowerCostEl = document.getElementById('clickPowerCost');
const autoClickCostEl = document.getElementById('autoClickCost');
const megaClickCostEl = document.getElementById('megaClickCost');
const superAutoCostEl = document.getElementById('superAutoCost');
const timeLeftEl = document.getElementById('timeLeft');
const targetEl = document.getElementById('target');
const finalScoreEl = document.getElementById('finalScore');
const recordLineEl = document.getElementById('recordLine');
const startScreenEl = document.getElementById('startScreen');
const gameOverScreenEl = document.getElementById('gameOverScreen');

const clickBtn = document.getElementById('clickBtn');
const buyClickPowerBtn = document.getElementById('buyClickPower');
const buyAutoClickerBtn = document.getElementById('buyAutoClicker');
const buyMegaClickBtn = document.getElementById('buyMegaClick');
const buySuperAutoBtn = document.getElementById('buySuperAuto');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');

function targetScore() {
    return roundTarget;
}

function updateDisplay() {
    scoreEl.textContent = score;
    highScoreEl.textContent = highScore;
    totalClicksEl.textContent = totalClicks;
    autoClickEl.textContent = autoClick;
    clickPowerEl.textContent = clickPower;
    clickPowerCostEl.textContent = clickPowerCost;
    autoClickCostEl.textContent = autoClickCost;
    megaClickCostEl.textContent = megaClickCost;
    superAutoCostEl.textContent = superAutoCost;
    timeLeftEl.textContent = timeLeft;
    targetEl.textContent = targetScore();
    
    buyClickPowerBtn.disabled = score < clickPowerCost;
    buyAutoClickerBtn.disabled = score < autoClickCost;
    buyMegaClickBtn.disabled = score < megaClickCost;
    buySuperAutoBtn.disabled = score < superAutoCost;
}

function saveGame() {
    localStorage.setItem('clickerHighScore', highScore);
    localStorage.setItem('totalClicks', totalClicks);
}

function addScore(amount) {
    score += amount;
    totalClicks++;
    
    if (score > highScore) {
        highScore = score;
    }
    
    if (!targetShown && score >= targetScore()) {
        targetShown = true;
        Sfx.play('win');
        recordLineEl.textContent = '';
        FX.flash('rgba(0,255,65,0.35)', 200);
    }
    
    updateDisplay();
    saveGame();
}

function createClickEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = '+' + clickPower;
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    document.body.appendChild(effect);
    
    setTimeout(() => effect.remove(), 800);
}

clickBtn.addEventListener('click', (e) => {
    if (!roundActive) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    addScore(clickPower);
    Sfx.play('blip');
    createClickEffect(e.clientX, e.clientY);
});

buyClickPowerBtn.addEventListener('click', () => {
    if (!roundActive) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    if (score >= clickPowerCost) {
        score -= clickPowerCost;
        clickPower += 1;
        clickPowerCost = Math.floor(clickPowerCost * 1.4);
        updateDisplay();
        saveGame();
        Sfx.play('coin');
    }
});

buyAutoClickerBtn.addEventListener('click', () => {
    if (!roundActive) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    if (score >= autoClickCost) {
        score -= autoClickCost;
        autoClick += 1;
        autoClickCost = Math.floor(autoClickCost * 1.4);
        updateDisplay();
        saveGame();
        Sfx.play('coin');
    }
});

buyMegaClickBtn.addEventListener('click', () => {
    if (!roundActive) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    if (score >= megaClickCost) {
        score -= megaClickCost;
        clickPower += 5;
        megaClickCost = Math.floor(megaClickCost * 1.6);
        updateDisplay();
        saveGame();
        Sfx.play('coin');
    }
});

buySuperAutoBtn.addEventListener('click', () => {
    if (!roundActive) return;
    if (document.documentElement.dataset.arcPaused === '1') return;
    if (score >= superAutoCost) {
        score -= superAutoCost;
        autoClick += 10;
        superAutoCost = Math.floor(superAutoCost * 1.6);
        updateDisplay();
        saveGame();
        Sfx.play('coin');
    }
});

setInterval(() => {
    if (!roundActive) return;
    if (autoClick > 0) {
        score += autoClick;
        totalClicks += autoClick;
        
        if (score > highScore) {
            highScore = score;
        }
        if (!targetShown && score >= targetScore()) {
            targetShown = true;
            Sfx.play('win');
        }
        
        updateDisplay();
        saveGame();
    }
}, 2000);

setInterval(() => {
    if (!roundActive) return;
    timeLeft--;
    timeLeftEl.textContent = timeLeft;
    if (timeLeft <= 10) {
        timeLeftEl.style.color = '#ff2244';
        timeLeftEl.style.textShadow = '0 0 10px #ff2244';
    }
    if (timeLeft <= 0) endRound();
}, 1000);

function startRound() {
    Sfx.play('select');
    score = 0;
    clickPower = 1;
    autoClick = 0;
    clickPowerCost = 10;
    autoClickCost = 50;
    megaClickCost = 200;
    superAutoCost = 500;
    timeLeft = 60;
    targetShown = false;
    bestAtStart = highScore;
    roundTarget = Math.max(100, bestAtStart + 100);
    roundActive = true;
    timeLeftEl.style.color = '';
    timeLeftEl.style.textShadow = '';
    startScreenEl.classList.add('hidden');
    gameOverScreenEl.classList.add('hidden');
    updateDisplay();
}

function endRound() {
    if (!roundActive) return;
    roundActive = false;
    Sfx.play('gameover');
    const isNewBest = score > 0 && score > bestAtStart;
    if (score > 0) Scores.submit('clicker', score);
    saveGame();
    finalScoreEl.textContent = score;
    recordLineEl.textContent = isNewBest ? 'NEW BEST SCORE!' : '';
    gameOverScreenEl.classList.remove('hidden');
}

startBtn.addEventListener('click', startRound);
againBtn.addEventListener('click', startRound);

highScoreEl.textContent = highScore;
roundTarget = Math.max(100, highScore + 100);
updateDisplay();
