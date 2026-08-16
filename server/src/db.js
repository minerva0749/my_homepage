// 数据库连接：打开（或创建）SQLite 数据库文件，并导出连接实例。
// 使用 Node.js 内置的 node:sqlite 模块（Node 22.5+ / 24 可用），无需安装原生依赖。
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// 数据库文件存放在 server/data/ 目录下，与代码隔离。
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'site.db');

// 打开数据库（文件不存在时会自动创建）。
const db = new DatabaseSync(dbPath);

// 开启外键约束，保证 attachments 等表的级联删除生效。
db.exec('PRAGMA foreign_keys = ON;');

module.exports = { db, dbPath };
