# Instagram 推广视频（LuckyPick Global）交接

- last_updated: 2026-11-02 10:50
- status: active
- version: 视频 v1.4（发布版）

## 任务目标

为 LuckyPick Global（海外彩票选号器，https://lucky.daobox.app）制作 Instagram 推广视频 + 帖子文案，拓展海外用户。

## 当前状态

v1.4 发布版已生成。网页端注册 Instagram 卡在 +86 手机短信验证码收不到（重发 3 次无效，Meta 对中国号码常静默不发）。2026-11-02 02:40 转向方案 B：iPhone 装 Instagram App 用 App 端注册（风控不同，常只需邮箱验证）。因国区 App Store 无 Meta 应用，已为用户写好美区 Apple ID 创建 + iPhone 代理配置操作指南：docs/promo/海外AppleID下载Instagram操作指南.md。用户决定不绑死 Ins，已整理多渠道推广方案：docs/promo/海外推广渠道清单.md（P0=Reddit+Lottery Post 垂直论坛，P1=Product Hunt/YouTube/X，含 30 天行动计划和合规红线）。2026-11-02 上午已开工：① 头像/文案包/执行清单三份文档完成并 push（文案包=docs/promo/海外推广文案包-第一波-20261103.md）；② Reddit 账号 u/luckypickapp 注册成功（密码已登记账号库），已加入 r/Lottery、r/Powerball、r/SideProject、r/InternetIsBeautiful，养号中不发帖；③ 用户确认两号策略：luckypickapp=LuckyPick 专用，旧号 DaoBoxStudio 留其他产品；X 复用 @hinewly2025；④ Lottery Post 注册卡在 Cloudflare 人机验证（浏览器窗口需用户手点勾选框），等待用户配合；⑤ Google OAuth 在自动化浏览器中被 Google 拦截（"此浏览器可能不安全"），YouTube 上传需用户在自己 Chrome 登录后手动传或另想办法。浏览器会话：promo_ctl.js tty + promo-accounts-profile。

### v1.4 修复（2026-11-02 01:40，重要教训）

- **用户听出第 1 句重复**：排查确认 edge-tts 循环生成时 zsh 数组下标从 1 开始，音频整体错位一位（Ava2=第1句、Ava3=第2句…），补生成第 1 句后导致第 1 句出现两次、末句 "Try it free" 丢失
- **教训：TTS 批量生成禁用 shell 数组循环，必须逐句显式生成**（本次已改用 V1-V6 逐句生成并复核时长）
- 修复后全片语音分段检测：6 句、时长各异、无重复；字幕/画面/配音三对位抽帧质检通过
- 片长 20.4 秒；发布文件：_temp-screenshots/2026-11/LuckyPick海外推广视频-v1.4字幕版-20261102.mp4
- 中英对照文案已归档：lucky-pick-global/docs/promo/instagram-video-script-bilingual.md（已提交 git）

### v1.3 变更（2026-11-02 01:10）

- 用户反馈 Samantha 音质一般 → 改用微软 edge-tts 神经网络语音
- 实际采用 en-US-AvaNeural（语速 +8%）；备选 en-US-AriaNeural 小样已导出供对比
- 用户要求加英文字幕 → 6 条字幕用 ffmpeg drawtext 烧录在画面上方（y=130，黑底半透明，字号 46），随配音时间分段显示
- 片长 20.7 秒；u1-u5 工作段落基于 t1-t5 英文站素材（注意：s1-s5 是旧中文站录屏，禁止使用）
- 质检抽帧已确认：开场卡/英文站/结果页/结尾卡画面与字幕均正常
- 已知小瑕疵（v2 处理）：结果页截图中 "0 personal picks left today" 字样出现

## 重要更正（2026-11-02）

- 推广产品确认为 **lucky-pick-global**（LuckyPick，英文站 lucky.daobox.app），**不是** lottery-pwa——此前误用中文站截图出了 v1，已作废留档
- 产品名 LuckyPick，链接 https://lucky.daobox.app （Cloudflare Workers 托管）
- 本文档最初误放在 lottery-pwa/docs/handoff/，已移到本目录

## 定稿文案（v1.1，诚实定位版）

### 英文配音稿（成片实际使用）

> Picking lottery numbers just got personal.
> Meet LuckyPick — for Powerball and Mega Millions.
> Add your lucky numbers, birthday, zodiac sign, even your dreams.
> And generate your picks in one tap.
> It's for fun, not predictions.
> Try it free at lucky.daobox.app.

