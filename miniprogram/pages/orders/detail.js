const ordersService = require('../../services/orders');
const auth = require('../../utils/auth');

Page({
  data: {
    id: null,
    order: null,
    loading: false,
    payLoading: false,
    verifyLoading: false,
    unverifyLoading: false,
    refundLoading: false,
    // 登录与错误态
    loggedIn: false,
    memberId: null,
    memberPhone: '',
    
    errorMsg: '',
    errorCode: '',
    // 操作权限与提示
    canPay: false,
    canRefund: false,
    canVerify: false,
    canUnverify: false,
    payReason: '',
    refundReason: '',
    verifyReason: '',
    unverifyReason: '',
  },

  onLoad(options) {
    const id = Number(options?.id);
    if (!id) {
      wx.showToast({ title: '无效订单ID', icon: 'none' });
      return;
    }
    const token = auth.getToken();
    const m = auth.getMember();
    const loggedIn = !!(token && m && m.id);
    this.setData({ id, loggedIn, memberId: loggedIn ? m.id : null, memberPhone: loggedIn ? (m.phone || '') : '' });
    if (loggedIn) {
      this.fetchDetail();
    }
  },

  async fetchDetail() {
    try {
      this.setData({ loading: true });
      const { id } = this.data;
      const res = await ordersService.getDetail(id, {
        onUnauthorized: () => {
          this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录后查看订单详情', errorCode: 'UNAUTHORIZED' });
          this.goLogin();
        },
        showErrorToast: false,
      });
      this.setData({ order: res.data, errorMsg: '' });
      this.updatePermissions();
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      const msg = e && e.message;
      if (status === 404) {
        this.setData({ errorMsg: '订单不存在或无权限查看', errorCode: 'NOT_FOUND' });
      } else if (status === 403) {
        this.setData({ errorMsg: '无权限查看该订单', errorCode: 'FORBIDDEN' });
      } else if (status === 401) {
        this.setData({ errorMsg: '未登录或登录态失效', errorCode: 'UNAUTHORIZED' });
      } else {
        this.setData({ errorMsg: msg || '详情加载失败，请稍后重试', errorCode: 'UNKNOWN' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  retryFetch() {
    if (!this.data.loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ errorMsg: '' });
    this.fetchDetail();
  },

  updatePermissions() {
    const { loggedIn, memberId, order } = this.data;
    let canPay = false, canRefund = false, canVerify = false, canUnverify = false;
    let payReason = '', refundReason = '', verifyReason = '', unverifyReason = '';
    if (!loggedIn) {
      payReason = '请先登录';
      refundReason = '请先登录';
      verifyReason = '请先登录';
      unverifyReason = '请先登录';
    }
    if (order) {
      const isOwner = Number(order.member_id || 0) === Number(memberId || 0);
      if (order.status === 'pending_pay') {
        canPay = !!(loggedIn && isOwner);
        if (!loggedIn) payReason = '请先登录';
        else if (!isOwner) payReason = '仅订单本人可支付';
      }
      if (order.status === 'paid' && order.verify_status === 'unverified') {
        canVerify = !!loggedIn; // 角色权限在后端校验，保留前端尝试
        if (!loggedIn) verifyReason = '请先登录';
        canRefund = !!(loggedIn && isOwner);
        if (!loggedIn) refundReason = '请先登录';
        else if (!isOwner) refundReason = '仅订单本人可申请退款';
      }
      if (order.status === 'used' && order.verify_status === 'verified') {
        canUnverify = !!loggedIn; // 角色权限在后端校验
        if (!loggedIn) unverifyReason = '请先登录';
      }
    }
    this.setData({ canPay, canRefund, canVerify, canUnverify, payReason, refundReason, verifyReason, unverifyReason });
  },

  async handleVerify() {
    const { id, verifyLoading, loggedIn, canVerify } = this.data;
    if (!loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!canVerify) return;
    if (verifyLoading) return;
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认核销',
        content: `将核销订单 #${id}，确认继续？`,
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;
    try {
      this.setData({ verifyLoading: true });
      const res = await ordersService.verify(id, { showErrorToast: false, onUnauthorized: () => {
        this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录', errorCode: 'UNAUTHORIZED' });
        this.goLogin();
      } });
      if (res?.data?.ok) {
        wx.showToast({ title: '核销成功', icon: 'success' });
        await this.fetchDetail();
      } else {
        wx.showToast({ title: res?.data?.message || '核销失败', icon: 'none' });
      }
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 403) {
        wx.showToast({ title: '无权限执行核销', icon: 'none' });
      } else {
        wx.showToast({ title: e?.message || '核销失败', icon: 'none' });
      }
    } finally {
      this.setData({ verifyLoading: false });
    }
  },

  async handleUnverify() {
    const { id, unverifyLoading, loggedIn, canUnverify } = this.data;
    if (!loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!canUnverify) return;
    if (unverifyLoading) return;
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认反核销',
        content: `将恢复订单 #${id} 为未核销状态，确认继续？`,
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;
    try {
      this.setData({ unverifyLoading: true });
      const res = await ordersService.unverify(id, { showErrorToast: false, onUnauthorized: () => {
        this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录', errorCode: 'UNAUTHORIZED' });
        this.goLogin();
      } });
      if (res?.data?.ok) {
        wx.showToast({ title: '反核销成功', icon: 'success' });
        await this.fetchDetail();
      } else {
        wx.showToast({ title: res?.data?.message || '反核销失败', icon: 'none' });
      }
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 403) {
        wx.showToast({ title: '无权限执行反核销', icon: 'none' });
      } else {
        wx.showToast({ title: e?.message || '反核销失败', icon: 'none' });
      }
    } finally {
      this.setData({ unverifyLoading: false });
    }
  },

  async handleRefund() {
    const { id, refundLoading, loggedIn, canRefund } = this.data;
    if (!loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!canRefund) return;
    if (refundLoading) return;
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认申请退款',
        content: `将为订单 #${id} 申请退款，确认继续？`,
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;
    try {
      this.setData({ refundLoading: true });
      const res = await ordersService.refund(id, { showErrorToast: false, onUnauthorized: () => {
        this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录', errorCode: 'UNAUTHORIZED' });
        this.goLogin();
      } });
      if (res?.data?.ok) {
        wx.showToast({ title: '已申请退款', icon: 'success' });
        await this.fetchDetail();
      } else {
        wx.showToast({ title: res?.data?.message || '退款申请失败', icon: 'none' });
      }
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 403) {
        wx.showToast({ title: '无权限申请退款', icon: 'none' });
      } else {
        wx.showToast({ title: e?.message || '退款申请失败', icon: 'none' });
      }
    } finally {
      this.setData({ refundLoading: false });
    }
  },

  async handlePay() {
    const { id, payLoading, loggedIn, canPay } = this.data;
    if (!loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!canPay) return;
    if (payLoading) return;
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认支付',
        content: `将支付订单 #${id}，确认继续？`,
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirm) return;
    try {
      this.setData({ payLoading: true });
      const res = await ordersService.pay(id, { showErrorToast: false, onUnauthorized: () => {
        this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录', errorCode: 'UNAUTHORIZED' });
        this.goLogin();
      } });
      if (res?.data?.ok) {
        wx.showToast({ title: '支付成功', icon: 'success' });
        await this.fetchDetail();
        setTimeout(() => {
          wx.showModal({
            title: '支付成功',
            content: '订单已更新为已支付状态',
            showCancel: true,
            cancelText: '返回列表',
            confirmText: '留在此页',
            success: (res) => {
              if (res && res.cancel) {
                wx.navigateTo({ url: '/pages/orders/index' });
              }
            },
          });
        }, 200);
      } else {
        wx.showToast({ title: res?.data?.message || '支付失败', icon: 'none' });
      }
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 403) {
        wx.showToast({ title: '无权限支付该订单', icon: 'none' });
      } else {
        wx.showToast({ title: e?.message || '支付失败', icon: 'none' });
      }
    } finally {
      this.setData({ payLoading: false });
    }
  },

  // 登录区：手动手机号输入与校验
  

  goList() {
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  // 统一跳转至独立登录页
  goLogin() {
    const id = Number(this.data.id || 0);
    const redirect = id ? `/pages/orders/detail?id=${id}` : '/pages/orders/detail';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },
});