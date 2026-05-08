const sciencenet = require('./sciencenet');
const pkuNews = require('./pku-news');
const pkuNotices = require('./pku-notices');
const hit = require('./hit');
const tsinghua = require('./tsinghua');
const jiupai = require('./jiupai');
const ccdi = require('./ccdi');
const eol = require('./eol');
const whu = require('./whu');

const ALL_SCRAPERS = [sciencenet, pkuNews, pkuNotices, hit, tsinghua, jiupai, ccdi, eol, whu];

// sourceConfigs: { [sourceId]: { keywords: [], enabled: true, name: '' } }
async function collectAll(sourceConfigs = {}, rangeDays = 1) {
  console.log('[采集] 开始采集，范围: 近' + rangeDays + '天');

  const results = await Promise.allSettled(
    ALL_SCRAPERS.map(scraper => {
      const cfg = sourceConfigs[scraper.SOURCE];
      if (cfg && cfg.enabled === false) {
        console.log(`[${scraper.SOURCE_NAME}] 已禁用，跳过`);
        return Promise.resolve([]);
      }
      const keywords = (cfg && cfg.keywords) ? cfg.keywords : [];
      return scraper.scrape(keywords, rangeDays).then(articles => {
        console.log(`[${scraper.SOURCE_NAME}] 采集到 ${articles.length} 条（关键词: ${keywords.join(',') || '无限制'}）`);
        return articles;
      });
    })
  );

  const all = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value);
    else console.error(`[${ALL_SCRAPERS[i].SOURCE_NAME}] 失败:`, r.reason);
  });
  console.log(`[采集] 完成，共 ${all.length} 条`);
  return all;
}

module.exports = { collectAll, ALL_SCRAPERS };
