// 前端共用工具与校验常量（白名单与大小上限和 server/src/uploads.js 保持一致，请勿单独修改）。

export const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
export const FILE_EXTS = [
  '.pdf', '.docx', '.md', '.zip', '.py', '.js',
  '.txt', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.ts', '.jsx', '.tsx', '.sql', '.sh',
  '.java', '.go', '.rs', '.c', '.cpp', '.h',
  '.tar', '.gz', '.7z', '.rar',
  '.xlsx', '.pptx', '.ipynb',
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 图片单张 10MB
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 文件单个 20MB
export const MAX_IMAGES = 9; // 单次最多 9 张图片

// 取小写扩展名（含点），例如 "A.JPG" -> ".jpg"。
export function extOf(name) {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
}

// 字节数 -> 人类可读文本（"1.2 MB"）。
export function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 后端时间字段是 UTC 文本 "YYYY-MM-DD HH:MM:SS"，转成本地时间显示。
export function formatDateTime(utcStr) {
  if (!utcStr) return '';
  const d = new Date(utcStr.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return utcStr;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
