# Gumroad 注册与收款接入（Plan C）

- last_updated: 2026-10-17 21:09
- status: active（商品已发布、站内已接线、创建者测试通过；待真实订单、payout 审核与商品命名调整）
- version: v1.4

## 任务目标

注册 Gumroad 商店，把 LuckyPick Global Pro（$9.99 一次性）挂上去卖，实际收款链路为 Gumroad → PayPal → 万里汇美元账户 → 支付宝/国内银行卡，形成 Paddle 之后的现役海外收款链路。

## 注册信息（已定，直接用）

| 项 | 值 |
|---|---|
| 邮箱 | hinewly@outlook.com（海外平台统一 Outlook，见项目 AGENTS.md） |
| 密码 | 已存 `/Users/zoujiean/CodeX/docs/账号密码管理.md`，不在交接文档重复保存 |
| 姓名 | Guangfan Zou（英文）/ 邹光凡 |
| 国家 | China |
| 业务 URL | https://draw.daobox.app（当前站点主域） |

## 当前进度（2026-10-17）

- ✅ 账号注册成功（hinewly@outlook.com），已进 Dashboard；密码见 `/Users/zoujiean/CodeX/docs/账号密码管理.md`
- ✅ 邮箱验证已完成，账号已进入可用状态
- ✅ 收款方式已配置并保存：PayPal（中国账户唯一选项，2% payout fee）+ Individual + Guangfan Zou + 成都英文地址 + 611731 + 生日 1976-01-23；国家声明两处已勾选
- ✅ 商品已发布：https://hinewly.gumroad.com/l/luckypick-pro
- ✅ 创建者测试购买已通过：未真实扣款，license key 已生成；线上 `/api/license/activate` 返回 `{ok:true,tier:'pro'}`
- 备注：万里汇 Citibank 直付选项在中国账户下不出现，Gumroad 中国只支持 PayPal 提现 → 链路实际为 Gumroad → PayPal → 万里汇 → 支付宝/银行卡
- 备注：Gumroad 本项目只面向海外用户，不给国内用户开通；不需要为收款链路保持国内 VPN 常开。当前测试环境出口 IP 是新加坡，Checkout 显示 SGD 属于 Gumroad 按买家 IP 自动换算，不是配置错误。

## 注册流程（原始计划，供参考）

> 这一段是历史方案；实际配置请以上方「当前进度」为准。中国账户实际 payout 走 PayPal，不能直接配 Gumroad → 万里汇。

1. 打开 https://gumroad.com/signup，邮箱+密码注册
2. ⚠️ 邮箱验证：Gumroad 会发验证邮件到 Outlook——需要用户转发验证码/链接，或提供 Outlook 密码由 Codex 收
3. 完善资料：姓名、国家 China、账号名（建议 luckypickglobal 或 daobox）
4. 配置收款（Payouts）：
   - 方式 A（推荐）：Direct deposit (US bank)——填万里汇 Citibank 账户
     - Account: 77729999990336995 / ACH Routing: 031100209 / SWIFT: CITIUS33
     - Holder: Zou Guangfan（与万里汇实名一致）
     - 来源文件: lucky-pick-global/wf-usd-account.txt
   - 方式 B（备用）：PayPal——paypal.me/hinewly（已绑万里汇，多一道环节）
5. 建商品（单档，勿恢复三档）：见下方文案
6. 测试购买（sandbox 无，用最小价 $1 测试单验证收款到账万里汇）

## 商品文案（$9.99 单档 Pro，勾选 License key）

- **Name**: LuckyPick Pro
- **Price**: $9.99（one-time，启用 License key）
- **Cover**: icons/icon-512.png
- **Description**:
  Unlock LuckyPick Pro — unlimited factor generation, up to 10 sets per draw,
  checkbox export to image / .txt, and unlimited saves.
  One-time purchase. License key delivered instantly after checkout.
  The app is free forever — Pro just removes the limits.

## 站内接线（注册成功后）

- Worker 现有 `/api/license/activate` 是按 Paddle license API 写的，Gumroad 用自己的 License API（`/api/license/activate`，格式不同）——需要小改 worker 或加 Gumroad 分支
- Gumroad webhook（sale 事件）→ 可选：存 KV 做订单表
- 前端 Pro 弹窗购买按钮跳 Gumroad 商品页（新窗口），激活仍走「Enter license key」

## 注意事项

