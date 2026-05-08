const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'pku-notices';
const SOURCE_NAME = '北大通知公告';
const URL = 'https://www.pku.edu.cn/notices.html';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);

    $('a').each((_, el) => {
      const $a = $(el);
      const title = $a.text().trim();
      let href = $a.attr('href') || '';
      if (!title || title.length < 4 || !href) return;
      if (!href.startsWith('http')) {
        href = href.startsWith('/') ? 'https://www.pku.edu.cn' + href : 'https://www.pku.edu.cn/' + href;
      }
      if (!href.includes('pku.edu.cn')) return;

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
