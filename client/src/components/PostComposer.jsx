import { useState } from 'react';
import {
  IMAGE_EXTS,
  FILE_EXTS,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
  MAX_IMAGES,
  extOf,
  formatSize,
} from '../utils.js';

// 附件选择框 accept 字符串（文件白名单）。
const FILE_ACCEPT = FILE_EXTS.join(',');

// 发布框：仅 admin 登录后渲染。支持 文字 + 图片（≤9 张）+ 文件附件 混合。
// 提交流程：先前端校验 -> 上传附件拿 id -> 创建动态 -> 清空并回调 onPublished。
export default function PostComposer({ onPublished }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // [{file, url}]，url 用于本地预览
  const [files, setFiles] = useState([]); // File[]（非图片附件）
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function revokeImages(list) {
    for (const it of list) URL.revokeObjectURL(it.url);
  }

  // 选择图片：逐张校验类型 / 大小 / 数量，第一张不合规即停下并提示。
  function onPickImages(e) {
    const picked = Array.from(e.target.files || []);
    const next = images.slice();
    let err = null;
    for (const f of picked) {
      const ext = extOf(f.name);
      if (!IMAGE_EXTS.includes(ext)) {
        err = `不支持图片类型：${f.name}（仅支持 JPG / PNG / WebP）`;
        break;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        err = `图片 ${f.name} 超过 10MB 上限`;
        break;
      }
      if (next.length >= MAX_IMAGES) {
        err = `图片单次最多上传 ${MAX_IMAGES} 张`;
        break;
      }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setImages(next);
    setError(err);
    e.target.value = '';
  }

  // 选择文件附件：逐张校验类型 / 大小。
  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    const next = files.slice();
    let err = null;
    for (const f of picked) {
      const ext = extOf(f.name);
      if (!FILE_EXTS.includes(ext)) {
        err = `不支持文件类型：${f.name}`;
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        err = `文件 ${f.name} 超过 20MB 上限`;
        break;
      }
      next.push(f);
    }
    setFiles(next);
    setError(err);
    e.target.value = '';
  }

  function removeImage(index) {
    const next = images.slice();
    const [removed] = next.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    setImages(next);
    setError('');
  }

  function removeFile(index) {
    const next = files.slice();
    next.splice(index, 1);
    setFiles(next);
    setError('');
  }

  // 前端校验（对应文档 4.1）。
  function validate() {
    const hasText = content.trim().length > 0;
    if (!hasText && images.length === 0 && files.length === 0) {
      return '正文或附件至少填一项';
    }
    if (images.length > MAX_IMAGES) return `图片单次最多上传 ${MAX_IMAGES} 张`;
    for (const it of images) {
      if (it.file.size > MAX_IMAGE_SIZE) return `图片 ${it.file.name} 超过 10MB 上限`;
    }
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) return `文件 ${f.name} 超过 20MB 上限`;
    }
    return null;
  }

  function reset() {
    revokeImages(images);
    setContent('');
    setImages([]);
    setFiles([]);
    setError('');
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setUploading(true);
    try {
      let attachmentIds = [];
      if (images.length > 0 || files.length > 0) {
        const fd = new FormData();
        for (const it of images) fd.append('files', it.file);
        for (const f of files) fd.append('files', f);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok) throw new Error(upData.error || '上传失败');
        attachmentIds = upData.attachments.map((a) => a.id);
      }

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, attachmentIds }),
      });
      const postData = await postRes.json().catch(() => ({}));
      if (!postRes.ok) throw new Error(postData.error || '发布失败');

      reset();
      onPublished();
    } catch (e) {
      setError(e.message || '发布失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="composer">
      <textarea
        placeholder="分享新鲜事…（支持文字、图片和文件附件）"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="composer-toolbar">
        <label className="file-btn">
          🖼 图片
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={onPickImages}
          />
        </label>
        <label className="file-btn">
          📎 附件
          <input type="file" accept={FILE_ACCEPT} multiple hidden onChange={onPickFiles} />
        </label>
        <div className="composer-hint">图片 ≤9 张/次、≤10MB/张；文件 ≤20MB/个</div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
          {uploading ? '发布中…' : '发布'}
        </button>
      </div>

      {images.length > 0 ? (
        <div className="preview-images">
          {images.map((it, i) => (
            <div className="preview-image" key={i}>
              <img src={it.url} alt={it.file.name} />
              <button className="remove" onClick={() => removeImage(i)} title="移除图片">
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="preview-files">
          {files.map((f, i) => (
            <div className="file-row" key={i}>
              <span className="file-icon">📄</span>
              <span className="file-meta">
                <span className="file-name">{f.name}</span>
                <span className="file-size">{formatSize(f.size)}</span>
              </span>
              <button className="btn-link danger" onClick={() => removeFile(i)}>
                移除
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="composer-error">{error}</div> : null}
    </div>
  );
}
