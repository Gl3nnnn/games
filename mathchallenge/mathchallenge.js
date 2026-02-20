const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const problemEl = document.getElementById('problem');
const answerInput = document.getElementById('answerInput');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const highScoreMsgEl = document.getElementById('highScoreMsg');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

let currentAnswer = 0;
let score = 0;
let streak = 0;
let timeLeft = 30;
let timerInterval = null;
let gameRunning = false;

const operations = ['+', '−', '×'];

function generateProblem() {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2;
    
    switch (operation) {
        case '+':
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * 20) + 1;
            currentAnswer = num1 + num2;
            break;
        case '−':
            num1 = Math.floor(Math.random() * 20) + 10;
            num2 = Math.floor(Math.random() * num1) + 1;
            currentAnswer = num1 - num2;
            break;
        case '×':
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
            currentAnswer = num1 * num2;
            break;
    }
    
    problemEl.textContent = `${num1} ${operation} ${num2} = ?`;
    console.log('Answer (for testing):', currentAnswer);
}

function loadHighScore() {
    const highScore = localStorage.getItem('mathChallengeHighScore');
    if (highScore) {
        highScoreEl.textContent = highScore;
    }
}

function saveHighScore(newScore) {
    const currentBest = localStorage.getItem('mathChallengeHighScore');
    if (!currentBest || newScore > parseInt(currentBest)) {
        localStorage.setItem('mathChallengeHighScore', newScore);
        highScoreEl.textContent = newScore;
        return true;
    }
    return false;
}

function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 1000);
}

function startGame() {
    gameRunning = true;
    score = 0;
    streak = 0;
    timeLeft = 30;
    
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    timerEl.textContent = timeLeft;
    answerInput.value = '';
    
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    generateProblem();
    answerInput.focus();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerEl.style.color = '#ff0000';
            timerEl.style.textShadow = '0 0 10px #ff0000';
        }
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    
    finalScoreEl.textContent = score;
    
    const isNewHighScore = saveHighScore(score);
    if (isNewHighScore && score > 0) {
        highScoreMsgEl.textContent = '🎉 NEW HIGH SCORE! 🎉';
    } else {
        highScoreMsgEl.textContent = '';
    }
    
    gameScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
}

function checkAnswer() {
    if (!gameRunning) return;
    
    const userAnswer = parseInt(answerInput.value);
    
    if (isNaN(userAnswer)) {
        showMessage('Enter a number!', 'error');
        return;
    }
    
    if (userAnswer === currentAnswer) {
        score++;
        streak++;
        scoreEl.textContent = score;
        streakEl.textContent = streak;
        
        problemEl.classList.add('correct');
        setTimeout(() => problemEl.classList.remove('correct'), 300);
        
        showMessage('Correct! +1', 'success');
        
        answerInput.value = '';
        generateProblem();
    } else {
        streak = 0;
        streakEl.textContent = streak;
        
        problemEl.classList.add('incorrect');
        setTimeout(() => problemEl.classList.remove('incorrect'), 300);
        
        showMessage('Wrong! Try again', 'error');
        
        answerInput.value = '';
        answerInput.focus();
    }
}

function resetGame() {
    clearInterval(timerInterval);
    gameRunning = false;
    score = 0;
    streak = 0;
    timeLeft = 30;
    
    scoreEl.textContent = '0';
    streakEl.textContent = '0';
    timerEl.textContent = '30';
    timerEl.style.color = '#ff0044';
    timerEl.style.textShadow = '0 0 10px #ff0044';
    answerInput.value = '';
    problemEl.textContent = '? + ? = ?';
    
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    
    messageEl.textContent = '';
    messageEl.className = 'message';
}

startBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', checkAnswer);
playAgainBtn.addEventListener('click', () => {
    resetGame();
    setTimeout(startGame, 100);
});

answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameRunning) {
        e.preventDefault();
        startGame();
    }
});

loadHighScore();
