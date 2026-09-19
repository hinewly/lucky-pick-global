#!/usr/bin/env node
/**
 * fetch_global.mjs - 抓取 Powerball + Mega Millions 最新数据
 *
 * 数据源: lotteryusa.com /year 归档页（国内可访问）
 * 用法: node src/fetch_global.mjs
 *
 * 输出: 更新 public/data/powerball.js 和 megamillions.js
 *   - 数据顺序: [最新, ..., 最旧]
 *   - 字段: { date: 'YYYY-MM-DD', main: [n1..n5], extra: [powerball] }
 *
 * 每个归档页包含 50 期真实数据。
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
  },
  megamillions: {
    name: 'Mega Millions',
    url: 'https://www.lotteryusa.com/mega-millions/year',
    extraClass: 'c-ball--yellow',
    varName: 'MEGAMILLIONS',
  },
};

// ============================================================
// 抓取 + 解析
// ============================================================

/**
 * 抓取并解析 /year 页面。
 * 每个 draw card 的 HTML 模式：
 *   <span class="c-draw-card__draw-date-sub">Mon DD, YYYY</span>
 *   <li class="c-ball c-ball--sm">N</li> × 5 (白球)
 *   <li class="c-ball c-ball--EXTRA c-ball--sm">N</li> × 1 (彩球)
 *
 * 注意：每个 draw card 实际上可能包含两个 draw（一个是当前 draw，
 * 另一个是上一期的回顾）。我们只取第一个 5+1 组合。
 */
async function fetchArchive(game) {
  const cfg = GAMES[game];
  console.log(`Fetching ${cfg.name} from lotteryusa.com /year...`);

  const res = await fetch(cfg.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // 按 draw card 切分（每个 c-draw-card__draw-date-sub 之前是一个 draw）
  const parts = html.split('c-draw-card__draw-date-sub');
  const draws = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    // 取日期
    const dateMatch = chunk.match(/^">([^<]+)</);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1].trim();

    // 取前 5 个白球 + 第 6 个彩球
    // 白球: c-ball c-ball--sm
    // 彩球: c-ball c-ball--<extraClass> c-ball--sm
    const whitePattern = /c-ball c-ball--sm">(\d+)</g;
    const extraPattern = new RegExp(`c-ball ${cfg.extraClass} c-ball--sm">(\\d+)`, 'g');

    const white = [];
    let m;
    while ((m = whitePattern.exec(chunk)) !== null && white.length < 5) {
      white.push(Number(m[1]));
    }
    const extraMatch = extraPattern.exec(chunk);

    if (white.length !== 5 || !extraMatch) continue;

    draws.push({
      date: formatDate(dateStr),
      main: white.sort((a, b) => a - b),
      extra: [Number(extraMatch[1])],
    });
  }

  if (draws.length === 0) {
    throw new Error('No draws parsed');
  }

  console.log(`  Got ${draws.length} draws: ${draws[0].date} → ${draws[draws.length - 1].date}`);
  return draws;
}

/**
 * 把 "Sep 18, 2026" 转成 "2026-09-18"
 */
function formatDate(s) {
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return s; // 已经是 ISO 格式就直接返回
  const month = months[m[1]];
  if (!month) return s;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

// ============================================================
// 写入数据文件
// ============================================================
function writeDataFile(game, draws) {
  const cfg = GAMES[game];
  const filename = path.join(__dirname, '..', 'public', 'data',
    game === 'powerball' ? 'powerball.js' : 'megamillions.js');
  const content = `window.${cfg.varName} = ${JSON.stringify(draws, null, 2)};\n`;
  fs.writeFileSync(filename, content, 'utf8');
  console.log(`  → Wrote ${draws.length} draws to ${filename}`);
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('=== Fetching latest lottery data ===\n');

  let ok = 0;
  for (const game of Object.keys(GAMES)) {
    try {
      const draws = await fetchArchive(game);
      writeDataFile(game, draws);
      ok++;
    } catch (err) {
      console.error(`${GAMES[game].name} fetch failed:`, err.message);
    }
  }

  console.log(`\n=== Done (${ok}/${Object.keys(GAMES).length} games updated) ===`);
  if (ok > 0) {
    console.log('\nNext steps:');
    console.log('  1. Review the changes in public/data/');
    console.log('  2. Bump SW version (service-worker.js CACHE_VERSION)');
    console.log('  3. git add + commit + push (auto-deploys to GitHub Pages)');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
