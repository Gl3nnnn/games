/* arcade.js - shared Neon Arcade engine: 8-bit SFX, CRT, mute, D-pad, pause, gamepad, FX, chiptune BGM */
(function () {
    var script = document.currentScript;
    var dpadMode = (script && script.dataset.dpad) || '0';
    var wantDpad = dpadMode === '1' || dpadMode === 'wasd';
    var dpadWasd = dpadMode === 'wasd';
    var wantPause = !!(script && script.dataset.pause === '1');
    var muted = localStorage.getItem('arcadeMuted') === '1';
    var crtOn = localStorage.getItem('arcadeCrt') !== '0';

    function isTyping(e) {
        var t = e.target;
        if (!t) return false;
        var tag = (t.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || !!t.isContentEditable;
    }

    /* ---------- SOUND ---------- */
    var actx = null;
    function ac() {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        return actx;
    }
    function tone(freq, dur, type, vol, delay, slideTo) {
        if (muted) return;
        try {
            var a = ac(), t = a.currentTime + (delay || 0);
            var o = a.createOscillator(), g = a.createGain();
            o.type = type || 'square';
            o.frequency.setValueAtTime(freq, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + dur);
            g.gain.setValueAtTime(vol || 0.05, t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            o.connect(g); g.connect(a.destination);
            o.start(t); o.stop(t + dur + 0.03);
        } catch (e) {}
    }
    function noise(dur, vol, delay) {
        if (muted) return;
        try {
            var a = ac(), t = a.currentTime + (delay || 0);
            var len = Math.floor(a.sampleRate * dur);
            var buf = a.createBuffer(1, len, a.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
            var src = a.createBufferSource(); src.buffer = buf;
            var g = a.createGain();
            g.gain.setValueAtTime(vol || 0.07, t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            src.connect(g); g.connect(a.destination);
            src.start(t);
        } catch (e) {}
    }
    var chompFlip = false;
    var SFX = {
        blip: function () { tone(660, 0.05, 'square', 0.045); },
        move: function () { tone(440, 0.04, 'square', 0.035); },
        select: function () { tone(880, 0.07, 'square', 0.05); tone(1320, 0.08, 'square', 0.04, 0.06); },
        eat: function () { tone(520, 0.05, 'square', 0.05); tone(780, 0.06, 'square', 0.045, 0.05); },
        chomp: function () { chompFlip = !chompFlip; tone(chompFlip ? 420 : 320, 0.06, 'square', 0.05); },
        pellet: function () { tone(240, 0.2, 'square', 0.06, 0, 900); noise(0.15, 0.04); },
        shoot: function () { tone(1000, 0.12, 'square', 0.045, 0, 180); },
        bounce: function () { tone(500, 0.05, 'triangle', 0.05, 0, 800); },
        jump: function () { tone(320, 0.16, 'square', 0.05, 0, 760); },
        land: function () { tone(180, 0.08, 'triangle', 0.06, 0, 90); },
        hit: function () { tone(700, 0.07, 'sawtooth', 0.05, 0, 300); },
        explode: function () { noise(0.3, 0.08); tone(220, 0.3, 'sawtooth', 0.05, 0, 45); },
        powerup: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.09, 'square', 0.05, i * 0.07); }); },
        coin: function () { tone(988, 0.08, 'square', 0.05); tone(1319, 0.35, 'square', 0.05, 0.08); },
        die: function () { tone(500, 0.5, 'sawtooth', 0.06, 0, 60); noise(0.35, 0.05, 0.05); },
        gameover: function () { [392, 349, 311, 196].forEach(function (f, i) { tone(f, 0.28, 'square', 0.055, i * 0.22); }); },
        win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.16, 'square', 0.055, i * 0.12); }); },
        level: function () { [659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, 'square', 0.05, i * 0.1); }); }
    };
    window.Sfx = {
        play: function (name) { try { if (SFX[name]) SFX[name](); } catch (e) {} },
        get muted() { return muted; },
        set muted(v) { muted = v; localStorage.setItem('arcadeMuted', v ? '1' : '0'); updateButtons(); }
    };

    /* ---------- FX LAYER (screen shake + flash) ---------- */
    var fxShakeTimer = null;
    window.FX = {
        shake: function (ms, power) {
            try {
                ms = ms || 300; power = power || 6;
                document.body.classList.remove('fx-shake');
                void document.body.offsetWidth;
                document.body.style.setProperty('--fxShake', power + 'px');
                document.body.style.setProperty('--fxShakeDur', ms + 'ms');
                document.body.classList.add('fx-shake');
                clearTimeout(fxShakeTimer);
                fxShakeTimer = setTimeout(function () { document.body.classList.remove('fx-shake'); }, ms);
            } catch (e) {}
        },
        flash: function (color, ms) {
            try {
                ms = ms || 150;
                var f = document.createElement('div');
                f.className = 'fx-flash';
                f.style.background = color || '#ffffff';
                f.style.animation = 'fxFlashOut ' + ms + 'ms ease-out forwards';
                document.body.appendChild(f);
                setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, ms + 30);
            } catch (e) {}
        }
    };

    /* ---------- CHIPTUNE BGM ENGINE ---------- */
    var musicOn = localStorage.getItem('arcadeMusic') === '1';
    var musicSeq = null, musicStep = 0;
    var MUSIC = {
        tempo: 0.135,
        bass: [40, 0, 40, 0, 43, 0, 43, 0, 45, 0, 45, 0, 43, 0, 40, 0],
        lead: [64, 0, 67, 0, 71, 0, 67, 0, 64, 0, 62, 0, 59, 0, 62, 0]
    };
    function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
    function musicTick() {
        if (muted || !musicOn) return;
        var b = MUSIC.bass[musicStep % 16], l = MUSIC.lead[musicStep % 16];
        try {
            var a = ac(), t = a.currentTime;
            if (b) {
                var o1 = a.createOscillator(), g1 = a.createGain();
                o1.type = 'triangle'; o1.frequency.setValueAtTime(midi(b), t);
                g1.gain.setValueAtTime(0.028, t);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                o1.connect(g1); g1.connect(a.destination);
                o1.start(t); o1.stop(t + 0.14);
            }
            if (l) {
                var o2 = a.createOscillator(), g2 = a.createGain();
                o2.type = 'square'; o2.frequency.setValueAtTime(midi(l), t);
                g2.gain.setValueAtTime(0.016, t);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                o2.connect(g2); g2.connect(a.destination);
                o2.start(t); o2.stop(t + 0.12);
            }
        } catch (e) {}
        musicStep++;
    }
    function startMusic() { if (!musicSeq) musicSeq = setInterval(musicTick, MUSIC.tempo * 1000); }
    function stopMusic() { clearInterval(musicSeq); musicSeq = null; }
    function syncMusic() { if (musicOn) startMusic(); else stopMusic(); }
    function updateMusicBtn() {
        var b = document.getElementById('arcadeMusicBtn');
        if (b) b.textContent = musicOn ? 'MUSIC ON' : 'MUSIC OFF';
    }
    updateMusicBtn();
    syncMusic();

    /* ---------- CRT OVERLAY ---------- */
    var style = document.createElement('style');
    style.textContent =
        '.crt-overlay{position:fixed;inset:0;pointer-events:none;z-index:99990;' +
        'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.16) 0px,rgba(0,0,0,0.16) 1px,transparent 1px,transparent 3px),' +
        'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.32) 100%);' +
        'animation:crtFlicker 4s infinite;}' +
        '@keyframes crtFlicker{0%,100%{opacity:1}50%{opacity:0.93}52%{opacity:0.98}}' +
        '.arcade-bar{position:fixed;top:8px;right:8px;z-index:99991;display:flex;gap:6px;}' +
        '.arcade-btn{background:rgba(10,10,15,0.85);border:2px solid #0ff;color:#0ff;' +
        'font-family:Orbitron,monospace;font-size:11px;padding:5px 9px;border-radius:5px;' +
        'cursor:pointer;letter-spacing:0.05em;user-select:none;}' +
        '.arcade-btn:hover{background:#0ff;color:#0a0a0f;box-shadow:0 0 12px #0ff;}' +
        '.dpad{position:fixed;bottom:14px;left:14px;z-index:99991;display:none;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:4px;opacity:0.85;}' +
        '.dpad button{background:rgba(0,255,255,0.12);border:2px solid #0ff;color:#0ff;font-size:20px;border-radius:10px;touch-action:none;user-select:none;-webkit-user-select:none;}' +
        '.dpad button:active{background:#0ff;color:#0a0a0f;}' +
        '.dpad .d-up{grid-column:2;grid-row:1}.dpad .d-left{grid-column:1;grid-row:2}' +
        '.dpad .d-mid{grid-column:2;grid-row:2;font-size:11px;color:#0ff;border-color:rgba(0,255,255,0.4)}' +
        '.dpad .d-right{grid-column:3;grid-row:2}.dpad .d-down{grid-column:2;grid-row:3}' +
        '@media (pointer:coarse){.dpad.on{display:grid}}' +
        '.pause-overlay{position:fixed;inset:0;background:rgba(5,5,10,0.72);z-index:99985;display:flex;' +
        'align-items:center;justify-content:center;flex-direction:column;gap:14px;}' +
        '.pause-overlay .pl{font-family:Orbitron,sans-serif;font-size:42px;color:#0ff;' +
        'text-shadow:0 0 18px #0ff;letter-spacing:0.25em;animation:crtPulse 1.2s infinite;}' +
        '.pause-overlay .ph{font-family:Orbitron,sans-serif;font-size:13px;color:#888;letter-spacing:0.1em;}' +
        '@keyframes crtPulse{0%,100%{opacity:1}50%{opacity:0.4}}' +
        '.crt-boot{position:fixed;inset:0;background:#000;z-index:99992;pointer-events:none;' +
        'animation:crtBoot .85s ease-out forwards;}' +
        '@keyframes crtBoot{' +
        '0%{transform:scaleY(0.004);opacity:1;background:#000;}' +
        '25%{transform:scaleY(0.004);opacity:1;background:#fff;}' +
        '60%{transform:scaleY(1);opacity:0.85;background:#fff;}' +
        '100%{transform:scaleY(1);opacity:0;background:#fff;}}' +
        'body.fx-shake{animation:fxShake var(--fxShakeDur,.32s) ease-in-out;}' +
        '@keyframes fxShake{' +
        '0%,100%{transform:translate(0,0)}' +
        '15%{transform:translate(calc(var(--fxShake,6px) * -1), calc(var(--fxShake,6px) * 0.4))}' +
        '35%{transform:translate(var(--fxShake,6px), calc(var(--fxShake,6px) * -0.5))}' +
        '55%{transform:translate(calc(var(--fxShake,6px) * -0.7), calc(var(--fxShake,6px) * 0.3))}' +
        '75%{transform:translate(calc(var(--fxShake,6px) * 0.5), calc(var(--fxShake,6px) * -0.2))}}' +
        '.fx-flash{position:fixed;inset:0;pointer-events:none;z-index:99988;opacity:0.5;}' +
        '@keyframes fxFlashOut{from{opacity:0.5}to{opacity:0}}';
    document.head.appendChild(style);

    var crt = document.createElement('div');
    crt.className = 'crt-overlay';
    document.body.appendChild(crt);

    var bar = document.createElement('div');
    bar.className = 'arcade-bar';
    bar.innerHTML = '<button class="arcade-btn" id="arcadeMuteBtn" title="Mute/unmute sounds"></button>' +
        '<button class="arcade-btn" id="arcadeMusicBtn" title="Toggle chiptune music"></button>' +
        '<button class="arcade-btn" id="arcadeCrtBtn" title="Toggle CRT effect">CRT</button>';
    document.body.appendChild(bar);

    function updateButtons() {
        var mb = document.getElementById('arcadeMuteBtn');
        if (mb) mb.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
        updateMusicBtn();
    }
    updateButtons();
    crt.style.display = crtOn ? '' : 'none';

    document.getElementById('arcadeMuteBtn').addEventListener('click', function () {
        muted = !muted;
        localStorage.setItem('arcadeMuted', muted ? '1' : '0');
        updateButtons();
        if (!muted) SFX.play('blip');
    });
    document.getElementById('arcadeCrtBtn').addEventListener('click', function () {
        crtOn = !crtOn;
        localStorage.setItem('arcadeCrt', crtOn ? '1' : '0');
        crt.style.display = crtOn ? '' : 'none';
    });
    document.getElementById('arcadeMusicBtn').addEventListener('click', function () {
        musicOn = !musicOn;
        localStorage.setItem('arcadeMusic', musicOn ? '1' : '0');
        updateMusicBtn();
        syncMusic();
        if (!muted) SFX.play('blip');
    });

    /* ---------- CRT POWER-ON BOOT (once per page load) ---------- */
    try {
        var boot = document.createElement('div');
        boot.className = 'crt-boot';
        document.body.appendChild(boot);
        setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 900);
    } catch (e) {}

    /* ---------- RETRO HIGH-SCORE INITIALS (top-5 per game) ---------- */
    var ScoreStyle = document.createElement('style');
    ScoreStyle.textContent =
        '.hs-entry{position:fixed;inset:0;z-index:99987;background:rgba(3,3,8,0.94);' +
        'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;' +
        'font-family:Orbitron,sans-serif;}' +
        '.hs-entry .hs-title{font-size:1.5rem;color:#ffcc00;text-shadow:0 0 18px #ffcc00;letter-spacing:0.2em;animation:crtPulse 1s infinite;}' +
        '.hs-entry .hs-sub{font-size:0.8rem;color:#0ff;letter-spacing:0.12em;}' +
        '.hs-entry .hs-letters{display:flex;gap:14px;}' +
        '.hs-entry .hs-slot{width:44px;height:56px;border:2px solid #0ff;border-radius:6px;' +
        'display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#0f0;' +
        'text-shadow:0 0 12px #0f0;background:rgba(0,255,255,0.05);}' +
        '.hs-entry .hs-slot.active{border-color:#ffcc00;box-shadow:0 0 14px #ffcc00;color:#ffcc00;}' +
        '.hs-entry .hs-help{font-size:0.65rem;color:#888;letter-spacing:0.08em;text-align:center;line-height:1.7;}' +
        '.hs-entry .hs-help b{color:#0ff;}';
    document.head.appendChild(ScoreStyle);

    var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function scoresKey(id) { return 'arcadeScores_' + id; }
    function readScores(id) {
        try {
            var raw = localStorage.getItem(scoresKey(id));
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }
    function writeScores(id, arr) {
        try { localStorage.setItem(scoresKey(id), JSON.stringify(arr.slice(0, 5))); } catch (e) {}
    }
    function qualifies(id, score, lowerBetter) {
        var arr = readScores(id).filter(function (e) { return e && typeof e.s === 'number'; });
        if (arr.length < 5) return true;
        var worst = arr[arr.length - 1].s;
        return lowerBetter ? score < worst : score > worst;
    }
    function insertScore(id, score, initials, lowerBetter) {
        var arr = readScores(id);
        arr.push({ s: score, i: initials, t: Date.now() });
        arr.sort(function (a, b) { return lowerBetter ? a.s - b.s : b.s - a.s; });
        writeScores(id, arr);
    }

    function showEntry(id, score, lowerBetter, unit, done) {
        var slots = [0, 0, 0];
        var active = 0;
        var timeStyle = lowerBetter && (!unit || unit === 'SEC');
        var wrap = document.createElement('div');
        wrap.className = 'hs-entry';
        wrap.innerHTML =
            '<div class="hs-title">' + (timeStyle ? '⚡ NEW BEST TIME!' : (lowerBetter ? '🏆 NEW RECORD!' : '🏆 NEW HIGH SCORE!')) + '</div>' +
            '<div class="hs-sub">' + score.toLocaleString() + ' ' + (unit || (lowerBetter ? 'SEC' : 'PTS')) + ' — ENTER YOUR INITIALS</div>' +
            '<div class="hs-letters">' +
            '<div class="hs-slot" data-i="0">A</div>' +
            '<div class="hs-slot" data-i="1">A</div>' +
            '<div class="hs-slot" data-i="2">A</div>' +
            '</div>' +
            '<div class="hs-help">TYPE A–Z · <b>←→</b> MOVE · <b>↑↓</b> CHANGE · <b>ENTER</b> CONFIRM</div>';
        document.body.appendChild(wrap);
        var slotEls = wrap.querySelectorAll('.hs-slot');
        function render() {
            slotEls.forEach(function (el, i) {
                el.textContent = ALPHA[slots[i]];
                el.classList.toggle('active', i === active);
            });
        }
        render();
        function onKey(e) {
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && /^[rR]$/.test(e.key))) return;
            e.preventDefault();
            e.stopPropagation();
            var k = e.key;
            if (/^[a-zA-Z]$/.test(k)) {
                slots[active] = k.toUpperCase().charCodeAt(0) - 65;
                if (active < 2) active++;
                Sfx.play('blip');
            } else if (k === 'ArrowUp') {
                slots[active] = (slots[active] + 1) % 26; Sfx.play('blip');
            } else if (k === 'ArrowDown') {
                slots[active] = (slots[active] + 25) % 26; Sfx.play('blip');
            } else if (k === 'ArrowLeft') {
                active = Math.max(0, active - 1); Sfx.play('blip');
            } else if (k === 'ArrowRight') {
                active = Math.min(2, active + 1); Sfx.play('blip');
            } else if (k === 'Enter' || k === ' ') {
                finish();
                return;
            } else if (k === 'Escape') {
                cancel();
                return;
            } else if (k === 'Backspace') {
                slots[active] = 0; Sfx.play('blip');
            } else {
                return;
            }
            render();
        }
        function cleanup() {
            document.removeEventListener('keydown', onKey, true);
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }
        function finish() {
            cleanup();
            var initials = slots.map(function (i) { return ALPHA[i]; }).join('');
            insertScore(id, score, initials, lowerBetter);
            Sfx.play('coin');
            done();
        }
        function cancel() {
            cleanup();
            done();
        }
        document.addEventListener('keydown', onKey, true);
    }

    window.Scores = {
        submit: function (id, score, opts) {
            try {
                opts = opts || {};
                if (!id || score == null || isNaN(score)) return;
                if (score <= 0) return;
                if (!qualifies(id, score, opts.lowerBetter)) return;
                showEntry(id, score, !!opts.lowerBetter, opts.unit, function () {});
            } catch (e) {}
        },
        get: readScores
    };

    /* ---------- TOUCH D-PAD (opt-in via data-dpad="1") ---------- */
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (wantDpad && isTouch) {
        var dpadKeys = dpadWasd
            ? { ArrowUp: ['w', 'KeyW'], ArrowDown: ['s', 'KeyS'], ArrowLeft: ['a', 'KeyA'], ArrowRight: ['d', 'KeyD'] }
            : null;
        function dpadMap(key) {
            if (dpadKeys && dpadKeys[key]) return { key: dpadKeys[key][0], code: dpadKeys[key][1] };
            if (key === ' ') return { key: ' ', code: 'Space' };
            if (key === 'p') return { key: 'p', code: 'KeyP' };
            return { key: key, code: key };
        }
        var dpad = document.createElement('div');
        dpad.className = 'dpad on';
        dpad.innerHTML =
            '<button class="d-up" data-key="ArrowUp">▲</button>' +
            '<button class="d-left" data-key="ArrowLeft">◀</button>' +
            '<button class="d-mid" data-key="p">⏸</button>' +
            '<button class="d-right" data-key="ArrowRight">▶</button>' +
            '<button class="d-down" data-key="ArrowDown">▼</button>';
        document.body.appendChild(dpad);
        dpad.querySelectorAll('button').forEach(function (b) {
            var key = b.dataset.key;
            function down(e) {
                e.preventDefault();
                var m = dpadMap(key);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: m.key, code: m.code, bubbles: true, cancelable: true }));
            }
            function up(e) {
                e.preventDefault();
                var m = dpadMap(key);
                document.dispatchEvent(new KeyboardEvent('keyup', { key: m.key, code: m.code, bubbles: true, cancelable: true }));
            }
            b.addEventListener('pointerdown', down);
            b.addEventListener('pointerup', up);
            b.addEventListener('pointercancel', up);
            b.addEventListener('pointerleave', up);
            b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        });
    }

    /* ---------- GENERIC PAUSE ENGINE (opt-in via data-pause="1") ---------- */
    if (wantPause) {
        var paused = false;
        var _raf = window.requestAnimationFrame.bind(window);
        var _setInterval = window.setInterval.bind(window);

        window.requestAnimationFrame = function (cb) {
            return _raf(function (ts) {
                if (paused) window.requestAnimationFrame(cb);
                else cb(ts);
            });
        };
        window.setInterval = function (cb, ms) {
            var args = Array.prototype.slice.call(arguments, 2);
            if (typeof cb === 'function') {
                return _setInterval(function () {
                    if (!paused) cb.apply(null, args);
                }, ms);
            }
            return _setInterval.apply(window, arguments);
        };

        var pOverlay = null;
        function showPause() {
            if (!pOverlay) {
                pOverlay = document.createElement('div');
                pOverlay.className = 'pause-overlay';
                pOverlay.innerHTML = '<div class="pl">PAUSED</div><div class="ph">PRESS P OR TAP TO RESUME</div>';
                pOverlay.addEventListener('click', togglePause);
                document.body.appendChild(pOverlay);
            }
            pOverlay.style.display = 'flex';
        }
        function togglePause() {
            paused = !paused;
            document.documentElement.dataset.arcPaused = paused ? '1' : '0';
            if (paused) { showPause(); Sfx.play('blip'); }
            else if (pOverlay) pOverlay.style.display = 'none';
        }
        document.addEventListener('keydown', function (e) {
            if ((e.key === 'p' || e.key === 'P') && !e.repeat && (!isTyping(e) || paused)) togglePause();
        });
    }

    /* ---------- GAMEPAD API (auto for all pages) ---------- */
    (function () {
        var prev = {};
        var axisHeld = { left: false, right: false, up: false, down: false };
        var dead = 0.5;
        var padKeys = dpadWasd
            ? { ArrowUp: ['w', 'KeyW'], ArrowDown: ['s', 'KeyS'], ArrowLeft: ['a', 'KeyA'], ArrowRight: ['d', 'KeyD'] }
            : null;
        function remap(key, code) {
            var m = padKeys && padKeys[key];
            return m ? { key: m[0], code: m[1] } : { key: key, code: code };
        }
        function press(key, code, down) {
            document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
                key: key, code: code, bubbles: true, cancelable: true
            }));
        }
        function setBtn(id, down, key, code) {
            if (prev[id] === down) return;
            prev[id] = down;
            var m = remap(key, code);
            press(m.key, m.code, down);
        }
        function setAxis(name, down, key, code) {
            if (axisHeld[name] === down) return;
            axisHeld[name] = down;
            var m = remap(key, code);
            press(m.key, m.code, down);
        }
        function poll() {
            var pads = navigator.getGamepads ? navigator.getGamepads() : [];
            for (var i = 0; i < pads.length; i++) {
                var gp = pads[i];
                if (!gp) continue;
                setBtn('a' + i, !!(gp.buttons[0] && gp.buttons[0].pressed), 'Enter', 'Enter');
                setBtn('b' + i, !!(gp.buttons[1] && gp.buttons[1].pressed), ' ', 'Space');
                setBtn('start' + i, !!(gp.buttons[9] && gp.buttons[9].pressed), 'p', 'KeyP');
                setBtn('up' + i, !!(gp.buttons[12] && gp.buttons[12].pressed), 'ArrowUp', 'ArrowUp');
                setBtn('down' + i, !!(gp.buttons[13] && gp.buttons[13].pressed), 'ArrowDown', 'ArrowDown');
                setBtn('left' + i, !!(gp.buttons[14] && gp.buttons[14].pressed), 'ArrowLeft', 'ArrowLeft');
                setBtn('right' + i, !!(gp.buttons[15] && gp.buttons[15].pressed), 'ArrowRight', 'ArrowRight');
                var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
                setAxis('left', ax < -dead, 'ArrowLeft', 'ArrowLeft');
                setAxis('right', ax > dead, 'ArrowRight', 'ArrowRight');
                setAxis('up', ay < -dead, 'ArrowUp', 'ArrowUp');
                setAxis('down', ay > dead, 'ArrowDown', 'ArrowDown');
            }
            requestAnimationFrame(poll);
        }
        if (navigator.getGamepads) requestAnimationFrame(poll);
    })();
})();
