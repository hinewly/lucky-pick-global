# LuckyPick Global — Session Handoff

> 接手这个项目时读这份文档就能快速上手。

## 项目状态 (2026-09-20)

**LuckyPick Global** — Personal lucky number picker for Powerball, Mega Millions,
EuroMillions, UK Lotto. 纯前端 PWA on GitHub Pages.

- **Live URL**: https://hinewly.github.io/lucky-pick-global/
- **GitHub**: https://github.com/hinewly/lucky-pick-global
- **Owner**: hinewly (Chinese developer)
- **Target users**: 海外 Powerball/MM/EuroMillions/UK Lotto 玩家 (English UI)

## 已完成功能 (latest commits, newest first)

| Commit | 内容 |
|---|---|
| `729629b` | docs: LOTTERIES.md reference |
| `6428888` | chore: SW v25 |
| `9632298` | hide USDT (等真实地址) |
| `0d63a39` | chore: SW v24 |
| `77ffc69` | feat: EuroMillions + UK Lotto + USDT |
| `771af08` | chore: SW v23 |
| `0e219b6` | dev mode shortcut (?dev=1) |
| `7c52f27` | chore: SW v22 |
| `3ea7c28` | fix: actually call dev mode functions |
| `7a7f148` | dev mode shortcut (#/super) |
| `b5d2113` | chore: SW v20 |
| `9fab9a6` | 5/day generation limit + dev mode |
| `35ea292` | ui: input limits (digits-only, max 9 / 256 chars) |
| `2a3f34a` | hide lucky/avoid conversion details |
| `ec7d097` | Lucky/Avoid accepts any number string (digital sum) |
| `ac99d4b` | fix: lucky/avoid range game-specific |
| `fc2cee1` | factor button help + single-number input |
| `5a69339` | ui: Recent Draws above Add Personal Factors |
| `51f0ed0` | Save to Library + daily free limit + Pro placeholder |
| `1eba880` | lyrics factor + copy + export image |
| `3d141e3` | one-click copy/save all + set count 1/3/5 |
| `e54bd63` | SW v10 |
| `d365cf3` | SW v11 |
| `acb8476` | Recent Draws to 5, fix date wrapping |
| `7c52f27` | SW v22 |

## 当前功能 (全部已部署)

### 4 个彩票
| 游戏 | 区域 | 格式 | 数据 |
|---|---|---|---|
| Powerball 🇺🇸 | US | 5/69 + 1/26 | seed 50 笔 |
| Mega Millions 🇺🇸 | US | 5/70 + 1/25 | seed 50 笔 |
| EuroMillions 🇪🇺 | EU | 5/50 + 2 Lucky Stars | seed 10 笔 |
| UK Lotto 🇬🇧 | UK | 6/59 + 1 Bonus | seed 10 笔 |

### Factor 系统
- 🍀 Lucky # — 数字根算法（用户输入任意 ≤ 9 位数字，自动收成 [1, max]）
- 🚫 Avoid # — 同 Lucky
- 📅 Birthday / Date
- ♈ Zodiac Sign (12 星座)
- 💭 Dream Symbol
- 🔢 Life Path Number
- 🎵 Lyric / Phrase — 黑盒算法（text + 时间戳 + random salt）

### Generation 系统
- 每次 Generate 1-10 套（默认 3，UI 可切 1/3/5）
- 每套号码按游戏规则生成
- Save to Library（每天 3/天免费，dev/pro 无限）

### Save to Library
- 每天 3 次免费保存
- 跨 session 保留
- 每条可：复制 / 导出图片 / 删除
- URL：`?dev=1` 切 dev mode（绕过所有限制，紫色虚线框提示）

### 导出图片
- 单 set / 多 set 都支持
- 多 set 时垂直排列
- 输出 PNG 800x800+

### Copy all
- 一键复制所有 set 到剪贴板

### Dev Mode
- URL: `https://.../?dev=1` (开) / `?dev=0` (关)
- localStorage flag: `luckyPick.devMode`
- 用于开发者测试，跳过所有限制

### 收款
- PayPal.me: paypal.me/hinewly (保留)
- USDT (TRC20): 代码就绪但暂时注释掉（等真实地址）

### GitHub Action
- 每周一自动跑 fetcher + bump SW
- `.github/workflows/weekly-fetch.yml`
- 当前只抓 Powerball + Mega Millions (欧彩票 fetcher 是占位)

### 数据源
- `lotteryusa.com/powerball/year` — Powerball, Mega Millions
- `euro-millions.com/en/results/history` — EuroMillions (TODO 实际 parser)
- `national-lottery.co.uk/lotto/results` — UK Lotto (TODO 实际 parser)

## 项目结构

```
lucky-pick-global/
├── public/
│   ├── index.html          # 主页面 (English)
│   ├── service-worker.js   # PWA offline cache (currently v25)
│   ├── manifest.json
│   ├── css/styles.css
│   ├── js/
│   │   ├── engine.js       # 核心算法 + 4 games config
│   │   └── app.js          # UI 逻辑
│   ├── data/
│   │   ├── powerball.js    # 50 draws
│   │   ├── megamillions.js # 50 draws
│   │   ├── euromillions.js # 10 draws (seed)
│   │   └── uklotto.js      # 10 draws (seed)
│   └── icons/
├── src/
│   └── fetch_global.mjs    # 抓取脚本 (4 games 支持, EU parser 占位)
├── .github/workflows/
│   ├── deploy.yml          # GitHub Pages 自动部署
│   └── weekly-fetch.yml    # 每周一自动抓数据
├── README.md
└── LOTTERIES.md           # 4 个彩票的完整规则文档
```

## 已知 TODO（用户提过但没做）

1. **欧彩票真实 fetcher** — `parseEuroMillions` 和 `parseUkLotto` 是占位，
   需要根据真实站点 DOM 调整
2. **GitHub Action 抓取欧彩票** — 当前 weekly-fetch.yml 只处理 PB/MM
3. **USDT 真实地址** — 用户还没注册钱包
4. **Capacitor 打包 iOS App** — 用户最终目标
5. **接 StoreKit (Apple IAP)** — App Store 上架后
6. **Pro 收费** — 用户在讨论中，暂未实现

## 用户的沟通偏好

- 喜欢**大白话**（避免技术黑话）
- 喜欢**先讨论再实施**
- 容易发现自己不喜欢某个功能（要求简化）
- 中文母语者，但 App 是英文（面向海外用户）
- 审美偏简：**modal 不要太多说明**，让用户看底下的 help
- 喜欢**隐藏算法**（"你不用让用户知道我背后怎么算"）
- 不喜欢暗黑设计（之前讨论过的"藏号码"被否决）

## 用户的"超级用户"模式

URL: `https://.../?dev=1` (绕过生成 + 保存的所有限制)

## 下次继续的建议

**先检查**：
- 浏览器刷新后是否能正常显示 4 个 tabs
- EuroMillions / UK Lotto 数据是否正确加载
- Dev mode 切换是否正常

**然后可以做**：
- 写 EuroMillions / UK Lotto 真实 fetcher parser
- 让 weekly-fetch.yml 也处理 EU games
- 给 USDT 加真实地址
