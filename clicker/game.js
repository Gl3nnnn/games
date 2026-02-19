let score = 0;
let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;
let totalClicks = parseInt(localStorage.getItem('totalClicks')) || 0;

// Easy & Casual settings:
// - Starting click power: 3 (was 1) - easier to get points
// - Lower initial costs: 5, 25, 100, 250 (was 10, 50, 200, 500)
// - Slower cost scaling: 1.2x, 1.3x (was 1.5x, 1.8x, 2x)

let clickPower = parseInt(localStorage.getItem('clickPower')) || 3;
let autoClick = parseInt(localStorage.getItem('autoClick')) || 0;

let clickPowerCost = parseInt(localStorage.getItem('clickPowerCost')) || 5;
let autoClickCost = parseInt(localStorage.getItem('autoClickCost')) || 25;
let megaClickCost = parseInt(localStorage.getItem('megaClickCost')) || 100;
let superAutoCost = parseInt(localStorage.getItem('superAutoCost')) || 250;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const totalClicksEl = document.getElementById('totalClicks');
const autoClickEl = document.getElementById('autoClick');
const clickPowerEl = document.getElementById('clickPower');
const clickPowerCostEl = document.getElementById('clickPowerCost');
const autoClickCostEl = document.getElementById('autoClickCost');
const megaClickCostEl = document.getElementById('megaClickCost');
const superAutoCostEl = document.getElementById('superAutoCost');

const clickBtn = document.getElementById('clickBtn');
const buyClickPowerBtn = document.getElementById('buyClickPower');
const buyAutoClickerBtn = document.getElementById('buyAutoClicker');
const buyMegaClickBtn = document.getElementById('buyMegaClick');
const buySuperAutoBtn = document.getElementById('buySuperAuto');

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
    
    buyClickPowerBtn.disabled = score < clickPowerCost;
    buyAutoClickerBtn.disabled = score < autoClickCost;
    buyMegaClickBtn.disabled = score < megaClickCost;
    buySuperAutoBtn.disabled = score < superAutoCost;
}

function saveGame() {
    localStorage.setItem('clickerHighScore', highScore);
    localStorage.setItem('totalClicks', totalClicks);
    localStorage.setItem('clickPower', clickPower);
    localStorage.setItem('autoClick', autoClick);
    localStorage.setItem('clickPowerCost', clickPowerCost);
    localStorage.setItem('autoClickCost', autoClickCost);
    localStorage.setItem('megaClickCost', megaClickCost);
    localStorage.setItem('superAutoCost', superAutoCost);
}

function addScore(amount) {
    score += amount;
    totalClicks++;
    
    if (score > highScore) {
        highScore = score;
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
    addScore(clickPower);
    createClickEffect(e.clientX, e.clientY);
});

buyClickPowerBtn.addEventListener('click', () => {
    if (score >= clickPowerCost) {
        score -= clickPowerCost;
        clickPower += 1;
        // Easy & Casual: slower cost scaling (1.2x vs 1.5x)
        clickPowerCost = Math.floor(clickPowerCost * 1.2);
        updateDisplay();
        saveGame();
    }
});

buyAutoClickerBtn.addEventListener('click', () => {
    if (score >= autoClickCost) {
        score -= autoClickCost;
        autoClick += 1;
        // Easy & Casual: slower cost scaling (1.2x vs 1.5x)
        autoClickCost = Math.floor(autoClickCost * 1.2);
        updateDisplay();
        saveGame();
    }
});

buyMegaClickBtn.addEventListener('click', () => {
    if (score >= megaClickCost) {
        score -= megaClickCost;
        clickPower += 5;
        // Easy & Casual: slower cost scaling (1.3x vs 1.8x)
        megaClickCost = Math.floor(megaClickCost * 1.3);
        updateDisplay();
        saveGame();
    }
});

buySuperAutoBtn.addEventListener('click', () => {
    if (score >= superAutoCost) {
        score -= superAutoCost;
        autoClick += 10;
        // Easy & Casual: slower cost scaling (1.3x vs 2x)
        superAutoCost = Math.floor(superAutoCost * 1.3);
        updateDisplay();
        saveGame();
    }
});

setInterval(() => {
    if (autoClick > 0) {
        score += autoClick;
        totalClicks += autoClick;
        
        if (score > highScore) {
            highScore = score;
        }
        
        updateDisplay();
        saveGame();
    }
}, 1000);

updateDisplay();
