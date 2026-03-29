// 环境切换配置：dev（开发者工具）、device（真机本地联调）、prod（线上）
const DEFAULT_ENV = 'dev';
const ENV_MAP = {
  // 开发环境统一指向本地 Mock/后端服务（按实际运行端口）
  dev: 'http://localhost:3002',
  // device：请按需替换为本机局域网 IP（用于真机本地联调）
  device: 'http://192.168.1.13:3000',
  // prod：替换为线上 HTTPS 域名，并在小程序后台配置服务器域名白名单
  prod: 'https://your-domain.example.com',
};

// 独立鉴权域名映射（登录接口走独立域）
const ENV_MAP_AUTH = {
  // 与 mock-server 保持一致，开发环境统一走 3002 端口
  dev: 'http://localhost:3002',
  // 真机联调同样走 3000（如需独立鉴权服务，可改回 3002 并启动对应服务）
  device: 'http://192.168.1.13:3000',
  prod: 'https://auth.your-domain.example.com',
};

function safeGetAccountEnv() {
  try {
    if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
      const info = wx.getAccountInfoSync();
      const envVersion = info && info.miniProgram && info.miniProgram.envVersion;
      // develop | trial | release
      if (envVersion === 'develop') return 'dev';
      if (envVersion === 'trial' || envVersion === 'release') return 'prod';
    }
  } catch (_) {}
  return null;
}

function getEnv() {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const override = wx.getStorageSync('ENV_OVERRIDE');
      if (override && ENV_MAP[override]) return override;
    }
  } catch (_) {}
  const auto = safeGetAccountEnv();
  return auto || DEFAULT_ENV;
}

function setEnvOverride(env) {
  if (ENV_MAP[env] && typeof wx !== 'undefined' && wx.setStorageSync) {
    wx.setStorageSync('ENV_OVERRIDE', env);
  }
}

const ENV = getEnv();
const BASE_URL = ENV_MAP[ENV] || ENV_MAP[DEFAULT_ENV];
const AUTH_BASE_URL = ENV_MAP_AUTH[ENV] || ENV_MAP_AUTH[DEFAULT_ENV];

module.exports = {
  ENV,
  BASE_URL,
  ENV_MAP,
  AUTH_BASE_URL,
  ENV_MAP_AUTH,
  getEnv,
  setEnvOverride,
};
