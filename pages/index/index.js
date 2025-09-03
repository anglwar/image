const { getRecords, addRecord } = require('../../utils/storage');

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

Page({
  data: {
    monthTotal: 0,
    todayList: [],
    todayDate: formatDate(new Date()),
    isRecording: false,
    showManual: false,
    categories: ['餐饮', '购物', '交通', '娱乐', '居住', '医疗', '教育', '其他'],
    form: {
      amount: '',
      title: '',
      date: formatDate(new Date()),
      categoryIndex: 0
    }
  },

  onShow() {
    this.refreshLists();
  },

  refreshLists() {
    const all = getRecords();
    const now = new Date();
    const todayStr = formatDate(now);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayList = all.filter(r => r.date === todayStr);
    const monthTotal = all
      .filter(r => r.date.startsWith(monthKey))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    this.setData({ todayList, monthTotal });
  },

  openManualPopup() {
    this.setData({ showManual: true, form: {
      amount: '', title: '', date: formatDate(new Date()), categoryIndex: 0
    }});
  },
  closeManualPopup() {
    this.setData({ showManual: false });
  },
  onAmountInput(e) { this.setData({ 'form.amount': e.detail.value }); },
  onTitleInput(e) { this.setData({ 'form.title': e.detail.value }); },
  onDateChange(e) { this.setData({ 'form.date': e.detail.value }); },
  onCategoryChange(e) { this.setData({ 'form.categoryIndex': Number(e.detail.value) }); },

  submitManual() {
    const { amount, title, date, categoryIndex } = this.data.form;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    const record = {
      id: Date.now(),
      amount: amt,
      title: title || '未命名',
      date: date || formatDate(new Date()),
      category: this.data.categories[categoryIndex]
    };
    addRecord(record);
    wx.showToast({ title: '已保存', icon: 'success' });
    this.setData({ showManual: false });
    this.refreshLists();
  },

  onVoiceTouchStart() {
    // noop: wait for longpress
  },
  onVoiceLongPress() {
    if (this.data.isRecording) return;
    const recorder = wx.getRecorderManager();
    recorder.onStop((res) => {
      this.setData({ isRecording: false });
      // Here we could call speech-to-text service; placeholder only
      wx.showToast({ title: '录音完成', icon: 'success' });
    });
    recorder.start({ format: 'mp3', duration: 60000, sampleRate: 16000, numberOfChannels: 1 });
    this.setData({ isRecording: true });
    wx.showToast({ title: '开始录音，松开结束', icon: 'none' });
  },
  onVoiceTouchEnd() {
    if (!this.data.isRecording) return;
    const recorder = wx.getRecorderManager();
    recorder.stop();
  }
});

