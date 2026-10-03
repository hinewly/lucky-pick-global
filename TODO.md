# LuckyPick Global — 待开发清单

> 按优先级分组，每一项做完打 ✅。
> 用户过完一遍后决定先做哪个。

---

## 🔴 高优先级（变现 + 上线）

### 1. 部署到 daobox.app 子域名
- **状态**: 待做
- **内容**: 用 Cloudflare Workers 把 lucky-pick-global 部署到 `lucky.daobox.app`（或用户选定的子域名）
- **做法**: 参考 vocab-pwa 的 wrangler.toml，最小 Worker 只托管静态文件（public/ 目录）
- **依赖**: 用户确认子域名名字
- **预计**: 半小时以内

### 2. PayPal 打赏卡片加二维码
- **状态**: 待做
- **内容**: 在 Tip 卡片里放一张 PayPal.me/hinewly 的二维码，桌面用户用手机扫码即可打赏
- **做法**: 生成二维码 PNG 放入 `public/icons/`，HTML 加 `<img>` 标签
- **预计**: 10 分钟

### 3. SEO 基础优化
- **状态**: 待做
- **内容**: 
  - index.html 加完整 meta 标签（title / description / keywords / og: / twitter:）
  - 添加 `sitemap.xml` 和 `robots.txt`
  - 用户手动提交 Google Search Console
- **预计**: 20 分钟

---

## 🟡 中优先级（Pro 付费闭环）

### 4. Pro 付费 — Gumroad / Lemon Squeezy 解锁码
- **状态**: 待做
- **内容**: 用户在 Gumroad/Lemon Squeezy 购买解锁码 → 在站内输入码解锁 Pro
- **前提**: 用户先去注册 Gumroad 或 Lemon Squeezy 账号
- **技术方案**:
  - 简单版：硬编码一批激活码在 JS 里（不安全但能用）
  - 正式版：接入 Worker API 验证激活码（像 vocab-pwa 那样）
- **定价（弹窗里已有）**: Starter $12.99 / Standard $29.99 / Heavy $69.99

### 5. Payoneer 提现链路
- **状态**: 用户操作
- **内容**: 注册 Payoneer → 实名认证 → 绑国内银行卡 → PayPal 后台添加提现账户
- **说明**: 代码无需改动，用户自己操作
- **提醒**: 攒够金额再提，别每笔都提

### 6. USDT 真实地址
- **状态**: 等用户提供
- **内容**: 取消 index.html 里 USDT 收款区的注释，填入真实 TRC20 地址
- **代码**: 已写好，只差地址

---

## 🟢 低优先级（推广 + 数据 + App）

### 7. Reddit 推广
- **状态**: 用户操作
- **内容**: 在 r/lottery 等版块发帖（语气：分享免费工具，不是广告）
- **建议**: 等 SEO + Pro 都上线后再发

### 8. Product Hunt 发布
- **状态**: 用户操作
- **内容**: 提交 Product Hunt（免费 PWA / no signup / entertainment tool 定位）

### 9. EuroMillions + UK Lotto 数据源
- **状态**: 待做（部分进展 2026-10-03）
- **内容**:
  - lotteryusa / euro-millions / national-lottery 都会拦 Cloudflare Worker IP
  - PB/MM 已改用 data.ny.gov 官方 JSON API（成功）
  - EU/UK 需要找各自的官方开放数据 API
- **另**: 数据抓取已从 GitHub Actions 迁到 Cloudflare Cron（每周一 01:00 UTC）+ KV 实时供应

### 10. Capacitor 打包 iOS App
- **状态**: 远期
- **内容**: 用 Capacitor 把 PWA 包成 iOS App，提交 App Store
- **前提**: Apple Developer 账号 ($99/year)

### 11. App Store 上架 + StoreKit IAP
- **状态**: 远期
- **内容**: 上架后把 Pro 收款从 Gumroad 换成苹果内购
- **前提**: 第 10 项完成

---

### 12. 频率统计 + 自选号码（借鉴国内版）
- **状态**: ✅ 已完成 2026-10-03
- Recent Draws 卡片内新增 Frequency Stats（20/50 期窗口，hot/warm/cold 颜色标记）
- 新增 "Or Enter Your Own" 自选号码卡片（1-3 注，校验范围/去重/个数，直接进结果区可保存/导图）
- 前端数据已切到 KV 实时供应（60 期最新数据）

## 已完成 ✅

- [x] PWA 三件套（manifest / SW / 注册）
- [x] GitHub Pages 部署
- [x] 4 个彩票（Powerball / Mega Millions / EuroMillions / UK Lotto）
- [x] Factor 系统（星座 / 生日 / 幸运数字 / 歌词 /梦境）
- [x] 每日免费限额 + dev mode
- [x] 导出图片 + 一键复制
- [x] PayPal.me 打赏链接
