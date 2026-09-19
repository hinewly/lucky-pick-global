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
    setCount: 3,  // 用户可调: 1 / 3 / 5
    // === Saved Library + Daily Limit ===
    saved: [],            // [{id, game, gameName, main, extra, extraName, factors:[labels], savedAt}]
    savesToday: 0,        // 今天保存次数
    savesDate: '',        // YYYY-MM-DD (北京时间)，用于跨天重置
    gensToday: 0,         // 今天生成次数
    gensDate: '',         // YYYY-MM-DD (北京时间)，用于跨天重置
    isPro: false,         // 付费状态（占位，未来接 StoreKit / Paddle）
    devMode: false,       // 开发者模式：绕过所有限制（你作为开发者用）
    savedKey: 'luckyPick.saved.v1',
    saveLimitKey: 'luckyPick.savelimit.v1',
    genLimitKey: 'luckyPick.genlimit.v1',
  };
  const FREE_SAVE_LIMIT = 3;   // 每天免费保存次数
  const FREE_GEN_LIMIT = 5;    // 每天免费生成次数
  // 北京时间今日 (YYYY-MM-DD)
  function beijingToday() {
    const d = new Date();
    // 北京时间 = UTC+8
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const beijing = new Date(utcMs + 8 * 3600 * 1000);
    return beijing.toISOString().slice(0, 10);
  }

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
    // 检查生成限额（devMode / Pro 用户跳过）
    const status = genLimitStatus();
    if (!status.canGen) {
      showUpgradeModal('You\'ve used all ' + FREE_GEN_LIMIT + ' free Generations today.\n\nEach Generate gives you fresh numbers for the next drawing.\n\nUpgrade to Pro for unlimited Generations and Saves.\n\n(Coming to App Store soon — leave your email for early access?)');
      return;
    }

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
      sets = Engine.generate(game, expandedFactors, history, { count: state.setCount, lookback: 50 });
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

    // 生成成功：扣一次（devMode / Pro 跳过）
    if (!state.isPro && !state.devMode) {
      state.gensToday++;
      saveGenLimit();
    }

    state.sets = sets;
    renderResults();
    renderGenCounter();
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

    // 顶部全局工具栏（仅当有结果时显示）
    const toolbar = el('div', { class: 'result-toolbar' });
    const copyAllBtn = el('button', { class: 'toolbar-btn primary', onClick: () => copyAllToClipboard() }, ['📋 Copy all']);
    const saveAllBtn = el('button', { class: 'toolbar-btn primary', onClick: () => exportAllAsImage() }, ['🖼️ Save all as image']);
    toolbar.appendChild(copyAllBtn);
    toolbar.appendChild(saveAllBtn);

    // 组数切换
    const countWrap = el('div', { class: 'set-count-wrap' });
    countWrap.appendChild(el('span', { class: 'set-count-label', text: 'Sets:' }));
    [1, 3, 5].forEach(n => {
      const c = el('button', {
        class: 'set-count-btn' + (state.setCount === n ? ' active' : ''),
        onClick: () => { state.setCount = n; saveState(); renderResults(); },
      }, [String(n)]);
      countWrap.appendChild(c);
    });
    toolbar.appendChild(countWrap);
    container.appendChild(toolbar);

    state.sets.forEach((set, idx) => {
      const card = el('div', { class: 'result-card fade-in' });
      card.appendChild(el('span', { class: 'scheme-tag', text: set.gameName }));
      card.appendChild(el('div', { class: 'meta', text: 'Set ' + (idx + 1) + ' · ' + timeStr }));
      card.appendChild(renderBalls(set));
      // 操作按钮：复制 + 导出图片 + 保存到历史库
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
      // 检查是否已经保存过这组（用 main+extra+game 作为 key）
      const sig = set.game + ':' + (set.main || []).join(',') + ':' + (set.extra || []).join(',');
      const alreadySaved = (state.saved || []).some(x => (x.game + ':' + (x.main || []).join(',') + ':' + (x.extra || []).join(',')) === sig);
      const saveBtn = el('button', {
        class: 'action-btn' + (alreadySaved ? ' success' : ''),
        'data-set-idx': String(idx),
        onClick: (e) => saveSetToLibrary(state.sets[Number(e.currentTarget.dataset.setIdx)]),
      }, [alreadySaved ? '✓ Saved' : '💾 Save']);
      actions.appendChild(copyBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(saveBtn);
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
  function formatSetsText(sets) {
    if (!sets || !sets.length) return '';
    const game = sets[0].gameName;
    const date = new Date().toLocaleDateString();
    const lines = [game + ' · ' + date + ' · ' + sets.length + ' sets'];
    sets.forEach((s, i) => {
      const main = (s.main || []).map(n => String(n).padStart(2, '0')).join(' - ');
      const extra = (s.extra || []).map(n => String(n).padStart(2, '0')).join(' - ');
      lines.push('');
      lines.push('Set ' + (i + 1) + ':');
      lines.push(main);
      lines.push(s.extraName + ': ' + extra);
    });
    return lines.join('\n');
  }

  function copyAllToClipboard() {
    if (!state.sets || !state.sets.length) return;
    const text = formatSetsText(state.sets);
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
    toast('📋 ' + state.sets.length + ' sets copied to clipboard');
  }

  // 保留旧的 per-set 复制（兼容 per-set 按钮）
  function copySetToClipboard(set) {
    if (!set) return;
    const text = formatSetsText([set]);
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

  function exportAllAsImage() {
    if (!state.sets || !state.sets.length) return;
    return exportSetsAsImage(state.sets);
  }

  function exportSetAsImage(set) {
    return exportSetsAsImage([set]);
  }

  function exportSetsAsImage(sets) {
    if (!sets || !sets.length) return;
    const isMulti = sets.length > 1;
    const W = 800;
    const H = isMulti ? (300 + sets.length * 220) : 800;
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
    ctx.fillText('LuckyPick', W/2, isMulti ? 70 : 90);

    // 游戏名
    ctx.font = 'bold ' + (isMulti ? 30 : 38) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(sets[0].gameName + (isMulti ? ' · ' + sets.length + ' sets' : ''), W/2, isMulti ? 115 : 150);

    // 日期
    ctx.font = (isMulti ? 18 : 24) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(new Date().toLocaleString(), W/2, isMulti ? 150 : 195);

    // 每个 set 一行（多 set）或居中大图（单 set）
    if (isMulti) {
      drawMultiSetBalls(ctx, sets, W, H);
    } else {
      drawSingleSetBalls(ctx, sets[0], W, H);
    }

    // 底部 disclaimer
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'italic ' + (isMulti ? 14 : 18) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('For entertainment only · Not affiliated with any lottery operator', W/2, H - 30);

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
        toast('🖼️ ' + sets.length + (sets.length > 1 ? ' sets' : ' set') + ' saved as image');
      }, 'image/png');
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  function drawSingleSetBalls(ctx, set, W, H) {
    const ballR = 60;
    const mainY = 380;
    const gap = 110;
    const totalW = (set.main.length - 1) * gap;
    const startX = (W - totalW) / 2 - 40;
    (set.main || []).forEach((n, i) => {
      const x = startX + i * gap;
      ctx.beginPath();
      ctx.arc(x, mainY + 4, ballR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, mainY, ballR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.fillStyle = '#D97757';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n).padStart(2, '0'), x, mainY);
    });
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
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(set.extraName, pbX, mainY + ballR + 35);

    // 因子
    if (state.factors && state.factors.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const labels = state.factors.map(f => f.label).join('  ·  ');
      const maxLabelW = W - 80;
      let display = labels;
      while (ctx.measureText(display).width > maxLabelW && display.length > 10) {
        display = display.slice(0, -1);
      }
      if (display.length < labels.length) display = display.slice(0, -1) + '…';
      ctx.fillText(display, W/2, 620);
    }
  }

  function drawMultiSetBalls(ctx, sets, W, H) {
    const ballR = 36;
    const gap = 70;
    const startY = 200;
    const rowH = 220;
    sets.forEach((set, idx) => {
      const y = startY + idx * rowH + ballR;
      const totalW = (set.main.length - 1) * gap;
      const startX = (W - totalW) / 2 - 30;
      // 行标签
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Set ' + (idx + 1), 30, y + 8);
      ctx.textAlign = 'center';

      (set.main || []).forEach((n, i) => {
        const x = startX + i * gap;
        ctx.beginPath();
        ctx.arc(x, y + 3, ballR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, ballR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.fillStyle = '#D97757';
        ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n).padStart(2, '0'), x, y);
      });
      const pbX = startX + set.main.length * gap;
      if (set.extra && set.extra.length) {
        const en = set.extra[0];
        ctx.beginPath();
        ctx.arc(pbX, y, ballR, 0, Math.PI * 2);
        ctx.fillStyle = '#D97757';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(String(en).padStart(2, '0'), pbX, y);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(set.extraName, pbX, y + ballR + 18);
      }
    });

    // 因子（多 set 时只显示一次在底部）
    if (state.factors && state.factors.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const labels = state.factors.map(f => f.label).join('  ·  ');
      const maxLabelW = W - 80;
      let display = labels;
      while (ctx.measureText(display).width > maxLabelW && display.length > 10) {
        display = display.slice(0, -1);
      }
      if (display.length < labels.length) display = display.slice(0, -1) + '…';
      ctx.fillText(display, W/2, H - 55);
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

    // ============================================================
  // Save to Library + Daily Limit
  // ============================================================
  function ensureDateRollover() {
    // 一次性 rollover save + gen（避免两个几乎一样的函数）
    const today = beijingToday();
    if (state.savesDate !== today) {
      state.savesDate = today;
      state.savesToday = 0;
      saveLimit();
    }
    if (state.gensDate !== today) {
      state.gensDate = today;
      state.gensToday = 0;
      saveGenLimit();
    }
  }

  function saveLimit() {
    try {
      localStorage.setItem(state.saveLimitKey, JSON.stringify({
        date: state.savesDate,
        count: state.savesToday,
      }));
    } catch (e) {}
  }

  function saveGenLimit() {
    try {
      localStorage.setItem(state.genLimitKey, JSON.stringify({
        date: state.gensDate,
        count: state.gensToday,
      }));
    } catch (e) {}
  }

  function loadGenLimit() {
    try {
      const s = localStorage.getItem(state.genLimitKey);
      if (!s) return;
      const data = JSON.parse(s);
      state.gensDate = data.date || '';
      state.gensToday = Number(data.count) || 0;
    } catch (e) {}
  }

  function loadDevMode() {
    try {
      state.devMode = localStorage.getItem('luckyPick.devMode') === '1';
    } catch (e) { state.devMode = false; }
  }

  // 隐藏的开发者快捷入口：通过 URL 切换 dev mode
  // 方式 1 (hash)：  https://.../#/super       → 开   (有些浏览器会自动剥)
  // 方式 2 (query)：https://.../?dev=1        → 开   (更稳)
  // 方式 1 (hash)：  https://.../#/super-off  → 关
  // 方式 2 (query)：https://.../?dev=0        → 关
  // 只在客户端生效，不发服务器请求，其他用户不会知道
  function checkDevModeShortcut() {
    let changed = false;
    const hash = (location.hash || '').toLowerCase();
    let cleanHash = hash;
    let cleanSearch = location.search;

    // 方式 1: hash routing
    if (hash === '#/super' || hash === '#/super-on') {
      try { localStorage.setItem('luckyPick.devMode', '1'); } catch (e) {}
      state.devMode = true;
      cleanHash = '';
      changed = true;
    } else if (hash === '#/super-off') {
      try { localStorage.removeItem('luckyPick.devMode'); } catch (e) {}
      state.devMode = false;
      cleanHash = '';
      changed = true;
    }

    // 方式 2: query string (?dev=1 / ?dev=0)
    // 用 URLSearchParams 解析，能正确处理 ?dev=1&other=2 这种
    try {
      const params = new URLSearchParams(location.search);
      const dev = params.get('dev');
      if (dev === '1') {
        try { localStorage.setItem('luckyPick.devMode', '1'); } catch (e) {}
        state.devMode = true;
        params.delete('dev');
        changed = true;
      } else if (dev === '0') {
        try { localStorage.removeItem('luckyPick.devMode'); } catch (e) {}
        state.devMode = false;
        params.delete('dev');
        changed = true;
      }
      const qs = params.toString();
      cleanSearch = qs ? '?' + qs : '';
    } catch (e) { /* URLSearchParams 不可用，忽略 */ }

    if (changed) {
      // 清掉 hash 和 query 里 dev=*，URL 变干净
      try {
        const newUrl = location.pathname + cleanSearch + cleanHash;
        history.replaceState(null, '', newUrl);
      } catch (e) {}
      return true;
    }
    return false;
  }

  function genLimitStatus() {
    if (state.isPro || state.devMode) return { canGen: true, remaining: 999, isPro: state.isPro, devMode: state.devMode };
    ensureGenRollover();
    const remaining = Math.max(0, FREE_GEN_LIMIT - state.gensToday);
    return { canGen: remaining > 0, remaining, isPro: false };
  }

  function ensureGenRollover() {
    const today = beijingToday();
    if (state.gensDate !== today) {
      state.gensDate = today;
      state.gensToday = 0;
      saveGenLimit();
    }
  }

  function loadSaveLimit() {
    try {
      const s = localStorage.getItem(state.saveLimitKey);
      if (!s) return;
      const data = JSON.parse(s);
      state.savesDate = data.date || '';
      state.savesToday = Number(data.count) || 0;
    } catch (e) {}
  }

  function loadSaved() {
    try {
      const s = localStorage.getItem(state.savedKey);
      if (s) state.saved = JSON.parse(s);
    } catch (e) { state.saved = []; }
  }

  function persistSaved() {
    try {
      localStorage.setItem(state.savedKey, JSON.stringify(state.saved));
    } catch (e) {}
  }

  function saveLimitStatus() {
    if (state.isPro || state.devMode) return { canSave: true, remaining: 999, isPro: state.isPro, devMode: state.devMode };
    ensureDateRollover();
    const remaining = Math.max(0, FREE_SAVE_LIMIT - state.savesToday);
    return { canSave: remaining > 0, remaining, isPro: false };
  }

  function saveSetToLibrary(set) {
    if (!set) return;
    const status = saveLimitStatus();
    if (!status.canSave) {
      showUpgradeModal('You\'ve used all ' + FREE_DAILY_LIMIT + ' free saves today.\n\nUpgrade to Pro for unlimited saves and history across all your devices.\n\n(Coming to App Store soon — leave your email for early access?)');
      return;
    }
    const id = 'sv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const factorLabels = (state.factors || []).map(f => f.label);
    const item = {
      id,
      game: set.game,
      gameName: set.gameName,
      main: (set.main || []).slice(),
      extra: (set.extra || []).slice(),
      extraName: set.extraName,
      factors: factorLabels,
      savedAt: new Date().toISOString(),
    };
    state.saved.unshift(item);
    if (!state.isPro) {
      state.savesToday++;
      saveLimit();
    }
    persistSaved();
    renderSavedNumbers();
    renderResults();  // 重新渲染以便更新按钮状态
    const left = state.isPro ? '∞' : (FREE_SAVE_LIMIT - state.savesToday);
    toast(state.isPro ? '💎 Saved to library' : '💾 Saved · ' + left + ' free saves left today');
  }

  function removeSaved(id) {
    state.saved = state.saved.filter(x => x.id !== id);
    persistSaved();
    renderSavedNumbers();
  }

  function showUpgradeModal(msg) {
    const mask = $('modal-mask');
    const modal = $('modal');
    modal.innerHTML = '<h3>⭐ Upgrade to Pro</h3>' +
      '<p style="white-space:pre-wrap;line-height:1.5;">' + msg + '</p>' +
      '<div class="pro-pricing">' +
        '<div class="pro-tier"><b>Starter</b><br/>$12.99<br/><span class="muted small">10 saves</span></div>' +
        '<div class="pro-tier featured"><b>Standard</b><br/>$29.99<br/><span class="muted small">30 saves</span></div>' +
        '<div class="pro-tier"><b>Heavy</b><br/>$69.99<br/><span class="muted small">100 saves</span></div>' +
      '</div>' +
      '<p class="muted small center">💡 Coming to App Store soon · one-time purchase, no subscription</p>' +
      '<div class="actions">' +
        '<button class="cancel" id="modal-cancel">Maybe later</button>' +
        '<button class="ok" id="modal-ok">Notify me</button>' +
      '</div>';
    mask.classList.add('show');
    $('modal-cancel').onclick = closeModal;
    $('modal-ok').onclick = () => {
      const email = prompt('Email (we\'ll only email when Pro launches):');
      if (email && /^.+@.+\..+$/.test(email)) {
        try { localStorage.setItem('luckyPick.notifyEmail', email); } catch (e) {}
        toast('📧 Got it. We\'ll email you when Pro launches.');
      }
      closeModal();
    };
  }

  function renderSavedNumbers() {
    const container = $('saved-list');
    if (!container) return;
    container.innerHTML = '';

    const items = state.saved || [];
    const status = saveLimitStatus();
    const counterEl = $('save-counter');
    if (counterEl) {
      if (state.isPro) {
        counterEl.innerHTML = '💎 <b>Pro</b> · Unlimited saves';
        counterEl.className = 'save-counter pro';
      } else {
        counterEl.innerHTML = '💎 <b>' + status.remaining + ' / ' + FREE_DAILY_LIMIT + '</b> free saves today';
        counterEl.className = 'save-counter' + (status.remaining === 0 ? ' exhausted' : '');
      }
    }
    const upgradeBtn = $('upgrade-btn');
    if (upgradeBtn) upgradeBtn.style.display = state.isPro ? 'none' : '';

    if (items.length === 0) {
      container.appendChild(el('div', { class: 'muted center saved-empty', text: 'No saved numbers yet. Tap 💾 Save on a generated set to keep it here.' }));
      return;
    }

    items.forEach(item => {
      const card = el('div', { class: 'saved-card' });
      const head = el('div', { class: 'saved-head' }, [
        el('span', { class: 'saved-date', text: new Date(item.savedAt).toLocaleString() }),
        el('span', { class: 'scheme-tag', text: item.gameName }),
      ]);
      card.appendChild(head);

      const balls = el('div', { class: 'balls' });
      (item.main || []).forEach(n => balls.appendChild(el('span', { class: 'ball main', text: String(n).padStart(2, '0') })));
      balls.appendChild(el('span', { class: 'ball divider', text: '|' }));
      (item.extra || []).forEach(n => balls.appendChild(el('span', { class: 'ball extra', text: String(n).padStart(2, '0') })));
      card.appendChild(balls);

      if (item.factors && item.factors.length) {
        card.appendChild(el('div', { class: 'saved-factors muted small', text: 'Factors: ' + item.factors.join(' · ') }));
      }

      const actions = el('div', { class: 'result-actions' });
      actions.appendChild(el('button', {
        class: 'action-btn',
        onClick: () => copySetsToClipboardText(formatSetsText([item])),
      }, ['📋 Copy']));
      actions.appendChild(el('button', {
        class: 'action-btn',
        onClick: () => exportSingleSavedAsImage(item),
      }, ['🖼️ Image']));
      actions.appendChild(el('button', {
        class: 'action-btn danger',
        onClick: () => { if (confirm('Remove from library?')) removeSaved(item.id); },
      }, ['🗑️']));
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  // 在 Generate 按钮上方显示剩余次数
  function renderGenCounter() {
    const el = document.getElementById('gen-counter');
    if (!el) return;
    const status = genLimitStatus();
    if (state.isPro) {
      el.innerHTML = '💎 <b>Pro</b> · Unlimited generations';
      el.className = 'gen-counter pro';
    } else if (state.devMode) {
      el.innerHTML = '🛠 <b>Dev Mode</b> · Unlimited (testing)';
      el.className = 'gen-counter dev';
    } else {
      el.innerHTML = '🎯 <b>' + status.remaining + ' / ' + FREE_GEN_LIMIT + '</b> free Generations today';
      el.className = 'gen-counter' + (status.remaining === 0 ? ' exhausted' : '');
    }
  }

  function copySetsToClipboardText(text) {
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else fallback();
    toast('📋 Copied');
  }

  function exportSingleSavedAsImage(item) {
    const set = {
      game: item.game,
      gameName: item.gameName,
      main: item.main,
      extra: item.extra,
      extraName: item.extraName,
    };
    exportSetsAsImage([set]);
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

    const recent = Engine.recentDraws(history, 5);
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
      // 极简：只放输入框，详细说明在底下的 help details
      body = '<input type="text" id="modal-input" inputmode="numeric" pattern="[0-9]*" maxlength="9" placeholder="Any digits, up to 9" autocomplete="off" />';
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
      body = '<input type="text" id="modal-input" maxlength="256" placeholder="Dream keywords (e.g. water fish)" autocomplete="off" />';
    } else if (type === 'lifepath') {
      body = `<label>Birthday (used for Life Path Number)</label>
              <input type="date" id="modal-input" value="1990-01-01" />`;
    } else if (type === 'lyrics') {
      body = '<textarea id="modal-input" rows="3" maxlength="256" placeholder="A lyric, phrase, or thought&#10;(e.g. hello darkness my old friend)" autocomplete="off"></textarea>';
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
        if (type === 'lucky' || type === 'avoid') {
          const cfg = Engine.GAMES[state.game];
          const max = cfg ? cfg.mainRange[1] : 69;
          const min = cfg ? cfg.mainRange[0] : 1;
          const result = parseLuckyInput(val, min, max);
          if (result.error) return alert(result.error);
          const n = result.value;
          const typeName = type === 'lucky' ? 'lucky numbers' : 'avoid numbers';
          if (state.factors.some(f => f.type === type && f.data && f.data.includes(n))) {
            return alert('You already added #' + n + ' to ' + typeName);
          }
          factor = type === 'lucky' ? Engine.makeLucky([n]) : Engine.makeAvoid([n]);
          // 算法细节不告诉用户（黑盒）
        }
        else if (type === 'date') factor = Engine.makeDate(val);
        else if (type === 'zodiac') factor = Engine.makeZodiac(val);
        else if (type === 'dream') {
          if (val.length > 256) return alert('Max 256 characters (you entered ' + val.length + ')');
          const kws = val.split(/\s+/).filter(Boolean);
          if (!kws.length) return alert('Enter at least one symbol');
          factor = Engine.makeDream(kws);
        }
        else if (type === 'lifepath') factor = Engine.makeLifePath(val);
        else if (type === 'lyrics') {
          if (!val || val.length < 2) return alert('Type at least 2 characters');
          if (val.length > 256) return alert('Max 256 characters (you entered ' + val.length + ')');
          factor = Engine.makeLyrics(val);
        }
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
  // 数字根算法：把数字串收成 [min, max] 之间的数
  // 输入限制：只允许数字，最多 9 位
  // 例: 7 → 7, 78 → 15 (7+8), 12345 → 15, 999999999 → 63, 9999999999 → 9 (超过 9 位会被拒)
  function parseLuckyInput(s, min, max) {
    min = (min == null) ? 1 : min;
    max = (max == null) ? 69 : max;
    // 只留数字（防用户粘贴时带空格等）
    const digits = String(s).replace(/\D/g, '');
    if (!digits) return { error: 'Type some digits (e.g. 7 or 12345)' };
    if (digits.length > 9) return { error: 'Maximum 9 digits allowed (you entered ' + digits.length + ')' };
    let n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return { error: 'Invalid number' };
    if (n >= min && n <= max) return { value: n, original: digits, transformed: false };
    // 数字根
    let sum = 0;
    for (const ch of digits) sum += parseInt(ch, 10);
    while (sum > max) {
      let s2 = 0;
      for (const ch of String(sum)) s2 += parseInt(ch, 10);
      if (s2 === sum) break;
      sum = s2;
    }
    if (sum < min) sum = min;
    return { value: sum, original: digits, transformed: true };
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
        setCount: state.setCount,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(state.saveKey);
      if (!s) return;
      const data = JSON.parse(s);
      state.game = data.game || 'powerball';
      state.setCount = data.setCount || 3;
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
    loadSaved();
    loadSaveLimit();
    loadGenLimit();
    loadDevMode();
    ensureDateRollover();
    // URL shortcut check (#/super) → toggle dev mode
    function applyShortcut() {
      if (checkDevModeShortcut()) {
        renderGenCounter();
        try { toast(state.devMode ? '🛠 Dev Mode ON · unlimited generations & saves' : '🛠 Dev Mode OFF · limits back on'); } catch (e) {}
      }
    }
    applyShortcut();
    // Also handle hash changes while page is already loaded
    window.addEventListener('hashchange', applyShortcut);
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const g = tab.dataset.game;
        if (g && Engine.GAMES[g]) {
          state.game = g;
          document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.game === g));
          renderFactors(); renderResults(); renderRecent(); renderSavedNumbers(); saveState(); updateDebug();
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
    renderFactors(); renderResults(); renderRecent(); renderSavedNumbers(); renderGenCounter(); updateDebug();
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      updateLastUpdate();
      updateDebug();
    }));
    updateLastUpdate();
    updateDebug();
    renderSavedNumbers();
    renderGenCounter();

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
