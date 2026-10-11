# LuckyPick Global 项目规则

> 家族总规则见 /Users/zoujiean/CodeX/daobox-home/AGENTS.md

## 版本号规则（用户要求：改动后自动升级，不需要提醒）

每次改动代码并发布时，两个版本号都要递增：

1. **显示版本 APP_VERSION**（public/js/app.js）：`v1.0` → `v1.1` → …
   用户可感知的产品版本，改动发布就 +0.1
2. **缓存版本 CACHE_VERSION**（public/service-worker.js）：vN → vN+1
   同时把 PRECACHE_URLS 里所有 `?v=N` 同步替换（注意有 13 处：12 个清单项 + install 里的 replace 调用）

## 部署与验证

- 部署：`cd worker && wrangler deploy`（wrangler 路径和 API Token 见 SESSION_HANDOFF.md）
- 验证：curl 带时间戳参数确认新版本串已生效
- git push 偶发 HTTP2 错误时加 `-c http.version=HTTP/1.1`

## 其他

- 存量保护：改动前 git status 干净、与 origin/main 一致
- 产品定位：free / no signup / no tracking，付费走 Paddle license key + 设备激活

## 邮箱规则（用户要求）

- **所有与国外平台/服务的联系，统一使用 hinewly@outlook.com**（Paddle、Payoneer、Gumroad、Lemon Squeezy 等）
- 原因：国外平台对 Outlook 邮箱的信任度和政策宽松度优于 163 等国内邮箱
- hinewly@163.com 仅用于国内服务；此前 Paddle 注册用了 163 邮箱，后续新注册一律用 Outlook
