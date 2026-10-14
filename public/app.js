const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
const savedView = (() => { try { return localStorage.getItem('cloudmark_view') || 'grid'; } catch { return 'grid'; } })();
const state = { user: null, collections: [], bookmarks: [], tags: [], section: 'all', search: '', tag: '', sort: 'newest', view: savedView, modal: null, sidebar: false, authMode: 'login' };
const iconPaths = {
  cloud:'<path d="M20 16.5A4.5 4.5 0 0 0 18 8h-1.3a7 7 0 0 0-13.3 2.1A4.5 4.5 0 0 0 6 19h12a4 4 0 0 0 2-2.5Z"/>',
  all:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
  inbox:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  trash:'<path d="M3 6h18m-2 0-1 14H6L5 6m4 0V4h6v2M10 10v6m4-6v6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  external:'<path d="M14 3h7v7M10 14 21 3"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
  pencil:'<path d="m15 5 4 4M4 20l4.3-1 12-12a2.5 2.5 0 0 0-4-4l-12 12L4 20Z"/>',
  x:'<path d="M5 5l14 14M19 5 5 19"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  bookmark:'<path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-5-7 5V4Z"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M4.9 4.9l2.2 2.2M19.1 19.1l-2.2-2.2M12 1v4M12 19v4M1 12h4M19 12h4M4.9 19.1l2.2-2.2M19.1 4.9l-2.2 2.2"/>',
  arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
  undo:'<path d="M3 7v6h6M4 13A8 8 0 1 1 7 19"/>',
  folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
};
const ic = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.bookmark}</svg>`;
const e = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const domain = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; } };
const imgPath = n => `/assets/${encodeURIComponent(n)}.svg`;
const collectionSymbols = {palette:'🎨',code:'💻','book-open':'📖',camera:'📷',plane:'✈️',folder:'📁',music:'🎵',coffee:'☕',heart:'💗',star:'⭐',film:'🎞️',lightbulb:'💡'};
let toastTimer;
function toast(message, error = false) { toastEl.textContent = message; toastEl.className = (error ? 'error ' : '') + 'show'; clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.className = '', 3200); }
async function request(url, options = {}) {
  const res = await fetch(url, { credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...options });
  let data; try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
async function refresh() {
  const data = await request('/api/bootstrap');
  Object.assign(state, data);
  renderShell();
}
async function init() {
  try {
    const info = await request('/api/me');
    state.user = info.user;
    if (state.user) await refresh(); else renderAuth();
  } catch { app.innerHTML = '<div class="initial-loader">Cannot connect to the server. Refresh this page.</div>'; }
}
const sectionNames = {all:'All bookmarks',unsorted:'Unsorted',favorites:'Favorites',trash:'Trash'};
function activeBookmarks() { return state.bookmarks.filter(b => !b.deleted_at); }
function countFor(key) {
  const items = activeBookmarks();
  if (key === 'all') return items.length;
  if (key === 'unsorted') return items.filter(b => b.collection_id === null).length;
  if (key === 'favorites') return items.filter(b => b.is_favorite).length;
  if (key === 'trash') return state.bookmarks.filter(b => b.deleted_at).length;
  return items.filter(b => b.collection_id === key).length;
}
function navItem(key, icon, title, count) {
  return `<button class="nav-item ${state.section === key ? 'active' : ''}" data-action="navigate" data-section="${e(key)}">
    ${ic(icon,17)} <span>${e(title)}</span><span class="count">${count}</span></button>`;
}
function renderShell() {
  const initial = (state.user.name.trim()[0] || 'U').toUpperCase();
  app.innerHTML = `<div class="app-shell">
    <aside id="sidebar" class="sidebar ${state.sidebar ? 'open':''}">
      <div class="brand"><span class="brand-icon">${ic('cloud',22)}</span><span class="brand-name">cloud<span>mark.</span></span><span class="brand-mini">MVP</span></div>
      <div class="nav-block">
        ${navItem('all','all','All bookmarks',countFor('all'))}
        ${navItem('unsorted','inbox','Unsorted',countFor('unsorted'))}
        ${navItem('favorites','heart','Favorites',countFor('favorites'))}
        ${navItem('trash','trash','Trash',countFor('trash'))}
      </div>
      <div class="divider"></div>
      <div class="side-heading"><span>My collections</span><button class="add-mini" title="New collection" data-action="new-collection">${ic('plus',15)}</button></div>
      <div class="nav-block collections-list">${state.collections.map(c => `<button class="nav-item ${state.section === c.id ? 'active' : ''}" data-action="navigate" data-section="${c.id}">
        <span class="collection-emoji">${e(collectionSymbols[c.icon] || '📁')}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(c.name)}</span><span class="count">${countFor(c.id)}</span></button>`).join('')}
        <button class="nav-item" data-action="new-collection" style="color:#a0aabc;font-size:11.5px">${ic('plus',15)} <span>New collection</span></button></div>
      <div class="aside-spacer"></div><div class="side-bottom">
        <div class="upgrade"><h4>✦ Keep your best finds.</h4><p>One beautiful space for everything you love online.</p></div>
        <div class="profile"><div class="avatar">${e(initial)}</div><div class="profile-details"><strong>${e(state.user.name)}</strong><small>Personal workspace</small></div>
          <button class="logout" data-action="logout" title="Log out">${ic('logout',16)}</button></div></div>
    </aside>
    <main class="main"><header class="topbar">
      <button class="icon-btn mobile-nav" data-action="toggle-sidebar" aria-label="Open sidebar">${ic('menu',21)}</button>
      <div class="search-shell">${ic('search',17)}<input id="search-input" type="search" autocomplete="off" placeholder="Search your bookmarks..." value="${e(state.search)}" aria-label="Search bookmarks"/><span class="shortcut">Ctrl K</span></div>
      <div class="top-actions"><button class="icon-btn" title="New collection" data-action="new-collection">${ic('folder',19)}</button>
      <button class="primary-btn" data-action="new-bookmark">${ic('plus',17)} Add bookmark</button></div>
    </header><div class="content" id="content"></div></main></div>`;
  drawContent();
}
function currentCollection() { return state.collections.find(c => c.id === state.section); }
function selectBookmarks() {
  let list = state.bookmarks.filter(b => state.section === 'trash' ? Boolean(b.deleted_at) : !b.deleted_at);
  if (state.section === 'unsorted') list = list.filter(b => b.collection_id === null);
  if (state.section === 'favorites') list = list.filter(b => b.is_favorite);
  if (typeof state.section === 'number') list = list.filter(b => b.collection_id === state.section);
  if (state.tag) list = list.filter(b => b.tags.includes(state.tag));
  const query = state.search.trim().toLowerCase();
  if (query) list = list.filter(b => [b.title, b.url, b.description, ...b.tags].some(v => String(v).toLowerCase().includes(query)));
  list.sort((a,b) => state.sort === 'title' ? a.title.localeCompare(b.title) : state.sort === 'oldest' ? (a.created_at.localeCompare(b.created_at) || a.id - b.id) : (b.created_at.localeCompare(a.created_at) || b.id - a.id));
  return list;
}
function readableDate(date) {
  const val = new Date((date || '').replace(' ','T')+'Z');
  if (Number.isNaN(val.getTime())) return 'Saved';
  return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(val);
}
function card(bookmark) {
  const tags = bookmark.tags || [];
  const trashed = state.section === 'trash';
  return `<article class="bookmark-card">
    <a class="preview ${bookmark.cover === 'default' ? 'no-cover' : ''}" href="${e(bookmark.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${e(bookmark.title)}">
      ${bookmark.cover === 'default' ? `<span class="preview-letter">${e(bookmark.title.slice(0,1).toUpperCase())}</span>` : `<img src="${imgPath(bookmark.cover)}" alt="Cover for ${e(bookmark.title)}" loading="lazy"/>`}</a>
    <div class="card-body"><a href="${e(bookmark.url)}" target="_blank" rel="noopener noreferrer" class="card-title">${e(bookmark.title)}</a>
      <div class="card-domain">${ic('external',11)} ${e(domain(bookmark.url))}</div>
      <p class="card-desc">${e(bookmark.description || 'A little corner of the web worth keeping for later.')}</p>
      <div class="card-tags">${tags.slice(0,3).map(tag => `<span class="card-tag">#${e(tag)}</span>`).join('')}</div></div>
    <div class="card-footer"><span class="card-date">${readableDate(bookmark.created_at)}</span>
      ${trashed ? `<button class="card-btn" title="Restore bookmark" data-action="restore-bookmark" data-id="${bookmark.id}">${ic('undo',16)}</button>
        <button class="card-btn" title="Permanently delete" data-action="permanent-bookmark" data-id="${bookmark.id}">${ic('trash',16)}</button>` : `
      <button class="card-btn ${bookmark.is_favorite ? 'faved' : ''}" title="${bookmark.is_favorite ? 'Remove favorite':'Add to favorites'}" data-action="toggle-favorite" data-id="${bookmark.id}">${ic('heart',16)}</button>
      <button class="card-btn" title="Edit bookmark" data-action="edit-bookmark" data-id="${bookmark.id}">${ic('pencil',15)}</button>
      <button class="card-btn" title="Move to trash" data-action="delete-bookmark" data-id="${bookmark.id}">${ic('trash',15)}</button>`}</div>
    </article>`;
}
function drawContent() {
  const target = document.querySelector('#content');
  if (!target) return;
  const collection = currentCollection();
  const pageTitle = collection?.name || sectionNames[state.section] || 'All bookmarks';
  const list = selectBookmarks();
  const desc = collection ? 'A little space for everything you want to keep.' : ({all:'Everything you love online, all in one place.',unsorted:'Bookmarks waiting for their perfect collection.',favorites:'Your most treasured links, always close.',trash:'Deleted bookmarks can be restored or removed forever.'}[state.section] || 'Everything you love online, all in one place.');
  const matchedTagNames = new Set(state.bookmarks.filter(b => !b.deleted_at && (typeof state.section !== 'number' || b.collection_id === state.section)).flatMap(b => b.tags));
  const tags = [...matchedTagNames].sort().slice(0,12);
  target.innerHTML = `<section class="content-top">
    <div><div class="eyebrow">My workspace <span class="dot"></span> ${collection ? 'Collections' : 'Library'}</div>
      <h1 class="page-title">${collection ? `<span style="font-size:26px;margin-right:8px">${e(collectionSymbols[collection.icon] || '📁')}</span>` : ''}${e(pageTitle)}</h1>
      <p class="page-desc">${e(desc)}</p></div>
    <div class="title-actions">${collection ? `<button class="outlined-btn" data-action="edit-collection" data-id="${collection.id}">${ic('pencil',15)} Edit collection</button>` : ''}</div></section>
    <div class="toolbar"><span class="toolbar-label">${state.search ? 'Search results' : 'Bookmarks'}</span><span class="count-pill">${list.length}</span>
      <span class="toolbar-spacer"></span><span style="color:#a1acbc;font-size:11px">Sort:</span><select id="sort-select" aria-label="Sort bookmarks"><option value="newest" ${state.sort === 'newest' ? 'selected':''}>Recently added</option><option value="oldest" ${state.sort === 'oldest' ? 'selected':''}>Oldest first</option><option value="title" ${state.sort === 'title' ? 'selected':''}>Title A – Z</option></select>
      <div class="view-toggle"><button title="Grid view" aria-label="Grid view" data-action="view-grid" class="${state.view === 'grid' ? 'active':''}">${ic('grid',15)}</button><button title="List view" aria-label="List view" data-action="view-list" class="${state.view === 'list' ? 'active':''}">${ic('list',16)}</button></div></div>
    ${tags.length && state.section !== 'trash' ? `<div class="tag-filters"><button class="filter-chip ${state.tag ? '' : 'active'}" data-action="filter-tag" data-tag="">All items</button>${tags.map(tag=>`<button data-action="filter-tag" data-tag="${e(tag)}" class="filter-chip ${state.tag === tag ? 'active':''}">#${e(tag)}</button>`).join('')}</div>` : ''}
    ${list.length ? `<div class="bookmark-grid ${state.view === 'list' ? 'list-view' : ''}">${list.map(card).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${ic(state.section === 'trash' ? 'trash' : 'bookmark',32)}</div>
      <h3>${state.search || state.tag ? 'No matching bookmarks' : state.section === 'trash' ? 'Your trash is empty' : 'Nothing saved here yet'}</h3>
      <p>${state.search || state.tag ? 'Try changing the search term or removing a filter.' : state.section === 'trash' ? 'Deleted links will be displayed here.' : 'Save your favorite websites and organize them into collections.'}</p>
      ${state.section === 'trash' ? '' : `<button class="primary-btn" data-action="new-bookmark">${ic('plus',16)} Add a bookmark</button>`}</div>`}
    <div class="watermark">Made with ☁ and a little love · Cloudmark School MVP</div>`;
}
function renderAuth() {
  const register = state.authMode === 'register';
  app.innerHTML = `<div class="auth-layout"><section class="auth-showcase"><div class="auth-brand"><span class="brand-icon">${ic('cloud',22)}</span> cloud<b>mark.</b></div>
    <div><h1>Your corner<br/>of the internet.</h1><p>Save what inspires you. Organize your ideas. Find everything in a heartbeat.</p>
    <div class="showcase-cards"><div class="float-card"><img src="/assets/figma.svg" alt="Design inspiration"/><span>Design inspiration</span></div><div class="float-card"><img src="/assets/unsplash.svg" alt="Photos collection"/><span>Creative finds</span></div><div class="float-card"><img src="/assets/vue.svg" alt="Development collection"/><span>Development</span></div></div></div>
    <div class="auth-foot">A Raindrop.io-inspired learning project · 2026</div></section>
    <main class="auth-main"><div class="auth-panel"><div class="auth-small">YOUR DIGITAL LIBRARY</div><h2>${register ? 'Create an account' : 'Welcome back 👋'}</h2>
      <p class="auth-sub">${register ? 'Your favorite corners of the web start here.' : 'Ready to rediscover your favorite things?'}</p>
      <form id="auth-form" class="form-grid"><div class="auth-error" id="auth-error"></div>
      ${register ? `<div class="form-field"><label for="auth-name">Your name</label><input id="auth-name" name="name" placeholder="Alex Morgan" maxlength="60" required/></div>` : ''}
      <div class="form-field"><label for="auth-email">Email address</label><input type="email" id="auth-email" name="email" placeholder="you@example.com" autocomplete="email" required/></div>
      <div class="form-field"><label for="auth-password">Password</label><input type="password" id="auth-password" name="password" placeholder="${register ? 'At least 8 characters' : 'Enter your password'}" minlength="${register ? 8 : 1}" autocomplete="${register ? 'new-password':'current-password'}" required/></div>
      <button class="primary-btn" type="submit">${register ? 'Create account' : 'Sign in'} ${ic('arrow',17)}</button></form>
      <p class="auth-toggle">${register ? 'Already have an account?' : 'New to Cloudmark?'} <button data-action="auth-toggle">${register ? 'Sign in' : 'Create an account'}</button></p>
      <div class="demo-box"><strong>✨ Just exploring?</strong><p>Try the preloaded demo with 16 real example links.</p><button data-action="demo-login">Use demo account ${ic('arrow',13)}</button></div>
    </div></main></div>`;
}
function modalShell(title, body) {
  document.querySelector('#modal-root')?.remove();
  const el = document.createElement('div'); el.id = 'modal-root';
  el.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${e(title)}">
    <header class="modal-header"><h2>${e(title)}</h2><button data-action="close-modal" aria-label="Close">${ic('x',19)}</button></header>${body}</section></div>`;
  document.body.appendChild(el);
  el.querySelector('input,select,textarea')?.focus();
}
function closeModal() { document.querySelector('#modal-root')?.remove(); state.modal = null; }
function bookmarkForm(id = null) {
  const bm = state.bookmarks.find(x => x.id === id);
  const selectedCollection = typeof state.section === 'number' ? state.section : null;
  state.modal = { type:'bookmark', id };
  modalShell(bm ? 'Edit bookmark' : 'Add a bookmark', `<form id="bookmark-form" class="form-grid">
    <div class="form-field"><label for="bm-url">Website URL *</label><input id="bm-url" name="url" type="url" placeholder="https://example.com" maxlength="2000" value="${e(bm?.url || '')}" required/></div>
    <div class="form-field"><label for="bm-title">Title</label><input id="bm-title" name="title" placeholder="A website worth saving" maxlength="180" value="${e(bm?.title || '')}"/></div>
    <div class="form-field"><label for="bm-desc">Description</label><textarea id="bm-desc" name="description" maxlength="800" placeholder="What makes this link special?">${e(bm?.description || '')}</textarea></div>
    <div class="form-row"><div class="form-field"><label for="bm-collection">Collection</label><select name="collection_id" id="bm-collection">
      <option value="">Unsorted</option>${state.collections.map(c=>`<option value="${c.id}" ${String(c.id) === String(bm?.collection_id ?? selectedCollection) ? 'selected' : ''}>${e(collectionSymbols[c.icon] || '📁')} ${e(c.name)}</option>`).join('')}</select></div>
      <div class="form-field"><label for="bm-tags">Tags</label><input id="bm-tags" name="tags" maxlength="400" placeholder="design, inspiration" value="${e((bm?.tags || []).join(', '))}"/><span class="form-note">Separate tags with commas</span></div></div>
    <div class="form-field"><label>Cover style</label><div class="cover-choices" id="cover-choices">
      ${['default','figma','awwwards','dribbble','unsplash','vue','tailwind'].map(name=>`<button type="button" title="${name}" data-action="select-cover" data-cover="${name}" class="cover-choice ${(bm?.cover || 'default') === name ? 'chosen':''}">${name === 'default' ? '✦' : `<img src="${imgPath(name)}" alt=""/>`}</button>`).join('')}</div><input id="bm-cover" type="hidden" name="cover" value="${e(bm?.cover || 'default')}"/></div>
    <div class="form-actions"><button type="button" class="secondary-btn" data-action="close-modal">Cancel</button><button class="primary-btn" type="submit">${ic('check',16)} ${bm ? 'Save changes' : 'Save bookmark'}</button></div></form>`);
}
function collectionForm(id = null) {
  const coll = state.collections.find(c => c.id === id);
  state.modal = { type:'collection', id, color: coll?.color || '#3b82f6' };
  const palette = ['#3b82f6','#a55eea','#2fb992','#e56d77','#eb9c38','#64748b'];
  modalShell(coll ? 'Edit collection' : 'New collection', `<form id="collection-form" class="form-grid">
    <div class="form-field"><label for="coll-name">Collection name *</label><input id="coll-name" name="name" value="${e(coll?.name || '')}" placeholder="e.g. My favorite articles" maxlength="60" required/></div>
    <div class="form-field"><label for="coll-icon">Choose an icon</label><select name="icon" id="coll-icon">${Object.keys(collectionSymbols).map(k=>`<option value="${k}" ${(coll?.icon || 'folder')===k?'selected':''}>${collectionSymbols[k]} ${k.replace('-', ' ')}</option>`).join('')}</select></div>
    <div class="form-field"><label>Color</label><div class="color-palette">${palette.map(c=>`<button type="button" class="color-circle ${state.modal.color===c?'chosen':''}" style="background:${c}" aria-label="Color ${c}" data-action="select-color" data-color="${c}"></button>`).join('')}</div></div>
    <div class="form-actions">${coll ? `<button class="secondary-btn" style="margin-right:auto;color:#d15b6b" type="button" data-action="delete-collection" data-id="${id}">Delete</button>`:''}
      <button class="secondary-btn" type="button" data-action="close-modal">Cancel</button><button type="submit" class="primary-btn">${ic('check',16)} ${coll?'Save changes':'Create collection'}</button></div></form>`);
}
function navigate(to) { state.section = /^\d+$/.test(String(to)) ? Number(to) : to; state.tag=''; state.search=''; state.sidebar=false; renderShell(); }
async function mutate(action, successText) {
  try { await action(); closeModal(); await refresh(); if (successText) toast(successText); }
  catch(err) { toast(err.message,true); }
}
document.addEventListener('input', event => {
  if (event.target.id === 'search-input') { state.search=event.target.value; drawContent(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'sort-select') { state.sort = event.target.value; drawContent(); }
});
document.addEventListener('click', async event => {
  if (event.target.id === 'modal-backdrop') { closeModal(); return; }
  const target = event.target.closest('[data-action]'); if (!target) return;
  const action = target.dataset.action; const id = Number(target.dataset.id);
  switch (action) {
    case 'toggle-sidebar': state.sidebar = !state.sidebar; document.querySelector('#sidebar')?.classList.toggle('open',state.sidebar); break;
    case 'navigate': navigate(target.dataset.section); break;
    case 'new-collection': collectionForm(); break;
    case 'edit-collection': collectionForm(id); break;
    case 'new-bookmark': bookmarkForm(); break;
    case 'edit-bookmark': bookmarkForm(id); break;
    case 'close-modal': closeModal(); break;
    case 'select-color': state.modal.color=target.dataset.color; document.querySelectorAll('.color-circle').forEach(el => el.classList.toggle('chosen',el === target)); break;
    case 'select-cover': document.querySelector('#bm-cover').value=target.dataset.cover; document.querySelectorAll('.cover-choice').forEach(el=>el.classList.toggle('chosen',el===target)); break;
    case 'filter-tag': state.tag=target.dataset.tag; drawContent(); break;
    case 'view-grid': case 'view-list': state.view = action === 'view-grid' ? 'grid' : 'list'; try { localStorage.setItem('cloudmark_view',state.view); } catch {} drawContent(); break;
    case 'auth-toggle': state.authMode = state.authMode === 'login' ? 'register' : 'login'; renderAuth(); break;
    case 'demo-login': {
      try { const result = await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:'demo@raindrop.local',password:'Demo12345!'})}); state.user=result.user; await refresh(); toast('Welcome to the demo workspace!'); }
      catch(err){ toast(err.message,true); } break;
    }
    case 'logout': try { await request('/api/auth/logout',{method:'POST'}); state.user=null; state.section='all'; state.search=''; renderAuth(); toast('Signed out.'); } catch(err) { toast(err.message,true); } break;
    case 'toggle-favorite': {
      const bm=state.bookmarks.find(b=>b.id===id);
      if (bm) await mutate(() => request(`/api/bookmarks/${id}`,{method:'PATCH',body:JSON.stringify({is_favorite:!bm.is_favorite})}), bm.is_favorite ? 'Removed from favorites.' : 'Added to favorites.'); break;
    }
    case 'delete-bookmark': await mutate(() => request(`/api/bookmarks/${id}`,{method:'DELETE'}), 'Bookmark moved to trash.'); break;
    case 'restore-bookmark': await mutate(() => request(`/api/bookmarks/${id}/restore`,{method:'POST'}), 'Bookmark restored.'); break;
    case 'permanent-bookmark': if (confirm('Permanently delete this bookmark? This cannot be undone.')) await mutate(()=>request(`/api/bookmarks/${id}/permanent`,{method:'DELETE'}),'Bookmark permanently deleted.'); break;
    case 'delete-collection': if (confirm('Delete this collection? Its bookmarks will move to Unsorted.')) { await mutate(()=>request(`/api/collections/${id}`,{method:'DELETE'}),'Collection deleted. Bookmarks moved to Unsorted.'); state.section='unsorted'; renderShell(); } break;
  }
});
document.addEventListener('submit',async event => {
  const form=event.target;
  if (!['auth-form','bookmark-form','collection-form'].includes(form.id)) return;
  event.preventDefault(); const submit=form.querySelector('[type="submit"]'); submit.disabled=true;
  const data=Object.fromEntries(new FormData(form).entries());
  try {
    if (form.id === 'auth-form') {
      const result=await request(`/api/auth/${state.authMode}`,{method:'POST',body:JSON.stringify(data)});
      state.user=result.user; await refresh(); toast(`Welcome, ${state.user.name}!`);
    } else if (form.id === 'bookmark-form') {
      const id=state.modal.id;
      const payload={...data,collection_id:data.collection_id ? Number(data.collection_id) : null,tags:data.tags.split(',').map(s=>s.trim()).filter(Boolean)};
      await request(id ? `/api/bookmarks/${id}`:'/api/bookmarks',{method:id?'PATCH':'POST',body:JSON.stringify(payload)});
      closeModal(); await refresh(); toast(id?'Bookmark updated.':'Bookmark saved!');
    } else if (form.id === 'collection-form') {
      const id=state.modal.id;
      const payload={...data,color:state.modal.color};
      const result=await request(id ? `/api/collections/${id}`:'/api/collections',{method:id?'PATCH':'POST',body:JSON.stringify(payload)});
      closeModal(); if(!id) state.section=result.id; await refresh(); toast(id?'Collection updated.':'Collection created!');
    }
  } catch(err) {
    const errorBox=document.querySelector('#auth-error');
    if (errorBox && form.id==='auth-form') { errorBox.textContent=err.message; errorBox.classList.add('visible'); }
    else toast(err.message,true);
  } finally { submit.disabled=false; }
});
document.addEventListener('keydown',ev=>{
  if (ev.key==='Escape') {closeModal(); if(state.sidebar){state.sidebar=false;document.querySelector('#sidebar')?.classList.remove('open');}}
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase()==='k' && state.user) {ev.preventDefault();document.querySelector('#search-input')?.focus();}
});
init();
