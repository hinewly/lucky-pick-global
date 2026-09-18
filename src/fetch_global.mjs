#!/usr/bin/env node
/**
 * fetch_global.mjs - 抓取 Powerball + Mega Millions 最新数据
 *
 * 数据源: lotteryusa.com (国内可访问)
 * 用法: node src/fetch_global.mjs
 *
 * 输出: 更新 public/data/powerball.js 和 megamillions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ============================================================
// Powerball 抓取
// ============================================================
async function fetchPowerball() {
  console.log('Fetching Powerball from lotteryusa.com...');
  const res = await fetch('https://www.lotteryusa.com/powerball', {
    headers: { 'User-Agent': UA }
  });
  const html = await res.text();

  // 提取日期
  const dateMatch = html.match(/c-draw-card__draw-date-sub[^>]*>\s*([^<]+)</);
  const drawDate = dateMatch ? dateMatch[1].trim() : '';

  // 提取 5 个白球（c-ball--sm 但不是 red）
  const ballSection = html.match(/<p[^>]*>Main draw<\/p>(.{0,3000}?)<p[^>]*>(Power Play|Feature)/s);
  let balls = [];
  if (ballSection) {
    balls = [...ballSection[1].matchAll(/<li class="c-ball c-ball--sm">(\d+)<\/li>/g)]
      .map(m => Number(m[1]));
  }

  // 提取 Powerball（c-ball--red）
  const pbMatch = html.match(/c-ball--red[^>]*>\s*(\d+)\s*</);
  const powerball = pbMatch ? Number(pbMatch[1]) : null;

  if (!drawDate || balls.length < 5 || powerball === null) {
    throw new Error('Failed to parse Powerball data');
  }

  console.log(`  Got Powerball: ${drawDate}, balls=${balls.slice(0,5).join(',')}, PB=${powerball}`);

  return [{
    date: drawDate,
    main: balls.slice(0, 5).sort((a, b) => a - b),
    extra: [powerball],
  }];
}

// ============================================================
// Mega Millions 抓取
// ============================================================
async function fetchMegaMillions() {
  console.log('Fetching Mega Millions from lotteryusa.com...');
  const res = await fetch('https://www.lotteryusa.com/mega-millions', {
    headers: { 'User-Agent': UA }
  });
  const html = await res.text();

  // 提取日期
  const dateMatch = html.match(/c-draw-card__draw-date-sub[^>]*>\s*([^<]+)</);
  const drawDate = dateMatch ? dateMatch[1].trim() : '';

  // 提取 5 个白球（在 "Main draw" section 里）
  const ballSection = html.match(/<p[^>]*>Main draw<\/p>(.{0,3000}?)<p[^>]*>(Mega Ball|Megaplier)/s);
  let balls = [];
  if (ballSection) {
    balls = [...ballSection[1].matchAll(/<li class="c-ball c-ball--sm">(\d+)<\/li>/g)]
      .map(m => Number(m[1]));
  }

  // 提取 Mega Ball（c-ball--yellow）
  const mbMatch = html.match(/c-ball--yellow[^>]*>\s*(\d+)\s*</);
  const megaBall = mbMatch ? Number(mbMatch[1]) : null;

  if (!drawDate || balls.length < 5 || megaBall === null) {
    throw new Error('Failed to parse Mega Millions data');
  }

  console.log(`  Got Mega Millions: ${drawDate}, balls=${balls.slice(0,5).join(',')}, MB=${megaBall}`);

  return [{
    date: drawDate,
    main: balls.slice(0, 5).sort((a, b) => a - b),
    extra: [megaBall],
  }];
}

// ============================================================
// 写入数据文件
// ============================================================
function writeDataFile(game, draws) {
  const filename = path.join(__dirname, '..', 'public', 'data', game === 'powerball' ? 'powerball.js' : 'megamillions.js');
  const varName = game === 'powerball' ? 'POWERBALL' : 'MEGAMILLIONS';
  const content = `window.${varName} = ${JSON.stringify(draws, null, 2)};\n`;
  fs.writeFileSync(filename, content, 'utf8');
  console.log(`  → Wrote ${draws.length} draws to ${filename}`);
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('=== Fetching latest lottery data ===\n');

  try {
    const pb = await fetchPowerball();
    writeDataFile('powerball', pb);
  } catch (err) {
    console.error('Powerball fetch failed:', err.message);
  }

  try {
    const mm = await fetchMegaMillions();
    writeDataFile('megamillions', mm);
  } catch (err) {
    console.error('Mega Millions fetch failed:', err.message);
  }

  console.log('\n=== Done ===');
  console.log('\n注意：lotteryusa 只显示最新 1-2 期数据。');
  console.log('如需更多期，请从官网手动复制补充：');
  console.log('  - https://www.powerball.com/');
  console.log('  - https://www.megamillions.com/');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
