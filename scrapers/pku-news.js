const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'pku-news';
const SOURCE_NAME = '北大新闻网';
const URL = 'https://news.pku.edu.cn/xwzh/index.htm';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const seen = new Set();

    $('a[href$=".htm"], a[href$=".html"]').each((_, el) => {
      const $a = $(el);
      const title = $a.text().replace(/\s+/g, ' ').trim();
      let href = $a.attr('href') || '';
      if (!title || title.length < 6) return;
      if (!href.startsWith('http')) {
        if (href.startsWith('/')) {
          href = 'https://news.pku.edu.cn' + href;
        } else {
          href = 'https://news.pku.edu.cn/xwzh/' + href;
        }
      }
      if (!href.includes('pku.edu.cn')) return;
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
