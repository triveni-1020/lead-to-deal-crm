const fs = require('fs');
const path = require('path');

const RESOURCES_FILE = path.join(__dirname, 'resources.json');

function loadResources() {
  try {
    if (fs.existsSync(RESOURCES_FILE)) {
      const data = fs.readFileSync(RESOURCES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading resources.json:', err.message);
  }
  return [];
}

function saveResources(list) {
  try {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving resources.json:', err.message);
  }
}

let resources = loadResources();

function getAll(category = null) {
  if (!category || category === 'All') return [...resources];
  return resources.filter((r) => r.category.toLowerCase() === category.toLowerCase());
}

function getById(id) {
  return resources.find((r) => String(r.id).toLowerCase() === String(id).toLowerCase()) || null;
}

function incrementDownloads(id) {
  const resource = getById(id);
  if (resource) {
    resource.downloadsCount = (resource.downloadsCount || 0) + 1;
    saveResources(resources);
  }
  return resource;
}

module.exports = {
  getAll,
  getById,
  incrementDownloads,
};
