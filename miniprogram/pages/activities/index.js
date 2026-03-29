const activitiesService = require('../../services/activities');
const auth = require('../../utils/auth');

Page({
  data: {
    list: [],
    total: 0,
    page: 1,
    pageSize: 2,
    loading: false,
    hasMore: true,
    // 登录相关
    loggedIn: false,
    memberId: null,
    memberPhone: '',
    
    // 错误态
    errorMsg: '',
  },
  onLoad() {
    try {
      const token = auth.getToken();
      const m = auth.getMember();
      const loggedIn = !!(token && m && m.id);
      this.setData({ loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '' });
    } catch (_) {}
    this.refresh();
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPage(this.data.page + 1);
    }
  },
  onPullDownRefresh() {
    this.refresh(() => wx.stopPullDownRefresh());
  },
  refresh(done) {
    this.setData({ list: [], total: 0, page: 1, hasMore: true, errorMsg: '' });
    // 无论是否登录都加载列表数据
    this.loadPage(1, done);
  },
  async loadPage(targetPage, done) {
    this.setData({ loading: true });
    try {
      const res = await activitiesService.list({ page: targetPage, pageSize: this.data.pageSize }, {
        showErrorToast: false
      });
      const data = res.data || {};
      const newList = (data.list || []);
      const merged = this.data.page === 1 ? newList : this.data.list.concat(newList);
      const total = data.total || merged.length;
      const hasMore = merged.length < total;
      this.setData({
        list: merged,
        total,
        page: targetPage,
        hasMore,
      });
    } catch (e) {
      const msg = e?.message || '活动列表加载失败';
      this.setData({ errorMsg: msg });
      // 如果是401错误且用户已登录，则更新登录状态
      if (e?.response?.statusCode === 401 && this.data.loggedIn) {
        this.setData({ loggedIn: false });
      }
    } finally {
      this.setData({ loading: false });
      if (typeof done === 'function') done();
    }
  },
  

  // 错误态重试
  retryList() {
    this.refresh();
  },

  // 统一跳转至独立登录页
  goLogin() {
    const redirect = '/pages/activities/index';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },

  goDetail(e) {
    const id = e?.currentTarget?.dataset?.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/activities/detail?id=${id}` });
  },
});