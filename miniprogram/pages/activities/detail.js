const activitiesService = require('../../services/activities');
const auth = require('../../utils/auth');

Page({
  data: {
    id: null,
    activity: null,
    loading: false,
    signupLoading: false,
    canSignup: true,
    phone: '',
    note: '',
    // 登录相关状态
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
      wx.showToast({ title: '无效活动ID', icon: 'none' });
      return;
    }
    // 读取本地登录状态（令牌与成员信息）
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
      const res = await activitiesService.getDetail(id, {
        showErrorToast: false,
        onUnauthorized: () => {
          this.setData({ loggedIn: false, errorMsg: '登录态失效，请重新登录后查看活动详情', errorCode: 'UNAUTHORIZED' });
          this.goLogin();
        },
      });
      const activity = res.data;
      const cap = activity && activity.capacity;
      const count = activity && activity.signup_count;
      const canSignup = typeof cap === 'number' && typeof count === 'number' ? (count < cap) : true;
      this.setData({ activity, canSignup });
    } catch (e) {
      const status = e && e.response && e.response.statusCode;
      if (status === 404) {
        this.setData({ errorMsg: '活动不存在或已下线', errorCode: 'NOT_FOUND' });
      } else {
        this.setData({ errorMsg: e?.message || '活动详情加载失败', errorCode: 'UNKNOWN' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  async signup() {
    try {
      const { id, canSignup, phone, note, loggedIn, memberId, memberPhone } = this.data;
      if (!id) return;
      if (!canSignup) {
        wx.showToast({ title: '名额已满，无法报名', icon: 'none' });
        return;
      }
      if (!loggedIn || !memberId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      this.setData({ signupLoading: true });
      const payload = { member_id: Number(memberId) };
      const phoneUsed = (phone && String(phone).trim()) || (memberPhone && String(memberPhone).trim()) || '';
      if (phoneUsed) payload.phone = phoneUsed;
      if (note) payload.note = String(note).trim();
      const res = await activitiesService.signupActivity(id, payload, {
        onUnauthorized: () => {
          this.setData({ loggedIn: false });
          wx.showToast({ title: '登录态失效，请重新登录', icon: 'none' });
          this.goLogin();
        },
        showErrorToast: false,
      });
      if (res && res.data && res.data.ok) {
        wx.showToast({ title: '报名成功', icon: 'success' });
        const activity = this.data.activity || {};
        const count = Number(activity.signup_count || 0) + 1;
        const cap = activity.capacity;
        const canSignup = typeof cap === 'number' ? (count < cap) : true;
        this.setData({ activity: { ...activity, signup_count: count }, canSignup, note: '' });
      } else {
        wx.showToast({ title: '报名失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e?.message || '报名失败', icon: 'none' });
    } finally {
      this.setData({ signupLoading: false });
    }
  },

  retryFetch() {
    this.fetchDetail();
  },
  backToList() {
    wx.navigateBack({ delta: 1 });
  },

  onPhoneInput(e) {
    this.setData({ phone: (e?.detail?.value || '').trim() });
  },

  onNoteInput(e) {
    this.setData({ note: (e?.detail?.value || '').trim() });
  },

  

  // 统一跳转至独立登录页
  goLogin() {
    const id = Number(this.data.id || 0);
    const redirect = id ? `/pages/activities/detail?id=${id}` : '/pages/activities/detail';
    const url = `/pages/login/index?redirect=${encodeURIComponent(redirect)}`;
    wx.navigateTo({ url });
  },
});