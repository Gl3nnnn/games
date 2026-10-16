/* arcade.js - shared Neon Arcade engine: 8-bit SFX, CRT effects, mute, D-pad, pause */
(function () {
    var script = document.currentScript;
    var wantDpad = !!(script && script.dataset.dpad === '1');
    var wantPause = !!(script && script.dataset.pause === '1');
    var muted = localStorage.getItem('arcadeMuted') === '1';
    var crtOn = localStorage.getItem('arcadeCrt') !== '0';

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
        '@keyframes crtPulse{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(style);

    var crt = document.createElement('div');
    crt.className = 'crt-overlay';
    document.body.appendChild(crt);

    var bar = document.createElement('div');
    bar.className = 'arcade-bar';
    bar.innerHTML = '<button class="arcade-btn" id="arcadeMuteBtn" title="Mute/unmute sounds"></button>' +
        '<button class="arcade-btn" id="arcadeCrtBtn" title="Toggle CRT effect">CRT</button>';
    document.body.appendChild(bar);

    function updateButtons() {
        var mb = document.getElementById('arcadeMuteBtn');
        if (mb) mb.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
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

    /* ---------- TOUCH D-PAD (opt-in via data-dpad="1") ---------- */
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (wantDpad && isTouch) {
        var dpad = document.createElement('div');
        dpad.className = 'dpad on';
        dpad.innerHTML =
            '<button class="d-up" data-key="ArrowUp">▲</button>' +
            '<button class="d-left" data-key="ArrowLeft">◀</button>' +
            '<button class="d-mid" data-key=" ">⏸</button>' +
            '<button class="d-right" data-key="ArrowRight">▶</button>' +
            '<button class="d-down" data-key="ArrowDown">▼</button>';
        document.body.appendChild(dpad);
        dpad.querySelectorAll('button').forEach(function (b) {
            var key = b.dataset.key;
            var code = key === ' ' ? 'Space' : key;
            function down(e) {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: key, code: code, bubbles: true, cancelable: true }));
            }
            function up(e) {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keyup', { key: key, code: code, bubbles: true, cancelable: true }));
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
            if (paused) { showPause(); Sfx.play('blip'); }
            else if (pOverlay) pOverlay.style.display = 'none';
        }
        document.addEventListener('keydown', function (e) {
            if ((e.key === 'p' || e.key === 'P') && !e.repeat) togglePause();
        });
    }
})();
