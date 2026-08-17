// 上传相关的常量与目录配置。
const path = require('path');
const fs = require('fs');

// 上传目录：与代码目录（src/）隔离，且已加入 .gitignore，不入库。
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// 图片：仅 JPG / PNG / WebP。
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// 文件类型白名单（不含 .exe 等可执行/危险类型）。
const FILE_EXTENSIONS = new Set([
  '.pdf', '.docx', '.md', '.zip', '.py', '.js',
  '.txt', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.ts', '.jsx', '.tsx', '.sql', '.sh',
  '.java', '.go', '.rs', '.c', '.cpp', '.h',
  '.tar', '.gz', '.7z', '.rar',
  '.xlsx', '.pptx', '.ipynb',
]);

// 大小与数量上限。
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES_PER_UPLOAD = 9; // 单次最多 9 张图片

module.exports = {
  UPLOAD_DIR,
  ensureUploadDir,
  IMAGE_EXTENSIONS,
  FILE_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_UPLOAD,
};
