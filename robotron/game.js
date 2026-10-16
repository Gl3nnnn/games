const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let player, grunts, spheroids, enforcers, brains, electrodes, humans, pBullets, eBullets, particles;
let score, lives, wave, isGameOver, isPaused, isRunning;
let shootDir, moveKeys, shootHeld, tapShootT, fireCd;
let highScore = parseInt(localStorage.getItem('robotronHighScore')) || 0;

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startScreenEl = document.getElementById('startScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const restartBtn = document.getElementById('restartBtn');

highScoreEl.textContent = highScore;

function rnd(a, b) { return a + Math.random() * (b - a); }

function newPlayer() {
    return { x: W / 2, y: H / 2, inv: 100 };
}

function spawnWave() {
    grunts = []; spheroids = []; enforcers = []; brains = []; electrodes = []; humans = []; pBullets = []; eBullets = [];
    const g = 4 + Math.min(wave, 10);
    for (let i = 0; i < g; i++) grunts.push({ x: rnd(30, W - 30), y: rnd(30, H - 30), sp: rnd(1.1, 1.5) + wave * 0.06 });
    const s = 1 + Math.floor(wave / 2);
    for (let i = 0; i < s; i++) spheroids.push({ x: rnd(40, W - 40), y: rnd(40, H - 40), vx: rnd(-1, 1), vy: rnd(-1, 1), t: 120 });
    for (let i = 0; i < 7 + wave; i++) {
        electrodes.push({ x: rnd(20, W - 20), y: rnd(20, H - 20), phase: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < 5; i++) humans.push({ x: rnd(40, W - 40), y: rnd(40, H - 40), vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), t: 0 });
    if (wave >= 2) {
        for (let i = 0; i < Math.min(2 + wave, 6); i++) brains.push({ x: rnd(30, W - 30), y: rnd(30, H - 30), sp: 1.3 + wave * 0.05 });
    }
}

function initGame() {
    player = newPlayer();
    score = 0; lives = 3; wave = 1;
    shootDir = { x: 0, y: 0 };
    moveKeys = {}; shootHeld = {};
    tapShootT = 0; fireCd = 0;
    particles = [];
    isGameOver = false; isPaused = false;
    scoreEl.textContent = 0; livesEl.textContent = 3;
    spawnWave();
    pauseOverlay.classList.add('hidden');
}

function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('robotronHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function explode(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24, color });
    }
}

function killPlayer() {
    if (player.inv > 0) return;
    Sfx.play('die');
    FX.shake(380, 8);
    FX.flash('#ff2244', 180);
    explode(player.x, player.y, '#00ff41', 22);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { endGame(); return; }
    player = newPlayer();
    eBullets = [];
}

function endGame() {
    Sfx.play('gameover');
    Scores.submit('robotron', score);
    isGameOver = true; isRunning = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
}

function shoot() {
    if (fireCd > 0) return;
    const d = shootDir;
    if (!d.x && !d.y) return;
    fireCd = 8;
    Sfx.play('shoot');
    pBullets.push({ x: player.x, y: player.y, vx: d.x * 7.5, vy: d.y * 7.5, life: 70 });
}

function nearestEnemyDir() {
    let best = null, bd = Infinity;
    const all = [...grunts, ...spheroids, ...enforcers, ...brains];
    for (const e of all) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < bd) { bd = d; best = e; }
    }
    if (!best) return { x: 1, y: 0 };
    const dx = best.x - player.x, dy = best.y - player.y;
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
}

