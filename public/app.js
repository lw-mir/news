const API = '';
let currentSource = '';
let currentPage = 1;
const PAGE_SIZE = 50;
let totalArticles = 0;
let selectedArticles = new Map(); // url -> {title, url}
let allArticles = [];

// ── 初始化 ──────────────────────────────────────────────────────
async function init() {
  await loadSources();
  await loadArticles();
  await loadStatus();
}

// ── 加载来源标签 ──────────────────────────────────────────────
async function loadSources() {
  try {
    const res = await fetch(`${API}/api/sources`);
    const sources = await res.json();
    const tabs = document.getElementById('sourceTabs');
    // 保留"全部"按钮，删除其他
    const allBtn = tabs.querySelector('[data-source=""]');
    tabs.innerHTML = '';
    tabs.appendChild(allBtn);

    sources.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (currentSource === s.source ? ' active' : '');
      btn.dataset.source = s.source;
      btn.textContent = `${s.source_name} (${s.count})`;
      btn.onclick = () => filterSource(btn, s.source);
      tabs.appendChild(btn);
    });
  } catch (e) { console.error('加载来源失败', e); }
}

// ── 加载文章 ──────────────────────────────────────────────────
async function loadArticles() {
  try {
    const params = new URLSearchParams({ page: currentPage, pageSize: PAGE_SIZE });
    if (currentSource) params.set('source', currentSource);
    const res = await fetch(`${API}/api/articles?${params}`);
    const data = await res.json();
    allArticles = data.articles;
    totalArticles = data.total;
    renderArticles();
    renderPagination();
    document.getElementById('totalCount').textContent = `共 ${data.total} 条`;
  } catch (e) { console.error('加载文章失败', e); }
}

