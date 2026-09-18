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
    let sets = [];
    try {
      sets = Engine.generate(game, state.factors, history, { count: 3, lookback: 50 });
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Failed to generate numbers: ' + err.message);
      return;
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
      } catch (e) { return alert('Parse error: ' + e.message); }
      if (factor) { addFactor(factor); closeModal(); }
    };
  }

  function title(type) {
    return { lucky: 'Lucky Numbers', avoid: 'Avoid Numbers', date: 'Date', zodiac: 'Zodiac Sign', dream: 'Dream Symbol', lifepath: 'Life Path Number' }[type] || 'Factor';
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
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', updateDebug));

    console.log('[LuckyPick Global] ready', { powerball: state.history.powerball.length, megamillions: state.history.megamillions.length });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.LuckyApp = { state, addFactor, removeFactor, generate };

})(typeof window !== 'undefined' ? window : globalThis);
