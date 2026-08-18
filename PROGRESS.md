# 项目交接纲要（Handoff Summary）

> 本文件是「个人主页网站」项目的完整交接文档。新会话请先读本文，再读同目录下《个人网站设计规划（修订版）.docx》（设计总纲，一切以它为准）。
> 上次更新：第四阶段（前端动态主页）验收通过、已 commit + push 之后。

---

## 1. 项目速览

- **目标**：做一个公网访问的个人动态（博客）站点，视觉参考 Bilibili 个人空间（顶部导航 + 背景图 + 动态流）；唯一作者 admin，访客无需注册即可浏览与下载。
- **技术栈**：前端 React 18（Vite 5）+ react-router-dom 6；后端 Node.js + Express 4；数据库 SQLite（用 Node 内置 `node:sqlite`，非 better-sqlite3）。
- **完成度**：约 **70%**。后端核心（建库、登录鉴权、动态 CRUD、附件上传/下载）与前端动态主页（发布、动态流、图片/附件、置顶/编辑/删除、长文折叠、分页）已完成并测试通过；剩余：作者简介页、网页设置页、部署。

---

## 2. 当前状态快照

### 2.1 已完成（按阶段）

**阶段一：项目初始化 + 数据库**
- 前后端分离目录 `client/`（Vite React）与 `server/`（Express）。
- 五张表：`users` / `posts` / `attachments` / `site_settings`（设计文档第五节四张表）+ `sessions`（登录会话，阶段二加）。
  - 文件：`server/src/initDb.js`（`initDb()`，幂等建表 + admin 种子 + attachments 迁移）。
- 数据库初始化脚本可重复执行（已初始化则跳过 admin 创建）。
  - 文件：`server/src/initDb.js`；入口 `server/src/db.js`（`DatabaseSync` 连接、`PRAGMA foreign_keys=ON`）。
- `GET /api/health` → `{"ok":true}`；静态托管 `client/dist` + SPA 兜底。
  - 文件：`server/src/index.js`。
- 前端空白首页 + Vite 开发代理 `/api → http://localhost:3000`。
  - 文件：`client/vite.config.js`（`server.proxy`）、`client/src/App.jsx`、`client/src/pages/Home.jsx`。

**阶段二：登录与鉴权**
- `POST /api/auth/login`：bcrypt 比对，成功建 HttpOnly Cookie 会话（存 `sessions` 表，7 天），失败统一提示（不区分用户不存在/密码错误，并对不存在用户也做一次 bcrypt 比对防时序泄露）。
- `POST /api/auth/logout`、`GET /api/auth/me`（未登录 401）。
- 鉴权中间件 `requireAuth`（`server/src/auth.js`），已用于 `/api/auth/me` 及阶段三所有写接口。
- 登录限流：每 IP 每分钟最多 5 次（`express-rate-limit`）。
  - 文件：`server/src/routes/auth.js`、`server/src/auth.js`。
- 前端 `/login` 页 + 顶部导航「登录/退出登录」+ 刷新保持登录。
  - 文件：`client/src/auth.jsx`（AuthContext）、`client/src/pages/Login.jsx`、`client/src/App.jsx`。

**阶段三：动态接口 + 附件上传（纯后端，无前端页面）**
- `GET /api/posts`（公开分页，置顶在前/其余按时间倒序）、`POST/PUT/DELETE /api/posts[/:id]`、`POST /api/posts/:id/pin`、`POST /api/posts/:id/unpin`（均仅 admin）。
  - 文件：`server/src/routes/posts.js`。
- `POST /api/upload`（仅 admin，multer）：图片 JPG/PNG/WebP ≤10MB 且单次≤9 张；文件白名单 ≤20MB；存储名 UUID 化；上传目录与代码隔离。
- `GET /api/attachments/:id/download`（公开，以原始文件名下载）。
  - 文件：`server/src/routes/attachments.js`、`server/src/uploads.js`（常量/白名单/目录）。