### Instagram 帖子文案

> Everyone has their own way of picking numbers 🎲
>
> **LuckyPick** lets you put yourself into your picks — lucky numbers, birthday, zodiac, even dreams. For Powerball & Mega Millions.
>
> It's for fun — not a prediction app.
>
> 👉 https://lucky.daobox.app
>
> For entertainment only. 18+. Play responsibly.
>
> #powerball #megamillions #lottery #lotterynumbers #lucky #luckynumbers #webapp #pwa

## v1.1 成片结构（20.2 秒，1080x1920 竖屏，Mac Samantha 配音）

| 时间 | 画面 | 配音 |
|---|---|---|
| 0-6.0s | 深蓝金号码球开场卡 LuckyPick / Powerball · Mega Millions | Picking lottery numbers just got personal. / Meet LuckyPick — for Powerball and Mega Millions. |
| 6.0-10.9s | 英文站个人因素区（Lucky #22 / Birthday / Zodiac·Leo 已添加） | Add your lucky numbers, birthday, zodiac sign, even your dreams. |
| 10.9-14.1s | Your Numbers 生成结果（Powerball 两注号码球） | And generate your picks in one tap. |
| 14.1-16.8s | "For fun, not predictions." 声明卡 | It's for fun, not predictions. |
| 16.8-20.2s | 结尾 CTA 卡 Try it free → lucky.daobox.app | Try it free at lucky.daobox.app. |

## 重要决策

- 文案诚实定位：仅供娱乐/选号辅助，不暗示提高中奖率（规避 Meta 虚假宣传审核；LuckyPick 不卖彩票不涉及金钱，不属于 Meta 管制的赌博内容）
- 帖子带免责声明 For entertainment only. 18+. Play responsibly.
- 配音用 Mac 自带 TTS（Samantha）出 v1.1，不满意再考虑 ElevenLabs / Vidu 配音
- 海外推广链接用 lucky.daobox.app

## Vidu 开头镜头提示词（备用于 v2，未生成）

- 方案二（推荐）：Vertical 9:16 abstract motion graphics. Glowing lottery numbers and digits float and swirl in dark blue space like a data stream, forming into a sphere of golden light particles, elegant sci-fi style, smooth camera push-in, cinematic lighting, premium tech commercial aesthetic.（中文：发光彩票数字在深蓝空间如数据流漂浮旋转，凝聚成金色光粒球，优雅科幻风，镜头推近，电影级打光）
- 方案一：Vertical 9:16 cinematic shot. A glowing golden lottery ball rolls slowly across a dark, moody table, dramatic rim lighting, shallow depth of field.（中文：发光金色彩票球在昏暗桌面缓慢滚动，轮廓光，浅景深）

## 待办

- [ ] 用户审看 v1.1 成片
- [ ] 用户注册 Instagram（Outlook 邮箱 + VPN）
- [ ] （可选）Vidu 生成开头镜头替换静态开场卡 → v2
- [ ] 发布：视频 + 帖子文案，链接 https://lucky.daobox.app
- [ ] 结果截图里"0 personal picks left today"字样略扎眼，v2 可考虑清 localStorage 后重录

## 注意事项

- lucky.daobox.app 的因素按钮（Lucky #/Birthday/Zodiac 等）点击后弹出 modal 输入框，自动化要填 #modal-input 再点 #modal-ok（Zodiac 是 select）
- 个人 picks 有每日次数（用完显示 0 personal picks left today，随机 picks 不限）
- 网站为英文，无字体问题；Chromium 无头截图正常
- 主仓库 lucky-pick-global 有未提交状态需留意（本次未改代码）

## 相关文件

- 最新成片：/Users/zoujiean/CodeX/_temp-screenshots/2026-11/LuckyPick海外推广视频-v1.4字幕版-20261102.mp4
- 配音小样：同目录 LuckyPick配音小样-Ava版 / Aria版-20261102.mp3
- 旧版：/Users/zoujiean/CodeX/_temp-screenshots/2026-11/LuckyPick海外推广视频-v1.1-20261102.mp4
- 工作文件：/Users/zoujiean/CodeX/_temp-screenshots/2026-11/Instagram推广视频-工作文件/
- 站点：https://lucky.daobox.app （源码 /Users/zoujiean/CodeX/lucky-pick-global）
