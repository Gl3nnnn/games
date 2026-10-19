const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND = H - 40;

const CITY_X = [30, 78, 126, 434, 482, 530];
const BASE_X = [210, 280, 350];
const MAX_AMMO = 10;

let cities, bases, enemyMissiles, playerMissiles, explosions, stars;
let score, wave, aim, isGameOver, isPaused, isRunning;
let spawnQueue, spawnTimer, waveEndDelay;
let highScore = parseInt(localStorage.getItem('missilecmdHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const waveEl = document.getElementById('wave');
const citiesEl = document.getElementById('cities');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function makeStars() {
    stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * GROUND, r: Math.random() * 1.4 + 0.3 }));
}

function initWave() {
    spawnQueue = 8 + wave * 2;
    spawnTimer = 30;
    bases.forEach(b => { b.ammo = MAX_AMMO; b.alive = true; });
    waveEndDelay = 0;
}

function initGame() {
    cities = CITY_X.map(x => ({ x, alive: true }));
    bases = BASE_X.map(x => ({ x, ammo: MAX_AMMO, alive: true }));
    enemyMissiles = []; playerMissiles = []; explosions = [];
    score = 0; wave = 1; aim = { x: W / 2, y: GROUND };
    isGameOver = false; isPaused = false;
    if (window.ArcadePause) ArcadePause.hide();
    scoreEl.textContent = 0; waveEl.textContent = 1;
    citiesEl.textContent = 6;
    initWave();
}

function aliveCities() { return cities.filter(c => c.alive); }

function randomTarget() {
    const targets = [
        ...aliveCities().map(c => ({ x: c.x, type: 'city', ref: c })),
        ...bases.filter(b => b.alive).map(b => ({ x: b.x, type: 'base', ref: b }))
    ];
    if (!targets.length) return null;
    return targets[Math.floor(Math.random() * targets.length)];
}

function spawnEnemy() {
    const t = randomTarget();
    if (!t) return;
    const mirv = wave >= 3 && Math.random() < 0.22;
    const smart = !mirv && wave >= 4 && Math.random() < 0.15;
    const sx = Math.random() * W;
    enemyMissiles.push({
        sx, sy: 0,
        tx: t.x + (Math.random() * 10 - 5), ty: GROUND - (t.type === 'base' ? 4 : 8),
        x: sx, y: 0,
        speed: smart ? 0.85 + wave * 0.12 : 1.1 + wave * 0.25 + Math.random() * 0.7,
        ref: t.ref, type: t.type,
        mirv, smart, splitAt: 0.3 + Math.random() * 0.25
    });
}

function fire(tx, ty) {
    if (isPaused || isGameOver || !isRunning) return;
    if (ty > GROUND + 10) ty = GROUND;
    let best = null, bestD = Infinity;
    bases.forEach(b => {
        if (!b.alive || b.ammo <= 0) return;
        const d = Math.abs(b.x - tx);
        if (d < bestD) { bestD = d; best = b; }
    });
    if (!best) return;
    Sfx.play('shoot');
    best.ammo--;
    playerMissiles.push({ sx: best.x, sy: GROUND, tx, ty, x: best.x, y: GROUND, speed: 7 });
}

