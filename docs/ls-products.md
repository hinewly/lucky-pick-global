# Lemon Squeezy 商品文案（建商品时直接复制）

> Store: luckypickglobal.lemonsqueezy.com
> 定价依据 TODO.md 已确认方案：免费版每日 3 次保存，Pro 按保存次数解锁。

---

## 商品 1：Pro — Starter
- **Name**: LuckyPick Pro — Starter
- **Price**: $12.99（one-time，启用 License key）
- **Description**:
  Unlock LuckyPick Pro Starter — 10 extra daily saves.
  Put yourself into your numbers: personal factors, frequency stats, and intentional picks.
  One-time purchase. License key delivered instantly after checkout.

## 商品 2：Pro — Standard
- **Name**: LuckyPick Pro — Standard
- **Price**: $29.99（one-time，启用 License key）
- **Description**:
  Unlock LuckyPick Pro Standard — 30 extra daily saves.
  Put yourself into your numbers: personal factors, frequency stats, and intentional picks.
  One-time purchase. License key delivered instantly after checkout.

## 商品 3：Pro — Heavy
- **Name**: LuckyPick Pro — Heavy
- **Price**: $69.99（one-time，启用 License key）
- **Description**:
  Unlock LuckyPick Pro Heavy — 100 extra daily saves. Best value for daily players.
  Put yourself into your numbers: personal factors, frequency stats, and intentional picks.
  One-time purchase. License key delivered instantly after checkout.

## 商品 4：打赏（小）
- **Name**: Buy the dev a coffee ☕
- **Price**: $3.00（one-time，不开 license）
- **Description**:
  Enjoying LuckyPick? Your lucky numbers came through? Buy the developer a coffee.
  100% optional — the app is free forever.

## 商品 5：打赏（大）
- **Name**: Jackpot thanks! 🎰
- **Price**: $5.00（one-time，不开 license）
- **Description**:
  Hit something good? Send a bigger thank-you to keep LuckyPick growing.
  100% optional — the app is free forever.

---

## 建商品注意事项
- 三个 Pro 商品都要开启 **License key** 功能（Product → 勾选 license keys），站点激活码验证走 Worker API
- 打赏商品不勾 license
- 商品图：可先用 icons/icon-512.png
- Checkout 成功后 LS 自动发 license key 邮件给买家

## 站内兑换流程（待开发，TODO #4）
- 站内加 "Enter license key" 输入框
- Worker API `/api/license/activate` 调 LS license API 校验并记录激活
- 校验通过 → 按商品档位解锁对应保存额度
