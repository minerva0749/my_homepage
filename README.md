# 个人主页（my_homepage）

一个面向公网访问的个人动态（博客）站点，视觉参考 Bilibili 个人空间：顶部导航 + 背景图横幅 + 动态流。唯一作者为站长本人（admin），访客无需注册即可浏览与下载。

## 技术栈

| 层 | 方案 |
| --- | --- |
| 前端 | React 18 + Vite 5 + react-router-dom 6 |
| 后端 | Node.js（Express 4） |
| 数据库 | SQLite（Node 内置 `node:sqlite`，无需原生依赖） |
| 认证 | 自建 Session 表 + HttpOnly Cookie，密码用 bcrypt 哈希 |

## 环境要求

- **Node.js ≥ 23.4**（`node:sqlite` 需要；推荐 24.x）
- 本机实测版本：Node 24.17.0、npm 11.13
- Windows 下请一律用 `npm.cmd`（不要用 `npm`，会触发 PowerShell 脚本策略问题）

验证 Node 版本：

```powershell
node -v
```

## 项目结构

```
WorkFile/
├── README.md                 # 本文档
├── PROGRESS.md               # 开发交接文档（新会话先读它）
├── 个人网站设计规划（修订版）.docx  # 设计总纲
├── client/                   # 前端（React + Vite）
│   ├── index.html
│   ├── vite.config.js        # 端口 5173，/api 代理到 3000
│   ├── public/placeholder-bg.svg  # 占位背景图
│   └── src/
│       ├── main.jsx          # 入口（路由 + Auth/Profile 上下文）
│       ├── auth.jsx          # 登录态上下文
│       ├── profile.jsx       # 站点公开资料上下文
│       ├── styles.css        # 全部样式
│       ├── utils.js          # 校验常量 / 格式化工具
│       ├── App.jsx           # 顶部导航 + 路由
│       ├── pages/            # Home / About / Login / Settings
│       └── components/       # PostCard / PostComposer / SiteBanner / PostManager / Lightbox
└── server/                   # 后端（Express + SQLite）
    ├── package.json
    └── src/
        ├── index.js          # 服务入口（装配路由 + 静态托管 + 统一错误处理）
        ├── db.js             # 打开 SQLite、开外键
        ├── initDb.js         # 幂等建表 + admin 种子
        ├── auth.js           # 会话 + requireAuth 中间件
        ├── uploads.js        # 上传目录/白名单/大小常量
        ├── asyncHandler.js   # async 路由异常包装
        └── routes/           # auth / posts / attachments / site / settings
```

运行时生成（**不入库**，已被 `.gitignore` 排除）：`server/data/`（数据库）、`server/uploads/`（上传文件）、`client/dist/`（构建产物）、各 `node_modules/`。

## 本地运行（两个终端）

### 终端 1：启动后端（端口 3000）

```powershell
cd C:\Users\Minerva07\WorkFile\server
npm.cmd install
npm.cmd start
```

预期输出：

```
后端已启动: http://localhost:3000
健康检查:   http://localhost:3000/api/health
数据库文件: C:\Users\Minerva07\WorkFile\server\data\site.db
```

### 终端 2：启动前端（端口 5173）

```powershell
cd C:\Users\Minerva07\WorkFile\client
npm.cmd install
npm.cmd run dev
```

预期输出：

```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

然后浏览器打开 **http://localhost:5173/** 即可。

## 初始账号

| 项 | 值 |
| --- | --- |
| 用户名 | `admin` |
| 初始密码 | `admin123` |

> ⚠️ 首次登录后，请到「网页设置」里**立即修改密码**。

## 数据与备份

- 数据库文件：`server/data/site.db`
- 上传文件（图片/附件/背景图）：`server/uploads/`

备份命令（Windows PowerShell，把 `D:\backups` 换成你想保存的目录）：

```powershell
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$dst = "D:\backups\my_homepage_$date"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "C:\Users\Minerva07\WorkFile\server\data\site.db" "$dst\site.db"
Copy-Item "C:\Users\Minerva07\WorkFile\server\uploads" "$dst\uploads" -Recurse
Write-Output "已备份到 $dst"
```

> 建议部署后设为每日定时任务自动执行。

## 安全说明

- **XSS**：动态正文由 React 文本节点渲染（自动 HTML 转义），不支持也不执行任何 HTML/脚本；如需 Markdown，请后续引入成熟库并开启安全模式。
- **上传**：类型白名单（图片 JPG/PNG/WebP、文件白名单，不含 `.exe`）、大小上限（图片 ≤10MB、文件 ≤20MB）、存储名 UUID 化、目录与代码隔离、附件只读下载不解析执行。
- **鉴权**：所有管理类接口（发布/编辑/删除/置顶/上传/改设置/改密码）均在服务端 `requireAuth`，未登录返回 401。
- **登录限流**：每 IP 每分钟最多 5 次登录尝试。
- **错误处理**：后端异常统一返回 JSON（不泄露堆栈），前端请求失败有友好提示。