function renderArticles() {
  const list = document.getElementById('articleList');
  if (allArticles.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>暂无文章，点击「立即采集」开始</p></div>';
    return;
  }
  list.innerHTML = allArticles.map(a => {
    const checked = selectedArticles.has(a.url);
    let kws = [];
    try { kws = JSON.parse(a.keywords_matched || '[]'); } catch {}
    const kwHtml = kws.length > 0 && kws[0] !== '全部'
      ? `<span class="article-kw">${kws.slice(0, 2).join(' ')}</span>` : '';
    const date = a.published_at ? a.published_at.substring(0, 10) : '';
    return `
      <div class="article-item ${checked ? 'checked' : ''}" onclick="toggleArticle('${encodeURIComponent(a.url)}', '${escHtml(a.title)}', '${a.source_name}')">
        <div class="article-checkbox"></div>
        <div class="article-content">
          <div class="article-title">${escHtml(a.title)}</div>
          <div class="article-meta">
            <span class="article-source">${escHtml(a.source_name)}</span>
            ${date ? `<span class="article-date">${date}</span>` : ''}
            ${kwHtml}
          </div>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function renderPagination() {
  const total = Math.ceil(totalArticles / PAGE_SIZE);
  const pg = document.getElementById('pagination');
  if (total <= 1) { pg.innerHTML = ''; return; }
  const pages = [];
  for (let i = 1; i <= total; i++) pages.push(i);
  pg.innerHTML = pages.map(p => `
    <button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>
  `).join('');
}

function goPage(p) {
  currentPage = p;
  loadArticles();
}

// ── 来源筛选 ──────────────────────────────────────────────────
function filterSource(el, source) {
  currentSource = source;
  currentPage = 1;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadArticles();
}

// ── 选择文章 ──────────────────────────────────────────────────
function toggleArticle(encodedUrl, title, sourceName) {
  const url = decodeURIComponent(encodedUrl);
  if (selectedArticles.has(url)) {
    selectedArticles.delete(url);
  } else {
    selectedArticles.set(url, { title, url, sourceName });
  }
  renderSelected();
  // 更新列表中该 item 的选中状态
  renderArticles();
}

function renderSelected() {
  const list = document.getElementById('selectedList');
  const count = selectedArticles.size;
  document.getElementById('selectedCount').textContent = count;

  if (count === 0) {
    list.innerHTML = '<p class="muted small">在左侧勾选文章后显示</p>';
    return;
  }
  list.innerHTML = Array.from(selectedArticles.values()).map(a => `
    <div class="selected-item">
      <span class="selected-item-title" title="${escHtml(a.url)}">${escHtml(a.title)}</span>
      <button class="remove-btn" onclick="removeSelected('${encodeURIComponent(a.url)}')" title="移除">×</button>
    </div>
  `).join('');
}

function removeSelected(encodedUrl) {
  selectedArticles.delete(decodeURIComponent(encodedUrl));
  renderSelected();
  renderArticles();
}

function clearSelected() {
  selectedArticles.clear();
  renderSelected();
  renderArticles();
  document.getElementById('outputBox').innerHTML = '<p class="muted small">点击「生成链接」后显示</p>';
}

// ── 链接生成 ──────────────────────────────────────────────────
function generateLinks() {
  if (selectedArticles.size === 0) { showToast('请先在左侧勾选文章', 'error'); return; }
  const urls = Array.from(selectedArticles.values()).map(a => a.url);
  const output = document.getElementById('outputBox');
  output.innerHTML = `<div class="output-links">${urls.map(u => `<a href="${escHtml(u)}" target="_blank">${escHtml(u)}</a>`).join('<br>')}</div>`;
  showToast(`已生成 ${urls.length} 条链接`, 'success');
}

function clearOutput() {
  document.getElementById('outputBox').innerHTML = '<p class="muted small">点击「生成链接」后显示</p>';
}

function copyLinks() {
  const urls = Array.from(selectedArticles.values()).map(a => a.url);
  if (urls.length === 0) { showToast('暂无链接可复制', 'error'); return; }
  const text = urls.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast(`已复制 ${urls.length} 条链接`, 'success');
  }).catch(() => {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast(`已复制 ${urls.length} 条链接`, 'success');
  });
}

// ── 采集 ──────────────────────────────────────────────────────
async function triggerCollect() {
  const btn = document.getElementById('collectBtn');
  const badge = document.getElementById('statusBadge');
  btn.disabled = true;
  badge.className = 'badge badge-running';
  badge.textContent = '采集中';
  showToast('开始采集，请稍候...');

  try {
    const res = await fetch(`${API}/api/collect`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      badge.className = 'badge badge-done';
      badge.textContent = '完成';
      showToast(data.message, 'success');
      await loadSources();
      await loadArticles();
      setTimeout(() => { badge.className = 'badge badge-idle'; badge.textContent = '空闲'; }, 3000);
    } else {
      badge.className = 'badge badge-idle';
      badge.textContent = '失败';
      showToast(data.message || '采集失败', 'error');
    }
  } catch (e) {
    badge.className = 'badge badge-idle';
    badge.textContent = '错误';
    showToast('网络错误: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function loadStatus() {
  try {
    const res = await fetch(`${API}/api/status`);
    const data = await res.json();
    document.getElementById('totalCount').textContent = `共 ${data.totalArticles} 条`;
    if (data.lastCollectTime) {
      const d = new Date(data.lastCollectTime);
      document.getElementById('lastCollect').textContent = `上次: ${d.toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}`;
    }
  } catch {}
}

async function refreshArticles() {
  await loadSources();
  await loadArticles();
  showToast('已刷新', 'success');
}

// ── 设置 ──────────────────────────────────────────────────────
async function openSettings() {
  try {
    const res = await fetch(`${API}/api/settings`);
    const s = await res.json();
    const kws = Array.isArray(s.keywords) ? s.keywords : [];
    document.getElementById('keywordsInput').value = kws.join('\n');
    document.getElementById('cronInput').value = s.cron_schedule || '0 20 * * *';
    document.getElementById('rangeDaysInput').value = s.date_range_days || '1';
  } catch (e) { console.error(e); }
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettings(event) {
  if (event && event.target !== document.getElementById('settingsModal')) return;
  document.getElementById('settingsModal').classList.remove('open');
}

async function saveSettings() {
  const kwText = document.getElementById('keywordsInput').value;
  const keywords = kwText.split('\n').map(s => s.trim()).filter(Boolean);
  const cron_schedule = document.getElementById('cronInput').value.trim();
  const date_range_days = parseInt(document.getElementById('rangeDaysInput').value) || 1;

  try {
    const res = await fetch(`${API}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, cron_schedule, date_range_days })
    });
    const data = await res.json();
    if (data.success) {
      showToast('设置已保存', 'success');
      document.getElementById('settingsModal').classList.remove('open');
    } else {
      showToast(data.error || '保存失败', 'error');
    }
  } catch (e) { showToast('保存失败', 'error'); }
}

// ── Toast ──────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ── 启动 ──────────────────────────────────────────────────────
init();
