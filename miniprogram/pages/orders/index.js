const ordersService = require('../../services/orders');
const linesService = require('../../services/lines');
const auth = require('../../utils/auth');

Page({
  data: {
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true,
    // 登录相关
    loggedIn: false,
    memberId: null,
    memberPhone: '',
    // 筛选与排序
    statusIndex: 0,
    statusOptions: [
      { label: '全部', value: '' },
      { label: '待使用', value: 'paid' },
      { label: '已使用', value: 'used' },
      { label: '已过期', value: 'expired' },
      { label: '退款中', value: 'refunding' },
    ],
    verifyIndex: 0,
    verifyOptions: [
      { label: '全部', value: '' },
      { label: '未核销', value: 'unverified' },
      { label: '已核销', value: 'verified' },
    ],
    lineIndex: 0,
    lineOptions: [ { label: '全部线路', value: '' } ],
    sortByIndex: 0,
    sortByOptions: [
      { label: '下单时间', value: 'created_at' },
      { label: '状态', value: 'status' },
      { label: '核销状态', value: 'verify_status' },
    ],
    sortOrderIndex: 1,
    sortOrderOptions: [
      { label: '升序', value: 'ASC' },
      { label: '降序', value: 'DESC' },
    ],
    // 供 wxml 使用的 labels
    statusLabels: [],
    verifyLabels: [],
    lineLabels: [],
    sortByLabels: [],
    sortOrderLabels: [],
  },

  onLoad() {
    this.initLabels();
    const token = auth.getToken();
    const m = auth.getMember();
    const loggedIn = !!(token && m && m.id);
    this.setData({ loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '' });
    if (loggedIn) {
      this.loadLines();
      this.fetchOrders(true);
    }
  },

  initLabels() {
    this.setData({
      statusLabels: this.data.statusOptions.map(o => o.label),
      verifyLabels: this.data.verifyOptions.map(o => o.label),
      lineLabels: this.data.lineOptions.map(o => o.label),
      sortByLabels: this.data.sortByOptions.map(o => o.label),
      sortOrderLabels: this.data.sortOrderOptions.map(o => o.label),
    });
  },

  async loadLines() {
    try {
      const res = await linesService.list('page=1&pageSize=50');
      const extra = (res.data.list || []).map(l => ({ label: `${l.name}`, value: String(l.id) }));
      const lineOptions = [{ label: '全部线路', value: '' }].concat(extra);
      const lineLabels = lineOptions.map(o => o.label);
      this.setData({ lineOptions, lineLabels });
    } catch (e) {
      // 忽略错误，保持默认“全部线路”
    }
  },

  onPullDownRefresh() {
    // 刷新登录态并按需刷新列表
    const token = auth.getToken();
    const m = auth.getMember();
    const loggedIn = !!(token && m && m.id);
    this.setData({ loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '' });
    this.setData({ page: 1 });
    if (loggedIn) {
      Promise.resolve()
        .then(() => this.loadLines())
        .then(() => this.fetchOrders(true))
        .finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.fetchOrders();
  },

  onStatusChange(e) {
    const statusIndex = Number(e.detail.value);
    this.setData({ statusIndex, page: 1 });
    this.fetchOrders(true);
  },
  onVerifyChange(e) {
    const verifyIndex = Number(e.detail.value);
    this.setData({ verifyIndex, page: 1 });
    this.fetchOrders(true);
  },
  onLineChange(e) {
    const lineIndex = Number(e.detail.value);
    this.setData({ lineIndex, page: 1 });
    this.fetchOrders(true);
  },
  onSortByChange(e) {
    const sortByIndex = Number(e.detail.value);
    this.setData({ sortByIndex, page: 1 });
    this.fetchOrders(true);
  },
  onSortOrderChange(e) {
    const sortOrderIndex = Number(e.detail.value);
    this.setData({ sortOrderIndex, page: 1 });
    this.fetchOrders(true);
  },

  clearFilters() {
    this.setData({ statusIndex: 0, verifyIndex: 0, lineIndex: 0, sortByIndex: 0, sortOrderIndex: 1, page: 1 });
    this.fetchOrders(true);
  },

  buildQueryParams() {
    const { page, pageSize, statusIndex, statusOptions, verifyIndex, verifyOptions, lineIndex, lineOptions, sortByIndex, sortByOptions, sortOrderIndex, sortOrderOptions } = this.data;
    const parts = [];
    const push = (k, v) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    };
    push('page', page);
    push('pageSize', pageSize);
    const status = statusOptions[statusIndex]?.value;
    const verifyStatus = verifyOptions[verifyIndex]?.value;
    const lineId = lineOptions[lineIndex]?.value;
    const sortBy = sortByOptions[sortByIndex]?.value;
    const sortOrder = sortOrderOptions[sortOrderIndex]?.value;
    push('status', status);
    push('verifyStatus', verifyStatus);
    push('lineId', lineId);
    push('sortBy', sortBy);
    push('sortOrder', sortOrder);
    // 为满足后端权限策略：会员/企业必须加 mine=true 才能访问订单列表
    push('mine', true);
    return parts.join('&');
  },

  async fetchOrders(initial = false) {
    try {
      if (!this.data.loggedIn) {
        return;
      }
      this.setData({ loading: true });
      const qs = this.buildQueryParams();
      const res = await ordersService.list(qs, {
        onUnauthorized: () => {
          // 登录态失效：切换到登录视图并清空列表
          this.setData({ loggedIn: false, items: [], total: 0, hasMore: false });
          this.goLogin();
        },
      });
      const data = res.data || {};
      const items = initial ? (data.items || []) : this.data.items.concat(data.items || []);
      const total = data.total || 0;
      const hasMore = items.length < total;
      this.setData({ items, total, hasMore });
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 401) {
        // 未登录/登录态失效：不重复弹 toast，直接依靠登录区提示
        this.setData({ loggedIn: false, items: [], total: 0, hasMore: false });
        this.goLogin();
      } else {
        wx.showToast({ title: e?.message || '订单加载失败', icon: 'none' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/orders/detail?id=${id}` });
  },

  

  // 统一跳转至独立登录页
  goLogin() {
    const redirect = '/pages/orders/index';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },
});