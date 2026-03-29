const linesService = require('../../services/lines');
const ordersService = require('../../services/orders');
const auth = require('../../utils/auth');

Page({
  data: {
    id: null,
    line: null,
    loading: false,
    // 下单与登录相关
    quantity: 1,
    canCreate: true,
    createLoading: false,
    loggedIn: false,
    memberId: null,
    memberPhone: '',
    // 错误态
    errorMsg: '',
    errorCode: '',
  },

  onLoad(options) {
    const id = Number(options?.id);
    if (!id) {
      wx.showToast({ title: '无效线路ID', icon: 'none' });
      return;
    }
    // 读取本地登录状态
    const token = auth.getToken();
    const m = auth.getMember();
    const loggedIn = !!(token && m && m.id);
    this.setData({ loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '', id });
    this.fetchDetail();
  },

  async fetchDetail() {
    try {
      this.setData({ loading: true, errorMsg: '', errorCode: '' });
      const { id } = this.data;
      const res = await linesService.getDetail(id, {
        showErrorToast: false,
        onUnauthorized: () => {
          this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录后查看线路详情', errorCode: 'UNAUTHORIZED' });
          this.goLogin();
        },
      });
      const line = res.data;
      const avail = line && line.available_count;
      const canCreate = typeof avail === 'number' ? avail > 0 : true;
      this.setData({ line, canCreate });
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 404) {
        this.setData({ errorMsg: '线路不存在或已下线', errorCode: 'NOT_FOUND' });
      } else {
        this.setData({ errorMsg: e?.message || '线路详情加载失败', errorCode: 'UNKNOWN' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // 数量调整
  onMinus() {
    const q = Number(this.data.quantity || 1);
    const next = Math.max(1, q - 1);
    this.setData({ quantity: next });
  },
  onPlus() {
    const q = Number(this.data.quantity || 1);
    const next = q + 1;
    this.setData({ quantity: next });
  },

  

  async createOrder() {
    try {
      const { id, line, quantity, loggedIn, memberId } = this.data;
      if (!id || !line) return;
      if (!loggedIn || !memberId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      if (!this.data.canCreate) {
        wx.showToast({ title: '当前不可下单', icon: 'none' });
        return;
      }
      this.setData({ createLoading: true });
      const payload = { line_id: Number(id), quantity: Number(quantity || 1) };
      const res = await ordersService.createOrder(payload, {
        onUnauthorized: () => {
          this.setData({ loggedIn: false });
          wx.showToast({ title: '登录态失效，请重新登录', icon: 'none' });
          this.goLogin();
        },
      });
      const data = res && res.data;
      if (data && (data.ok || data.id || data.order_id)) {
        const orderId = Number(data.id || data.order_id);
        wx.showToast({ title: '下单成功', icon: 'success' });
        // 跳转订单详情页
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/orders/detail?id=${orderId}` });
        }, 300);
      } else {
        wx.showToast({ title: data?.message || '下单失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e?.message || '下单失败', icon: 'none' });
    } finally {
      this.setData({ createLoading: false });
    }
  },

  // 统一跳转至独立登录页
  goLogin() {
    const id = Number(this.data.id || 0);
    const redirect = id ? `/pages/lines/detail?id=${id}` : '/pages/lines/detail';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },

  retryFetch() {
    this.fetchDetail();
  },
  backToList() {
    wx.navigateBack({ delta: 1 });
  },
});