- Gumroad 对中国卖家：中国账户 payout 目前实际走 PayPal（2% payout fee），再进万里汇 Citibank 美元账户；不要在文档中写“Gumroad 直接付万里汇”作为当前已配置路径
- 收款账户信息绝不能再放公开仓库；wf-usd-account.txt 已 gitignore
- 万里汇提现到支付宝/银行卡在万里汇后台「提款」操作，攒够再提
- 首笔真实 payout 前 Gumroad 可能人审；真实交易前后要检查 Gumroad Payout 页。
- 不要频繁用 VPN 自购真实商品，避免触发风控；已完成的是创建者测试购买，无真实扣款。
- `LuckyPick` 名称有被支付/平台风控误判为彩票类工具的可能性。当前商品描述只写号码组织和随机生成，没有博彩、预测、提高中奖概率等表述，暂时可控；但下一步应评估改成更中性商品名（例如 Number Studio Pro / Random Studio Pro / Pick Studio Pro），并把 Gumroad 逐步扩展成 DaoBox 家族软件商店。

## 相关文件

- lucky-pick-global/wf-usd-account.txt（银行账户，勿提交）
- docs/账号密码管理.md（密码档案）
- daobox-home/docs/handoff/payoneer-worldfirst-payment-rails.md（线路图）
- lucky-pick-global/docs/handoff/feature-wall-paywall.md（定价与功能墙）
- lucky-pick-global/worker/src/index.js（激活接口，待适配 Gumroad）

## 2026-10-17 完成记录

- License key 内容块已插入并保存；邮箱验证后商品成功发布。
- Checkout 底价为 US$9.99；买家看到的 SGD/其他币种是 Gumroad 按 IP/买家地区自动换算显示，不是卖家收款国选错。
- 创建者测试单已验证：无真实扣款，license key 生成，Worker 激活接口 200。
- 站内文件更新：`public/js/app.js`、`public/service-worker.js`、`worker/src/index.js`、`worker/wrangler.toml`、`public/pricing.html`、`public/refunds.html`。
- Cloudflare Worker 部署版本：`b62c630f-2e8d-4522-bf1e-f5146c171969`。
- 前端版本 v1.4 / SW v58；代码已 commit/push：`4107de3 feat: Gumroad Pro checkout and license activation, v1.4 / SW v58`。
- 产品方向记录：Gumroad 不只放彩票/抽奖类单品；下一步考虑上架 DaoBox 家族多个学习/工具类软件，并评估把 LuckyPick Pro 商品名改得更中性。
- 已检查本地 Playwright 页面快照，把临时快照中的 Gumroad / 万里汇 / Paddle 密码抹成 `[REDACTED]`；正式密码只保留在 `/Users/zoujiean/CodeX/docs/账号密码管理.md`。

## 下一步

1. 等用户确认是否把 Gumroad 商品名从 `LuckyPick Pro` 改成更中性名称；确认后同步改商品页与站内文案。
2. 规划 Gumroad 家族商店：先上架学习/工具类产品，弱化单一彩票类入口。
3. 真实订单后检查 Gumroad Payout 页与 PayPal / 万里汇到账，再验证万里汇提现。

## 2026-10-18 更新：海外三商品链路验证

- Math Sprint Pro / Sudoku Junior Pro / Five in a Row Pro 三个商品已发布并完成 creator test purchase 验证：
  - 下单 → test purchase（未真实扣款）→ **license key 成功签发**（`76C01ED0-2FDE463D-ABCF821C-D9BDE849`）→ Sales 记录正常
  - 收据邮件已发送至 hinewly@outlook.com
- 三个商品均已在 Content 中插入 License key 内容块（这是 license 签发的开关，LuckyPick Pro 同款做法）：
  - Math Sprint Pro（ehyis）API product ID：`FvLbaV0DjGVnMC_k_Utctw==`
  - Sudoku Junior Pro（npduwr）API product ID：`5kz8ncTuyeqkkOYt2srcEg==`
  - Five in a Row Pro（ffyqmge）API product ID：`4wDFehYBQqxn8i69kgzPig==`
- 按方案 A，三个商品验证后已改回 Unpublished，等英文 App 激活链路完成后再一键重新发布；LuckyPick Pro 保持 Published。
- 测试用 100% 折扣码 DAOTEST100 已删除。
- 待办：英文 App（suan/sudoku/gomoku /en）加 Pro 激活入口 + Gumroad License API（`POST https://api.gumroad.com/v2/licenses/verify`，需 access token，在 Settings 开启）校验；完成后重新发布并去掉 test purchase 记录疑虑。
