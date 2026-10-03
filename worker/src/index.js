// Minimal Worker — 静态资源由 [assets] 托管，这个文件只是入口占位。
// 如果以后需要 API（如激活码验证），在这里加 fetch handler。

export default {
  async fetch(request, env, ctx) {
    return new Response('OK', { status: 200 });
  },
};
