/**
 * engine.js - LuckyPick Global core algorithm
 *
 * Supports: Powerball, Mega Millions
 * Each game: weights based on personal factors + history
 */

(function (global) {
  'use strict';

  // ============================================================
  // Game configuration
  // ============================================================
  const GAMES = {
    powerball: {
      name: 'Powerball',
      mainRange: [1, 69],
      mainCount: 5,
      extraRange: [1, 26],
      extraCount: 1,
      extraName: 'Powerball',
    },
    megamillions: {
      name: 'Mega Millions',
      mainRange: [1, 70],
      mainCount: 5,
      extraRange: [1, 25],
      extraCount: 1,
      extraName: 'Mega Ball',
    },
  };

  // ============================================================
  // Factor library (English)
  // ============================================================

  function makeLucky(numbers, weight = 1.0) {
    const set = new Set(numbers.filter(n => Number.isFinite(n)));
    return {
      type: 'lucky',
      label: 'Lucky #' + Array.from(set).join(','),
      weight,
      data: Array.from(set),
      contains: (n) => set.has(n),
    };
  }

  function makeAvoid(numbers, weight = 1.0) {
    const set = new Set(numbers.filter(n => Number.isFinite(n)));
    return {
      type: 'avoid',
      label: 'Avoid #' + Array.from(set).join(','),
      weight,
      data: Array.from(set),
      contains: (n) => set.has(n),
    };
  }

  function makeDate(dateStr, weight = 0.6) {
    const date = parseDate(dateStr);
    const digits = [
      Math.floor(date.getFullYear() / 1000) % 10,
      Math.floor(date.getFullYear() / 100) % 10,
      Math.floor(date.getFullYear() / 10) % 10,
      date.getFullYear() % 10,
      date.getMonth() + 1,
      date.getDate(),
    ];
    const set = new Set(digits.filter(x => x > 0));
    return {
      type: 'date',
      label: 'Date · ' + formatDate(date),
      weight,
      data: { dateStr: formatDate(date), digits: Array.from(set) },
      contains: (n) => set.has(n),
    };
  }

  function parseDate(s) {
    if (s instanceof Date) return s;
    if (typeof s === 'string') {
      const parts = s.split(/[-/.]/).map(Number);
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Western zodiac (12 signs)
  const ZODIAC_NUMBERS = {
    aries:       { name: 'Aries',       numbers: [6, 9, 12, 15, 21] },
    taurus:      { name: 'Taurus',      numbers: [4, 8, 16, 23, 29] },
    gemini:      { name: 'Gemini',      numbers: [5, 7, 14, 22, 31] },
    cancer:      { name: 'Cancer',      numbers: [2, 7, 11, 17, 24] },
    leo:         { name: 'Leo',         numbers: [1, 8, 19, 25, 33] },
    virgo:       { name: 'Virgo',       numbers: [3, 14, 18, 26, 32] },
    libra:       { name: 'Libra',       numbers: [6, 13, 20, 27, 34] },
    scorpio:     { name: 'Scorpio',     numbers: [8, 11, 18, 22, 27] },
    sagittarius: { name: 'Sagittarius', numbers: [3, 9, 17, 22, 30] },
    capricorn:   { name: 'Capricorn',   numbers: [4, 13, 22, 28, 31] },
    aquarius:    { name: 'Aquarius',    numbers: [5, 14, 18, 23, 35] },
    pisces:      { name: 'Pisces',      numbers: [3, 9, 12, 21, 33] },
  };

  function inferZodiac(date) {
    const d = parseDate(date);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'aries';
    if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'taurus';
    if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return 'gemini';
    if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return 'cancer';
    if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'leo';
    if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'virgo';
    if ((m === 9 && day >= 23) || (m === 10 && day <= 23)) return 'libra';
    if ((m === 10 && day >= 24) || (m === 11 && day <= 22)) return 'scorpio';
    if ((m === 11 && day >= 23) || (m === 12 && day <= 21)) return 'sagittarius';
    if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'capricorn';
    if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'aquarius';
    return 'pisces';
  }

  function makeZodiac(zodiacOrDate, weight = 0.5) {
    let zodiac;
    let dateStr = null;
    if (ZODIAC_NUMBERS[zodiacOrDate]) {
      zodiac = zodiacOrDate;
    } else {
      zodiac = inferZodiac(zodiacOrDate);
      dateStr = formatDate(parseDate(zodiacOrDate));
    }
    const info = ZODIAC_NUMBERS[zodiac];
    const set = new Set(info.numbers);
    return {
      type: 'zodiac',
      label: 'Zodiac · ' + info.name,
      weight,
      data: { zodiac, name: info.name, numbers: info.numbers, dateStr },
      contains: (n) => set.has(n),
    };
  }

  // Dream symbols (Western + universal)
  const DREAM_NUMBERS = {
    water: [1, 6, 16, 26],
    fish: [1, 9, 19, 29],
    fire: [2, 7, 17, 27],
    snake: [4, 14, 24],
    dragon: [5, 15, 25, 35],
    phoenix: [3, 13, 23, 33],
    mountain: [8, 18, 28],
    sea: [10, 20, 30],
    tree: [11, 21, 31],
    flower: [12, 22, 32],
    money: [8, 18, 28],
    dream: [4, 14, 24],
    fly: [3, 13, 23],
    run: [5, 15, 25],
    cry: [7, 17, 27],
    laugh: [9, 19, 29],
    death: [4, 14, 24],
    birth: [1, 11, 21],
    cat: [3, 13, 23],
    dog: [6, 16, 26],
    car: [2, 12, 22],
    ship: [1, 11, 21],
    rain: [4, 14, 24],
    snow: [7, 17, 27],
    moon: [7, 17, 27],
    sun: [8, 18, 28],
    star: [9, 19, 29],
    cloud: [10, 20, 30],
    baby: [1, 11, 21],
    house: [4, 14, 24],
    road: [8, 18, 28],
    horse: [3, 13, 23],
  };

  function makeDream(keywords, weight = 0.4) {
    const kwArr = Array.isArray(keywords) ? keywords : [keywords];
    const numbers = new Set();
    const matched = [];
    for (const kw of kwArr) {
      const key = String(kw).toLowerCase().trim();
      const nums = DREAM_NUMBERS[key];
      if (nums) {
        matched.push(key);
        nums.forEach(n => numbers.add(n));
      }
    }
    return {
      type: 'dream',
      label: matched.length ? 'Dream · ' + matched.join(', ') : 'Dream',
      weight,
      data: { keywords: matched, numbers: Array.from(numbers) },
      contains: (n) => numbers.has(n),
    };
  }

  // Life Path Number (Western numerology)
  function lifePathNumber(dateStr) {
    const date = parseDate(dateStr);
    const digits = [
      ...String(date.getFullYear()).split(''),
      String(date.getMonth() + 1),
      String(date.getDate()),
    ].map(Number);
    let sum = digits.reduce((a, b) => a + b, 0);
    while (sum >= 10) {
      sum = String(sum).split('').reduce((a, b) => a + Number(b), 0);
    }
    return sum;
  }

  const LPN_LUCKY = {
    1: [1, 10, 19, 28, 37, 46, 55, 64],
    2: [2, 11, 20, 29, 38, 47, 56, 65],
    3: [3, 12, 21, 30, 39, 48, 57, 66],
    4: [4, 13, 22, 31, 40, 49, 58, 67],
    5: [5, 14, 23, 32, 41, 50, 59, 68],
    6: [6, 15, 24, 33, 42, 51, 60, 69],
    7: [7, 16, 25, 34, 43, 52, 61],
    8: [8, 17, 26, 35, 44, 53, 62],
    9: [9, 18, 27, 36, 45, 54, 63],
  };

  function makeLifePath(dateStr, weight = 0.4) {
    const lpn = lifePathNumber(dateStr);
    const numbers = (LPN_LUCKY[lpn] || []).filter(n => n <= 69);
    const set = new Set(numbers);
    return {
      type: 'lifepath',
      label: 'Life Path · ' + lpn,
      weight,
      data: { lifePathNumber: lpn, numbers },
      contains: (n) => set.has(n),
    };
  }

  // ============================================================
  // Frequency analysis
  // ============================================================

  function freqForGame(history, game) {
    const cfg = GAMES[game];
    if (!cfg) return null;
    const main = new Array(cfg.mainRange[1] + 1).fill(0);
    const extra = new Array(cfg.extraRange[1] + 1).fill(0);
    for (const draw of history) {
      for (const n of (draw.main || [])) {
        if (n >= cfg.mainRange[0] && n <= cfg.mainRange[1]) main[n]++;
      }
      for (const n of (draw.extra || [])) {
        if (n >= cfg.extraRange[0] && n <= cfg.extraRange[1]) extra[n]++;
      }
    }
    return { main, extra };
  }

  // ============================================================
  // Weights synthesis
  // ============================================================

  function factorsToSets(factors) {
    const lucky = new Set();
    const avoid = new Set();
    for (const f of factors) {
      if (f.type === 'avoid') {
        for (const n of (f.data || [])) avoid.add(n);
      } else {
        for (const n of (f.data && f.data.numbers ? f.data.numbers : f.data || [])) {
          lucky.add(n);
        }
      }
    }
    return { lucky, avoid };
  }

  function makeWeights(factors, freq, game) {
    const cfg = GAMES[game];
    if (!cfg || !freq) return null;
    const { lucky, avoid } = factorsToSets(factors);
    const maxMain = Math.max(...freq.main.slice(cfg.mainRange[0]));
    const maxExtra = Math.max(...freq.extra.slice(cfg.extraRange[0]));
    const mainWeights = {};
    const extraWeights = {};
    for (let n = cfg.mainRange[0]; n <= cfg.mainRange[1]; n++) {
      let w = (freq.main[n] || 0) / (maxMain || 1);
      if (lucky.has(n)) w += 0.5;
      if (avoid.has(n)) w *= 0.05;
      w += Math.random() * 0.3;
      mainWeights[n] = Math.max(w, 0.001);
    }
    for (let n = cfg.extraRange[0]; n <= cfg.extraRange[1]; n++) {
      let w = (freq.extra[n] || 0) / (maxExtra || 1);
      if (lucky.has(n)) w += 0.5;
      if (avoid.has(n)) w *= 0.05;
      w += Math.random() * 0.3;
      extraWeights[n] = Math.max(w, 0.001);
    }
    return { mainWeights, extraWeights };
  }

  // Efraimidis-Spirakis weighted sampling without replacement
  function pickNoReplace(weights, k) {
    const keys = Object.keys(weights).map(Number).filter(n => !isNaN(n));
    const scored = keys.map(n => ({
      n,
      key: -Math.log(Math.random()) / (Math.max(weights[n], 0) + 1e-9),
    }));
    scored.sort((a, b) => a.key - b.key);
    return scored.slice(0, k).map(x => x.n).sort((a, b) => a - b);
  }

  function pickOne(weights) {
    let sum = 0;
    for (const k in weights) sum += weights[k];
    if (sum <= 0) {
      const keys = Object.keys(weights).map(Number);
      return keys[Math.floor(Math.random() * keys.length)];
    }
    let r = Math.random() * sum;
    for (const k in weights) {
      r -= weights[k];
      if (r <= 0) return Number(k);
    }
    return Number(Object.keys(weights).slice(-1)[0]);
  }


  // ============================================================
  // Lyrics / phrase factor (black-box, time-based)
  // ============================================================
  //
  // 用户输入一段歌词 / 一句话 / 一个短语。
  // 算法内部用 (text + timestamp + random salt) → 哈希 → 选号。
  // 用户看不到公式，也没法反推。
  // 同一段话不同时刻生成不同号码。
  //

  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /**
   * 从一段文字 + 当前时刻生成一组号码（黑盒算法）。
   * @param {string} text 用户输入的文字
   * @param {string} game 'powerball' | 'megamillions'
   * @returns {{ main: number[], extra: number[] }}
   */
  function lyricsToNumbers(text, game) {
    const cfg = GAMES[game];
    if (!cfg || !text) return { main: [], extra: [] };

    // 1. 盐：text + 毫秒时间戳 + 随机串
    const seed = String(text) + '|' + Date.now() + '|' + Math.random().toString(36).slice(2, 10);

    // 2. djb2 哈希 → 32-bit 整数
    let h = djb2(seed);

    // 3. LCG 推进 + mod 主区范围，选 5 个不重复的
    const mainMin = cfg.mainRange[0];
    const mainMax = cfg.mainRange[1];
    const mainCount = cfg.mainCount;
    const main = [];
    let attempts = 0;
    while (main.length < mainCount && attempts < 100) {
      h = (h * 1103515245 + 12345) | 0;
      const n = (Math.abs(h) % (mainMax - mainMin + 1)) + mainMin;
      if (!main.includes(n)) main.push(n);
      attempts++;
    }
    while (main.length < mainCount) {
      // 极端兜底
      const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
      if (!main.includes(n)) main.push(n);
    }
    main.sort((a, b) => a - b);

    // 4. 彩球：换一种哈希混合
    const extraMin = cfg.extraRange[0];
    const extraMax = cfg.extraRange[1];
    const extraCount = cfg.extraCount;
    const pbSeed = djb2(seed + '|extra');
    let ph = pbSeed;
    const extra = [];
    for (let i = 0; i < extraCount; i++) {
      ph = (ph * 1103515245 + 12345) | 0;
      const n = (Math.abs(ph) % (extraMax - extraMin + 1)) + extraMin;
      extra.push(n);
    }

    return { main, extra };
  }

  function makeLyrics(text, weight = 0.8) {
    const clean = String(text || '').trim();
    const display = clean.length > 22 ? clean.slice(0, 20) + '...' : clean;
    return {
      type: 'lyrics',
      label: '🎵 \u201C' + display + '\u201D',
      weight,
      data: { text: clean },
      // contains 在 generate 时由 app.js 动态注入 fresh 数字
      contains: () => false,
    };
  }

  // ============================================================
  // Generate
  // ============================================================

  function generate(game, factors, history, options = {}) {
    const cfg = GAMES[game];
    if (!cfg) return [];
    const count = options.count || 3;
    const lookback = options.lookback || Math.min(50, history.length);
    const rec = history.slice(-lookback);
    const freq = freqForGame(rec, game);
    const sets = [];
    for (let i = 0; i < count; i++) {
      const w = makeWeights(factors, freq, game);
      if (!w) continue;
      const main = pickNoReplace(w.mainWeights, cfg.mainCount);
      const extra = pickNoReplace(w.extraWeights, cfg.extraCount);
      sets.push({
        game,
        gameName: cfg.name,
        main,
        extra,
        extraName: cfg.extraName,
      });
    }
    return sets;
  }

  // Recent draws display
  function recentDraws(history, count = 10) {
    // 数据文件是 [最新, ..., 最旧] 顺序，直接取前 N 个就是 [最新, ..., 最旧]
    return history.slice(0, count);
  }

  // Award tier (simplified)
  function awardTier(game, mainHits, extraHits) {
    if (game === 'powerball') {
      if (mainHits === 5 && extraHits === 1) return 1;
      if (mainHits === 5) return 2;
      if (mainHits === 4 && extraHits === 1) return 3;
      if (mainHits === 4) return 4;
      if (mainHits === 3 && extraHits === 1) return 5;
      if (mainHits === 3) return 6;
      if (mainHits === 2 && extraHits === 1) return 7;
      if (mainHits === 1 && extraHits === 1) return 8;
      if (extraHits === 1) return 9;
      return 0;
    } else if (game === 'megamillions') {
      if (mainHits === 5 && extraHits === 1) return 1;
      if (mainHits === 5) return 2;
      if (mainHits === 4 && extraHits === 1) return 3;
      if (mainHits === 4) return 4;
      if (mainHits === 3 && extraHits === 1) return 5;
      if (mainHits === 3) return 6;
      if (mainHits === 2 && extraHits === 1) return 7;
      if (mainHits === 1 && extraHits === 1) return 8;
      if (extraHits === 1) return 9;
      return 0;
    }
    return 0;
  }

  function matchCount(set, actual) {
    const mainHits = (set.main || []).filter(n => (actual.main || []).includes(n)).length;
    const extraHits = (set.extra || []).filter(n => (actual.extra || []).includes(n)).length;
    const tier = awardTier(set.game, mainHits, extraHits);
    return {
      main: mainHits,
      extra: extraHits,
      tier,
      text: `Main ${mainHits}/${set.main.length}, ${set.extraName} ${extraHits}/${set.extra.length}`,
    };
  }

  // Expose
  global.LuckyEngine = {
    GAMES,
    SCHEMES: GAMES,
    ZODIAC_NUMBERS,
    DREAM_NUMBERS,
    LPN_LUCKY,
    makeLucky,
    makeAvoid,
    makeDate,
    makeZodiac,
    makeDream,
    makeLifePath,
    makeLyrics,
    lyricsToNumbers,
    inferZodiac,
    lifePathNumber,
    parseDate,
    formatDate,
    freqForGame,
    generate,
    recentDraws,
    matchCount,
    awardTier,
    pickNoReplace,
    pickOne,
    meta: {
      version: '1.0.0',
      games: Object.keys(GAMES),
      factorTypes: ['lucky', 'avoid', 'date', 'zodiac', 'dream', 'lifepath', 'lyrics'],
      description: 'LuckyPick Global - Powerball & Mega Millions lucky number picker',
    },
  };

})(typeof window !== 'undefined' ? window : globalThis);
