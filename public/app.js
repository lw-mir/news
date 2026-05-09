const API = '';
let currentSource = '';
let currentPage = 1;
const PAGE_SIZE = 20;
let totalArticles = 0;
let selectedArticles = new Map(); // url -> {title, url}
let allArticles = [];
let sourceConfigs = {}; // 来源配置缓存

// ── 初始化 ──────────────────────────────────────────────────────
async function init() {
  await Promise.all([loadSources(), loadStatus()]);
  await loadArticles();
}

// ── 加载来源标签 ──────────────────────────────────────────────
async function loadSources() {
  try {
    const res = await fetch(`${API}/api/sources`);
    const sources = await res.json();
    const tabs = document.getElementById('sourceTabs');
    const allBtn = tabs.querySelector('[data-source=""]');
    tabs.innerHTML = '';
    tabs.appendChild(allBtn);
    sources.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (currentSource === s.source ? ' active' : '');
      btn.dataset.source = s.source;
      btn.textContent = `${s.source_name}（${s.count}）`;
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
      ? `<span class="article-kw">${kws.slice(0, 3).join(' ')}</span>` : '';
    // 优先显示发布日期，没有则显示采集日期（标注为"采集"）
    let dateHtml = '';
    if (a.published_at) {
      dateHtml = `<span class="article-date" title="发布日期">${a.published_at.substring(0, 10)}</span>`;
    } else if (a.collected_at) {
      const cd = a.collected_at.substring(0, 10);
      dateHtml = `<span class="article-date collected" title="采集日期（无发布日期）">${cd} 采集</span>`;
    }
    const eu = encodeURIComponent(a.url);
    const et = escHtml(a.title).replace(/'/g, '&#39;');
    return `
      <div class="article-item ${checked ? 'checked' : ''}" onclick="toggleArticle('${eu}', '${et}', '${escHtml(a.source_name)}')">
        <div class="article-checkbox"></div>
        <div class="article-content">
          <div class="article-title">${escHtml(a.title)}</div>
          <div class="article-meta">
            <span class="article-source">${escHtml(a.source_name)}</span>
            ${dateHtml}
            ${kwHtml}
          </div>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── 分页：第N页格式 ──────────────────────────────────────────
function renderPagination() {
  const total = Math.ceil(totalArticles / PAGE_SIZE);
  const pg = document.getElementById('pagination');
  if (total <= 1) { pg.innerHTML = ''; return; }

  const pages = [];
  // 显示最多 7 个页码，当前页前后各 2 个
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  if (start > 1) {
    pages.push(`<button class="page-btn" onclick="goPage(1)">第1页</button>`);
    if (start > 2) pages.push(`<span class="page-ellipsis">…</span>`);
  }
  for (let p = start; p <= end; p++) {
    pages.push(`<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">第${p}页</button>`);
  }
  if (end < total) {
    if (end < total - 1) pages.push(`<span class="page-ellipsis">…</span>`);
    pages.push(`<button class="page-btn" onclick="goPage(${total})">第${total}页</button>`);
  }
  pg.innerHTML = pages.join('');
}

function goPage(p) { currentPage = p; loadArticles(); }

// ── 来源筛选 ──────────────────────────────────────────────────
function filterSource(el, source) {
  currentSource = source; currentPage = 1;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadArticles();
}

// ── 选择文章 ──────────────────────────────────────────────────
function toggleArticle(encodedUrl, title, sourceName) {
  const url = decodeURIComponent(encodedUrl);
  if (selectedArticles.has(url)) selectedArticles.delete(url);
  else selectedArticles.set(url, { title, url, sourceName });
  renderSelected();
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
  renderSelected(); renderArticles();
}

function clearSelected() {
  selectedArticles.clear();
  renderSelected(); renderArticles();
  clearOutput();
}

// ── 链接生成 ──────────────────────────────────────────────────
function generateLinks() {
  if (selectedArticles.size === 0) { showToast('请先在左侧勾选文章', 'error'); return; }
  const urls = Array.from(selectedArticles.values()).map(a => a.url);
  const output = document.getElementById('outputBox');
  output.innerHTML = `<div class="output-links">${urls.map(u =>
    `<a href="${escHtml(u)}" target="_blank">${escHtml(u)}</a>`
  ).join('')}</div>`;
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
  badge.className = 'badge badge-running'; badge.textContent = '采集中';
  document.getElementById('collectBtnIcon').textContent = '⟳';
  showToast('开始采集，请稍候...');
  try {
    const res = await fetch(`${API}/api/collect`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      badge.className = 'badge badge-done'; badge.textContent = '完成';
      showToast(data.message, 'success');
      await loadSources(); await loadArticles();
      setTimeout(() => { badge.className = 'badge badge-idle'; badge.textContent = '空闲'; }, 3000);
    } else {
      badge.className = 'badge badge-idle'; badge.textContent = '失败';
      showToast(data.message || '采集失败', 'error');
    }
  } catch (e) {
    badge.className = 'badge badge-idle'; badge.textContent = '错误';
    showToast('网络错误: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    document.getElementById('collectBtnIcon').textContent = '▶';
  }
}

async function clearAll() {
  if (!confirm('确认清空所有文章数据？')) return;
  await fetch(`${API}/api/articles`, { method: 'DELETE' });
  currentPage = 1; await loadSources(); await loadArticles();
  showToast('已清空', 'success');
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
  await loadSources(); await loadArticles();
  showToast('已刷新', 'success');
}

// ── 设置 ──────────────────────────────────────────────────────
async function openSettings() {
  try {
    const [settingsRes, configsRes] = await Promise.all([
      fetch(`${API}/api/settings`),
      fetch(`${API}/api/source-configs`)
    ]);
    const s = await settingsRes.json();
    sourceConfigs = await configsRes.json();
    document.getElementById('cronInput').value = s.cron_schedule || '0 20 * * *';
    document.getElementById('rangeDaysInput').value = s.date_range_days || '1';
    renderSourceConfigs();
  } catch (e) { console.error(e); }
  document.getElementById('settingsModal').classList.add('open');
}

function renderSourceConfigs() {
  const list = document.getElementById('sourceConfigList');
  list.innerHTML = Object.entries(sourceConfigs).map(([id, cfg]) => `
    <div class="source-config-row ${!cfg.enabled ? 'source-disabled' : ''}" data-source-id="${id}">
      <div class="source-row-top">
        <span class="source-row-name">${escHtml(cfg.name)}</span>
        <label class="toggle" title="${cfg.enabled ? '已启用，点击禁用' : '已禁用，点击启用'}">
          <input type="checkbox" ${cfg.enabled ? 'checked' : ''} onchange="toggleSourceEnabled('${id}', this)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <textarea
        class="source-kw-input"
        data-source-kw="${id}"
        placeholder="关键词（每行一个，留空=全部采集）"
        ${!cfg.enabled ? 'disabled' : ''}
      >${(cfg.keywords || []).join('\n')}</textarea>
      <p class="source-kw-hint">每行一个关键词，留空则采集该来源全部内容</p>
    </div>
  `).join('');
}

function toggleSourceEnabled(id, checkbox) {
  const row = checkbox.closest('.source-config-row');
  const textarea = row.querySelector('.source-kw-input');
  if (checkbox.checked) {
    row.classList.remove('source-disabled');
    textarea.disabled = false;
  } else {
    row.classList.add('source-disabled');
    textarea.disabled = true;
  }
}

function switchSettingsTab(el, tabId) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function closeSettings(event) {
  if (event && event.target !== document.getElementById('settingsModal')) return;
  document.getElementById('settingsModal').classList.remove('open');
  // 重置到第一个 tab
  document.querySelectorAll('.settings-tab')[0].click();
}

async function saveSettings() {
  // 基础设置
  const cron_schedule = document.getElementById('cronInput').value.trim();
  const date_range_days = parseInt(document.getElementById('rangeDaysInput').value) || 1;

  // 每来源配置
  const updatedConfigs = {};
  document.querySelectorAll('[data-source-id]').forEach(row => {
    const id = row.dataset.sourceId;
    const enabled = row.querySelector('input[type=checkbox]').checked;
    const kwText = row.querySelector(`[data-source-kw="${id}"]`).value;
    const keywords = kwText.split('\n').map(s => s.trim()).filter(Boolean);
    updatedConfigs[id] = { enabled, keywords };
  });

  try {
    const [r1, r2] = await Promise.all([
      fetch(`${API}/api/settings`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ cron_schedule, date_range_days })
      }),
      fetch(`${API}/api/source-configs`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(updatedConfigs)
      })
    ]);
    const d1 = await r1.json();
    if (d1.error) { showToast(d1.error, 'error'); return; }
    showToast('设置已保存', 'success');
    document.getElementById('settingsModal').classList.remove('open');
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
