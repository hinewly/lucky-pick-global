# 功能墙付费模式（2026-10-08 凌晨，commit e29ee30）

> 用户拍板：按"功能"切分免费/付费，不按次数；付费买体验差异而非数量。

## 收费模式（最终版）
- **免费用户**：
  - 看开奖记录、纯随机生成（不限次）、手输号码
  - **因素生成 2 组/天**（尝鲜口，按组扣额度，超了弹付费墙）
  - 保存 3 组/天（维持原状）
- **Pro $9.99 一次性**（原三档 $12.99/$29.99/$69.99 砍成单档）：
  - 因素生成不限次
  - 一次生成最多 10 组（Sets 选择器 Pro 多一档 10）
  - **勾选导出**：结果卡可 ☑ Select，导出图片（exportSetsAsImage 复用）/ .txt 文本（Blob 下载）
  - 保存不限
- 以后 AI 功能做出来再单独加购或涨价，不卖期货

## 技术要点
- 额度复用 gensToday/genLimitKey 机制，语义变为"今日因素生成组数"；FREE_GEN_LIMIT 删除，新增 FREE_FACTOR_SETS=2
- genLimitStatus()：无因素→unlimited；有因素→按 2 组/天算 remaining
- renderGenCounter 有两处相同定义（912/1304 行历史遗留），本次两处都改了
- selectedResultIdx（Set）存勾选下标，generate() 时清空
- 免责声明两处：页脚 footer + 购买弹窗底部（"does not improve your odds — draws are always random"）
- PADDLE_CONFIG.prices 单档 { pro: '' }；worker TIER_BY_PRICE 单条，tier 兜底 'pro'
- 版本：APP_VERSION v1.2 / SW v54（13 处 ?v= 同步）

## 踩坑记录
- generate() 开头有一段旧预检查引用 FREE_GEN_LIMIT（已删的常量），运行时会 ReferenceError——语法检查 node --check 不报（浏览器运行时才炸）。已删除，靠 generate() 内部的新检查兜底。

## 等接线（同 paddle-payment-scaffold.md）
Paddle 建单档商品 $9.99（勾 license key）→ app.js 填 clientToken + pri_xxx → worker 填 TIER_BY_PRICE → secrets 两个 → webhook 配 https://lucky.daobox.app/api/paddle/webhook

## 测试激活码通道（2026-10-08 补充，commit 0ec9556 + 813b0e9）
- 用户要 5 个测试码在 Paddle 注册前试激活流程
- 实现：handleLicenseActivate 里在 Paddle 校验**之前**检查 env.TEST_LICENSE_KEYS（逗号分隔，
  存 Cloudflare secret，不进公开仓库）；命中→返回 tier:pro-test；未命中→走 Paddle 官方校验
- **坑**：PADDLE_API_KEY 的 503 守卫原来在函数开头，会把测试码也拦掉——已把守卫移到测试码检查之后
- 当前 5 个测试码（已写入 secret）：LPG-TEST-AYPU-NDJW / 00R8-ZTIL / HWAG-UVVS / JDXP-U4HG / Y51E-G57A
- 已知小瑕疵：输错码时前端提示 "license service not configured"（因为落到 Paddle 分支返回 503），语义不够友好，接线后自然消失
- 激活状态存 localStorage（luckyPick.pro.v1 + deviceId），清浏览器数据后重新贴码即可恢复
