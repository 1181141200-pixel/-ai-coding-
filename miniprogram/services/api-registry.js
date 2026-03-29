// 统一接口路径注册表，集中管理，便于快速切换真实后端
// 使用 CommonJS 导出以兼容现有 require 导入

const { ENV, AUTH_BASE_URL } = require('../config');

const API = {
  auth: {
    // 登录接口走独立域名；如未配置则回落到相对路径
    login: () => (AUTH_BASE_URL ? `${AUTH_BASE_URL}/auth/login` : '/auth/login'),
  },
  orders: {
    list: () => '/orders',
    detail: (id) => `/orders/${id}`,
    verify: (id) => `/orders/${id}/verify`,
    unverify: (id) => `/orders/${id}/unverify`,
    refund: (id) => `/orders/${id}/refund`,
    pay: (id) => `/orders/${id}/pay`,
    create: () => '/orders',
  },
  activities: {
    list: () => '/activities',
    detail: (id) => `/activities/${id}`,
    signup: (id) => `/activities/${id}/signup`,
  },
  lines: {
    list: () => '/lines',
    detail: (id) => `/lines/${id}`,
  },
  bases: {
    list: () => '/bases',
    detail: (id) => `/bases/${id}`,
  },
};

module.exports = API;