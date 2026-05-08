const cheerio = require('cheerio');
const { fetchHtml, matchKeywords, formatDate } = require('./utils');

const SOURCE = 'tsinghua';
const SOURCE_NAME = '清华大学';
const URL = 'https://www.tsinghua.edu.cn/news/xsky.htm';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const seen = new Set();

    $('a[href*="/info/"]').each((_, el) => {
      const $a = $(el);
      const rawText = $a.text().replace(/\s+/g, ' ').trim();
      // 标题中可能包含日期 "07 2026.05 真实标题"，提取真实标题
      const title = rawText.replace(/^\d{1,2}\s+\d{4}\.\d{2}\s*/, '').trim();
      let href = $a.attr('href') || '';
      if (!title || title.length < 5) return;
      if (!href.startsWith('http')) {
        href = href.startsWith('/') ? 'https://www.tsinghua.edu.cn' + href
          : 'https://www.tsinghua.edu.cn/' + href.replace(/^\.\.\//, '');
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