function update() {
    if (isPaused || isGameOver || !isRunning) return;

    if (player.inv > 0) player.inv--;
    if (fireCd > 0) fireCd--;

    let mx = 0, my = 0;
    if (moveKeys.KeyA || moveKeys.a) mx -= 1;
    if (moveKeys.KeyD || moveKeys.d) mx += 1;
    if (moveKeys.KeyW || moveKeys.w) my -= 1;
    if (moveKeys.KeyS || moveKeys.s) my += 1;
    if (moveKeys.ArrowLeft || moveKeys.ArrowRight || moveKeys.ArrowUp || moveKeys.ArrowDown) {
        /* arrows reserved for shooting */
    }
    if (mx && my) { mx *= 0.7071; my *= 0.7071; }
    player.x = Math.max(10, Math.min(W - 10, player.x + mx * 3.3));
    player.y = Math.max(10, Math.min(H - 10, player.y + my * 3.3));

    if (tapShootT > 0) { tapShootT--; shoot(); }

    const sd = shootDir;
    if (sd.x || sd.y) shoot();

    grunts.forEach(g => {
        const dx = player.x - g.x, dy = player.y - g.y;
        const m = Math.hypot(dx, dy) || 1;
        g.x += dx / m * g.sp;
        g.y += dy / m * g.sp;
    });

    spheroids.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 15 || s.x > W - 15) s.vx *= -1;
        if (s.y < 15 || s.y > H - 15) s.vy *= -1;
        s.t--;
        if (s.t <= 0) {
            s.t = 160;
            enforcers.push({ x: s.x, y: s.y, vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), fireT: 60 });
        }
    });

    enforcers.forEach(e => {
        const dx = player.x - e.x, dy = player.y - e.y;
        const m = Math.hypot(dx, dy) || 1;
        e.x += dx / m * 0.9 + e.vx * 0.4;
        e.y += dy / m * 0.9 + e.vy * 0.4;
        e.fireT--;
        if (e.fireT <= 0) {
            e.fireT = 50 + Math.random() * 40;
            eBullets.push({ x: e.x, y: e.y, vx: dx / m * 3.4, vy: dy / m * 3.4, life: 90 });
            Sfx.play('blip');
        }
    });

    brains.forEach(b => {
        const dx = player.x - b.x, dy = player.y - b.y;
        const m = Math.hypot(dx, dy) || 1;
        b.x += dx / m * b.sp;
        b.y += dy / m * b.sp;
    });

    humans.forEach(h => {
        h.t--;
        if (h.t <= 0) {
            h.t = 40 + Math.random() * 60;
            h.vx = rnd(-0.6, 0.6); h.vy = rnd(-0.6, 0.6);
        }
        h.x = Math.max(10, Math.min(W - 10, h.x + h.vx));
        h.y = Math.max(10, Math.min(H - 10, h.y + h.vy));
        if (Math.hypot(h.x - player.x, h.y - player.y) < 14) {
            h.rescued = true;
            addScore(1000);
            Sfx.play('coin');
            explode(h.x, h.y, '#00ffff', 8);
        }
    });
    const before = humans.length;
    humans = humans.filter(h => !h.rescued);
    if (before !== humans.length && humans.length === 0) {
        Sfx.play('level');
    }

    pBullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    for (let i = pBullets.length - 1; i >= 0; i--) {
        const b = pBullets[i];
        if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) { pBullets.splice(i, 1); continue; }
        let hit = false;
        const tryHit = (arr, pts, color) => {
            for (let j = arr.length - 1; j >= 0; j--) {
                const e = arr[j];
                if (Math.hypot(b.x - e.x, b.y - e.y) < 13) {
                    arr.splice(j, 1);
                    addScore(pts);
                    explode(e.x, e.y, color, 10);
                    Sfx.play('hit');
                    hit = true;
                    return true;
                }
            }
            return false;
        };
        if (tryHit(grunts, 100, '#ff4444')) { }
        else if (tryHit(enforcers, 150, '#ff8800')) { }
        else if (tryHit(brains, 500, '#ff66ff')) { }
        else if (tryHit(spheroids, 1000, '#4488ff')) { }
        else if (tryHit(electrodes, 25, '#ffff00')) { }
        if (hit) pBullets.splice(i, 1);
    }

    eBullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    eBullets = eBullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

    if (player.inv <= 0) {
        for (const b of eBullets) {
            if (Math.hypot(b.x - player.x, b.y - player.y) < 10) {
                killPlayer();
                return;
            }
        }
        const touches = arr => arr.some(e => Math.hypot(e.x - player.x, e.y - player.y) < 14);
        if (touches(grunts) || touches(brains) || touches(enforcers)) { killPlayer(); return; }
        if (touches(electrodes)) { killPlayer(); return; }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    if (!grunts.length && !spheroids.length && !enforcers.length && !brains.length) {
        wave++;
        Sfx.play('level');
        spawnWave();
    }
}

