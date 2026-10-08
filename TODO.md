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

### 4. Pro 付费 — 销售平台收款
- **状态**: 🟡 代码侧已就绪，等注册 Paddle + Payoneer 账号接线（2026-10-08 更新）
- **2026-10-08 凌晨**: Paddle 收款底座已上线（commit 4e57ca4）——Pro 弹窗三档可点结算、
  /api/paddle/webhook 验签、/api/license/activate 激活码校验、SW v52。
  密钥/price ID 填入后即可收款，详见 docs/handoff/paddle-payment-scaffold.md
- **LS 当前状态（2026-10-05）**:
  - LS 账号已注册、商店 luckypickglobal 已创建、PayPal 收款已绑定 (hinewly@163.com)
  - ⛔ **Activate Store 身份验证被卡**：验证流程走 Stripe，Stripe 提示 "payouts not available in your country"（中国不支持）
  - ⛔ **税表 W-8BEN 被卡**：税表也是 Stripe 内嵌表单，加载报错 "Unable to set up tax form"
  - VPN 没用：Stripe 看的是商店注册国家（中国），不是 IP
  - ✅ 已发邮件给 LS 客服 (support@lemonsqueezy.com) 问中国卖家怎么完成验证和税表，等回复（1-2 工作日）
  - LS 官方文档确认：中国不在银行打款支持列表，PayPal 打款支持 200+ 国家
- **Plan B: Paddle（推荐）**:
  - 中国独立开发者用得最多的 MoR 平台
  - 身份验证不走 Stripe，自己做审核，中国个人开发者可注册
  - 打款走 Payoneer（派安盈）→ 提现到国内银行卡，成熟路线
  - 商品文案直接复用 docs/ls-products.md，把 LS 换成 Paddle 即可
- **Plan C: Gumroad**: PayPal 收款，可作为第二通道
- **Plan D: USDT**: app 里已写好收款代码（index.html 注释区），就差填 TRC20 地址，永远不会被卡
- **节后行动顺序（按优先级）**:
  1. 等 LS 客服邮件回复 → 有方案就继续 LS
  2. 问万里汇客服：PayPal 能不能绑万里汇 Citibank 美元账户（话术见 docs/payment-support-questions.md 第 1 部分）
  3. 问 PayPal 中国客服：跨境人民币结算选哪个行业编码（同文件第 3 部分）
  4. 注册 Payoneer（免费）：就算不走 Paddle，Payoneer 也是收款基础设施，兼容性好
  5. LS 确认走不通 → 注册 Paddle，重新走验证 + 建商品 + 接 Payoneer
  6. 全部不行 → USDT 兜底
- **技术方案（无论哪个平台都一样）**:
  - 正式版：接入 Worker API 验证激活码（像 vocab-pwa 那样）
  - 简单版：硬编码一批激活码在 JS 里（不安全但能用）
- **定价（2026-10-08 已改）**: 单档 Pro $9.99 一次性（原三档已砍）；功能墙模式——免费纯随机不限+因素2组/天+保存3组/天，Pro 因素不限+10组/次+勾选导出图/文+保存不限；详见 docs/handoff/feature-wall-paywall.md
- **2026-10-08 Paddle 被拒+申诉**: 注册/验证完成但域名审查被拒（Gambling+Donations 误判）；已删打赏区块+申诉（3 个工作日复审）；详见 docs/handoff/paddle-rejection-appeal.md

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
- **2026-10-05 补充**: 
  - ⚠️ PayPal 绑万里汇 Citibank 美元账户失败（PayPal 报"您需要一些帮助才能关联此账户"），节后问万里汇客服
  - 建议同时注册 **Payoneer**：兼容性比万里汇好，Paddle 直打 Payoneer，国内提现成熟
- **2026-10-08 Paddle 状态**: 账号已注册但域名审查被拒（详见 docs/handoff/paddle-rejection-appeal.md），
  申诉已提交等邮件；Payoneer 注册顺延到申诉结果出来后（Paddle 不通就先看 Gumroad/USDT）
- **说明**: 代码无需改动，用户自己操作
- **提醒**: 攒够金额再提，别每笔都提

### 6. USDT 真实地址
- **状态**: 等用户提供
- **内容**: 取消 index.html 里 USDT 收款区的注释，填入真实 TRC20 地址
- **代码**: 已写好。⚠️ 2026-10-08 配合 Paddle 申诉删除打赏区块时，index.html 里的 USDT 注释块一并被删，
  需要时从 git 历史（60f3a60 之前）找回或参照 docs/handoff/paddle-rejection-appeal.md 重写

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