function addExplosion(x, y, byPlayer) {
    explosions.push({ x, y, r: 3, maxR: 42 + Math.random() * 10, growing: true, byPlayer });
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    if (spawnQueue > 0) {
        spawnTimer--;
        if (spawnTimer <= 0) {
            spawnEnemy();
            spawnQueue--;
            spawnTimer = Math.max(18, 70 - wave * 6);
        }
    }

    enemyMissiles.forEach(m => {
        if (m.smart) {
            const threatened = explosions.some(e => e.byPlayer && Math.hypot(m.x - e.x, m.y - e.y) < e.r + 22);
            if (threatened) return;
        }
        const dx = m.tx - m.x, dy = m.ty - m.y;
        const dist = Math.hypot(dx, dy);
        const total = Math.hypot(m.tx - m.sx, m.ty - m.sy) || 1;
        const traveled = Math.hypot(m.x - m.sx, m.y - m.sy);
        if (m.mirv && !m.splitDone && traveled / total >= m.splitAt) {
            m.splitDone = true;
            m.done = true;
            Sfx.play('blip');
            const kids = 2 + (Math.random() < 0.5 ? 1 : 0);
            for (let k = 0; k < kids; k++) {
                const nt = randomTarget();
                if (!nt) break;
                enemyMissiles.push({
                    sx: m.x, sy: m.y,
                    tx: nt.x + (Math.random() * 10 - 5), ty: GROUND - (nt.type === 'base' ? 4 : 8),
                    x: m.x, y: m.y, speed: m.speed * 1.15,
                    ref: nt.ref, type: nt.type, mirv: false, smart: false
                });
            }
            return;
        }
        if (dist < m.speed) {
            m.done = true;
            addExplosion(m.tx, m.ty, false);
            if (m.ref && m.ref.alive) {
                m.ref.alive = false;
                if (m.type === 'city') citiesEl.textContent = aliveCities().length;
            }
        } else {
            m.x += dx / dist * m.speed;
            m.y += dy / dist * m.speed;
        }
    });
    enemyMissiles = enemyMissiles.filter(m => !m.done);

    playerMissiles.forEach(m => {
        const dx = m.tx - m.x, dy = m.ty - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < m.speed) {
            m.done = true;
            addExplosion(m.tx, m.ty, true);
        } else {
            m.x += dx / dist * m.speed;
            m.y += dy / dist * m.speed;
        }
    });
    playerMissiles = playerMissiles.filter(m => !m.done);

    explosions.forEach(e => {
        if (e.growing) {
            e.r += 2;
            if (e.r >= e.maxR) e.growing = false;
        } else {
            e.r -= 1.4;
        }
    });

    const deadEnemies = enemyMissiles.filter(m =>
        explosions.some(e => e.byPlayer && Math.hypot(m.x - e.x, m.y - e.y) < e.r)
    );
    if (deadEnemies.length) {
        deadEnemies.forEach(m => { m.done = true; });
        score += deadEnemies.reduce((s, m) => s + (m.smart ? 100 : 25), 0);
        Sfx.play('explode');
        FX.shake(150, 4);
        scoreEl.textContent = score;
    }
    enemyMissiles = enemyMissiles.filter(m => !m.done);

    playerMissiles.forEach(m => {
        if (explosions.some(e => !e.byPlayer && Math.hypot(m.x - e.x, m.y - e.y) < e.r)) m.done = true;
    });
    playerMissiles = playerMissiles.filter(m => !m.done);

    explosions = explosions.filter(e => e.r > 0);

    if (aliveCities().length === 0 && !isGameOver) { endGame(); return; }

    if (spawnQueue === 0 && enemyMissiles.length === 0 && explosions.length === 0) {
        waveEndDelay++;
        if (waveEndDelay > 40) {
            score += aliveCities().length * 50;
            scoreEl.textContent = score;
            Sfx.play('level');
            wave++;
            waveEl.textContent = wave;
            initWave();
        }
    } else {
        waveEndDelay = 0;
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.r, s.r));

    ctx.strokeStyle = 'rgba(0,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();

    cities.forEach(c => {
        if (c.alive) {
            ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#00ccff';
            ctx.fillRect(c.x - 14, GROUND - 16, 10, 16);
            ctx.fillRect(c.x - 2, GROUND - 22, 12, 22);
            ctx.fillRect(c.x + 12, GROUND - 12, 6, 12);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(c.x - 14, GROUND - 5, 30, 5);
        }
    });
    ctx.shadowBlur = 0;

    bases.forEach(b => {
        if (b.alive) {
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.moveTo(b.x, GROUND - 24);
            ctx.lineTo(b.x - 18, GROUND);
            ctx.lineTo(b.x + 18, GROUND);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '10px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(b.ammo, b.x, GROUND - 28);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(b.x - 18, GROUND - 4, 36, 4);
        }
    });

    ctx.lineWidth = 2;
    const smartPulse = 3 + Math.sin(Date.now() / 120);
    enemyMissiles.forEach(m => {
        ctx.strokeStyle = m.smart ? '#ff8800' : '#ff3355';
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
        ctx.fillStyle = m.smart ? '#00ffff' : '#ffff00';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.smart ? smartPulse : 2.5, 0, Math.PI * 2);
        ctx.fill();
    });
    playerMissiles.forEach(m => {
        ctx.strokeStyle = '#00ff66';
        ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
    });
    ctx.shadowBlur = 0;

    explosions.forEach(e => {
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.4, 'rgba(255,220,80,0.8)');
        g.addColorStop(1, 'rgba(255,60,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    });

    if (isRunning && !isGameOver) {
        ctx.strokeStyle = 'rgba(0,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#0ff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(aim.x, aim.y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.x - 18, aim.y); ctx.lineTo(aim.x - 6, aim.y);
        ctx.moveTo(aim.x + 6, aim.y); ctx.lineTo(aim.x + 18, aim.y);
        ctx.moveTo(aim.x, aim.y - 18); ctx.lineTo(aim.x, aim.y - 6);
        ctx.moveTo(aim.x, aim.y + 6); ctx.lineTo(aim.x, aim.y + 18);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function loop() {
    if (!isGameOver && isRunning) update();
    draw();
    requestAnimationFrame(loop);
}

function endGame() {
    Sfx.play('gameover');
    Scores.submit('missilecmd', score);
    isGameOver = true; isRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('missilecmdHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function canvasPos(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
        x: (clientX - r.left) * (W / r.width),
        y: (clientY - r.top) * (H / r.height)
    };
}

canvas.addEventListener('mousemove', (e) => { aim = canvasPos(e.clientX, e.clientY); });
canvas.addEventListener('click', (e) => {
    if (isGameOver) return;
    if (!isRunning) {
        isRunning = true;
        startScreenEl.classList.add('hidden');
        Sfx.play('select');
        return;
    }
    aim = canvasPos(e.clientX, e.clientY);
    fire(aim.x, aim.y);
});
canvas.addEventListener('touchstart', (e) => {
    if (isGameOver) return;
    e.preventDefault();
    if (!isRunning) {
        isRunning = true;
        startScreenEl.classList.add('hidden');
        Sfx.play('select');
        return;
    }
    const p = canvasPos(e.touches[0].clientX, e.touches[0].clientY);
    aim = p;
    fire(p.x, p.y);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    aim = canvasPos(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if ((e.key === 'p' || e.key === 'P') && isRunning && !e.repeat) { isPaused = !isPaused; if (window.ArcadePause) ArcadePause.set(isPaused); }
});

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    Sfx.play('select');
    isRunning = true;
});

makeStars();
initGame();
draw();
loop();