function drawHuman(h) {
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y - 7, 3, 0, Math.PI * 2);
    ctx.moveTo(h.x, h.y - 4); ctx.lineTo(h.x, h.y + 4);
    ctx.moveTo(h.x, h.y); ctx.lineTo(h.x - 5, h.y + 3);
    ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + 5, h.y + 3);
    ctx.moveTo(h.x, h.y + 4); ctx.lineTo(h.x - 4, h.y + 10);
    ctx.moveTo(h.x, h.y + 4); ctx.lineTo(h.x + 4, h.y + 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function draw() {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);

    electrodes.forEach(e => {
        e.phase += 0.06;
        const r = 6 + Math.sin(e.phase) * 2;
        ctx.strokeStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = e.phase + (i * Math.PI) / 3;
            ctx.moveTo(e.x - Math.cos(a) * r, e.y - Math.sin(a) * r);
            ctx.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    humans.forEach(drawHuman);

    ctx.shadowBlur = 10;
    grunts.forEach(g => {
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - 9); ctx.lineTo(g.x + 8, g.y); ctx.lineTo(g.x, g.y + 9); ctx.lineTo(g.x - 8, g.y);
        ctx.closePath(); ctx.fill();
    });
    spheroids.forEach(s => {
        ctx.fillStyle = '#4488ff';
        ctx.shadowColor = '#4488ff';
        ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill();
    });
    enforcers.forEach(e => {
        ctx.fillStyle = '#ff8800';
        ctx.shadowColor = '#ff8800';
        ctx.fillRect(e.x - 7, e.y - 7, 14, 14);
    });
    brains.forEach(b => {
        ctx.fillStyle = '#ff66ff';
        ctx.shadowColor = '#ff66ff';
        ctx.fillRect(b.x - 8, b.y - 8, 16, 16);
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x - 5, b.y - 3, 3, 3);
        ctx.fillRect(b.x + 2, b.y - 3, 3, 3);
    });
    ctx.shadowBlur = 0;

    if (!(player.inv > 0 && Math.floor(player.inv / 4) % 2 === 0)) {
        ctx.fillStyle = '#00ff41';
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 12;
        ctx.fillRect(player.x - 8, player.y - 3, 16, 6);
        ctx.fillRect(player.x - 3, player.y - 8, 6, 16);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;
    pBullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 2, 4, 4));
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;
    eBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.shadowBlur = 0;

    particles.forEach(p => {
        ctx.globalAlpha = p.life / 24;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText('WAVE ' + wave + '  HUMANS ' + humans.length, 12, 18);
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

function setShootFromKeys() {
    let x = 0, y = 0;
    if (shootHeld.ArrowLeft) x = -1;
    if (shootHeld.ArrowRight) x = 1;
    if (shootHeld.ArrowUp) y = -1;
    if (shootHeld.ArrowDown) y = 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    shootDir.x = x; shootDir.y = y;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        shootHeld[e.key] = true;
        setShootFromKeys();
        return;
    }
    if (e.key === ' ') {
        e.preventDefault();
        shootDir = nearestEnemyDir();
        tapShootT = 1;
        shoot();
        return;
    }
    moveKeys[e.code] = true;
    moveKeys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        shootHeld[e.key] = false;
        setShootFromKeys();
        return;
    }
    moveKeys[e.code] = false;
    moveKeys[e.key] = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGameOver) return;
    if (!isRunning) { startGame(); return; }
    const r = canvas.getBoundingClientRect();
    const tx = (e.touches[0].clientX - r.left) * (W / r.width);
    const ty = (e.touches[0].clientY - r.top) * (H / r.height);
    const dx = tx - player.x, dy = ty - player.y;
    const m = Math.hypot(dx, dy) || 1;
    shootDir = { x: dx / m, y: dy / m };
    tapShootT = 45;
}, { passive: false });
canvas.addEventListener('touchend', () => { tapShootT = 0; });

pauseOverlay.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
    gameOverEl.classList.add('hidden');
    initGame();
    isRunning = true;
});

initGame();
draw();
loop();
