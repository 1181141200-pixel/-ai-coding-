const { loginWithPhone } = require('../../services/auth');
const Auth = require('../../utils/auth');

Page({
  data: {
    loggedIn: false,
    member: null,
    phone: '',
  },

  onShow() {
    const member = Auth.getMember();
    this.setData({ member, loggedIn: Auth.isLoggedIn() });
  },

  onPhoneInput(e) {
    this.setData({ phone: (e && e.detail && e.detail.value) || '' });
  },

  async onLogin() {
    const phone = String(this.data.phone || '').trim();
    if (!/^\d{11}$/.test(phone)) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '登录中', mask: true });
      const res = await loginWithPhone(phone);
      const data = (res && res.data) || {};
      if (data && data.token) Auth.setToken(data.token);
      if (data && data.member) Auth.setMember(data.member);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.setData({ member: data.member || null, loggedIn: Auth.isLoggedIn() });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e && e.message ? e.message : '登录失败', icon: 'none' });
    }
  },

  onLogout() {
    Auth.logout();
    Auth.clearToken();
    wx.showToast({ title: '已退出登录', icon: 'none' });
    this.setData({ member: null, loggedIn: false });
  },
});