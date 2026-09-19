/**
 * app.js - LuckyPick Global main app
 *
 * Loads history (data/powerball.js, data/megamillions.js)
 * Renders UI, manages factors, generates numbers
 */

(function (global) {
  'use strict';

  const Engine = global.LuckyEngine;

  // ============================================================
  // State
  // ============================================================
  const state = {
    game: 'powerball',
    factors: [],
    sets: [],
    history: { powerball: [], megamillions: [] },
    language: 'en',
    saveKey: 'luckyPick.global.v1',
  };

  // ============================================================
  // Data loading
  // ============================================================
  function loadData() {
    if (global.POWERBALL && Array.isArray(global.POWERBALL)) {
      state.history.powerball = normalize(global.POWERBALL);
    }
    if (global.MEGAMILLIONS && Array.isArray(global.MEGAMILLIONS)) {
      state.history.megamillions = normalize(global.MEGAMILLIONS);
    }
  }

  function normalize(arr) {
    return arr.map(d => ({
      date: d.date || d.draw_date || '',
      main: d.main || d.white_balls || [],
      extra: d.extra || (d.powerball != null ? [d.powerball] : d.mega_ball != null ? [d.mega_ball] : d.lucky_stars || []),
    })).filter(d => d.main.length > 0);
  }

  // ============================================================
  // Factor management
  // ============================================================
  function addFactor(f) { state.factors.push(f); renderFactors(); saveState(); }
  function removeFactor(i) { state.factors.splice(i, 1); renderFactors(); saveState(); }

  function generate() {
    const game = state.game;
    const history = state.history[game];
    if (!history || history.length === 0) {
      alert('No historical data available for this game yet.');
      return;
    }
    // 歌词因子：每次 Generate 用 text + 当前时间生成新号码 → 直接覆盖生成结果
    // （不是 bias，是 hard-set——用户输入一段话，就期待看到"对应"的号码）
    let lyricsOverride = null;
    const expandedFactors = [];
    for (const f of state.factors) {
      if (f.type === 'lyrics' && f.data && f.data.text) {
        const fresh = Engine.lyricsToNumbers(f.data.text, game);
        if (fresh.main && fresh.main.length) {
          lyricsOverride = fresh;
        }
      } else {
        expandedFactors.push(f);
      }
    }

    let sets = [];
    try {
      sets = Engine.generate(game, expandedFactors, history, { count: 3, lookback: 50 });
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Failed to generate numbers: ' + err.message);
      return;
    }
    // 歌词因子 hard-override：每个 set 用歌词生成的号码替换
    if (lyricsOverride) {
      sets = sets.map(s => ({
        game: s.game,
        gameName: s.gameName,
        main: lyricsOverride.main.slice(),
        extra: lyricsOverride.extra.slice(),
        extraName: s.extraName,
      }));
    }

    state.sets = sets;
    renderResults();
    renderRecent();
    saveState();
  }

  // ============================================================
  // UI rendering
  // ============================================================
  function $(id) { return document.getElementById(id); }
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') node.className = props[k];
      else if (k === 'style') node.style.cssText = props[k];
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k === 'text') node.textContent = props[k];
      else node.setAttribute(k, props[k]);
    }
    for (const c of children) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    }
    return node;
  }

  function renderFactors() {
    const list = $('factor-list');
    if (!list) return;
    list.innerHTML = '';

    if (state.factors.length === 0) {
      list.appendChild(el('div', { class: 'muted', style: 'font-size:13px; padding:8px 0;', text: 'No factors yet · click buttons below to add' }));
      return;
    }

    state.factors.forEach((f, idx) => {
      const chip = el('span', { class: 'factor-chip ' + (f.type === 'avoid' ? 'avoid' : '') }, [
        el('span', { class: 'icon', text: factorIcon(f.type) }),
        el('span', { text: f.label }),
        el('button', {
          class: 'remove',
          title: 'Remove',
          'data-idx': String(idx),
          onClick: (e) => removeFactor(Number(e.currentTarget.dataset.idx)),
        }, ['×']),
      ]);
      list.appendChild(chip);
    });
  }

  function factorIcon(type) {
    return { lucky: '🍀', avoid: '🚫', date: '📅', zodiac: '♈', dream: '💭', lifepath: '🔢' }[type] || '✨';
  }

  function renderResults() {
    const container = $('results');
    if (!container) return;
    container.innerHTML = '';

    if (state.sets.length === 0) {
      container.appendChild(el('div', { class: 'muted center', text: 'Click the button above to generate your lucky numbers' }));
      return;
    }

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    state.sets.forEach((set, idx) => {
      const card = el('div', { class: 'result-card fade-in' });
      card.appendChild(el('span', { class: 'scheme-tag', text: set.gameName }));
      card.appendChild(el('div', { class: 'meta', text: 'Set ' + (idx + 1) + ' · ' + timeStr }));
      card.appendChild(renderBalls(set));
      // 操作按钮：复制 + 导出图片
      const actions = el('div', { class: 'result-actions' });
      const copyBtn = el('button', {
        class: 'action-btn',
        'data-set-idx': String(idx),
        onClick: (e) => copySetToClipboard(state.sets[Number(e.currentTarget.dataset.setIdx)]),
      }, ['📋 Copy']);
      const exportBtn = el('button', {
        class: 'action-btn',
        'data-set-idx': String(idx),
        onClick: (e) => exportSetAsImage(state.sets[Number(e.currentTarget.dataset.setIdx)]),
      }, ['🖼️ Save image']);
      actions.appendChild(copyBtn);
      actions.appendChild(exportBtn);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function renderBalls(set) {
    const wrap = el('div', { class: 'balls' });
    (set.main || []).forEach(n => wrap.appendChild(el('span', { class: 'ball main', text: String(n).padStart(2, '0') })));
    wrap.appendChild(el('span', { class: 'ball divider', text: '|' }));
    (set.extra || []).forEach(n => wrap.appendChild(el('span', { class: 'ball extra', text: String(n).padStart(2, '0') })));
    return wrap;
  }

  // ============================================================
  // Copy & Export
  // ============================================================
  function formatSetText(set) {
    const main = (set.main || []).map(n => String(n).padStart(2, '0')).join(' - ');
    const extra = (set.extra || []).map(n => String(n).padStart(2, '0')).join(' - ');
    return set.gameName + ' · ' + new Date().toLocaleDateString() + '\n' + main + '\n' + set.extraName + ': ' + extra;
  }

  function copySetToClipboard(set) {
    if (!set) return;
    const text = formatSetText(set);
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
    toast('📋 Copied to clipboard');
  }

  function exportSetAsImage(set) {
    if (!set) return;
    const W = 800, H = 800;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // 背景渐变
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#D97757');
    g.addColorStop(0.5, '#E89775');
    g.addColorStop(1, '#FAF8F5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('LuckyPick', W/2, 90);

    // 游戏名
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(set.gameName, W/2, 150);

    // 日期
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(new Date().toLocaleString(), W/2, 195);

    // 主球
    const ballR = 60;
    const mainY = 380;
    const gap = 110;
    const totalW = (set.main.length - 1) * gap;
    const startX = (W - totalW) / 2 - 40; // 留出彩球空间
    (set.main || []).forEach((n, i) => {
      const x = startX + i * gap;
      // 阴影
      ctx.beginPath();
      ctx.arc(x, mainY + 4, ballR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      // 球
      ctx.beginPath();
      ctx.arc(x, mainY, ballR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      // 数字
      ctx.fillStyle = '#D97757';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n).padStart(2, '0'), x, mainY);
    });

    // 彩球（独立的 Powerball / Mega Ball）
    const pbX = startX + set.main.length * gap;
    if (set.extra && set.extra.length) {
      const en = set.extra[0];
      ctx.beginPath();
      ctx.arc(pbX + 4, mainY + 4, ballR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pbX, mainY, ballR, 0, Math.PI * 2);
      ctx.fillStyle = '#D97757';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(String(en).padStart(2, '0'), pbX, mainY);
    }

    // 分隔符
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(set.extraName, pbX, mainY + ballR + 35);

    // 因子（如有）
    if (state.factors && state.factors.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const labels = state.factors.map(f => f.label).join('  ·  ');
      const maxLabelW = W - 80;
      let display = labels;
      // 简单截断
      while (ctx.measureText(display).width > maxLabelW && display.length > 10) {
        display = display.slice(0, -1);
      }
      if (display.length < labels.length) display = display.slice(0, -1) + '…';
      ctx.fillText(display, W/2, 620);
    }

    // 底部 disclaimer
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'italic 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('For entertainment only · Not affiliated with any lottery operator', W/2, 720);

    // 触发下载
    try {
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'luckypick-' + set.gameName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('🖼️ Image saved');
      }, 'image/png');
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  let _toastTimer = null;
  function toast(msg) {
    let t = document.getElementById('lp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lp-toast';
      t.className = 'lp-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

    function renderRecent() {
    const container = $('freq');
    if (!container) return;
    container.innerHTML = '';
    const game = state.game;
    const history = state.history[game];
    if (!history || history.length === 0) {
      container.appendChild(el('div', { class: 'muted center', text: 'No historical data yet' }));
      return;
    }

    const recent = Engine.recentDraws(history, 10);
    const list = el('div', { class: 'recent-list' });
    recent.forEach(draw => {
      const line = el('div', { class: 'recent-item' }, [
        el('span', { class: 'recent-issue', text: draw.date || '—' }),
        el('div', { class: 'recent-balls' }, [
          ...(draw.main || []).map(n => el('span', { class: 'mini-ball main', text: String(n).padStart(2, '0') })),
          el('span', { class: 'mini-ball divider', text: '|' }),
          ...(draw.extra || []).map(n => el('span', { class: 'mini-ball extra', text: String(n).padStart(2, '0') })),
        ]),
      ]);
      list.appendChild(line);
    });
    container.appendChild(list);

    const meta = el('div', { class: 'meta-note muted', text: 'Showing latest ' + recent.length + ' draws · Source: official lottery websites' });
    container.appendChild(meta);
  }

  // ============================================================
  // Modal for adding factors
  // ============================================================
  function openAddModal(type) {
    const mask = $('modal-mask');
    const modal = $('modal');
    if (!mask || !modal) return;

    let body = '';
    if (type === 'lucky' || type === 'avoid') {
      body = `<label>Numbers (separated by spaces or commas)</label>
              <input type="text" id="modal-input" placeholder="e.g. 7 18 or 7,18" />`;
    } else if (type === 'date') {
      body = `<label>Date</label>
              <input type="date" id="modal-input" value="${new Date().toISOString().slice(0,10)}" />`;
    } else if (type === 'zodiac') {
      const opts = Object.entries(Engine.ZODIAC_NUMBERS)
        .map(([k, v]) => `<option value="${k}">${v.name} (${v.numbers.join(' ')})</option>`)
        .join('');
      body = `<label>Zodiac sign</label>
              <select id="modal-input">${opts}</select>`;
    } else if (type === 'dream') {
      body = `<label>Dream symbols (separated by spaces)</label>
              <input type="text" id="modal-input" placeholder="e.g. water fish cat" />`;
    } else if (type === 'lifepath') {
      body = `<label>Birthday (used for Life Path Number)</label>
              <input type="date" id="modal-input" value="1990-01-01" />`;
    } else if (type === 'lyrics') {
      body = `<label>Lyric / phrase (anything that means something to you right now)</label>
              <textarea id="modal-input" rows="3" placeholder="e.g. hello darkness my old friend&#10;or a sentence, a thought, anything"></textarea>
              <p class="muted small">Tip: same text at a different moment will give different numbers.</p>`;
    }

    modal.innerHTML = `<h3>Add ${title(type)}</h3>${body}
      <div class="actions">
        <button class="cancel" id="modal-cancel">Cancel</button>
        <button class="ok" id="modal-ok">Add</button>
      </div>`;
    mask.classList.add('show');

    $('modal-cancel').onclick = closeModal;
    $('modal-ok').onclick = () => {
      const val = ($('modal-input').value || '').trim();
      let factor = null;
      try {
        if (type === 'lucky') { const ns = parseNums(val); if (!ns.length) return alert('Enter at least one number'); factor = Engine.makeLucky(ns); }
        else if (type === 'avoid') { const ns = parseNums(val); if (!ns.length) return alert('Enter at least one number'); factor = Engine.makeAvoid(ns); }
        else if (type === 'date') factor = Engine.makeDate(val);
        else if (type === 'zodiac') factor = Engine.makeZodiac(val);
        else if (type === 'dream') { const kws = val.split(/\s+/).filter(Boolean); if (!kws.length) return alert('Enter at least one symbol'); factor = Engine.makeDream(kws); }
        else if (type === 'lifepath') factor = Engine.makeLifePath(val);
        else if (type === 'lyrics') { if (!val || val.length < 2) return alert('Type at least 2 characters'); factor = Engine.makeLyrics(val); }
      } catch (e) { return alert('Parse error: ' + e.message); }
      if (factor) { addFactor(factor); closeModal(); }
    };
  }

  function title(type) {
    return {
      lucky: 'Lucky Numbers',
      avoid: 'Avoid Numbers',
      date: 'Date',
      zodiac: 'Zodiac Sign',
      dream: 'Dream Symbol',
      lifepath: 'Life Path Number',
      lyrics: 'Lyric / Phrase'
    }[type] || 'Factor';
  }
  function parseNums(s) {
    return s.split(/[\s,,，]+/).map(x => Number(x.trim())).filter(n => Number.isFinite(n));
  }
  function closeModal() { $('modal-mask').classList.remove('show'); }

  // ============================================================
  // Persistence
  // ============================================================
  function saveState() {
    try {
      localStorage.setItem(state.saveKey, JSON.stringify({
        factors: state.factors.map(f => ({ type: f.type, label: f.label, weight: f.weight, data: f.data })),
        game: state.game,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(state.saveKey);
      if (!s) return;
      const data = JSON.parse(s);
      state.game = data.game || 'powerball';
      if (Array.isArray(data.factors)) {
        state.factors = data.factors.map(rebuildFactor).filter(Boolean);
      }
    } catch (e) {}
  }

  function rebuildFactor(f) {
    try {
      if (f.type === 'lucky') return Engine.makeLucky(f.data, f.weight);
      if (f.type === 'avoid') return Engine.makeAvoid(f.data, f.weight);
      if (f.type === 'date') return Engine.makeDate(f.data.dateStr, f.weight);
      if (f.type === 'zodiac') return Engine.makeZodiac(f.data.zodiac, f.weight);
      if (f.type === 'dream') return Engine.makeDream(f.data.keywords, f.weight);
      if (f.type === 'lifepath') {
        const d = new Date();
        d.setFullYear(Math.floor(f.data.lifePathNumber), 0, 1);
        return Engine.makeLifePath(d, f.weight);
      }
      if (f.type === 'lyrics') return Engine.makeLyrics(f.data.text, f.weight);
    } catch (e) { return null; }
    return null;
  }

  function updateDebug() {
    const c = $('debug-content');
    if (!c) return;
    const game = state.game;
    const hist = state.history[game] || [];
    const last = hist[hist.length - 1];
    c.innerHTML = '';
    function row(k, v, cls) {
      c.appendChild(el('div', { class: 'row' }, [
        el('span', { class: 'key', text: k }),
        el('span', { class: 'val' + (cls ? ' ' + cls : ''), text: v }),
      ]));
    }
    row(state.game + ' data', hist.length + ' draws' + (hist.length ? ' ✓' : ' ✗'), hist.length ? 'ok' : 'bad');
    row('Current game', state.game);
    row('Factors', state.factors.length);
    row('Last draw', last ? (last.date || '—') : 'none');
    row('Save key', state.saveKey);
    row('PayPal tip', 'paypal.me/hinewly');
  }

  // ============================================================
  // Init
  // ============================================================

  // ============================================================
  // Update indicator
  // ============================================================
  function updateLastUpdate() {
    const el = document.getElementById('last-update');
    if (!el) return;
    const hist = state.history[state.game] || [];
    if (hist.length > 0) {
      // 数据文件是 [最新, ..., 最旧]，所以第一个元素就是最新
      const latest = hist[0];
      el.textContent = '📅 Last update: ' + (latest.date || 'unknown');
    } else {
      el.textContent = 'No data';
    }
  }

  async function refreshData() {
    const btn = document.getElementById('refresh-data-btn');
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = '⏳ Refreshing...';
    btn.disabled = true;
    try {
      // 清掉 SW 缓存
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.startsWith('lucky-pick-global-')) await caches.delete(k);
        }
      }
      // 强制 reload（带 cache-bust）
      location.reload(true);
    } catch (e) {
      alert('Refresh failed: ' + e.message);
      btn.textContent = original;
      btn.disabled = false;
    }
  }

  // SW 注册 & 更新检测
  let refreshing = false;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本可用
              showUpdateToast();
            }
          });
        });
      })
      .catch(err => console.warn('[LuckyPick] SW failed:', err));

    // 监听 controllerchange（新 SW 接管）
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  function showUpdateToast() {
    const toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = '🎉 New version available! <button id="toast-refresh">Refresh</button>';
    document.body.appendChild(toast);
    document.getElementById('toast-refresh').onclick = () => location.reload(true);
    setTimeout(() => toast.classList.add('show'), 100);
  }

  function init() {
    loadData();
    loadState();
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const g = tab.dataset.game;
        if (g && Engine.GAMES[g]) {
          state.game = g;
          document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.game === g));
          renderFactors(); renderResults(); renderRecent(); saveState(); updateDebug();
        }
      });
    });
    document.querySelectorAll('[data-add-factor]').forEach(btn => {
      btn.addEventListener('click', () => openAddModal(btn.dataset.addFactor));
    });
    const genBtn = $('btn-generate');
    if (genBtn) genBtn.addEventListener('click', generate);
    const mask = $('modal-mask');
    if (mask) mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.game === state.game));
    renderFactors(); renderResults(); renderRecent(); updateDebug();
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      updateLastUpdate();
      updateDebug();
    }));
    updateLastUpdate();
    updateDebug();

    // Refresh data 按钮
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshData);

    console.log('[LuckyPick Global] ready', { powerball: state.history.powerball.length, megamillions: state.history.megamillions.length });
  }

  // 把新代码插入到 init() 之前


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.LuckyApp = { state, addFactor, removeFactor, generate };

})(typeof window !== 'undefined' ? window : globalThis);