**阶段四：前端动态主页（本阶段）**
- 顶部固定导航（动态主页 / 作者简介 / 网页设置仅登录可见）+ 右上登录/退出；`/about`、`/settings` 为占位页（后续阶段实现），`/settings` 未登录自动跳 `/login`。
- 背景图横幅（占位图 `client/public/placeholder-bg.svg`）+ 昵称；发布框（仅 admin）：文字 + 图片 ≤9 张 + 文件附件混合，前端校验类型/大小/数量。
- 动态流：卡片列表、页码分页（每页 10）；长文折叠（>500 字或 >10 行）；图片缩略图网格 + 点开原图（Lightbox）；文件附件显示文件名/大小并可下载。
- admin 操作：置顶/取消置顶、编辑（显示「已编辑」标记）、删除（二次确认）。
- 后端新增 `GET /api/attachments/:id/view`（图片内联展示，供 `<img>` 用）+ 修复上传中文文件名乱码（multer 加 `defParamCharset:'utf8'`）。
  - 文件：`client/src/pages/Home.jsx`、`client/src/App.jsx`、`client/src/components/PostComposer.jsx|PostCard.jsx|Lightbox.jsx`、`client/src/utils.js`、`client/src/styles.css`、`client/public/placeholder-bg.svg`、`client/src/pages/About.jsx|Settings.jsx`（占位）；`server/src/routes/attachments.js`。

### 2.2 进行中的工作

无。第四阶段已全部完成、测试通过（后端 AI 侧实测、前端用户真机实测），待 commit + push。

### 2.3 未开始的部分

- 「作者简介」页 `/about`（昵称、简介文字、可更换背景图；当前为占位页）。
- 「网页设置」页 `/settings`（仅 admin：动态管理、改昵称、改简介、换背景图、改密码；当前为占位页）。
- （可选）Markdown 渲染（文档要求安全模式）。
- 部署（Nginx + HTTPS + 进程守护 systemd/PM2/Docker + 每日备份）。

---

## 3. 代码结构说明

```
WorkFile/
├── .gitignore                      # 忽略 node_modules/client/dist/server/data/server/uploads/*.log/.env
├── PROGRESS.md                     # 本交接文档
├── 个人网站设计规划（修订版）.docx    # 设计总纲（唯一权威），已入库（有时被 Word 自动保存改动，属正常）
├── client/                         # 前端（React + Vite）
│   ├── index.html                  # HTML 入口，#root
│   ├── package.json                # deps: react18/react-dom18/react-router-dom6；dev: vite5/@vitejs/plugin-react4
│   ├── vite.config.js              # 端口 5173 + 代理 /api → http://localhost:3000【定稿勿动】
│   ├── public/
│   │   └── placeholder-bg.svg      # 背景图占位图【后续设置阶段替换为可上传图】
│   └── src/
│       ├── main.jsx                # 入口：BrowserRouter + AuthProvider【定稿】
│       ├── auth.jsx                # AuthContext：user/loading/login/logout，挂载时 fetch /api/auth/me【定稿，后续可扩展】
│       ├── App.jsx                 # 顶部固定导航（动态主页/作者简介/网页设置+登录退出）+ Routes【定稿】
│       ├── styles.css              # 全局样式【定稿】
│       ├── utils.js                # 前端校验常量（与后端白名单一致）+ 大小/时间格式化【定稿】
│       ├── components/
│       │   ├── PostComposer.jsx    # 发布框（文字/图片/文件 + 校验 + 上传 + 发布）【定稿】
│       │   ├── PostCard.jsx        # 动态卡片（折叠/置顶/编辑/删除/图片/附件）【定稿】
│       │   └── Lightbox.jsx        # 图片原图查看浮层【定稿】
│       └── pages/
│           ├── Home.jsx            # 动态主页（hero + 发布框 + 动态流 + 分页）【定稿】
│           ├── About.jsx           # 作者简介（占位，后续阶段实现）【半成品】
│           ├── Settings.jsx        # 网页设置（占位 + 登录守卫）【半成品】
│           └── Login.jsx           # 登录表单【定稿】
└── server/                         # 后端（Node + Express + SQLite）
    ├── package.json                # deps: bcryptjs/cookie-parser/express4/express-rate-limit7/multer2【定稿勿动】
    ├── package-lock.json
    └── src/
        ├── db.js                   # 打开 SQLite（node:sqlite DatabaseSync），建 data 目录，开外键【定稿勿动】
        ├── initDb.js               # 幂等建 5 表 + admin 种子 + attachments.post_id 可空迁移【定稿勿动】
        ├── auth.js                 # 会话助手 + requireAuth 中间件 + Cookie 常量【定稿勿动】
        ├── uploads.js              # 上传目录/白名单/大小与数量常量 + ensureUploadDir【定稿勿动】
        ├── index.js                # Express 装配：init、json/cookie 解析、挂路由、静态托管+SPA 兜底【定稿】
        └── routes/
            ├── auth.js             # login/logout/me + 登录限流【定稿勿动】
            ├── posts.js            # 动态列表/发布/编辑/删除/置顶/取消置顶【定稿勿动】
            └── attachments.js      # 上传(multer)/下载【定稿勿动】
```

