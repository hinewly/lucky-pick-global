/**
 * lucky-pick-global Worker
 * - 托管静态站点（lucky.daobox.app）
 * - Cron 每周一抓最新开奖数据 → 存 KV
 * - /data/{game}.js 请求优先返回 KV 里的新数据，KV 没有则走静态文件
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const GAMES = {
  powerball: {
    name: 'Powerball',
    url: 'https://data.ny.gov/resource/d6yy-54nr.json?$limit=60&$order=draw_date%20DESC',
    varName: 'POWERBALL',
    parse: parseNyPowerball,
  },
  megamillions: {
    name: 'Mega Millions',
    url: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=60&$order=draw_date%20DESC',
    varName: 'MEGAMILLIONS',
    parse: parseNyMegaMillions,
  },
  euromillions: {
    name: 'EuroMillions',
    url: 'https://www.euro-millions.com/en/results/history',
    extraClass: 'c-ball--star',
    varName: 'EUROMILLIONS',
    parse: parseEuroMillions,
  },
  uklotto: {
    name: 'UK Lotto',
    url: 'https://www.national-lottery.co.uk/lotto/results',
    extraClass: 'c-ball--bonus',
    varName: 'UKLOTTO',
    parse: parseUkLotto,
  },
};

const MIN_DRAWS = 5;

// ============================================================
// HTTP 路由
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /data/{game}.js → KV 优先，静态兜底
    const m = url.pathname.match(/^\/data\/(powerball|megamillions|euromillions|uklotto)\.js$/);
    if (m) {
      const game = m[1];
      try {
        const kvData = await env.LOTTERY_DATA.get(`data:${game}`);
        if (kvData) {
          const draws = JSON.parse(kvData);
          const body = `window.${GAMES[game].varName} = ${JSON.stringify(draws)};\n` +
                       `window.${GAMES[game].varName}_SOURCE = 'live';\n`;
          return new Response(body, {
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
              'X-Data-Source': 'kv-live',
            },
          });
        }
      } catch (e) {
        // KV 出错就走静态
      }
    }

    // 手动触发抓取（可选调试）：/api/fetch
    if (url.pathname === '/api/fetch') {
      const result = await fetchAllGames(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 查看数据状态
    if (url.pathname === '/api/status') {
      const status = {};
      for (const game of Object.keys(GAMES)) {
        const raw = await env.LOTTERY_DATA.get(`data:${game}`);
        const updated = await env.LOTTERY_DATA.get(`updated:${game}`);
        status[game] = raw ? { draws: JSON.parse(raw).length, updated } : null;
      }
      return new Response(JSON.stringify(status, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Paddle webhook：支付/许可证事件 → 验签 → 存 KV
    if (url.pathname === '/api/paddle/webhook' && request.method === 'POST') {
      return handlePaddleWebhook(request, env);
    }

    // 激活码校验：POST /api/license/activate { licenseKey, deviceId }
    if (url.pathname === '/api/license/activate' && request.method === 'POST') {
      return handleLicenseActivate(request, env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetchAllGames(env));
  },
};

// ============================================================
// 抓取主流程
// ============================================================
async function fetchAllGames(env) {
  const result = {};
  for (const [game, cfg] of Object.entries(GAMES)) {
    try {
      const headers = cfg.url.includes('data.ny.gov') ? {} : { 'User-Agent': UA };
      const res = await fetch(cfg.url, { headers });
      if (!res.ok) { result[game] = `HTTP ${res.status}`; continue; }
      const html = await res.text();
      const draws = cfg.parse(html, cfg);
      if (draws.length < MIN_DRAWS) { result[game] = `parsed ${draws.length}, need >= ${MIN_DRAWS}`; continue; }
      await env.LOTTERY_DATA.put(`data:${game}`, JSON.stringify(draws));
      const now = new Date().toISOString();
      await env.LOTTERY_DATA.put(`updated:${game}`, now);
      result[game] = `ok, ${draws.length} draws`;
    } catch (err) {
      result[game] = `error: ${err.message}`;
    }
  }
  return result;
}

// ============================================================
// Parsers（与 src/fetch_global.mjs 同源）
// ============================================================
function numFromMatch(m) {
  if (!m) return null;
  const n = parseInt(m.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function formatDate(s) {
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

function parseNyPowerball(jsonText) {
  // data.ny.gov Powerball 官方数据集 d6yy-54nr
  // winning_numbers: "14 40 52 55 57"（5 个白球空格分隔），无 PB 字段时 extra 为空
  const rows = JSON.parse(jsonText);
  const draws = [];
  for (const r of rows) {
    if (!r.draw_date || !r.winning_numbers) continue;
    const nums = r.winning_numbers.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 69);
    if (nums.length < 5) continue;
    draws.push({
      date: r.draw_date.slice(0, 10),
      main: nums.slice(0, 5).sort((a, b) => a - b),
      extra: nums.length > 5 ? [nums[5]] : [],
    });
  }
  return draws;
}

function parseNyMegaMillions(jsonText) {
  // data.ny.gov Mega Millions 官方数据集 5xaw-6ayf
  // winning_numbers: "01 15 24 35 47"，mega_ball 单独字段
  const rows = JSON.parse(jsonText);
  const draws = [];
  for (const r of rows) {
    if (!r.draw_date || !r.winning_numbers || !r.mega_ball) continue;
    const nums = r.winning_numbers.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 70);
    if (nums.length < 5) continue;
    draws.push({
      date: r.draw_date.slice(0, 10),
      main: nums.slice(0, 5).sort((a, b) => a - b),
      extra: [Number(r.mega_ball)],
    });
  }
  return draws;
}

function parseUsStyle(html, cfg) {
  const parts = html.split('c-draw-card__draw-date-sub');
  const draws = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const dateMatch = chunk.match(/^">([^<]+)</);
    if (!dateMatch) continue;
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
        date: formatDate(dateMatch[1].trim()),
        main: white.sort((a, b) => a - b),
        extra: [Number(extraMatch[1])],
      });
    }
  }
  return draws;
}

function parseEuroMillions(html) {
  const draws = [];
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                   jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const cardRe = /<(?:article|li|div)\s+[^>]*class="[^"]*(?:result|draw|ball-row)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|li|div)>/gi;
  const cards = [...html.matchAll(cardRe)];
  if (cards.length === 0) return draws;

  for (const card of cards) {
    const chunk = card[1];
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

    const allNums = [...chunk.matchAll(/>\s*(\d{1,2})\s*</g)]
      .map(x => parseInt(x[1], 10))
      .filter(n => n >= 1 && n <= 50);
    if (allNums.length < 7) continue;

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
  const draws = [];
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                   jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const cardRe = /<(?:article|li|div)\s+[^>]*class="[^"]*(?:result|draw|lotto-row|ball-row)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|li|div)>/gi;
  const cards = [...html.matchAll(cardRe)];
  if (cards.length === 0) return draws;

  for (const card of cards) {
    const chunk = card[1];
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

    const allNums = [...chunk.matchAll(/>\s*(\d{1,2})\s*</g)]
      .map(x => parseInt(x[1], 10))
      .filter(n => n >= 1 && n <= 59);
    if (allNums.length < 7) continue;

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
// Paddle 收款（Plan B）：webhook + 激活码校验
// 部署后需设置 secrets：
//   wrangler secret put PADDLE_API_KEY          （Paddle 后台 API key）
//   wrangler secret put PADDLE_WEBHOOK_SECRET   （webhook 签名密钥）
// ============================================================
const PADDLE_API_BASE = 'https://api.paddle.com';

// 建完商品后把 price ID 填进来（pri_ 开头）
const TIER_BY_PRICE = {
  // 'pri_01xxxx': 'starter',   // $12.99 Starter · 10 saves
  // 'pri_01xxxx': 'standard',  // $29.99 Standard · 30 saves
  // 'pri_01xxxx': 'heavy',     // $69.99 Heavy · 100 saves
};

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyPaddleSignature(request, raw, secret) {
  const sigHeader = request.headers.get('Paddle-Signature') || '';
  const parts = {};
  sigHeader.split(';').forEach(p => {
    const idx = p.indexOf('=');
    if (idx > 0) parts[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
  });
  const ts = Number(parts.ts);
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  // 防重放：时间戳误差超过 10 秒拒绝
  if (Math.abs(Date.now() / 1000 - ts) > 10) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts + ':' + raw));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === h1;
}

async function handlePaddleWebhook(request, env) {
  const secret = env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return jsonResp({ error: 'webhook secret not configured' }, 503);

  const raw = await request.text();
  const ok = await verifyPaddleSignature(request, raw, secret);
  if (!ok) return jsonResp({ error: 'invalid signature' }, 401);

  let event;
  try { event = JSON.parse(raw); } catch (e) { return jsonResp({ error: 'bad json' }, 400); }

  try {
    if (event.event_type === 'transaction.completed') {
      const tx = event.data || {};
      const priceIds = (tx.items || []).map(i => i.price && i.price.id).filter(Boolean);
      const tier = priceIds.map(id => TIER_BY_PRICE[id]).find(Boolean) || null;
      await env.LOTTERY_DATA.put('order:' + tx.id, JSON.stringify({
        tier, priceIds,
        customerId: tx.customer_id || null,
        at: new Date().toISOString(),
      }));
    }
    if (event.event_type === 'license_keys.created' || event.event_type === 'license_keys.updated') {
      const lk = event.data || {};
      if (lk.key) {
        const prevRaw = await env.LOTTERY_DATA.get('license:' + lk.key);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        prev.status = lk.status || prev.status;
        prev.instanceLimit = lk.instance_limit || prev.instanceLimit;
        prev.updatedAt = new Date().toISOString();
        await env.LOTTERY_DATA.put('license:' + lk.key, JSON.stringify(prev));
      }
    }
  } catch (e) {
    // 存储失败不阻塞应答；失败时 Paddle 会重试
  }
  return jsonResp({ ok: true });
}

async function handleLicenseActivate(request, env) {
  const apiKey = env.PADDLE_API_KEY;
  if (!apiKey) return jsonResp({ error: 'license service not configured' }, 503);

  const body = await request.json().catch(() => null);
  const licenseKey = String((body && body.licenseKey) || '').trim();
  const deviceId = String((body && body.deviceId) || '').trim() || 'default-device';
  if (!licenseKey) return jsonResp({ error: 'licenseKey required' }, 400);

  // KV 缓存里标记为非 active 的直接拒绝（省一次 API 调用）
  const cachedRaw = await env.LOTTERY_DATA.get('license:' + licenseKey);
  let cached = null;
  if (cachedRaw) {
    try {
      cached = JSON.parse(cachedRaw);
      if (cached.status && cached.status !== 'active') {
        return jsonResp({ error: 'license key is not active' }, 403);
      }
    } catch (e) {}
  }

  // Paddle 官方校验（重复激活同一 deviceId 是幂等的）
  const res = await fetch(PADDLE_API_BASE + '/activate-license', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, instance_id: deviceId.slice(0, 255) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 404 || res.status === 422) {
      return jsonResp({ error: 'invalid or expired license key' }, 401);
    }
    return jsonResp({ error: 'license validation failed' }, 502);
  }
  const lk = data && data.data;

  // tier：本地 price 映射优先，其次 webhook 缓存，兜底 standard
  let tier = null;
  const pid = lk && (lk.price_id || (lk.billing_details && lk.billing_details.price_id));
  if (pid && TIER_BY_PRICE[pid]) tier = TIER_BY_PRICE[pid];
  if (!tier && cached && cached.tier) tier = cached.tier;
  if (!tier) tier = 'standard';

  try {
    await env.LOTTERY_DATA.put(
      'activation:' + licenseKey + ':' + deviceId,
      JSON.stringify({ tier, deviceId, activatedAt: new Date().toISOString() })
    );
  } catch (e) {}

  return jsonResp({ ok: true, tier, key: licenseKey });
}
