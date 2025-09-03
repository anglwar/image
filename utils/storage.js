const STORAGE_KEY = 'ledger_records_v1';

function getRecords() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY) || [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  wx.setStorageSync(STORAGE_KEY, records || []);
}

function addRecord(record) {
  const records = getRecords();
  records.unshift(record);
  saveRecords(records);
}

module.exports = {
  getRecords,
  saveRecords,
  addRecord
};

