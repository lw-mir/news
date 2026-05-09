const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'hit';
const SOURCE_NAME = '哈尔滨工业大学';
const URL = 'https://today.hit.edu.cn/category/10';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);

    $('article, .news-item, li, .list-item').each((_, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const title = ($a.attr('title') || $a.text()).trim();
      let href = $a.attr('href') || '';
      if (!title || !href) return;
      if (!href.startsWith('http')) {
        href = href.startsWith('/') ? 'https://today.hit.edu.cn' + href : 'https://today.hit.edu.cn/' + href;
      }
      const dateText = $el.find('time, .date, .time').text().trim();
      const publishedAt = formatDate(dateText) || new Date().toISOString().substring(0, 10);

      const matched = keywords.length === 0 ? ['全部'] : matchKeywords(title, keywords);
      if (keywords.length > 0 && matched.length === 0) return;

      articles.push({
        title, url: href, source: SOURCE, source_name: SOURCE_NAME,
        published_at: publishedAt, collected_at: new Date().toISOString(),
        keywords_matched: JSON.stringify(matched)
      });
    });

    // 兜底：直接抓 a 标签
    if (articles.length === 0) {
      $('a[href*="/article/"], a[href*="/news/"]').each((_, el) => {
        const $a = $(el);
        const title = $a.text().trim();
        let href = $a.attr('href') || '';
        if (!title || title.length < 4) return;
        if (!href.startsWith('http')) href = 'https://today.hit.edu.cn' + href;
        const matched = keywords.length === 0 ? ['全部'] : matchKeywords(title, keywords);
        if (keywords.length > 0 && matched.length === 0) return;
        articles.push({
          title, url: href, source: SOURCE, source_name: SOURCE_NAME,
          published_at: null,
          collected_at: new Date().toISOString(),
          keywords_matched: JSON.stringify(matched)
        });
      });
    }
  } catch (err) {
    console.error(`[${SOURCE_NAME}] 采集失败:`, err.message);
  }
  return articles;
}

module.exports = { scrape, SOURCE, SOURCE_NAME };
