const linesService = require('../../services/lines');
const activitiesService = require('../../services/activities');
const basesService = require('../../services/bases');

Page({
  data: {
    activeTab: 'lines',
    loading: true,
    error: '',
    lines: [],
    activities: [],
    bases: [],
  },

  async onLoad() {
    await this.fetchAll();
  },

  async fetchAll() {
    this.setData({ loading: true, error: '' });
    try {
      const [linesRes, activitiesRes, basesRes] = await Promise.all([
        linesService.list(),
        activitiesService.list(),
        basesService.list(),
      ]);
      const lines = (linesRes && linesRes.data) || [];
      const activities = (activitiesRes && activitiesRes.data) || [];
      const bases = (basesRes && basesRes.data) || [];
      this.setData({ lines, activities, bases, loading: false });
    } catch (e) {
      const msg = e && e.message ? e.message : '加载失败';
      this.setData({ error: msg, loading: false });
    }
  },

  switchTab(e) {
    const tab = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab) || 'lines';
    this.setData({ activeTab: tab });
  },
});