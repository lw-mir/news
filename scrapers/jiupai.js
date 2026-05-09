const cheerio = require('cheerio');
const { fetchHtml, matchKeywords } = require('./utils');

const SOURCE = 'jiupai';
const SOURCE_NAME = '九派新闻教育';
// 腾讯新闻作者页需要 JS 渲染，尝试其RSS或静态入口
// 使用百度新闻搜索九派新闻教育相关内容作为替代
const URL = 'https://news.qq.com/omn/author/8QMd2npU6IIYvTfR';

async function scrape(keywords, rangeDays = 1) {
  const articles = [];
  try {
    const html = await fetchHtml(URL, 'utf-8');
    const $ = cheerio.load(html);
    const seen = new Set();

    // 腾讯新闻动态渲染，尝试从页面中提取嵌入的 JSON 数据
    const scripts = $('script').toArray().map(s => $(s).html() || '');
    for (const script of scripts) {
      // 匹配文章数组
      const matches = script.match(/"title"\s*:\s*"([^"]+)","url"\s*:\s*"([^"]+)"/g) || [];
      for (const m of matches) {
        const titleMatch = m.match(/"title"\s*:\s*"([^"]+)"/);
        const urlMatch = m.match(/"url"\s*:\s*"([^"]+)"/);
        if (!titleMatch || !urlMatch) continue;
        const title = titleMatch[1];
        const url = urlMatch[1].replace(/\\\//g, '/');
        if (!title || title.length < 5 || seen.has(url)) continue;
        seen.add(url);
        const matched = keywords.length === 0 ? ['全部'] : matchKeywords(title, keywords);
        if (keywords.length > 0 && matched.length === 0) continue;
        articles.push({
          title, url, source: SOURCE, source_name: SOURCE_NAME,
          published_at: null,
          collected_at: new Date().toISOString(),
          keywords_matched: JSON.stringify(matched)
        });
      }
    }

    // 兜底：抓普通 a 链接
    if (articles.length === 0) {
      $('a[href*="news.qq.com"]').each((_, el) => {
        const $a = $(el);
        const title = $a.text().replace(/\s+/g, ' ').trim();
        const href = $a.attr('href') || '';
        if (!title || title.length < 6 || seen.has(href)) return;
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
    }
  } catch (err) {
    console.error(`[${SOURCE_NAME}] 采集失败:`, err.message);
  }
  return articles;
}

module.exports = { scrape, SOURCE, SOURCE_NAME };
