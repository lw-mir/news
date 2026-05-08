const axios = require('axios');
const iconv = require('iconv-lite');

const httpClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  }
});

async function fetchHtml(url, encoding = 'utf-8') {
  const response = await httpClient.get(url, {
    responseType: encoding === 'utf-8' ? 'text' : 'arraybuffer'
  });
  if (encoding !== 'utf-8') {
    return iconv.decode(Buffer.from(response.data), encoding);
  }
  return response.data;
}

function matchKeywords(text, keywords) {
  const matched = keywords.filter(kw => text.includes(kw));
  return matched;
}

function isToday(dateStr, rangeDays = 1) {
  if (!dateStr) return true;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= rangeDays;
  } catch {
    return false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return null;
  }
}

module.exports = { fetchHtml, matchKeywords, isToday, formatDate, httpClient };
