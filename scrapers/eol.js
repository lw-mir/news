const cheerio = require('cheerio');
const { fetchHtml, matchKeywords } = require('./utils');

const SOURCE = 'eol';
const SOURCE_NAME = '教育在线';
const URL = 'https://www.eol.cn/news/';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    // 教育在线实际为 UTF-8
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const seen = new Set();

    $('a[href]').each((_, el) => {
      const $a = $(el);
      const title = ($a.attr('title') || $a.text()).replace(/\s+/g, ' ').trim();
      let href = $a.attr('href') || '';
      if (!title || title.length < 6) return;
      if (!href.startsWith('http')) {
        href = href.startsWith('/') ? 'https://www.eol.cn' + href : 'https://www.eol.cn/news/' + href;
      }
      if (!href.includes('eol.cn')) return;
      if (href.includes('.css') || href.includes('.js') || href.includes('javascript')) return;
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