> 运行时生成（**不入库**，被 .gitignore 排除）：`server/data/`（site.db）、`server/uploads/`（附件文件）、`client/dist/`（构建产物）、各 `node_modules/`。

**「定稿勿动」** = 已测试通过、无 bug、接口契约已被前端/后续阶段依赖，不要改动字段名/URL/排序规则/表结构；只能在其上**新增**。
**「半成品」** = 后续阶段会大改/替换的占位文件（主要是前端页面）。

---

## 4. 关键决策记录（选了 A 而非 B）

1. **SQLite 驱动用 Node 内置 `node:sqlite`（`DatabaseSync`），而非 `better-sqlite3`** —— 因为 better-sqlite3 需要原生预编译二进制/编译工具链，而 node:sqlite 是 Node 24 内置、零原生依赖、安装零风险。⚠️ 前提：Node 需 ≥23.4（不带 flag）；本机是 Node 24.17.0，满足。
2. **bcrypt 用 `bcryptjs`（纯 JS），而非 `bcrypt`（原生）** —— 避免 Windows 原生编译问题。
3. **会话用自建 SQLite `sessions` 表 + HttpOnly Cookie，而非 `express-session`(MemoryStore) 或 JWT** —— 因为：重启不丢会话、单用户低并发够用、无额外原生存储依赖、HttpOnly 防 XSS 窃取。
4. **multer 从 1.x 升级到 2.x（`^2.0.0`，实际装到 2.2.0）** —— npm 安装时明确警告 1.x 有已知漏洞，文档第六节要求公网安全底线。
5. **`attachments.post_id` 改为可空（早期误设 `NOT NULL`，后修正并在 initDb 加自动迁移）** —— 因为「先上传拿附件 id、再创建动态关联」的流程，需要 post_id 为 NULL 的“待关联”附件记录。
6. **存储文件名 = `UUID + 原扩展名`（而非纯 UUID）** —— 保留扩展名只为下载时给出正确 Content-Type；名字本身仍是 UUID（防路径攻击与重名）。原始文件名只存 `orig_name`。
7. **上传目录 `server/uploads/`（gitignore），与代码目录 `server/src/` 隔离** —— 文档要求「存储目录与代码隔离」。
8. **分页默认 10、上限 20** —— 文档 4.2 建议每页 10–20 条。
9. **排序加 `id DESC` 兜底**（`ORDER BY is_pinned DESC, pinned_at DESC, created_at DESC, id DESC`）—— 因为 `created_at` 用 `CURRENT_TIMESTAMP` 只有秒级精度，同秒多条会顺序不确定；`id` 自增可保证“越新越靠前”确定。
10. **限流按「所有登录尝试」计数（max 5/分钟/IP），未用 `skipSuccessfulRequests`** —— 按文档字面“每 IP 每分钟最多 5 次尝试”实现。
11. **前端锁定 React 18.3.1 + Vite 5.4 + react-router-dom 6.28（稳定版本），未追 React 19 / Vite 6** —— 求稳、教程多、版本兼容确定。
12. **CSRF 暂用 `SameSite=Lax` 缓解，未加 CSRF token** —— 对跨站 POST 基本够用；公网部署若需更严可后加 token（见“已知问题”）。
13. **登录失败对“不存在的用户”也跑一次 bcrypt 比对（`DUMMY_HASH`）** —— 避免响应时间差泄露“用户是否存在”，同时错误文案统一。

