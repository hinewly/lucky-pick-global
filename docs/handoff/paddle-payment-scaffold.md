# Paddle 收款底座（2026-10-08 凌晨）

> 背景：Lemon Squeezy 卡死（Stripe 拒中国 + 客服不回邮件），转 Plan B = Paddle。
> 定位：LuckyPick Global（lucky.daobox.app）Pro 付费，海外用户付款 → Paddle 收银台 → Payoneer → 国内银行卡。

## 本次完成
1. **前端 Pro 弹窗改造**（public/js/app.js）
   - 三档从纯展示改成可点按钮：Starter $12.99 / Standard $29.99（主推）/ Heavy $69.99
   - 点档位 → Paddle.js 懒加载 → overlay checkout（PADDLE_CONFIG 里填 token + price ID 后自动生效）
   - 未配置时点击提示 "Checkout is almost ready"，不报错
   - 弹窗新增 "Already bought? Enter license key" 激活输入框
   - checkout.completed 事件 → 提示查邮件 → 贴入 license key → 调激活接口
   - 激活成功：state.isPro=true + localStorage luckyPick.pro.v1 持久化 + 无限保存
2. **Worker 新接口**（worker/src/index.js）
   - POST /api/paddle/webhook：Paddle-Signature 验签（HMAC-SHA256 ts:body，10 秒防重放），
     transaction.completed / license_keys.created|updated 事件存 KV（order:/license: 前缀）
   - POST /api/license/activate {licenseKey, deviceId}：先查 KV 缓存（非 active 直接拒），
     再调 Paddle /activate-license 官方校验（同一 deviceId 重复激活幂等），activation: 前缀存 KV
   - tier 映射表 TIER_BY_PRICE：建完商品把 pri_xxx 填进去
3. **SW 缓存版本** v51 → v52（CACHE_VERSION + PRECACHE_URLS ?v= 同步）

## 上线验证（2026-10-08 00:50）
- app.js 线上含 PADDLE_CONFIG ✓
- /api/license/activate → 503 "license service not configured"（符合预期，密钥未填）✓
- /api/paddle/webhook → 503（签名密钥未填）✓
- commit 4e57ca4 已推送，wrangler 部署成功（Version fad0b719）

## 等账号注册完的接线步骤
1. Paddle 后台建 3 个商品（文案复用 docs/ls-products.md，LS→Paddle），勾选 License key 功能
2. app.js PADDLE_CONFIG：填 clientToken（pdl_ntfset_）+ 三个 price ID（pri_），sandbox 调通后改 production
3. worker TIER_BY_PRICE 填三个 price ID → tier 映射
4. cd worker && npx wrangler secret put PADDLE_API_KEY（Paddle 后台 API key）
5. npx wrangler secret put PADDLE_WEBHOOK_SECRET（webhook 签名密钥）
6. Paddle 后台 webhook 地址填 https://lucky.daobox.app/api/paddle/webhook，勾 transaction.completed + license_keys.*
7. Payoneer 绑定 Paddle payout；sandbox 测试卡走一单全流程
