# LuckyPick Global — Session Handoff

> 接手这个项目时读这份文档就能快速上手。
> 最后更新：2026-10-05（收款链路排查日）

## 项目状态 (2026-10-03)

**LuckyPick Global** — Intentional lottery number picker (Powerball/MegaMillions).
纯前端 PWA + Cloudflare Worker（静态托管 + Cron 数据抓取 + KV）。

- **Live URL**: https://lucky.daobox.app ← 主站（用户日常看这个）
- **GitHub Pages 备份**: https://hinewly.github.io/lucky-pick-global/
- **GitHub**: https://github.com/hinewly/lucky-pick-global
- **产品版本**: v1.0（显示用）；SW 缓存版本 v50（内部递增，两者已解耦）
- **定位**: "Don't just leave it to chance — put yourself into your numbers." / Intentional picks, not blind luck

## ⚙️ 基础设施（重要，接手必读）

- **Cloudflare API Token**: 存在 `/Users/zoujiean/CodeX/lucky-pick-global/.env`（已 gitignore）
  - 永久有效，部署**不需要**用户再认证/点链接
  - 用法：`export CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)`
- **wrangler 路径**（未安装到本项目）：`/Users/zoujiean/CodeX/vocab-pwa/worker/node_modules/.bin/wrangler`
- **wrangler 日志权限问题**：`~/Library/Preferences/.wrangler` 不可写时报 EPERM，
  解决：命令前加 `XDG_CONFIG_HOME=/tmp/wrangler-cfg`
- **KV namespace**: `LOTTERY_DATA` id=`a461eefd321f4182b16e3c2437fc1683`
- **Cron**: 每周一 01:00 UTC，Worker `scheduled` handler 抓数据存 KV
- **数据路由**: `/data/{game}.js` → KV 优先（响应头 `x-data-source: kv-live`），静态文件兜底
  - wrangler.toml 里 `run_worker_first = ["/data/*", "/api/*"]` 是关键，没它静态资源会先拦走请求
- **API 端点**: `/api/status`（数据状态）、`/api/fetch`（手动触发抓取）
- **数据源**: Powerball=`data.ny.gov/resource/d6yy-54nr.json`、MegaMillions=`data.ny.gov/resource/5xaw-6ayf.json`
  （纽约州官方开放数据，免费无反爬；lotteryusa.com 会拦 Cloudflare Worker IP，别用）

## ✅ 今天完成的功能（2026-10-03）

1. 部署到 lucky.daobox.app（原 GitHub Pages 计划变更）
2. PayPal 打赏二维码（icons/paypal-qr.png → paypal.me/hinewly）
3. 数据管道：GitHub Actions → Cloudflare Cron + KV 实时供应（60 期）
4. Intentional 文案上线（tagline-intent 斜体 + tagline）
5. **频率统计**：Recent Draws 卡内 20/50 期窗口，hot(>130%期望)/warm/cold(<70%) 色标网格
6. **自选号码**："Or Enter Your Own" 卡（在 Recent Draws 之下、Factors 之上——用户特意要求这个位置）
   - 1/2/3 注，校验个数/范围/重复，通过后进 Your Numbers 结果区
7. 交互：因素添加从弹窗改**内联输入**（lucky/avoid 可连续加，Enter 提交，inline-msg 报错）
8. 版本规范：显示 v1.0，内部 CACHE_VERSION 独立递增

## 📁 关键文件

- `public/index.html` — 页面结构（手填卡在 factors 之前）
- `public/js/app.js` — 主逻辑（renderFreqStats / renderManualInputs / useManualNumbers / openAddModal=内联版）
- `public/js/engine.js` — Engine.GAMES 配置 + 算法（不动 AI 部分——用户明确说过）
- `public/service-worker.js` — CACHE_VERSION 每次发版 bump
- `worker/src/index.js` — KV 数据服务 + cron 抓取 + 4 个 parser
- `worker/wrangler.toml` — 路由/KV/cron/assets 配置
- `TODO.md` — 待开发清单（状态已同步）
- `public/data/*.js` — seed 数据（KV 没数据时的兜底）

## 📋 下一步（按优先级，详见 TODO.md）

1. ~~SEO 基础优化~~ ✅ 已完成 2026-10-03：已上线（SW v50）。剩用户手动提交 Google Search Console
2. **Pro 付费（被卡，转 Plan B）**：LS 商店已建但 Activate Store 和税表都走 Stripe，Stripe 拒绝中国 → 已发邮件问 LS 客服，等回复
   - Plan B: **Paddle**（不走 Stripe，打款到 Payoneer，中国开发者成熟路线）
     ✅ 2026-10-08 代码侧已上线（webhook + 激活码接口 + Pro 弹窗结算），等账号注册后填密钥接线，
     详见 docs/handoff/paddle-payment-scaffold.md
   - Plan C: Gumroad / Plan D: USDT（代码已写好，就差 TRC20 地址）
   - 详见 TODO.md 第 4 条（2026-10-05 已更新完整行动清单）
3. **收款账户**：万里汇 Citibank 美元账户已拿到（wf-usd-account.txt），但 PayPal 绑定时被拒；节后问万里汇 + PayPal 客服（话术见 docs/payment-support-questions.md）
   - 建议同时注册 Payoneer 作为备用收款基础设施
4. **EuroMillions/UK Lotto 数据源**：原网站拦 Cloudflare IP，需找官方开放 API
5. Reddit/Product Hunt 推广（SEO 完成后）
6. 远期：Capacitor iOS 打包 → App Store StoreKit

## 👤 用户偏好（务必遵守）

- 大白话，避免技术黑话
- **先讨论/确认再动手**
- UI 反馈通过浏览器标注提意见，改完让他刷新验证
- 不喜欢多余弹窗（因素输入已改内联）
- 算法保持黑盒（不向用户暴露权重细节）
- 部署链路已通，**不需要用户参与认证**（API Token 常驻 .env）

## 🔧 常用命令

```bash
# 部署（项目根目录）
export CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)
cd worker && XDG_CONFIG_HOME=/tmp/wrangler-cfg /Users/zoujiean/CodeX/vocab-pwa/worker/node_modules/.bin/wrangler deploy

# 发版 bump（public/service-worker.js）
CACHE_VERSION = 'vN+' 且 PRECACHE_URLS 里 ?v=N 同步替换

# 提交推送（HTTP/2 偶发失败时用 1.1）
git -c http.version=HTTP/1.1 push origin main
```

## 已知问题

- `git push` 偶发 `HTTP2 framing layer` 错误 → 加 `-c http.version=HTTP/1.1`
- EuroMillions/UK Lotto fetch 404（源站拦 Worker IP），`/api/fetch` 会返回 404——不是 bug，待换数据源
- 沙盒对 `.git`、`~/Library/Preferences` 等路径默认只读，需要时用 request_permissions 申请
