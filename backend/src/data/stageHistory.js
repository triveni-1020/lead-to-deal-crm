const fs = require('fs');
const path = require('path');

const STAGE_HISTORY_FILE = path.join(__dirname, 'stageHistory.json');

function loadHistory() {
  try {
    if (fs.existsSync(STAGE_HISTORY_FILE)) {
      const data = fs.readFileSync(STAGE_HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading stageHistory.json:', err.message);
  }
  return [];
}

function saveHistory(list) {
  try {
    fs.writeFileSync(STAGE_HISTORY_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving stageHistory.json:', err.message);
  }
}

// In-memory cache
let stageHistory = loadHistory();

function getAll() {
  return [...stageHistory];
}

function getByLeadId(leadId) {
  if (!leadId) return [];
  const normalizedId = String(leadId).toLowerCase();
  return stageHistory.filter((r) => String(r.leadId).toLowerCase() === normalizedId);
}

function generateHistoryId() {
  const maxNumber = stageHistory.reduce((max, r) => {
    const match = String(r.id).match(/^STG-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 1000);
  return `STG-${maxNumber + 1}`;
}

function addRecord(entry = {}) {
  const record = {
    id: generateHistoryId(),
    leadId: String(entry.leadId),
    oldStage: entry.oldStage || null,
    newStage: entry.newStage,
    reason: entry.reason || 'Stage progression updated based on activity',
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  stageHistory.unshift(record); // newest first
  saveHistory(stageHistory);
  return record;
}

module.exports = {
  getAll,
  getByLeadId,
  addRecord,
};
