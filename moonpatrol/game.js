const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const GY = 330;
const P_X = 90;

let scrollX, speed, ground, segType, segLeft, segEmit;
let player, hoppers, ufos, pBullets, eBullets, particles, stars;
let score, lives, level, isGameOver, isPaused, isRunning;
let ufoTimer, hopTimer, spawnGap;
let highScore = parseInt(localStorage.getItem('moonpatrolHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function makeStars() {
    stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * (GY - 60), r: Math.random() * 1.5 + 0.3 }));
}

function newSeg() {
    const roll = Math.random();
    const lv = Math.min(level, 8);
    segEmit = 0;
    if (roll < 0.14 + lv * 0.01) { segType = 'pit'; segLeft = 44 + Math.random() * 18; }
    else if (roll < 0.45) { segType = 'bump'; segLeft = 56; }
    else if (roll < 0.53 && lv >= 2) { segType = 'dbump'; segLeft = 100; }
    else { segType = 'flat'; segLeft = 70 + Math.random() * 90; }
}

function seedGround() {
    ground = [];
    segType = 'flat'; segLeft = 200; segEmit = 0;
    for (let i = 0; i < W + 80; i++) stepGround();
}

function stepGround() {
    if (segLeft <= 0) newSeg();
    segLeft--;
    let y = GY, type = segType;
    if (segType === 'bump') y = GY - 16;
    if (segType === 'dbump') y = (segEmit % 100 < 50) ? GY - 16 : GY;
    if (segType === 'pit') y = H + 40;
    segEmit++;
    ground.push({ y, type });
    if (ground.length > W + 80) ground.shift();
}

function groundAt(sx) {
    const i = Math.floor(sx);
    if (i < 0 || i >= ground.length) return GY;
    return ground[i].y;
}

function newPlayer() {
    return { y: GY, vy: 0, onGround: true, inv: 90, fireCd: 0 };
}

function initGame() {
    scrollX = 0; speed = 2.4; level = 1;
    seedGround();
    player = newPlayer();
    hoppers = []; ufos = []; pBullets = []; eBullets = []; particles = [];
    score = 0; lives = 3;
    ufoTimer = 180; hopTimer = 60; spawnGap = W;
    isGameOver = false; isPaused = false;
    scoreEl.textContent = 0; livesEl.textContent = 3;
    pauseOverlay.classList.add('hidden');
}

function explode(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 26, color });
    }
}

function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('moonpatrolHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function jump() {
    if (!isRunning || isGameOver || isPaused) return;
    if (player.onGround) {
        player.vy = -8.2;
        player.onGround = false;
        Sfx.play('jump');
    }
}

function fire() {
    if (!isRunning || isGameOver || isPaused) return;
    if (player.fireCd > 0) return;
    player.fireCd = 12;
    Sfx.play('shoot');
    pBullets.push({ x: P_X + 16, y: player.y - 12, vx: 9 });
    pBullets.push({ x: P_X + 10, y: player.y - 26, vx: 9 });
}

function killPlayer() {
    if (player.inv > 0) return;
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    explode(P_X, player.y - 12, '#00ff41', 20);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { endGame(); return; }
    player = newPlayer();
    hoppers = hoppers.filter(h => h.x > P_X + 200);
    eBullets = [];
}

