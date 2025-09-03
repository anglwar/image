const { getRecords } = require('../../utils/storage');

function formatMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

Page({
  data: {
    granularityOptions: ['month', 'quarter', 'year'],
    granularityIndex: 0,
    granularity: 'month',
    selectedMonth: formatMonth(new Date()),
    selectedYear: String(new Date().getFullYear()),
    total: 0,
    trendPoints: [],
    categoryDist: []
  },

  onShow() {
    this.computeAggregates();
  },

  onGranularityChange(e) {
    const idx = Number(e.detail.value);
    const granularity = this.data.granularityOptions[idx];
    this.setData({ granularityIndex: idx, granularity }, () => {
      this.computeAggregates();
    });
  },
  onMonthChange(e) {
    this.setData({ selectedMonth: e.detail.value }, () => this.computeAggregates());
  },
  onYearChange(e) {
    this.setData({ selectedYear: e.detail.value.split('-')[0] }, () => this.computeAggregates());
  },

  computeAggregates() {
    const records = getRecords();
    const { granularity, selectedMonth, selectedYear } = this.data;
    let filtered = [];
    if (granularity === 'month') {
      const key = selectedMonth;
      filtered = records.filter(r => r.date.startsWith(key));
      const parts = key.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const days = new Date(year, month, 0).getDate();
      const trendMap = new Map();
      for (let d = 1; d <= days; d++) {
        trendMap.set(String(d).padStart(2, '0'), 0);
      }
      filtered.forEach(r => {
        const day = r.date.slice(8, 10);
        trendMap.set(day, (trendMap.get(day) || 0) + Number(r.amount || 0));
      });
      const trendPoints = Array.from(trendMap.entries()).map(([k, v]) => ({ label: k, value: v }));
      const categoryMap = {};
      filtered.forEach(r => {
        categoryMap[r.category] = (categoryMap[r.category] || 0) + Number(r.amount || 0);
      });
      const categoryDist = Object.entries(categoryMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      const total = trendPoints.reduce((s, p) => s + p.value, 0);
      this.setData({ trendPoints, categoryDist, total }, () => this.drawCharts());
    } else if (granularity === 'quarter') {
      const year = Number(selectedYear);
      const quarters = [
        ['01', '02', '03'],
        ['04', '05', '06'],
        ['07', '08', '09'],
        ['10', '11', '12']
      ];
      const trendPoints = quarters.map((months, idx) => {
        const sum = records
          .filter(r => r.date.startsWith(`${year}-`) && months.includes(r.date.slice(5,7)))
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        return { label: `Q${idx+1}`, value: sum };
      });
      const filteredYear = records.filter(r => r.date.startsWith(`${year}-`));
      const categoryMap = {};
      filteredYear.forEach(r => {
        categoryMap[r.category] = (categoryMap[r.category] || 0) + Number(r.amount || 0);
      });
      const categoryDist = Object.entries(categoryMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      const total = trendPoints.reduce((s, p) => s + p.value, 0);
      this.setData({ trendPoints, categoryDist, total }, () => this.drawCharts());
    } else {
      const year = Number(selectedYear);
      const trendPoints = Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0');
        const sum = records
          .filter(r => r.date.startsWith(`${year}-${m}`))
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        return { label: `${i + 1}月`, value: sum };
      });
      const filteredYear = records.filter(r => r.date.startsWith(`${year}-`));
      const categoryMap = {};
      filteredYear.forEach(r => {
        categoryMap[r.category] = (categoryMap[r.category] || 0) + Number(r.amount || 0);
      });
      const categoryDist = Object.entries(categoryMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      const total = trendPoints.reduce((s, p) => s + p.value, 0);
      this.setData({ trendPoints, categoryDist, total }, () => this.drawCharts());
    }
  },

  drawCharts() {
    this.drawBar('trend', this.data.trendPoints);
    this.drawBar('dist', this.data.categoryDist);
  },

  drawBar(canvasId, points) {
    const query = wx.createSelectorQuery();
    query.select(`canvas[canvas-id=${canvasId}]`).fields({ node: true, size: true }).exec(res => {
      const canvas = res && res[0] && res[0].node;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;
      const width = res[0].width;
      const height = res[0].height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);
      const padding = 24;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2 - 16;
      const maxVal = Math.max(1, ...points.map(p => p.value));
      const barCount = points.length;
      const barGap = 8;
      const barWidth = Math.max(6, (chartWidth - (barCount - 1) * barGap) / (barCount || 1));

      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(padding, padding, chartWidth, chartHeight);
      ctx.fillStyle = '#1677ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1677ff';
      points.forEach((p, i) => {
        const barHeight = (p.value / maxVal) * chartHeight;
        const x = padding + i * (barWidth + barGap);
        const y = padding + chartHeight - barHeight;
        ctx.fillStyle = '#1677ff';
        ctx.fillRect(x, y, barWidth, barHeight);
      });
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      const step = Math.ceil(points.length / 6);
      points.forEach((p, i) => {
        if (i % step !== 0 && i !== points.length - 1) return;
        const x = padding + i * (barWidth + barGap) + barWidth / 2;
        ctx.fillText(p.label, x, height - padding);
      });
    });
  }
});

