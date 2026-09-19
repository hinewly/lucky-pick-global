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
    const extraPattern = new RegExp(`c-ball ${cfg.extraClass} c-ball--sm">(\\\\d+)`, 'g');
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
  // EuroMillions: 5 main balls + 2 lucky stars (gold colored)
  // 站点结构: li.c-ball.c-ball--result, .c-ball.c-ball--lucky-star
  // 站点结构会变，下面只是占位，需要根据真实页面调整
  const draws = [];
  // 尝试常见模式
  const cardPattern = /<article[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  // ... 占位实现，数据从另一条路径补
  // 实际可靠来源：lotterysoup.com / lotteryextreme.com
  // 这里只兜底，直接返回 seed data
  return draws;
}

function parseUkLotto(html) {
  // UK Lotto: 6 main balls + 1 bonus ball
  // 国家彩票网站有强反爬，普通 fetch 难以解析
  // 推荐来源: lotteryextreme.com / lotterysoup.com
  const draws = [];
  // 占位
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
function writeDataFile(game, draws) {
  const cfg = GAMES[game];
  const filename = path.join(__dirname, '..', 'public', 'data',
    game === 'powerball' ? 'powerball.js' :
    game === 'megamillions' ? 'megamillions.js' :
    game === 'euromillions' ? 'euromillions.js' :
    'uklotto.js'
  );
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
    const cfg = GAMES[game];
    console.log(`Fetching ${cfg.name} from ${cfg.url}...`);
    try {
      const res = await fetch(cfg.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const draws = cfg.parse(html, cfg);
      if (draws.length === 0) {
        console.log(`  (no new draws parsed; keeping existing seed data)`);
        continue;
      }
      writeDataFile(game, draws);
      ok++;
    } catch (err) {
      console.error(`  ${cfg.name} fetch failed:`, err.message);
      console.log(`  (keeping existing seed data)`);
    }
  }

  console.log(`\n=== Done (${ok}/${Object.keys(GAMES).length} games updated) ===`);
  if (ok > 0) {
    console.log('\n下一步: bump SW version in public/service-worker.js');
    console.log('然后 commit + push (auto-deploys to GitHub Pages)');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