function endGame() {
    Sfx.play('gameover');
    Scores.submit('moonpatrol', score);
    isGameOver = true; isRunning = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function spawnHopper() {
    hoppers.push({ x: W + 20, y: GY, vy: 0, hopT: 30 + Math.random() * 30, fireT: 90 + Math.random() * 120, onGround: true });
}

function spawnUfo() {
    ufos.push({ x: W + 30, y: 50 + Math.random() * 80, phase: Math.random() * Math.PI * 2, dropT: 70 + Math.random() * 90 });
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    speed = 2.4 + (level - 1) * 0.25;
    scrollX += speed;

    for (let i = 0; i < Math.ceil(speed); i++) stepGround();
    stars.forEach(s => { s.x -= speed * 0.25; if (s.x < 0) s.x += W; });

    if (player.fireCd > 0) player.fireCd--;
    if (player.inv > 0) player.inv--;

    player.vy += 0.36;
    player.y += player.vy;
    const gy = groundAt(P_X);
    if (gy > H) {
        player.onGround = false;
        if (player.y > GY + 30) killPlayer();
    } else if (player.y >= gy) {
        player.y = gy;
        player.vy = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }

    hopTimer--;
    if (hopTimer <= 0) {
        spawnHopper();
        hopTimer = Math.max(50, 130 - level * 10) + Math.random() * 60;
    }
    ufoTimer--;
    if (ufoTimer <= 0) {
        spawnUfo();
        ufoTimer = Math.max(90, 220 - level * 14) + Math.random() * 80;
    }

    hoppers.forEach(h => {
        h.x -= speed + 1.6;
        h.hopT--;
        const gyh = groundAt(h.x);
        if (h.onGround && h.hopT <= 0 && gyh < H) {
            h.vy = -6.5;
            h.onGround = false;
            h.hopT = 28 + Math.random() * 24;
        }
        h.vy += 0.3;
        h.y += h.vy;
        if (gyh < H && h.y >= gyh) { h.y = gyh; h.vy = 0; h.onGround = true; }
        if (h.y > H + 30) h.dead = true;
        h.fireT--;
        if (h.fireT <= 0 && h.x > P_X + 60 && gyh < H) {
            h.fireT = 100 + Math.random() * 100;
            const ang = Math.atan2(player.y - 12 - h.y, P_X - h.x);
            eBullets.push({ x: h.x, y: h.y - 14, vx: Math.cos(ang) * 3.2, vy: Math.sin(ang) * 3.2 });
        }
    });
    hoppers = hoppers.filter(h => !h.dead && h.x > -40);

    ufos.forEach(u => {
        u.x -= speed + 0.9;
        u.phase += 0.04;
        u.dropT--;
        if (u.dropT <= 0 && u.x > P_X && u.x < W) {
            u.dropT = 80 + Math.random() * 80;
            eBullets.push({ x: u.x, y: u.y + 10, vx: -speed * 0.3, vy: 3.4 });
        }
        if (u.x < -40) u.dead = true;
    });
    ufos = ufos.filter(u => !u.dead);

    pBullets.forEach(b => b.x += b.vx);
    pBullets = pBullets.filter(b => b.x < W + 10);
    eBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    eBullets = eBullets.filter(b => b.y < H + 10 && b.x > -10);

    for (let i = pBullets.length - 1; i >= 0; i--) {
        const b = pBullets[i];
        let hit = false;
        for (let j = hoppers.length - 1; j >= 0; j--) {
            const h = hoppers[j];
            if (Math.abs(b.x - h.x) < 14 && Math.abs(b.y - (h.y - 12)) < 16) {
                hoppers.splice(j, 1);
                explode(h.x, h.y - 12, '#ffcc00', 10);
                addScore(100);
                Sfx.play('hit');
                hit = true;
                break;
            }
        }
        if (!hit) {
            for (let j = ufos.length - 1; j >= 0; j--) {
                const u = ufos[j];
                if (Math.abs(b.x - u.x) < 20 && Math.abs(b.y - u.y) < 12) {
                    ufos.splice(j, 1);
                    explode(u.x, u.y, '#ff66ff', 14);
                    addScore(250);
                    Sfx.play('explode');
                    hit = true;
                    break;
                }
            }
        }
        if (hit) pBullets.splice(i, 1);
    }

    if (player.inv <= 0) {
        for (const h of hoppers) {
            if (Math.abs(h.x - P_X) < 16 && Math.abs((h.y - 12) - (player.y - 12)) < 22) {
                killPlayer();
                break;
            }
        }
        for (const b of eBullets) {
            if (Math.abs(b.x - P_X) < 12 && Math.abs(b.y - (player.y - 14)) < 14) {
                eBullets.splice(eBullets.indexOf(b), 1);
                killPlayer();
                break;
            }
        }
        for (const u of ufos) {
            if (Math.abs(u.x - P_X) < 22 && Math.abs(u.y - (player.y - 20)) < 24) {
                killPlayer();
                break;
            }
        }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    addScore(1);
    const newLevel = 1 + Math.floor(score / 3000);
    if (newLevel > level) {
        level = newLevel;
        Sfx.play('level');
    }
}

function drawBuggy() {
    const y = player.y;
    ctx.save();
    if (player.inv > 0 && Math.floor(player.inv / 5) % 2 === 0) { ctx.restore(); return; }
    ctx.translate(P_X, y);
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 10;
    ctx.fillRect(-16, -14, 28, 10);
    ctx.fillRect(-10, -22, 16, 9);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(-7, -20, 6, 5);
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
    const spin = Math.floor(scrollX / 6) % 2;
    ctx.beginPath(); ctx.arc(-10, -2, 5, spin ? 0.2 : 0.9, spin ? 2.9 : 3.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -2, 5, spin ? 0.9 : 0.2, spin ? 3.6 : 2.9); ctx.stroke();
    ctx.restore();
}

function draw() {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.r, s.r));

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(0, GY + 10);
    for (let x = 0; x <= W; x += 20) {
        const h = groundAt(x);
        ctx.lineTo(x, h > H ? H : h + 10 + Math.sin((x + scrollX) * 0.02) * 8);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#8888ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#8888ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
        const h = groundAt(x);
        if (h > H) {
            ctx.stroke();
            ctx.beginPath();
            continue;
        }
        if (x === 0) ctx.moveTo(x, h);
        else ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawBuggy();

    hoppers.forEach(h => {
        ctx.fillStyle = '#ff8800';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 8;
        ctx.fillRect(h.x - 9, h.y - 24, 18, 14);
        ctx.fillRect(h.x - 12, h.y - 12, 24, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(h.x - 5, h.y - 20, 3, 3);
        ctx.fillRect(h.x + 2, h.y - 20, 3, 3);
    });

    ufos.forEach(u => {
        ctx.fillStyle = '#ff66ff';
        ctx.shadowColor = '#ff66ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(u.x, u.y - 6, 10, 7, 0, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;
    pBullets.forEach(b => ctx.fillRect(b.x - 3, b.y - 1, 8, 3));
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;
    eBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowBlur = 0;

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 26;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'left';
    for (let i = 0; i < lives - 1; i++) {
        ctx.fillStyle = '#00ff41';
        ctx.fillRect(16 + i * 20, H - 18, 12, 6);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    Sfx.play('select');
    if (isRunning) return;
    initGame();
    isRunning = true;
    startScreenEl.classList.add('hidden');
}

function togglePause() {
    if (!isRunning || isGameOver) return;
    isPaused = !isPaused;
    pauseOverlay.classList.toggle('hidden', !isPaused);
    Sfx.play('blip');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') { if (!e.repeat) { e.preventDefault(); togglePause(); } return; }
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (!e.repeat) { e.preventDefault(); jump(); } }
    if (e.key === 'x' || e.key === 'X' || e.key === 'Enter') { if (!e.repeat) { e.preventDefault(); fire(); } }
});

startScreenEl.addEventListener('click', () => { if (!isRunning) startGame(); });
startScreenEl.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isRunning) startGame(); }, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    const r = canvas.getBoundingClientRect();
    const rx = (e.touches[0].clientX - r.left) / r.width;
    if (rx < 0.5) jump(); else fire();
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    const r = canvas.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    if (rx < 0.5) jump(); else fire();
});

pauseOverlay.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

makeStars();
initGame();
draw();
loop();
