const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'ccdi';
const SOURCE_NAME = '中纪委要闻';
// 中纪委提供 RSS/列表，尝试多个入口
const URLS = [
  'https://www.ccdi.gov.cn/yaowenn/',
  'https://www.ccdi.gov.cn/toutiaojujiao/'
];

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  const seen = new Set();

  for (const url of URLS) {
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      $('a[href]').each((_, el) => {
        const $a = $(el);
        const title = ($a.attr('title') || $a.text()).replace(/\s+/g, ' ').trim();
        let href = $a.attr('href') || '';
        if (!title || title.length < 6) return;
        if (!href.startsWith('http')) {
          href = href.startsWith('/') ? 'https://www.ccdi.gov.cn' + href
            : new URL(href, url).href;
        }
        if (!href.includes('ccdi.gov.cn')) return;
        if (seen.has(href)) return;
        seen.add(href);

        const matched = keywords.length === 0 ? ['全部'] : matchKeywords(title, keywords);
        if (keywords.length > 0 && matched.length === 0) return;

        articles.push({
          title, url: href, source: SOURCE, source_name: SOURCE_NAME,
          published_at: null,
          collected_at: new Date().toISOString(),
          keywords_matched: JSON.stringify(matched)
        });
      });
    } catch (err) {
      console.error(`[${SOURCE_NAME}][${url}] 采集失败:`, err.message);
    }
  }
  return articles;
}

module.exports = { scrape, SOURCE, SOURCE_NAME };
