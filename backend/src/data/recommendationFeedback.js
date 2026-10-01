const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, 'recommendationFeedback.json');

function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading recommendationFeedback.json:', err.message);
  }
  return [];
}

function saveFeedback(list) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving recommendationFeedback.json:', err.message);
  }
}

let feedbackList = loadFeedback();

function recordFeedback(data) {
  const item = {
    id: `FB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    customerId: String(data.customerId),
    leadId: data.leadId || null,
    productId: data.productId,
    recommendationId: data.recommendationId || null,
    reason: data.reason || '',
    action: data.action, // 'RECOMMENDATION_CLICK' | 'RECOMMENDATION_INTEREST' | 'RECOMMENDATION_DISMISSED'
    timestamp: data.timestamp || new Date().toISOString(),
  };

  feedbackList.push(item);
  saveFeedback(feedbackList);
  return item;
}

function getByCustomerId(customerId) {
  const cId = String(customerId);
  return feedbackList.filter((f) => String(f.customerId) === cId);
}

module.exports = {
  recordFeedback,
  getByCustomerId,
};
