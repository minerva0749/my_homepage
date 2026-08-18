// 包装 async 路由处理器：捕获其抛出的异常 / 拒绝，交给统一错误处理中间件。
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
