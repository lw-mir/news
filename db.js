const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'data.json');

const DEFAULT_DATA = {
  articles: [],
  settings: {
    cron_schedule: '0 20 * * *',
    keywords: ['讣告', '通报', '情况说明', '处分', '违纪', '违规', 'Nature', 'Science', '突破', '首次', '新策略', '研究生', '招生', '导师', '教授', '校长', '院士'],
    date_range_days: '1'
  }
};

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function save(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] 写入失败:', e.message);
  }
}

let _data = load();

function getData() { return _data; }

module.exports = {
  insertArticle(article) {
    const d = getData();
    const exists = d.articles.some(a => a.url === article.url);
    if (exists) return { changes: 0 };
    d.articles.unshift(article);
    // 保留最近 5000 条
    if (d.articles.length > 5000) d.articles = d.articles.slice(0, 5000);
    save(d);
    return { changes: 1 };
  },

  getArticles({ source, page = 1, pageSize = 50 } = {}) {
    const d = getData();
    let list = source ? d.articles.filter(a => a.source === source) : d.articles;
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  },

  getCount(source) {
    const d = getData();
    return source ? d.articles.filter(a => a.source === source).length : d.articles.length;
  },

  getSources() {
    const d = getData();
    const map = {};
    d.articles.forEach(a => {
      if (!map[a.source]) map[a.source] = { source: a.source, source_name: a.source_name, count: 0 };
      map[a.source].count++;
    });
    return Object.values(map).sort((a, b) => a.source_name.localeCompare(b.source_name, 'zh'));
  },

  clearArticles() {
    const d = getData();
    d.articles = [];
    save(d);
  },

  getSetting(key) {
    return getData().settings[key] ?? null;
  },

  setSetting(key, value) {
    const d = getData();
    d.settings[key] = value;
    save(d);
  },

  getAllSettings() {
    return getData().settings;
  }
};
