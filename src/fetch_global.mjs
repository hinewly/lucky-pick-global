#!/usr/bin/env node
/**
 * fetch_global.mjs - 抓取 Powerball + Mega Millions + EuroMillions + UK Lotto 最新数据
 *
 * 数据源:
 * - lotteryusa.com    → Powerball, Mega Millions
 * - euro-millions.com → EuroMillions
 * - national-lottery.co.uk → UK Lotto
 *
 * 用法: node src/fetch_global.mjs
 *
 * 输出: 更新 public/data/{game}.js
 *   - 数据顺序: [最新, ..., 最旧]
 *   - 字段: { date: 'YYYY-MM-DD', main: [n1..n5], extra: [彩球] }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const GAMES = {
  powerball: {
    name: 'Powerball',
    url: 'https://www.lotteryusa.com/powerball/year',
    extraClass: 'c-ball--red',
    varName: 'POWERBALL',
    parse: parseUsStyle,  // 5 white + 1 red
  },
  megamillions: {
    name: 'Mega Millions',
    url: 'https://www.lotteryusa.com/mega-millions/year',
    extraClass: 'c-ball--yellow',
    varName: 'MEGAMILLIONS',
    parse: parseUsStyle,
  },
  euromillions: {
    name: 'EuroMillions',
    url: 'https://www.euro-millions.com/en/results/history',
    extraClass: 'c-ball--star',  // lucky stars are gold/orange
    varName: 'EUROMILLIONS',
    parse: parseEuroMillions,  // 5 main + 2 lucky stars
  },
  uklotto: {
    name: 'UK Lotto',
    url: 'https://www.national-lottery.co.uk/lotto/results',
    extraClass: 'c-ball--bonus',
    varName: 'UKLOTTO',
    parse: parseUkLotto,  // 6 main + 1 bonus ball
  },
};

// ============================================================
// Parsers
// ============================================================

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function numFromMatch(m) {
  if (!m) return null;
  const n = parseInt(m.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseUsStyle(html, cfg) {
  // 同 PB / MM：c-ball--sm 白球，c-ball--<extra> 彩球
  // 旧版 djb2 算法，分割 c-draw-card__draw-date-sub
  const parts = html.split('c-draw-card__draw-date-sub');
  const draws = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const dateMatch = chunk.match(/^">([^<]+)</);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1].trim();
    const white = [];
    const whitePattern = /c-ball c-ball--sm">(\d+)</g;
    let m;
    while ((m = whitePattern.exec(chunk)) !== null && white.length < 5) {
      white.push(Number(m[1]));
    }
    const extraPattern = new RegExp(`c-ball ${cfg.extraClass} c-ball--sm">(\\d+)`, 'g');
    const extraMatch = extraPattern.exec(chunk);
    if (white.length === 5 && extraMatch) {
      draws.push({
        date: formatDate(dateStr),
        main: white.sort((a, b) => a - b),
        extra: [Number(extraMatch[1])],
      });
    }
  }
  return draws;
}

function parseEuroMillions(html) {
  // EuroMillions: 5 main balls (1-50) + 2 lucky stars (1-12)
  // 站点: euro-millions.com/en/results/history
  // 保守写法：尝试多种常见 HTML 结构，找不到就返回 []
  const draws = [];
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                   jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  // 1. 找每个 draw 块（多种常见结构都试）
  const cardRe = /<(?:article|li|div)\s+[^>]*class="[^"]*(?:result|draw|ball-row)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|li|div)>/gi;
  const cards = [...html.matchAll(cardRe)];
  if (cards.length === 0) return draws;

  for (const card of cards) {
    const chunk = card[1];

    // 2. 找日期（"18 Sep 2026" 或 "Sep 18, 2026"）
    const dateMatch = chunk.match(/\b(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\b/) ||
                      chunk.match(/\b([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})\b/);
    if (!dateMatch) continue;
    let day, mon, yr;
    if (dateMatch[1] && /\d/.test(dateMatch[1])) {
      day = +dateMatch[1]; mon = MONTHS[dateMatch[2].toLowerCase()]; yr = +dateMatch[3];
    } else {
      day = +dateMatch[2]; mon = MONTHS[dateMatch[1].toLowerCase()]; yr = +dateMatch[3];
    }
    if (!mon || !day || !yr) continue;
    const dateStr = `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    // 3. 找所有数字 1-50（main 球范围）
    const allNums = [...chunk.matchAll(/>\s*(\d{1,2})\s*</g)]
      .map(x => parseInt(x[1], 10))
      .filter(n => n >= 1 && n <= 50);
    if (allNums.length < 7) continue;

    // 4. 去重，按出现顺序；前 5 unique 是 main，剩 1-12 的是 stars
    const seen = new Set();
    const ordered = [];
    for (const n of allNums) {
      if (!seen.has(n)) { seen.add(n); ordered.push(n); }
      if (ordered.length >= 7) break;
    }
    if (ordered.length < 7) continue;

    const main = ordered.slice(0, 5);
    const stars = ordered.slice(5, 7).filter(n => n <= 12);
    if (stars.length !== 2) continue;

    draws.push({
      date: dateStr,
      main: main.sort((a, b) => a - b),
      extra: stars.sort((a, b) => a - b),
    });
    if (draws.length >= 50) break;
  }
  return draws;
}

function parseUkLotto(html) {
  // UK Lotto: 6 main balls (1-59) + 1 bonus ball
  // 站点: national-lottery.co.uk/lotto/results (有反爬，可能拿不到 HTML)
  // 保守写法：尝试常见 HTML 结构
  const draws = [];
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                   jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  // 找每个 draw 块
  const cardRe = /<(?:article|li|div)\s+[^>]*class="[^"]*(?:result|draw|lotto-row|ball-row)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|li|div)>/gi;
  const cards = [...html.matchAll(cardRe)];
  if (cards.length === 0) return draws;

  for (const card of cards) {
    const chunk = card[1];

    // 找日期
    const dateMatch = chunk.match(/\b(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\b/) ||
                      chunk.match(/\b([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})\b/);
    if (!dateMatch) continue;
    let day, mon, yr;
    if (dateMatch[1] && /\d/.test(dateMatch[1])) {
      day = +dateMatch[1]; mon = MONTHS[dateMatch[2].toLowerCase()]; yr = +dateMatch[3];
    } else {
      day = +dateMatch[2]; mon = MONTHS[dateMatch[1].toLowerCase()]; yr = +dateMatch[3];
    }
    if (!mon || !day || !yr) continue;
    const dateStr = `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    // 找数字 1-59
    const allNums = [...chunk.matchAll(/>\s*(\d{1,2})\s*</g)]
      .map(x => parseInt(x[1], 10))
      .filter(n => n >= 1 && n <= 59);
    if (allNums.length < 7) continue;

    // 去重；UK Lotto 是 6 main + 1 bonus（bonus 也可能不在 main 里）
    // 简化：前 6 unique 算 main，第 7 个算 bonus
    const seen = new Set();
    const ordered = [];
    for (const n of allNums) {
      if (!seen.has(n)) { seen.add(n); ordered.push(n); }
      if (ordered.length >= 7) break;
    }
    if (ordered.length < 7) continue;

    draws.push({
      date: dateStr,
      main: ordered.slice(0, 6).sort((a, b) => a - b),
      extra: [ordered[6]],
    });
    if (draws.length >= 50) break;
  }
  return draws;
}

// ============================================================
// 日期格式化
// ============================================================
function formatDate(s) {
  // 已经是 ISO 就直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return s;
  const month = months[m[1]];
  if (!month) return s;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

// ============================================================
// 写入数据文件
// ============================================================
function writeDataFile(game, draws, source = 'live') {
  const cfg = GAMES[game];
  const filename = path.join(__dirname, '..', 'public', 'data',
    game === 'powerball' ? 'powerball.js' :
    game === 'megamillions' ? 'megamillions.js' :
    game === 'euromillions' ? 'euromillions.js' :
    'uklotto.js'
  );
  const content = `window.${cfg.varName} = ${JSON.stringify(draws, null, 2)};\n` +
    `window.${cfg.varName}_SOURCE = '${source}';\n`;
  fs.writeFileSync(filename, content, 'utf8');
  console.log(`  → Wrote ${draws.length} draws to ${filename} (source: ${source})`);
}

// 至少需要这么多条数据才算成功，否则保留 seed（防止 parser bug 把数据清空）
const MIN_DRAWS = 5;

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('=== Fetching latest lottery data ===\n');

  let ok = 0;
  for (const game of Object.keys(GAMES)) {
    const cfg = GAMES[game];
    console.log(`Fetching ${cfg.name} from ${cfg.url}...`);
    try {
      const res = await fetch(cfg.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const draws = cfg.parse(html, cfg);
      if (draws.length === 0) {
        console.log(`  (no draws parsed; keeping existing seed data)`);
        continue;
      }
      if (draws.length < MIN_DRAWS) {
        console.log(`  (only ${draws.length} draws parsed, need >= ${MIN_DRAYS}; keeping seed)`);
        continue;
      }
      writeDataFile(game, draws, 'live');
      ok++;
    } catch (err) {
      console.error(`  ${cfg.name} fetch failed:`, err.message);
      console.log(`  (keeping existing seed data)`);
    }
  }

  console.log(`\n=== Done (${ok}/${Object.keys(GAMES).length} games updated to live data) ===`);
  if (ok > 0) {
    console.log('\n下一步: bump SW version in public/service-worker.js');
    console.log('然后 commit + push (auto-deploys to GitHub Pages)');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
