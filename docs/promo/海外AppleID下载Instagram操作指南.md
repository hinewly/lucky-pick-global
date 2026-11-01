# 海外 Apple ID 下载 Instagram 操作指南（iPhone）

- 记录日期: 2026-11-02
- 用途: 中国大陆 iPhone 安装 Instagram，用于 LuckyPick Global 海外推广
- 关联项目: lucky-pick-global（Instagram 推广任务）

## 一、为什么搜不到 Instagram

- 中国大陆区 App Store 里，Instagram / Facebook / WhatsApp / Threads 这类 Meta 应用**全部没有上架**，搜索结果是空的，不是手机坏了，也不是 iOS 版本问题。
- 解决办法只有一个：用海外地区的 Apple ID 登录 App Store 去下载。推荐选**美区（United States）**，Instagram 完整可用，以后装其他海外工具也方便。

## 二、两种方案对比

| 方案 | 说明 | 结论 |
|---|---|---|
| A. 新建一个美区 Apple ID，只给 App Store 用（推荐） | iCloud、国区已购应用完全不动，互不影响 | ✅ 推荐 |
| B. 把现有 Apple ID 的地区改成美国 | 要先取消所有订阅、退不出余额不能换，国区已购应用更新会出问题 | ❌ 不推荐 |

## 三、方案 A 详细步骤

### 第 1 步：准备材料

1. 一个邮箱做 Apple ID 账号：可以直接用 `hinewly@outlook.com`（海外平台统一邮箱），登录邮箱收验证码即可。
2. 一个能收短信的手机号：**用你自己的 +86 中国手机号就行**，Apple ID 验证码对中国号码友好（这点和 Instagram 不一样）。
3. 一个美国地址（随便一个真实存在的地址即可，推荐免税州 Oregon）：
   ```
   街道: 1200 SW Naito Pkwy
   城市: Portland
   州:   Oregon（缩写 OR）
   邮编: 97205
   电话: 填美国格式即可，如 (503) 555-0121
   ```
4. Mac 的 VPN 保持开着（注册和下载 App 都需要）。

### 第 2 步：在 iPhone 上创建美区 Apple ID

> 关键点：**必须从 App Store 里的登录入口注册**，这样付款方式才能选 "None"（不绑卡）；从「设置」里注册容易被要求绑支付方式。

1. iPhone 打开「App Store」。
2. 点右上角**头像** → 拉到底 → **退出登录**（只退 App Store，**不要动 iCloud！** 设置右上角你的名字那个页面全程不要碰）。
3. 再点头像位置 → 选「**创建新 Apple ID**」。
4. 地区/国家选 **United States** → 同意条款。
5. 填邮箱（hinewly@outlook.com）→ 设置一个**和别的账号都不一样的强密码**（设完登记到 `docs/账号密码管理.md`）。
6. 生日随便填一个成人生日（如 1976-01-23）。
7. 验证方式：手机号填你的 **+86 中国手机号**，收 Apple 验证码，这个能收到。
8. 付款方式页：选 **None**（这是整个流程最关键的一步，用 App Store 入口注册才会出现）。
9. 账单地址填上面第 1 步的美国地址。
10. 去邮箱收 Apple 验证邮件，完成验证。

### 第 3 步：用美区 ID 下载 Instagram

1. App Store 右上角确认现在登录的是新的美区账号。
2. 搜索 **Instagram** → 下载安装（VPN 保持开着；如果转圈失败，杀掉 App Store 重开再试）。

### 第 4 步：App Store 切回国区

- 装完 Instagram 后，App Store 右上角头像 → 退出登录 → 重新登录你原来的国区 Apple ID。
- iCloud 从头到尾没动过，所有原有应用、订阅、家庭共享都不受影响。
- **注意**：以后 Instagram 出新版本要更新时，需要临时把 App Store 切回美区 ID 更新，再切回来。

## 四、首次打开 Instagram 的网络准备

装上只是第一步，Instagram 在大陆网络直连不了，iPhone 需要走代理。两个办法：

### 办法 1（推荐，iPhone 上什么都不用装）：借 Mac 的 VPN

1. Mac 上打开 VPN/Clash 客户端，打开「**允许局域网连接 / Allow LAN**」开关。
2. Mac 上查看本机局域网 IP（系统设置 → Wi-Fi → 详细信息，一般是 `192.168.x.x`）。
3. iPhone 连**同一个 Wi-Fi** → 设置 → Wi-Fi → 点当前网络右边的 (i) → 最下面「配置代理」→ 选「手动」：
   - 服务器：Mac 的局域网 IP（如 `192.168.1.8`）
   - 端口：`7897`（与 Mac 客户端里显示的混合/HTTP 端口一致）
   - 鉴权、用户名、密码：都不填
   - 保存
4. 这样 iPhone 所有流量都走 Mac 的海外节点（新加坡），正好满足 Instagram 注册的海外环境。
5. 用完想关掉：回到同一位置选「关闭」即可。

### 办法 2：iPhone 上装代理 App

- 美区 Apple ID 现在已经有了，可以在美区商店装 Shadowrocket（约 $2.99 买断）或 Stash 等客户端，把节点填进去。
- 麻烦一点，但以后不带 Mac 出门也能用。

> 推荐先用办法 1，够用且零成本。

## 五、在 App 里注册 Instagram（本次的真正目标）

1. iPhone 开着代理（办法 1），打开 Instagram。
2. 用邮箱注册：**hinewly@outlook.com**（去 Outlook 收 Instagram 验证码/确认邮件）。
3. 用户名用 **luckypick.app**（和之前网页注册时确认可用的名字一致，保持品牌统一）。
4. App 端注册的风控流程和网页端不同，**很可能只要邮箱验证，不再强制手机短信验证**——这正是我们换 App 端注册的原因。
5. 如果 App 端仍要求手机验证，再换联通/移动号码试试（联通到达率最好）。

## 六、注意事项

- 美区 Apple ID 密码单独设置，不要和 Instagram、Gumroad 共用，设好登记到 `docs/账号密码管理.md`。
- 美区 ID **不要绑定任何支付方式**（保持 None），避免误购。
- 下载/更新美区应用、使用 Instagram 时才需要切 ID / 开代理，日常 App Store 购买、更新国内应用切回国区即可。
- 注册 Instagram 全程保持海外节点（新加坡出口），中途不要频繁切换节点国家，降低风控。

## 七、快速排错

| 问题 | 处理 |
|---|---|
| 注册美区 ID 时没有 "None" 付款选项 | 你是从「设置」里注册的，退出来改从 App Store 头像入口重新注册 |
| +86 手机收不到 Apple 验证码 | 检查短信拦截/骚扰拦截；换家人联通/移动号 |
| Instagram 搜不到 | 确认 App Store 右上角登录的是美区新 ID，不是国区 ID |
| Instagram 打不开/一直转圈 | 检查 iPhone 代理配置：IP、端口 7897、Mac 的 Allow LAN 是否开 |
| 邮箱验证码收不到 | 去 Outlook 网页版垃圾邮件文件夹找，发件人是 no-reply@mail.instagram.com |
