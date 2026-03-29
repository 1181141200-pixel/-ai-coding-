const { BASE_URL } = require('../config.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  if (!url) return BASE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return BASE_URL + url;
  return BASE_URL + '/' + url;
}

function showToast(message) {
  try {
    if (typeof wx !== 'undefined' && wx.showToast) {
      wx.showToast({ title: message, icon: 'none', duration: 2000 });
    }
  } catch (_) {}
}

// SPEC-B 错误码映射（文档：附录B）
const ERROR_CODE_MAP = {
  0: '成功',
  40101: '未登录或登录态失效',
  40301: '无权限',
  40401: '资源不存在',
  40901: '业务冲突',
  42201: '参数错误',
  42901: '操作太频繁，请稍后再试',
  50000: '服务器开小差了',
  54001: '支付失败，请稍后重试',
  56001: '库存或容量不足',
};

function mapSpecBMessage(res) {
  const data = (res && res.data) || {};
  const code = Number(data.code);
  const serverMsg = data.message || data.msg || data.error;
  if (!Number.isNaN(code) && code !== 0) {
    return ERROR_CODE_MAP[code] || serverMsg || `请求失败（业务码：${code}）`;
  }
  // HTTP 状态兜底映射（部分接口可能未返回 SPEC-B 结构）
  const status = res && res.statusCode;
  if (status) {
    if (status === 401) return ERROR_CODE_MAP[40101];
    if (status === 403) return ERROR_CODE_MAP[40301];
    if (status === 404) return ERROR_CODE_MAP[40401];
    if (status === 429) return ERROR_CODE_MAP[42901];
    if (status >= 500) return ERROR_CODE_MAP[50000];
  }
  return serverMsg;
}

function isUnauthorized(res) {
  const status = res && res.statusCode;
  const code = Number((res && res.data && res.data.code) || NaN);
  return status === 401 || code === 40101;
}

function parseErrorMessage(res, err) {
  if (err) {
    const msg = err.errMsg || '网络错误，请稍后重试';
    if (/timeout/i.test(msg)) return '请求超时，请稍后重试';
    return msg;
  }
  if (res) {
    const mapped = mapSpecBMessage(res);
    if (mapped) return mapped;
    const data = res.data || {};
    return data.message || data.msg || data.error || `请求失败（${res.statusCode || '未知状态'}）`;
  }
  return '未知错误';
}

function backoffDelay(attempt, base = 300) {
  // 指数退避：300ms, 600ms, 1200ms, ...
  return base * Math.pow(2, attempt);
}

function rawRequest(opts) {
  return new Promise((resolve, reject) => {
    try {
      wx.request({
        url: normalizeUrl(opts.url),
        method: opts.method || 'GET',
        data: opts.data,
        header: opts.header || opts.headers || {},
        timeout: opts.timeout || 10000,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function request(options) {
  const opts = options || {};
  const maxRetries = typeof opts.retry === 'number' ? opts.retry : 0;
  const retryBaseDelay = opts.retryDelay || 300;
  const showError = opts.showErrorToast !== false;
  // 读取令牌并注入到请求头
  let headers = opts.header || opts.headers || {};
  try {
    const token = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('AUTH_TOKEN') : null;
    if (token) headers = { ...headers, Authorization: `Bearer ${token}` };
  } catch (_) {}

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await rawRequest({ ...opts, header: headers });
      const code = res.statusCode || 0;
      if (code >= 200 && code < 300) {
        return res;
      }
      const message = parseErrorMessage(res, null);
      // 未认证处理回调（可选）
      if (isUnauthorized(res)) {
        // 清理本地令牌，避免后续请求持续 401
        try {
          if (typeof wx !== 'undefined' && wx.removeStorageSync) {
            wx.removeStorageSync('AUTH_TOKEN');
            // 同步清理本地 member，避免页面误判已登录
            wx.removeStorageSync('member');
          }
        } catch (_) {}
        if (typeof opts.onUnauthorized === 'function') {
          try { opts.onUnauthorized(res); } catch (_) {}
        }
      }
      if (code >= 500 && attempt < maxRetries) {
        await sleep(backoffDelay(attempt, retryBaseDelay));
        attempt += 1;
        continue;
      }
      if (showError) showToast(message);
      const error = new Error(message);
      error.response = res;
      throw error;
    } catch (err) {
      const msg = parseErrorMessage(null, err);
      const isTimeout = /timeout/i.test(err && err.errMsg);
      const isNetworkFail = /request:fail/i.test(err && err.errMsg);
      if ((isTimeout || isNetworkFail) && attempt < maxRetries) {
        await sleep(backoffDelay(attempt, retryBaseDelay));
        attempt += 1;
        continue;
      }
      if (showError) showToast(msg);
      throw err;
    }
  }
}

request.get = (url, options = {}) => request({ url, method: 'GET', ...options });
request.post = (url, data = {}, options = {}) => request({ url, method: 'POST', data, ...options });
request.put = (url, data = {}, options = {}) => request({ url, method: 'PUT', data, ...options });
request.delete = (url, options = {}) => request({ url, method: 'DELETE', ...options });

module.exports = request;