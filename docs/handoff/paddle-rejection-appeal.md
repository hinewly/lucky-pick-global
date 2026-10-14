# Paddle 注册被拒与申诉（2026-10-08）

> 背景：Paddle 收款底座（paddle-payment-scaffold.md）完成后，当天走完注册+账户验证，但域名审查被拒，已申诉。

## 时间线（2026-10-08 当天）
1. **注册完成**：vendors.paddle.com 账号建好（LuckyPick Global / hinewly@163.com / Individual / $0-$100K / 中国成都地址），邮箱验证通过
2. **网站合规补课**：为通过验证新建 4 个页面（commit 569d3d4，SW v55）：
   - /terms、/privacy、/refunds（英文政策页，邮箱按家族规范 JS 拼接防 Cloudflare 混淆）
   - /pricing（独立定价页——Paddle 表单校验要求定价页必须是带路径的 URL，裸首页会被拒）
   - index.html 页脚加三个政策链接；修复了 contact-line 里遗留的 `[email protected]` 坏占位符
3. **账户验证 5 步提交**：个人信息（生日 1976-01-23）、业务信息、网站 URL、合规声明（4 项全部 No），状态进入 under-review
4. **域名审查被拒**（邮件）：被机器归类为 **Adult-Only Content/Gambling + Other/Donations**
   - 判断：站点满屏 lottery/Powerball 关键词 → 被归入博彩；页脚 PayPal 打赏二维码（paypal.me/hinewly）→ 被归入捐赠
5. **整改**：删除整个 Tip/Support 区块（含注释掉的 USDT 收款代码）、SW 里 paypal-qr 预缓存项、app.js 调试面板 PayPal 行（commit 60f3a60，SW v56）。线上 curl 验证 0 处 paypal 引用
6. **申诉已提交**（Typeform/Taktile 表单，hinewly@163.com）：
   - 分类选 Other Software；7b 详细说明「非博彩、无彩票销售/下注，Pro=$9.99 一次性软件解锁，打赏区已删，政策页齐全」
   - 官方答复：**3 个工作日内复审**，结果发邮件

## 待观察
- [ ] 申诉结果邮件（hinewly@163.com，3 个工作日内）
- 申诉通过 → 回到 paddle-payment-scaffold.md 的「接线步骤」继续（建商品/token/webhook/域名审批）
- 申诉失败 → Plan C（Gumroad，但打款还是绕回 PayPal）或 Plan D（USDT，TRC20 地址等用户提供）或换干净产品/独立域名重走 Paddle

## 经验教训（家族复用）
1. **PayPal 打赏/捐赠区块是支付平台审核的「捐赠类」红线**——已从站点永久移除，其他项目接入支付平台时同样注意
2. **彩票主题内容容易被机器归入 Gambling**，申诉话术核心 = 强调「工具非博彩、无真实货币交易」
3. Paddle 验证表单的 Pricing page 字段必须是带路径 URL（/pricing），裸域名校验不过
4. Playwright 操作 Typeform 的 Radix 下拉：点击 option 不生效时，用「打开对话框 → 纯键盘 ArrowDown 导航 → Enter」100% 可靠

## 申诉结果（2026-10-15 确认）

- **申诉被驳回**。Paddle 后台「Verify your account」步骤显示 Failed：We couldn't approve your website。
- 邮箱全量搜索确认：除 10-08 原始拒信外无任何后续邮件，结果只更新在后台状态。
- **结论：Paddle 在 lucky.daobox.app + 当前站点形态下不可用**。机器分类仍为 Gambling + Donations，申诉无法推翻。
- 若走 Paddle，需按邮件指引「product offering 变更后以新 application 重新申请」——即新域名 + 重构产品定位。

## A1 方案执行：draw 子域名重提（2026-10-15 晚）

- **Paddle 后台确认**：Website approval 按「域名/子域名」单独审批，同账号可直接 Add domain 重提，无需新建账号。
- **代码改造**（commit 2c5b96f，v1.3 / SW v57，Version 8576a9ac）：
  - 新增 `draw.daobox.app` 路由（`lucky.` 保留过渡，两域名同时在线）
  - SEO 中性化：title/description/keywords/og/twitter 改「Random Number & Draw Generator」口径；keywords 移除 lottery/Powerball/Mega Millions；指南首句改为通用抽签工具（giveaways, raffles, game nights + lottery-style picks）
  - 剩余 lottery/Powerball 引用仅保留：游戏 Tab、数据文件、法律免责声明（免责声明是过审加分项，勿删）
  - terms/privacy/pricing 内 URL 全部指向 draw.daobox.app
- **部署验证**：draw 域 5 个页面全部 200；lucky 域过渡正常；测试激活码 LPG-TEST-AYPU-NDJW 在 draw 域返回 pro-test ✓
- **Paddle 送审**：draw.daobox.app 已提交，状态 In review（2026-10-15）
- 周任务机器人 10-12 曾升 SW v56→v57 并更新开奖数据，rebase 时已吸收，部署包含最新数据

## 下一步（审批通过后接线）

1. Paddle 建单档商品 $9.99（勾 license key）
2. app.js PADDLE_CONFIG 填 clientToken + price ID；worker TIER_BY_PRICE 映射
3. wrangler secret put PADDLE_API_KEY / PADDLE_WEBHOOK_SECRET
4. webhook URL 填 https://draw.daobox.app/api/paddle/webhook
5. sandbox 测单 → 切 production；网页端购买入口域名引用全部在 draw 域下无需再改
