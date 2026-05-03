/**
 * MathShield — Drop-in Human Verification Widget v2.0
 * Supports: visible, invisible, dark/light themes, AIS display, retry logic
 */
(function (window, document) {
  'use strict';

  const VERSION = '2.0.0';
  const API_BASE = (window.MathShieldConfig && window.MathShieldConfig.apiBase) || 'http://localhost:3000/api';

  /* ─────────────────────────── CSS ─────────────────────────── */
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root{--ms-accent:#6c63ff;--ms-accent2:#48cfad;--ms-bg:#ffffff;--ms-surface:#f8f9fc;--ms-border:#e2e8f0;--ms-text:#1a202c;--ms-muted:#718096;--ms-success:#38a169;--ms-error:#e53e3e;--ms-warn:#dd6b20;--ms-radius:16px;--ms-shadow:0 20px 60px rgba(0,0,0,.15),0 4px 16px rgba(108,99,255,.12);}
    .ms-dark{--ms-bg:#0f0f1a;--ms-surface:#1a1a2e;--ms-border:#2d2d4e;--ms-text:#e2e8f0;--ms-muted:#a0aec0;}
    .ms-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:center;justify-content:center;animation:ms-fade-in .25s ease;}
    .ms-widget{background:var(--ms-bg);border-radius:var(--ms-radius);box-shadow:var(--ms-shadow);width:min(420px,94vw);font-family:'Inter',system-ui,sans-serif;color:var(--ms-text);overflow:hidden;animation:ms-slide-up .3s cubic-bezier(.34,1.56,.64,1);}
    .ms-header{background:linear-gradient(135deg,var(--ms-accent),#9b59b6);padding:20px 24px;display:flex;align-items:center;gap:12px;}
    .ms-header-icon{font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));}
    .ms-header-title{color:#fff;font-weight:700;font-size:17px;letter-spacing:-.01em;}
    .ms-header-sub{color:rgba(255,255,255,.75);font-size:12px;margin-top:2px;}
    .ms-body{padding:24px;}
    .ms-loading{text-align:center;padding:30px 0;}
    .ms-spinner{width:36px;height:36px;border:3px solid var(--ms-border);border-top-color:var(--ms-accent);border-radius:50%;animation:ms-spin 1s linear infinite;margin:0 auto 14px;}
    .ms-loading p{color:var(--ms-muted);font-size:14px;}
    .ms-question-box{background:var(--ms-surface);border:1px solid var(--ms-border);border-left:4px solid var(--ms-accent);border-radius:10px;padding:16px 18px;font-size:15px;font-weight:500;margin-bottom:16px;line-height:1.5;}
    .ms-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:12px;}
    .ms-badge.easy{background:#e6fffa;color:#285e61;}.ms-badge.medium{background:#fffbeb;color:#744210;}.ms-badge.hard{background:#fff5f5;color:#742a2a;}
    .ms-dark .ms-badge.easy{background:#1c4532;color:#9ae6b4;}.ms-dark .ms-badge.medium{background:#3d2f00;color:#f6e05e;}.ms-dark .ms-badge.hard{background:#3d1515;color:#feb2b2;}
    .ms-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
    .ms-option-btn{padding:11px 14px;border:1.5px solid var(--ms-border);border-radius:8px;background:var(--ms-bg);color:var(--ms-text);font-size:14px;font-weight:500;cursor:pointer;transition:all .18s;text-align:center;}
    .ms-option-btn:hover{border-color:var(--ms-accent);background:var(--ms-surface);transform:translateY(-1px);}
    .ms-option-btn.selected{border-color:var(--ms-accent);background:var(--ms-accent);color:#fff;}
    .ms-input-row{display:flex;gap:8px;}
    .ms-input{flex:1;padding:12px 14px;border:1.5px solid var(--ms-border);border-radius:8px;font-size:15px;font-family:inherit;background:var(--ms-bg);color:var(--ms-text);outline:none;transition:border-color .18s;}
    .ms-input:focus{border-color:var(--ms-accent);}
    .ms-dark .ms-input{background:var(--ms-surface);}
    .ms-submit-btn{padding:12px 20px;background:var(--ms-accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap;}
    .ms-submit-btn:hover:not(:disabled){background:#5a52d5;transform:translateY(-1px);}
    .ms-submit-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .ms-timer{height:4px;background:var(--ms-border);border-radius:2px;margin-top:14px;overflow:hidden;}
    .ms-timer-bar{height:100%;background:linear-gradient(90deg,var(--ms-accent),var(--ms-accent2));border-radius:2px;transition:width .5s linear;width:100%;}
    .ms-result{text-align:center;padding:10px 0 8px;}
    .ms-result-icon{font-size:52px;margin-bottom:10px;animation:ms-pop .35s cubic-bezier(.34,1.56,.64,1);}
    .ms-result-title{font-size:18px;font-weight:700;margin-bottom:6px;}
    .ms-result-msg{font-size:13px;color:var(--ms-muted);margin-bottom:16px;}
    .ms-ais-card{background:var(--ms-surface);border:1px solid var(--ms-border);border-radius:12px;padding:16px;text-align:left;margin-bottom:12px;}
    .ms-ais-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ms-muted);margin-bottom:12px;}
    .ms-ais-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
    .ms-ais-label{font-size:13px;color:var(--ms-muted);}
    .ms-ais-val{font-size:14px;font-weight:700;}
    .ms-ais-bar-wrap{width:100%;height:6px;background:var(--ms-border);border-radius:3px;margin-top:3px;overflow:hidden;}
    .ms-ais-bar{height:100%;border-radius:3px;transition:width .6s ease;}
    .ms-retry-btn{width:100%;padding:10px;background:transparent;border:1.5px solid var(--ms-accent);color:var(--ms-accent);border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s;}
    .ms-retry-btn:hover{background:var(--ms-accent);color:#fff;}
    .ms-footer{border-top:1px solid var(--ms-border);padding:10px 24px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ms-muted);}
    .ms-footer a{color:var(--ms-accent);text-decoration:none;font-weight:600;}
    @keyframes ms-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes ms-slide-up{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes ms-spin{to{transform:rotate(360deg)}}
    @keyframes ms-pop{0%{transform:scale(.5)}80%{transform:scale(1.1)}100%{transform:scale(1)}}
  `;

  /* ─────────────────────────── BehaviorTracker ─────────────────────────── */
  class BehaviorTracker {
    constructor() { this.reset(); }
    reset() {
      this.mouseMovements = []; this.clickTiming = []; this.focusEvents = [];
      this.keystrokes = []; this.typingStartTime = null; this.isTracking = false;
    }
    start() {
      if (this.isTracking) return;
      this.isTracking = true;
      this._mouse = (e) => this.mouseMovements.push({ x: e.clientX, y: e.clientY, timestamp: Date.now(), duration: 0 });
      this._click = (e) => {
        const now = Date.now();
        const delay = this.clickTiming.length ? now - this.clickTiming[this.clickTiming.length - 1].timestamp : 0;
        this.clickTiming.push({ timestamp: now, target: e.target.tagName, delay });
      };
      this._focus = (e) => this.focusEvents.push({ type: 'focus', timestamp: Date.now(), element: e.target.tagName });
      this._blur = (e) => this.focusEvents.push({ type: 'blur', timestamp: Date.now(), element: e.target.tagName });
      document.addEventListener('mousemove', this._mouse);
      document.addEventListener('click', this._click);
      document.addEventListener('focus', this._focus, true);
      document.addEventListener('blur', this._blur, true);
    }
    trackTyping(input) {
      this.typingStartTime = Date.now(); this.keystrokes = [];
      this._keydown = (e) => {
        const now = Date.now();
        const delay = this.keystrokes.length ? now - this.keystrokes[this.keystrokes.length - 1].timestamp : 0;
        this.keystrokes.push({ key: e.key, timestamp: now, delay });
      };
      input.addEventListener('keydown', this._keydown);
    }
    stop() {
      if (!this.isTracking) return;
      this.isTracking = false;
      // calc durations
      for (let i = 1; i < this.mouseMovements.length; i++)
        this.mouseMovements[i].duration = this.mouseMovements[i].timestamp - this.mouseMovements[i - 1].timestamp;
      document.removeEventListener('mousemove', this._mouse);
      document.removeEventListener('click', this._click);
      document.removeEventListener('focus', this._focus, true);
      document.removeEventListener('blur', this._blur, true);
    }
    getData() {
      const typingPattern = this.keystrokes.length > 2 ? {
        keystrokes: this.keystrokes,
        averageSpeed: this.typingStartTime ? (Date.now() - this.typingStartTime) / this.keystrokes.length : 200,
        corrections: this.keystrokes.filter(k => k.key === 'Backspace').length,
      } : null;
      return { mouseMovements: this.mouseMovements, clickTiming: this.clickTiming, typingPattern, focusEvents: this.focusEvents };
    }
  }

  /* ─────────────────────────── HumanShield ─────────────────────────── */
  class HumanShield {
    constructor(opts = {}) {
      this.opts = { apiKey: 'demo-key', theme: 'light', invisible: false, onVerified: null, onError: null, container: null, ...opts };
      this.challenge = null; this.startTime = null; this.timerInterval = null;
      this.overlay = null; this.widget = null; this.behaviorTracker = new BehaviorTracker();
      this._injectStyles();
    }

    _injectStyles() {
      if (document.getElementById('ms-styles')) return;
      const s = document.createElement('style'); s.id = 'ms-styles'; s.textContent = CSS;
      document.head.appendChild(s);
    }

    /* ── Public API ── */
    init() { if (this.opts.invisible) this.behaviorTracker.start(); }

    async start() {
      this._buildUI();
      this.behaviorTracker.start();
      await this._fetchChallenge();
    }

    close() {
      this.behaviorTracker.stop();
      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    }

    reset() {
      this.close();
      this.challenge = null; this.startTime = null;
      this.behaviorTracker.reset();
    }

    /* ── UI Builder ── */
    _buildUI() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'ms-overlay';
      this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });

      this.widget = document.createElement('div');
      this.widget.className = `ms-widget${this.opts.theme === 'dark' ? ' ms-dark' : ''}`;
      this.widget.innerHTML = `
        <div class="ms-header">
          <div class="ms-header-icon">🛡️</div>
          <div><div class="ms-header-title">MathShield Verification</div><div class="ms-header-sub">Powered by Adaptive Intelligence</div></div>
        </div>
        <div class="ms-body" id="ms-body">
          <div class="ms-loading" id="ms-loading">
            <div class="ms-spinner"></div><p>Generating challenge…</p>
          </div>
          <div id="ms-challenge" style="display:none"></div>
          <div id="ms-result" style="display:none"></div>
        </div>
        <div class="ms-footer"><span>MathShield v${VERSION}</span><a href="#" target="_blank">Docs ↗</a></div>`;

      this.overlay.appendChild(this.widget);
      document.body.appendChild(this.overlay);
    }

    /* ── Challenge Fetch ── */
    async _fetchChallenge() {
      try {
        const res = await fetch(`${API_BASE}/challenge/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.opts.apiKey}` },
          body: JSON.stringify({ riskScore: 30 }),
        });
        if (!res.ok) throw new Error('Failed to generate challenge');
        this.challenge = await res.json();
        this.startTime = Date.now();
        this._renderChallenge();
      } catch (err) {
        this._renderError(err.message);
        this.opts.onError?.(err);
      }
    }

    /* ── Render Challenge ── */
    _renderChallenge() {
      const c = this.challenge;
      const loading = this.widget.querySelector('#ms-loading');
      const container = this.widget.querySelector('#ms-challenge');
      loading.style.display = 'none';

      const diff = c.difficulty || 'easy';
      const diffLabel = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' }[diff] || diff;

      container.innerHTML = `
        <span class="ms-badge ${diff}">${diffLabel} · ${c.type || 'math'}</span>
        <div class="ms-question-box">${c.question}</div>
        <div id="ms-options"></div>
        <div class="ms-input-row" id="ms-input-row" style="display:none">
          <input class="ms-input" id="ms-answer-input" type="text" placeholder="Your answer…" autocomplete="off"/>
          <button class="ms-submit-btn" id="ms-submit">Verify</button>
        </div>
        <div class="ms-timer"><div class="ms-timer-bar" id="ms-timer-bar"></div></div>`;

      if (c.options && c.options.length) {
        const optGrid = container.querySelector('#ms-options');
        c.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'ms-option-btn'; btn.textContent = opt;
          btn.addEventListener('click', () => {
            optGrid.querySelectorAll('.ms-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            setTimeout(() => this._submit(opt), 300);
          });
          optGrid.appendChild(btn);
        });
      } else {
        container.querySelector('#ms-input-row').style.display = 'flex';
        const input = container.querySelector('#ms-answer-input');
        this.behaviorTracker.trackTyping(input);
        input.focus();
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._submit(input.value); });
        container.querySelector('#ms-submit').addEventListener('click', () => this._submit(input.value));
      }

      container.style.display = 'block';
      this._startTimer(c.timeLimit || 60);
    }

    /* ── Timer ── */
    _startTimer(seconds) {
      const bar = this.widget.querySelector('#ms-timer-bar');
      const start = Date.now();
      const end = start + seconds * 1000;
      this.timerInterval = setInterval(() => {
        const remaining = Math.max(0, end - Date.now());
        const pct = (remaining / (seconds * 1000)) * 100;
        bar.style.width = pct + '%';
        bar.style.background = pct > 50 ? 'linear-gradient(90deg,#6c63ff,#48cfad)' : pct > 20 ? 'linear-gradient(90deg,#dd6b20,#f6e05e)' : '#e53e3e';
        if (remaining === 0) { clearInterval(this.timerInterval); this._renderError('Time\'s up! Please try again.'); }
      }, 500);
    }

    /* ── Submit ── */
    async _submit(answer) {
      if (!answer || !answer.toString().trim()) return;
      clearInterval(this.timerInterval);
      const submitBtn = this.widget.querySelector('#ms-submit');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const timeTaken = Date.now() - this.startTime;
        const behaviorData = this.behaviorTracker.getData();
        const res = await fetch(`${API_BASE}/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.opts.apiKey}` },
          body: JSON.stringify({ challengeId: this.challenge.id, answer: answer.toString().trim(), timeTaken, behaviorData }),
        });
        if (!res.ok) throw new Error('Verification failed');
        const result = await res.json();
        this._renderResult(result);
        this.opts.onVerified?.(result);
      } catch (err) {
        this._renderError(err.message);
        this.opts.onError?.(err);
      }
    }

    /* ── Result ── */
    _renderResult(r) {
      this.widget.querySelector('#ms-challenge').style.display = 'none';
      const resultEl = this.widget.querySelector('#ms-result');
      const ais = r.adaptiveIntelligenceScore || {};
      const scoreColor = (v) => v >= 75 ? '#38a169' : v >= 50 ? '#dd6b20' : '#e53e3e';

      resultEl.innerHTML = `
        <div class="ms-result">
          <div class="ms-result-icon">${r.success ? '✅' : '❌'}</div>
          <div class="ms-result-title">${r.success ? 'Verification Passed!' : 'Verification Failed'}</div>
          <div class="ms-result-msg">${r.reasoning?.[0] || (r.success ? 'You\'re human.' : 'Please try again.')}</div>
          ${r.success ? `
          <div class="ms-ais-card">
            <div class="ms-ais-title">🧠 Adaptive Intelligence Score</div>
            <div class="ms-ais-row"><span class="ms-ais-label">Intelligence</span><span class="ms-ais-val" style="color:${scoreColor(r.intelligenceScore)}">${r.intelligenceScore}/100</span></div>
            <div class="ms-ais-bar-wrap"><div class="ms-ais-bar" style="width:${r.intelligenceScore}%;background:${scoreColor(r.intelligenceScore)}"></div></div>
            <div style="margin-top:10px"></div>
            <div class="ms-ais-row"><span class="ms-ais-label">Confidence</span><span class="ms-ais-val" style="color:${scoreColor(r.confidence)}">${r.confidence}%</span></div>
            <div class="ms-ais-bar-wrap"><div class="ms-ais-bar" style="width:${r.confidence}%;background:${scoreColor(r.confidence)}"></div></div>
            <div style="margin-top:10px"></div>
            <div class="ms-ais-row"><span class="ms-ais-label">Risk Level</span><span class="ms-ais-val">${r.riskLevel?.toUpperCase() || 'LOW'}</span></div>
            ${ais.expiresAt ? `<div style="font-size:11px;color:var(--ms-muted);margin-top:8px">Token valid until ${new Date(ais.expiresAt).toLocaleTimeString()}</div>` : ''}
          </div>` : ''}
          ${!r.success ? `<button class="ms-retry-btn" id="ms-retry">Try Again</button>` : ''}
        </div>`;

      resultEl.style.display = 'block';
      const retryBtn = resultEl.querySelector('#ms-retry');
      if (retryBtn) retryBtn.addEventListener('click', () => { this.reset(); this.start(); });
      if (r.success) setTimeout(() => this.close(), 4000);
    }

    _renderError(msg) {
      const loading = this.widget?.querySelector('#ms-loading');
      const challenge = this.widget?.querySelector('#ms-challenge');
      const result = this.widget?.querySelector('#ms-result');
      if (loading) loading.style.display = 'none';
      if (challenge) challenge.style.display = 'none';
      if (result) {
        result.innerHTML = `<div class="ms-result">
          <div class="ms-result-icon">⚠️</div>
          <div class="ms-result-title">Something went wrong</div>
          <div class="ms-result-msg">${msg}</div>
          <button class="ms-retry-btn" id="ms-retry">Retry</button>
        </div>`;
        result.style.display = 'block';
        result.querySelector('#ms-retry')?.addEventListener('click', () => { this.reset(); this.start(); });
      }
    }
  }

  /* ─── Global export ─── */
  window.HumanShield = HumanShield;

  // Auto-initialize via data attributes
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-mathshield]').forEach(el => {
      const shield = new HumanShield({
        apiKey: el.getAttribute('data-api-key') || 'demo-key',
        theme: el.getAttribute('data-theme') || 'light',
        invisible: el.getAttribute('data-invisible') === 'true',
      });
      shield.init();
      el.addEventListener('click', () => shield.start());
    });
  });

})(window, document);
