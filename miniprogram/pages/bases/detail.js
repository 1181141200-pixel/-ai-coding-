const basesService = require('../../services/bases');
const auth = require('../../utils/auth');

Page({
  data: {
    id: null,
    base: null,
    loading: false,
    // 登录与错误态
    loggedIn: false,
    memberId: null,
    memberPhone: '',
    
    errorMsg: '',
    errorCode: '',
  },

  onLoad(options) {
    const id = Number(options?.id);
    if (!id) {
      wx.showToast({ title: '无效基地ID', icon: 'none' });
      return;
    }
    // 读取本地登录状态
    try {
      const token = auth.getToken();
      const m = auth.getMember();
      const loggedIn = !!(token && m && m.id);
      this.setData({ loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '' });
    } catch (_) {}
    this.setData({ id });
    this.fetchDetail();
  },

  async fetchDetail() {
    try {
      this.setData({ loading: true, errorMsg: '', errorCode: '' });
      const { id } = this.data;
      const res = await basesService.getDetail(id, {
        onUnauthorized: () => {
          // 登录失效：切换到登录视图并清空数据
          this.setData({ loggedIn: false, base: null, errorMsg: '登录态失效，请重新登录', errorCode: '401' });
          this.goLogin();
        },
      });
      this.setData({ base: res.data });
    } catch (e) {
      const msg = e?.message || '基地详情加载失败';
      this.setData({ errorMsg: msg });
    } finally {
      this.setData({ loading: false });
    }
  },

  

  // 错误态重试
  retryFetch() {
    this.fetchDetail();
  },
  // 返回列表
  backToList() {
    // 若从列表进入，优先返回上一页
    wx.navigateBack({ delta: 1 });
  },

  // 统一跳转至独立登录页
  goLogin() {
    const id = Number(this.data.id || 0);
    const redirect = id ? `/pages/bases/detail?id=${id}` : '/pages/bases/detail';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },
});