---

## 5. 接口契约（已确定，新会话不得擅自修改）

> 基础：后端默认端口 **3000**；前端开发端口 **5173**（/api 代理到 3000）。
> 登录态 Cookie：名 **`sid`**，`HttpOnly` + `SameSite=Lax` + `secure`(仅生产) + `path=/` + `maxAge` 7 天。
> 所有**写接口**（posts 的 POST/PUT/DELETE/pin/unpin、upload）都走 `requireAuth`，未登录统一返回 `401 {"error":"未登录"}`。
> 时间字段均为 SQLite 文本 `YYYY-MM-DD HH:MM:SS`（UTC，来自 `CURRENT_TIMESTAMP`）；`is_pinned` 对外是布尔（库里存 0/1）。

### 5.1 数据模型（`server/src/initDb.js` 当前定稿）

```sql
users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,      -- bcrypt(cost=10)，绝不明文
  nickname TEXT NOT NULL,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT,                      -- 可为空（若有附件）
  is_pinned INTEGER NOT NULL DEFAULT 0,
  pinned_at TEXT,                    -- 置顶时间，多条置顶按此倒序
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,  -- 可空（待关联）
  kind TEXT NOT NULL,                -- 'image' | 'file'
  orig_name TEXT NOT NULL,           -- 原始文件名
  stored_name TEXT NOT NULL,         -- UUID + 扩展名
  size INTEGER NOT NULL,             -- 字节数
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
site_settings (                      -- 无主键，单行表
  background_image TEXT,
  site_title TEXT
)
sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER NOT NULL        -- epoch 毫秒
)
```

**唯一账户种子**：`username=admin`，初始密码 `admin123`（bcrypt 哈希存储；后续“网页设置”阶段要提供改密码）。

### 5.2 HTTP 接口

**认证**
```
POST /api/auth/login     body {username,password}
  200 {"ok":true,"user":{"id","username","nickname","bio"}}   + Set-Cookie: sid
  400 {"error":"用户名和密码不能为空"}
  401 {"error":"用户名或密码错误"}        （用户不存在/密码错 同一文案）
  429 {"error":"尝试次数过多，请稍后再试"}
POST /api/auth/logout     → 200 {"ok":true}
GET  /api/auth/me         → 200 {"user":{...}} / 401 {"error":"未登录"}
```

**动态**
```
GET    /api/posts?page=1&pageSize=10
  200 {"posts":[{id,author_id,content,is_pinned,pinned_at,created_at,updated_at,
                 attachments:[{id,post_id,kind,orig_name,stored_name,size,created_at}]}],
       "pagination":{page,pageSize,total,totalPages}}
  排序：ORDER BY is_pinned DESC, pinned_at DESC, created_at DESC, id DESC
POST   /api/posts         body {content, attachmentIds:[...]}   （正文或附件至少其一）
  201 {"post":{...}} / 400 {"error":"正文或附件至少填一项"} / 400 "附件不存在/已被其它动态使用"
PUT    /api/posts/:id     body {content}   → 200 {"post":{...}} / 404 "动态不存在"
DELETE /api/posts/:id     → 200 {"ok":true,"deletedAttachments":N}   （级联删附件记录 + 删磁盘文件）
POST   /api/posts/:id/pin    → 200 {"post":{...}}   （is_pinned=1, pinned_at=now）
POST   /api/posts/:id/unpin  → 200 {"post":{...}}   （is_pinned=0, pinned_at=NULL）
```

