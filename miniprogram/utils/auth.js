// 简易本地登录状态管理（基于 Storage）
// 仅用于 Mock 环境；真实项目应接入后端鉴权与会话管理

function getMember() {
  try {
    const m = wx.getStorageSync('member');
    return m || null;
  } catch (e) {
    return null;
  }
}

function setMember(member) {
  try {
    wx.setStorageSync('member', member || null);
  } catch (e) {}
}

function logout() {
  try {
    wx.removeStorageSync('member');
  } catch (e) {}
}

function isLoggedIn() {
  const m = getMember();
  return !!(m && m.id);
}

function getToken() {
  try {
    return wx.getStorageSync('AUTH_TOKEN') || null;
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  try {
    wx.setStorageSync('AUTH_TOKEN', token || '');
  } catch (e) {}
}

function clearToken() {
  try {
    wx.removeStorageSync('AUTH_TOKEN');
  } catch (e) {}
}

module.exports = { getMember, setMember, logout, isLoggedIn, getToken, setToken, clearToken };