# LuckyPick Global — 待开发清单

> 按优先级分组，每一项做完打 ✅。
> 用户过完一遍后决定先做哪个。

---

## 🔴 高优先级（变现 + 上线）

### 1. 部署到 daobox.app 子域名
- **状态**: ✅ 已完成 2026-10-03
- **结果**: https://lucky.daobox.app （Cloudflare Workers 托管，API Token 已配置永久免认证）

### 2. PayPal 打赏卡片加二维码
- **状态**: ✅ 已完成 2026-10-03
- **结果**: Tip 卡片内已有二维码（icons/paypal-qr.png），支持手机扫码

### 3. SEO 基础优化
- **状态**: ✅ 已完成 2026-10-03（meta/OG/Twitter/canonical + robots.txt + sitemap.xml 已上线并验证；SW v50）
- **剩余**: 用户手动提交 Google Search Console（https://search.google.com/search-console ，提交 https://lucky.daobox.app/sitemap.xml ）
- **预计**: 20 分钟

---

## 🟡 中优先级（Pro 付费闭环）

### 4. Pro 付费 — Lemon Squeezy 解锁码
- **状态**: 🔶 进行中 2026-10-03
- **进展**: LS 账号已注册+邮箱验证；商店 luckypickglobal 已创建；PayPal 收款已绑定 (hinewly@163.com)
  - 注意：LS 对中国卖家不支持银行收款，只支持 PayPal（万里汇美元账号没法直连 LS，改走 PayPal 中转）
  - 商品文案已备好：docs/ls-products.md
- **待办（用户下次回来，按顺序）**:
  1. **填税表 W-8BEN**：Payouts 页黄条 "Submit your tax information" → Individual / China / 拼音名 (Guangfan Zou) / 国内地址拼音 / 无美国税号 / 打字签名
  2. **设 2FA**：设置清单第 4 步 Configure（需手机装验证器 App）
  3. **Activate Store** 身份验证
  4. 解锁后建 5 个商品（3 个 Pro 档 + 2 个打赏，文案见 docs/ls-products.md）
  5. 站内开发兑换流程：license key 输入框 + Worker `/api/license/activate`
- **备选计划**: 注册 Gumroad 作第二通道（支持直填万里汇美元账号打款，少绕 PayPal 一道弯）
- **技术方案**:
  - 简单版：硬编码一批激活码在 JS 里（不安全但能用）
  - 正式版：接入 Worker API 验证激活码（像 vocab-pwa 那样）
- **定价（弹窗里已有）**: Starter $12.99 / Standard $29.99 / Heavy $69.99

### 5. 收款账户（万里汇 WorldFirst）
- **状态**: 🔶 审核中 2026-10-03（已提交实名认证材料，当天 18:00 前出结果，最迟 1-2 个工作日）
- **进展**: 走"跨境电商"个人流程注册（公司名填"无"），B2B/数娱出海通道均不适用
- **2026-10-04 更新**:
  - ⚠️ 客服确认：卖软件/虚拟商品必须用"数娱出海开发者账户"，跨境电商/B2B 类型不符（B2B 结汇要物流凭证、报关单）
  - ✅ 已重新申请开发者账户（问卷：工具与UGC平台 / 自有网站 / 北美+欧洲 / 月流水小于1万美元），实名资料已提交，1-2 工作日审核
  - ⏳ 审核通过后：用开发者账户重新申请美元收款账号 → 发账号信息配 PayPal
- **2026-10-03 晚更新**:
  - ✅ 账户激活，已登录后台（注意：账户类型显示"开发者账户"，来源待确认，不影响收付款功能）
  - ✅ 提现收款人已添加：**支付宝**（选了"自建站"申请收款账户；银行卡收款人以后可补加，待办里"同名银行账户"如仍挂起需补绑银行卡）
  - ✅ 提示"人民币 vs 离岸人民币/出口退税"与个人虚拟商品卖家无关，选人民币即可
  - ⏳ **美元收款账号申请审核中**（自建站；通过后在"资金管理"可见 Bank Name / Routing Number / Account Number）
- **审核通过后**: 拿美元收款账号 → 加到 PayPal 提现（作为美国银行账户）→ 钱到万里汇 → 提现到支付宝/银行卡
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
