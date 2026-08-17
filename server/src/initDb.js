// 数据库初始化脚本：
//   1. 建 users / posts / attachments / site_settings 四张表，以及登录会话表 sessions（表已存在则跳过）。
//   2. 写入唯一的 admin 账户（密码用 bcrypt 哈希存储，绝不明文）。
// 可重复执行：已初始化时自动跳过 admin 的创建。
const bcrypt = require('bcryptjs');
const { db, dbPath } = require('./db');

const ADMIN_USERNAME = 'admin';
const ADMIN_INITIAL_PASSWORD = 'admin123'; // 临时初始密码，后续阶段可修改。

function initDb() {
  // ---- 1. 建表（IF NOT EXISTS 保证幂等）----
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname      TEXT NOT NULL,
      bio           TEXT,
      created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id  INTEGER NOT NULL REFERENCES users(id),
      content    TEXT,
      is_pinned  INTEGER NOT NULL DEFAULT 0,
      pinned_at  TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      orig_name   TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      size        INTEGER NOT NULL,
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      background_image TEXT,
      site_title       TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at INTEGER NOT NULL
    );
  `);

  // ---- 1.1 迁移：旧版 attachments.post_id 带 NOT NULL，无法先建“待关联”附件记录。
  // 若表为空且 post_id 为 NOT NULL，则重建为可空（此阶段无历史附件数据，安全）。
  const attCols = db.prepare('PRAGMA table_info(attachments)').all();
  const postIdCol = attCols.find((c) => c.name === 'post_id');
  if (postIdCol && postIdCol.notnull === 1) {
    const attCount = db.prepare('SELECT COUNT(*) AS n FROM attachments').get().n;
    if (attCount === 0) {
      db.exec('DROP TABLE attachments');
      db.exec(`
        CREATE TABLE attachments (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          kind        TEXT NOT NULL,
          orig_name   TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          size        INTEGER NOT NULL,
          created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  }

  // ---- 2. 写入唯一 admin 账户（已存在则跳过）----
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(ADMIN_USERNAME);

  let createdAdmin = false;
  if (!existing) {
    // bcrypt 哈希，cost factor = 10。绝不明文存储。
    const passwordHash = bcrypt.hashSync(ADMIN_INITIAL_PASSWORD, 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, nickname, bio) VALUES (?, ?, ?, ?)'
    ).run(ADMIN_USERNAME, passwordHash, ADMIN_USERNAME, '');
    createdAdmin = true;
  }

  return { createdAdmin };
}

// 允许作为独立脚本运行：`node src/initDb.js` 或 `npm run init-db`。
if (require.main === module) {
  const result = initDb();
  const tableCount = db
    .prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('users','posts','attachments','site_settings')"
    )
    .get().n;
  const adminRow = db
    .prepare('SELECT id, username, nickname FROM users WHERE username = ?')
    .get(ADMIN_USERNAME);

  console.log('数据库文件:', dbPath);
  console.log('数据表数量(应=4):', tableCount);
  console.log('admin 账户:', adminRow ? JSON.stringify(adminRow) : '缺失');
  console.log('admin 创建结果:', result.createdAdmin ? '本次已创建' : '已存在，跳过');
}

module.exports = { initDb };