**附件**
```
POST /api/upload          multipart 字段名 "files"（可多个），仅 admin
  201 {"attachments":[{id,kind,orig_name,stored_name,size}]}
  400 {"error":"不支持的文件类型: .exe"}
  400 {"error":"单个文件超过 20MB 上限"}
  400 {"error":"图片 <原名> 超过 10MB 上限"}
  400 {"error":"图片单次最多上传 9 张"}
GET  /api/attachments/:id/download   （公开）
  200 二进制 + Content-Disposition: attachment; filename="<orig_name>"
  404 {"error":"附件不存在"}/{"error":"文件不存在"}
```

**其它**
```
GET /api/health → {"ok":true}
```

### 5.3 上传白名单（`server/src/uploads.js`，勿改）

- 图片：`.jpg .jpeg .png .webp`（≤10MB/张，≤9 张/次）
- 文件：`.pdf .docx .md .zip .py .js .txt .csv .json .xml .yaml .yml .ts .jsx .tsx .sql .sh .java .go .rs .c .cpp .h .tar .gz .7z .rar .xlsx .pptx .ipynb`（≤20MB/个）
- **不含** `.exe` 等可执行类型（验收要点）。

---

## 6. 已知问题与坑

1. **⚠️ AI 无法在本环境验证前端**：沙盒禁止 `esbuild` 的 `child_process` spawn（EPERM），所以 `vite build/dev` 在 AI 侧跑不了。前端代码都是“标准写法、未在本环境实测”，**必须由用户在真机 `npm.cmd run dev` 验证**。后端（纯 Node）可在 AI 侧完整实测。
2. **无 CSRF token**，仅靠 `SameSite=Lax`。公网部署若担心，后续给所有 state-changing 接口加 CSRF token 或改用 `SameSite=Strict`。
3. **孤儿附件**：上传成功但未创建动态（post_id 为 NULL）的附件会永远留在磁盘，无清理任务。后续“设置/动态管理”阶段可加清理逻辑。
4. **`site_settings` 表无主键、无种子行**：后续“网页设置”阶段写入时需先判断有无行（无则 INSERT，有则 UPDATE）。
5. **限流按 `req.ip`**：本地经 Vite 代理后都显示为 127.0.0.1（单用户测试无碍）；生产放 Nginx 后需 `app.set('trust proxy', ...)`，否则所有用户同 IP。
6. **`express.json()` 对坏 JSON 返回 400 且默认 HTML 错误页**（开发环境会带堆栈）。可考虑加统一 JSON 错误处理中间件（未做，非阻塞）。
7. **`bcryptjs` 是纯 JS，比原生 bcrypt 慢**：`initDb`/`DUMMY_HASH` 用了同步 `hashSync`（启动时一次性，可接受）；登录比对用了异步 `bcrypt.compare`。
8. **Windows 测试踩坑记录**（写文档给用户时务必注意）：
   - `npm` 在本机 PowerShell 会被解析成 `npm.ps1` 且被脚本执行策略禁用 → **统一用 `npm.cmd`**。
   - `curl.exe` 在 PowerShell 里内联 JSON（`-d '...'`）会坏 → 改用 `--data-binary "@文件.json"`，或 PowerShell 原生 `Invoke-RestMethod`。
   - PowerShell `Set-Content -Encoding ascii` 会毁掉中文 → 写含中文的 JSON 文件用 `[System.IO.File]::WriteAllText(path, json, [System.Text.UTF8Encoding]::new($false))`。
