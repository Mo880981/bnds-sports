# BNDS 运动圈

BNDS 校园运动社交平台 — 打卡、分享、约练。

## 页面入口

| 文件 | 说明 |
|------|------|
| `index.html` | 首页 |
| `checkin.html` | 运动打卡 |
| `feed.html` | 动态 |
| `buddy.html` | 约练搭子 |

三个功能页顶部 / 底部 Tab 互通：**打卡 · 动态 · 约练**。

## Supabase 接入（必做一步）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 打开你的项目（或新建一个）
3. 左侧 **SQL Editor** → 粘贴运行 `supabase-setup.sql` 全部内容
4. 确认 **Settings → API** 里的 URL 和 anon key 与 `js/supabase-config.js` 一致

**已跑过旧版 SQL？** 只需在 SQL Editor 里再运行 `supabase-setup.sql` 末尾「约练搭子」那一段（`bnds_buddy_posts` / `bnds_buddy_joins` 表）。

完成后刷新打卡页 / 动态页 / 约练页，顶部应显示 **「云端已连接」**（绿色）。

## 数据表

| 表名 | 用途 |
|------|------|
| `bnds_profiles` | 昵称、年级、体重 |
| `bnds_checkins` | 打卡记录 |
| `bnds_feeds` | 动态 |
| `bnds_likes` | 点赞 |
| `bnds_buddy_posts` | 约练帖子 |
| `bnds_buddy_joins` | 约练报名 |

## 开发进度

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 好看首页 | ✅ |
| 2 | 运动打卡页 | ✅ |
| 3 | 发动态 + 列表 | ✅ |
| 4 | Supabase 云端 | ✅ |
| 5 | 约练搭子 | ✅ |
| 6 | 部署上线（Vercel） | ✅ |

## 项目结构

```
bnds-sports/
├── index.html
├── checkin.html
├── feed.html
├── buddy.html
├── supabase-setup.sql    ← 在 Supabase 里运行
├── js/
│   ├── supabase-config.js
│   ├── db.js             ← 本地 + 云端数据层
│   ├── checkin.js
│   ├── feed.js
│   └── buddy.js
└── css/
```

## 说明

- 连接失败时会自动降级为 **本地模式**，数据仍保存在浏览器
- 动态页在线时会拉取 **全校同学** 的公开动态（内测阶段 RLS 为开放策略）
- 约练时间用自由文字（如「明天下午」），内测阶段无需选具体日期
- 正式上线前应改为登录鉴权 + 严格 RLS
