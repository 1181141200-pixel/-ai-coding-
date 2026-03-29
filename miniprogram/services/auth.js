const request = require('../utils/request');
const API = require('./api-registry');

// 登录服务：使用手机号请求后端获取 token 与 member 信息
// 返回形如 { token, member: { id, phone, roles, ... } }
async function loginWithPhone(phone, options = {}) {
  const payload = { phone: String(phone || '').trim() };
  return request.post(API.auth.login(), payload, {
    retry: 1,
    showErrorToast: false,
    ...options,
  });
}

module.exports = { loginWithPhone };