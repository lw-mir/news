const cheerio = require('cheerio');
const { fetchHtml, matchKeywords } = require('./utils');

const SOURCE = 'sciencenet';
const SOURCE_NAME = '科学网';
const URL = 'https://news.sciencenet.cn/todaynews.aspx';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const seen = new Set();

    $('a[href*="htmlnews"]').each((_, el) => {
      const $a = $(el);
      const title = $a.text().trim();
      let href = ($a.attr('href') || '').trim().split(/\s/)[0]; // 去掉 target= 等多余内容
      if (!title || title.length < 5 || !href) return;

      if (!href.startsWith('http')) {
        href = 'https://news.sciencenet.cn' + (href.startsWith('/') ? href : '/' + href);
      }
      // 统一用 https
      href = href.replace(/^http:\/\//, 'https://');
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
