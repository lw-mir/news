const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, 'data.json');

const DEFAULT_SOURCE_CONFIGS = {
  sciencenet:   { name: '科学网',       url: 'https://news.sciencenet.cn/todaynews.aspx',             keywords: [],                                                    enabled: true },
  'pku-news':   { name: '北大新闻网',   url: 'https://news.pku.edu.cn/xwzh/index.htm',               keywords: ['讣告'],                                              enabled: true },
  'pku-notices':{ name: '北大通知公告', url: 'https://www.pku.edu.cn/notices.html',                   keywords: ['通知', '公告'],                                      enabled: true },
  hit:          { name: '哈工大',       url: 'https://today.hit.edu.cn/category/10',                  keywords: ['讣告', '通告'],                                      enabled: true },
  tsinghua:     { name: '清华大学',     url: 'https://www.tsinghua.edu.cn/news/xsky.htm',             keywords: ['Nature', '进展', '突破', '新领域', '首次', '新策略', '成果'], enabled: true },
  jiupai:       { name: '九派新闻教育', url: 'https://news.qq.com/omn/author/8QMd2npU6IIYvTfR',      keywords: ['大学', '研究生', '去世'],                            enabled: true },
  ccdi:         { name: '中纪委要闻',   url: 'https://www.ccdi.gov.cn/yaowenn/',                      keywords: ['高校', '大学', '校长', '教授', '导师'],              enabled: true },
  eol:          { name: '教育在线',     url: 'https://www.eol.cn/news/',                              keywords: ['大学', '高校'],                                      enabled: true },
  whu:          { name: '武汉大学',     url: 'https://www.whu.edu.cn/tzgg.htm',                       keywords: ['讣告', '情况通报'],                                  enabled: true },
};

const DEFAULT_DATA = {
  articles: [],
  settings: {
    cron_schedule: '0 20 * * *',
    date_range_days: '1'
  },
  source_configs: DEFAULT_SOURCE_CONFIGS
};

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // 补全新增的 source_configs
      if (!d.source_configs) d.source_configs = DEFAULT_SOURCE_CONFIGS;
      else {
        for (const [k, v] of Object.entries(DEFAULT_SOURCE_CONFIGS)) {
          if (!d.source_configs[k]) d.source_configs[k] = v;
        }
      }
      return d;
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

module.exports = {
  insertArticle(article) {
    const exists = _data.articles.some(a => a.url === article.url);
    if (exists) return { changes: 0 };
    _data.articles.unshift(article);
    if (_data.articles.length > 5000) _data.articles = _data.articles.slice(0, 5000);
    save(_data);
    return { changes: 1 };
  },

  getArticles({ source, page = 1, pageSize = 50 } = {}) {
    let list = source ? _data.articles.filter(a => a.source === source) : _data.articles;
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  },

  getCount(source) {
    return source ? _data.articles.filter(a => a.source === source).length : _data.articles.length;
  },

  getSources() {
    const map = {};
    _data.articles.forEach(a => {
      if (!map[a.source]) map[a.source] = { source: a.source, source_name: a.source_name, count: 0 };
      map[a.source].count++;
    });
    return Object.values(map).sort((a, b) => a.source_name.localeCompare(b.source_name, 'zh'));
  },

  clearArticles() {
    _data.articles = [];
    save(_data);
  },

  getSetting(key) { return _data.settings[key] ?? null; },

  setSetting(key, value) {
    _data.settings[key] = value;
    save(_data);
  },

  getAllSettings() { return _data.settings; },

  getSourceConfigs() { return _data.source_configs; },

  setSourceConfigs(configs) {
    // 合并更新，保留未提交的 source
    for (const [k, v] of Object.entries(configs)) {
      if (_data.source_configs[k]) {
        Object.assign(_data.source_configs[k], v);
      }
    }
    save(_data);
  }
};
