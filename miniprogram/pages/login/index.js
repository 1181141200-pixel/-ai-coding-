const auth = require('../../utils/auth');
const authService = require('../../services/auth');

Page({
  data: {
    loginPhone: '',
    loginPhoneValid: false,
    loginLoading: false,
    redirect: '',
  },

  onLoad(options) {
    try {
      const token = auth.getToken();
      const m = auth.getMember();
      if (token && m && m.id) {
        wx.showToast({ title: '已登录', icon: 'success' });
        this.goAfterLogin();
        return;
      }
    } catch (_) {}
    const redirect = decodeURIComponent(String(options?.redirect || ''));
    this.setData({ redirect });
  },

  onLoginPhoneInput(e) {
    const v = String(e?.detail?.value || '').trim();
    const valid = /^1[3-9]\d{9}$/.test(v);
    this.setData({ loginPhone: v, loginPhoneValid: valid });
  },

  async loginWithPhone() {
    const { loginPhoneValid, loginPhone } = this.data;
    if (!loginPhoneValid) {
      wx.showToast({ title: '请输入有效手机号', icon: 'none' });
      return;
    }
    this.setData({ loginLoading: true });
    try {
      const res = await authService.loginWithPhone(loginPhone);
      const data = res && res.data;
      if (!data || !data.token || !data.member || !data.member.id) {
        wx.showToast({ title: '登录失败：返回数据异常', icon: 'none' });
        return;
      }
      auth.setToken(data.token);
      auth.setMember(data.member);
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.goAfterLogin();
    } catch (e) {
      wx.showToast({ title: e?.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loginLoading: false });
    }
  },

  onGetPhoneNumber(e) {
    const detail = e?.detail || {};
    if (detail?.phoneNumber) {
      const v = String(detail.phoneNumber).trim();
      const valid = /^1[3-9]\d{9}$/.test(v);
      this.setData({ loginPhone: v, loginPhoneValid: valid });
      wx.showToast({ title: '已获取手机号', icon: 'success' });
      return;
    }
    wx.showToast({ title: '无法自动获取手机号，请手动输入', icon: 'none' });
  },

  goAfterLogin() {
    const redirect = this.data.redirect;
    if (redirect) {
      try {
        // 使用 redirectTo 而不是 reLaunch 避免重新启动页面
        wx.redirectTo({ url: redirect });
        return;
      } catch (_) {}
    }
    const pages = getCurrentPages();
    if (pages && pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/lines/index' });
    }
  },
});