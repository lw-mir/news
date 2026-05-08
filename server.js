const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { insertArticle, getArticles, getCount, getSources, clearArticles, getSetting, setSetting, getAllSettings } = require('./db');
const { collectAll } = require('./scrapers/index');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let isCollecting = false;
let lastCollectTime = null;
let currentCronJob = null;

async function runCollection() {
  if (isCollecting) return { success: false, message: '采集正在进行中' };
  isCollecting = true;
  try {
    const settings = getAllSettings();
    const keywords = Array.isArray(settings.keywords) ? settings.keywords : JSON.parse(settings.keywords || '[]');
    const rangeDays = parseInt(settings.date_range_days || '1');
    const articles = await collectAll(keywords, rangeDays);

    let inserted = 0;
    for (const article of articles) {
      const result = insertArticle(article);
      if (result.changes > 0) inserted++;
    }
    lastCollectTime = new Date().toISOString();
    return { success: true, total: articles.length, inserted, message: `采集完成，共 ${articles.length} 条，新增 ${inserted} 条` };
  } catch (err) {
    console.error('[采集] 错误:', err);
    return { success: false, message: err.message };
  } finally {
    isCollecting = false;
  }
}

function setupCron(schedule) {
  if (currentCronJob) {
    currentCronJob.stop();
    currentCronJob = null;
  }
  if (!cron.validate(schedule)) {
    console.warn('[Cron] 无效的 cron 表达式:', schedule);
    return;
  }
  currentCronJob = cron.schedule(schedule, () => {
    console.log('[Cron] 定时采集触发:', new Date().toLocaleString());
    runCollection().then(r => console.log('[Cron] 结果:', r.message));
  }, { timezone: 'Asia/Shanghai' });
  console.log('[Cron] 已设置定时任务:', schedule);
}

// 启动时加载 cron
setupCron(getSetting('cron_schedule') || '0 20 * * *');

// ─── API 路由 ──────────────────────────────────────────────────────────────────

// 获取文章列表
app.get('/api/articles', (req, res) => {
  const { source, page = 1, pageSize = 50 } = req.query;
  const articles = getArticles({ source, page: parseInt(page), pageSize: parseInt(pageSize) });
  const total = getCount(source);
  res.json({ articles, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 获取来源列表
app.get('/api/sources', (req, res) => {
  const sources = getSources();
  res.json(sources);
});

// 手动触发采集
app.post('/api/collect', async (req, res) => {
  const result = await runCollection();
  res.json(result);
});

// 采集状态
app.get('/api/status', (req, res) => {
  res.json({
    isCollecting,
    lastCollectTime,
    totalArticles: getCount()
  });
});

// 清空文章
app.delete('/api/articles', (req, res) => {
  clearArticles();
  res.json({ success: true });
});

// 获取设置
app.get('/api/settings', (req, res) => {
  res.json(getAllSettings());
});

// 更新设置
app.put('/api/settings', (req, res) => {
  const { keywords, cron_schedule, date_range_days } = req.body;
  if (keywords !== undefined) setSetting('keywords', keywords);
  if (date_range_days !== undefined) setSetting('date_range_days', String(date_range_days));
  if (cron_schedule !== undefined) {
    if (!cron.validate(cron_schedule)) {
      return res.status(400).json({ error: '无效的 Cron 表达式' });
    }
    setSetting('cron_schedule', cron_schedule);
    setupCron(cron_schedule);
  }
  res.json({ success: true, settings: getAllSettings() });
});

// 前端路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[服务器] 已启动，端口 ${PORT}`);
  console.log(`[服务器] 访问 http://localhost:${PORT}`);
});
