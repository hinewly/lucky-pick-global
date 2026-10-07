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