9. **设计文档 `.docx` 在 git 里**：用 Word 打开会自动保存，产生“已修改”噪音（无害，正常提交即可）。

---

## 7. 下一步行动清单（按优先级）

**✅ P0 — 前端动态主页：已完成（第四阶段，见 2.1「阶段四」）**

**P1 — 作者简介页 `/about`**
- 做什么：昵称、简介文字展示；页面顶部可更换背景图（admin 在设置里换，见 P2）。需要后端提供读取/更新昵称、bio、背景图的接口（当前无）。
- 涉及文件：新增 `server/src/routes/settings.js`（或并入现有）、`client/src/pages/About.jsx`；`users.bio/nickname` 与 `site_settings.background_image` 读写。
- 前置条件：P2 的“设置”接口可先做一部分（昵称/bio/背景图读写）。

**P2 — 网页设置页 `/settings`（仅 admin）**
- 做什么：动态集中管理（复用 P0 的置顶/编辑/删除）；修改昵称、简介；上传背景图（JPG/PNG/WebP ≤10MB，复用上传逻辑但写入 `site_settings`）；修改密码（先验原密码，新密码 ≥8 位含字母数字）。
- 涉及文件：新增后端 settings 接口 + `client/src/pages/Settings.jsx`；`site_settings` 表无主键需按第 6.4 条处理。
- 前置条件：P0 完成（复用其组件）。
- 验收：改昵称全站即时生效；背景图上传预览并持久化；改密码后旧密码失效。

**P3 — 部署**
- 做什么：云服务器 + Nginx 反代（/api → 后端，其余 → `client/dist`）+ HTTPS（Let's Encrypt）+ 进程守护（PM2/systemd）+ 每日备份 DB 与 `server/uploads/`。
- 前置条件：P0–P2 全部完成。
- 验收：公网域名可访问，重启自动拉起，HTTPS 有效。

---

## 8. 复现与验证

### 环境
- Node **24.17.0**（`node:sqlite` 需 ≥23.4；不要降到 22 以下，否则 node:sqlite 不可用/需 flag）、npm 11.13。
- 依赖安装与启动在 Windows 上**一律用 `npm.cmd`**（见第 6.8 条）。

### 启动（两个终端）
```powershell
# 终端1：后端（端口 3000）
cd C:\Users\Minerva07\WorkFile\server
npm.cmd install
npm.cmd start            # 预期打印“后端已启动 http://localhost:3000”

# 终端2：前端（端口 5173）
cd C:\Users\Minerva07\WorkFile\client
npm.cmd install
npm.cmd run dev          # 预期 VITE ready, Local http://localhost:5173/
```

### 验证当前已完成部分
- 打开 `http://localhost:5173/`：动态主页（背景图横幅 + 动态流，右上角「登录」）。
- `http://localhost:5173/api/health` → `{"ok":true}`（验证代理）。
- 登录 `admin` / `admin123` 后右上角变「退出登录」，刷新仍保持；退出后变回「登录」。
- 后端接口可用 `curl.exe`（**JSON 一律 `--data-binary "@文件.json"`**）按第 5.2 节契约逐一验证；登录用 `-c cookies.txt` 存 cookie、后续 `-b cookies.txt` 携带。
- 数据库初始化：`cd server` 后 `npm.cmd run init-db`（或直接 `npm.cmd start` 自动执行），打印“数据表数量(应=4): 4”“admin 账户 …”“本次已创建/已存在，跳过”。

### 验收要点回顾（前三阶段均已通过）
1. 未登录调任何写接口 → 401。
2. 上传 `.exe` 或 >20MB 文件被拒绝。
3. 删除动态后：attachments 记录级联删除 + 磁盘文件删除。
4. 列表分页：置顶在前（多条按 pinned_at 倒序），其余按 created_at 倒序。
