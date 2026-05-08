const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'whu';
const SOURCE_NAME = '武汉大学';
const URL = 'https://www.whu.edu.cn/tzgg.htm';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const seen = new Set();

    // 武汉大学通知公告：info/ 和 tzggnr.jsp 路径
    $('a[href*="info/"], a[href*="tzggnr"]').each((_, el) => {
      const $a = $(el);
      const title = $a.text().replace(/\s+/g, ' ').trim();
      let href = $a.attr('href') || '';
      if (!title || title.length < 5) return;
      if (!href.startsWith('http')) {
        href = 'https://www.whu.edu.cn/' + href.replace(/^\//, '');
      }
      if (seen.has(href)) return;
      seen.add(href);

      const matched = keywords.length === 0 ? ['全部'] : matchKeywords(title, keywords);
      if (keywords.length > 0 && matched.length === 0) return;

      articles.push({
        title, url: href, source: SOURCE, source_name: SOURCE_NAME,
        published_at: new Date().toISOString().substring(0, 10),
        collected_at: new Date().toISOString(),
        keywords_matched: JSON.stringify(matched)
      });
    });
  } catch (err) {
    console.error(`[${SOURCE_NAME}] 采集失败:`, err.message);
  }
  return articles;
}

module.exports = { scrape, SOURCE, SOURCE_NAME };
