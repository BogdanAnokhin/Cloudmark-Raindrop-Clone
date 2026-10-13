import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { db, bootstrap, hashPassword, hashToken, seedDemo, setTags, verifyPassword } from './db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 3000);
seedDemo();

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) fail(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { fail(400, 'Invalid JSON.'); }
}
function idFrom(pathname, base) {
  const match = pathname.match(new RegExp(`^/api/${base}/(\\d+)$`));
  return match ? Number(match[1]) : null;
}
function getUser(req) {
  const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('session='))?.slice(8);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(`SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).get(hashToken(token)) || null;
}
function userOrFail(req) { return getUser(req) || fail(401, 'Please sign in.'); }
function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?,?,datetime('now','+7 days'))").run(hashToken(token), userId);
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`);
}
function ownCollection(userId, collectionId) {
  if (collectionId === null || collectionId === undefined || collectionId === '') return null;
  if (!Number.isInteger(Number(collectionId))) fail(400, 'Invalid collection.');
  const item = db.prepare('SELECT * FROM collections WHERE id=? AND user_id=?').get(Number(collectionId), userId);
  if (!item) fail(404, 'Collection not found.');
  return item.id;
}
function ownBookmark(userId, id) {
  const found = db.prepare('SELECT * FROM bookmarks WHERE user_id=? AND id=?').get(userId, id);
  if (!found) fail(404, 'Bookmark not found.');
  return found;
}
function cleanText(value, maxLength, label, required = false) {
  const str = String(value ?? '').trim();
  if ((required && !str) || str.length > maxLength) fail(400, `${label} must be ${required ? '1-' : 'at most '}${maxLength} characters.`);
  return str;
}
function cleanUrl(raw) {
  const str = cleanText(raw, 2000, 'URL', true);
  let url;
  try { url = new URL(str); } catch { fail(400, 'Please enter a valid URL including https://'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) fail(400, 'Only http and https URLs are supported.');
  return url.href;
}
function cleanTags(value) {
  if (!Array.isArray(value)) fail(400, 'Tags must be an array.');
  const tags = value.map(v => cleanText(v, 32, 'Tag')).filter(Boolean);
  if (tags.length > 12) fail(400, 'Maximum 12 tags.');
  return tags;
}
const coverNames = new Set(['default','awwwards','dribbble','figma','behance','typewolf','mdn','vue','github','roadmap','tailwind','smashing','nng','unsplash','pexels','atlas','wiki']);
function cleanCover(raw) { return coverNames.has(raw) ? raw : 'default'; }

async function api(req, res, pathname) {
  const method = req.method;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && req.headers.origin) {
    const origin = new URL(req.headers.origin);
    if (origin.host !== req.headers.host) fail(403, 'Cross-origin requests are not permitted.');
  }
  if (pathname === '/api/me' && method === 'GET') return json(res, 200, { user: getUser(req) });
  if (pathname === '/api/auth/login' && method === 'POST') {
    const data = await body(req);
    const email = cleanText(data.email, 254, 'Email', true).toLowerCase();
    const pass = String(data.password ?? '');
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row || !verifyPassword(pass, row.password_hash)) fail(401, 'Invalid email or password.');
    startSession(res, row.id);
    return json(res, 200, { user: { id: row.id, name: row.name, email: row.email } });
  }
  if (pathname === '/api/auth/register' && method === 'POST') {
    const data = await body(req);
    const name = cleanText(data.name, 60, 'Name', true);
    const email = cleanText(data.email, 254, 'Email', true).toLowerCase();
    const password = String(data.password ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Please enter a valid email.');
    if (password.length < 8 || password.length > 128) fail(400, 'Password must be 8–128 characters.');
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) fail(409, 'This email is already registered.');
    const id = Number(db.prepare('INSERT INTO users(name,email,password_hash) VALUES (?,?,?)').run(name,email,hashPassword(password)).lastInsertRowid);
    startSession(res, id);
    return json(res, 201, { user: { id, name, email } });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
    return json(res, 200, { ok: true });
  }
  const user = userOrFail(req);
  if (pathname === '/api/bootstrap' && method === 'GET') return json(res, 200, bootstrap(user.id));
  if (pathname === '/api/collections' && method === 'POST') {
    const data = await body(req);
    const name = cleanText(data.name, 60, 'Collection name', true);
    const icon = cleanText(data.icon || 'folder', 30, 'Icon');
    const color = /^#[a-fA-F0-9]{6}$/.test(data.color) ? data.color : '#64748b';
    const id = Number(db.prepare('INSERT INTO collections (user_id,name,icon,color) VALUES (?,?,?,?)').run(user.id,name,icon,color).lastInsertRowid);
    return json(res, 201, { id });
  }
  const collId = idFrom(pathname, 'collections');
  if (collId !== null && method === 'PATCH') {
    ownCollection(user.id, collId);
    const data = await body(req);
    const name = cleanText(data.name, 60, 'Collection name', true);
    const icon = cleanText(data.icon || 'folder', 30, 'Icon');
    const color = /^#[a-fA-F0-9]{6}$/.test(data.color) ? data.color : '#64748b';
    db.prepare('UPDATE collections SET name=?, icon=?, color=? WHERE id=? AND user_id=?').run(name,icon,color,collId,user.id);
    return json(res, 200, { ok: true });
  }
  if (collId !== null && method === 'DELETE') {
    ownCollection(user.id, collId);
    db.prepare('DELETE FROM collections WHERE id=? AND user_id=?').run(collId, user.id);
    return json(res, 200, { ok: true });
  }
  if (pathname === '/api/bookmarks' && method === 'POST') {
    const data = await body(req);
    const url = cleanUrl(data.url);
    const title = cleanText(data.title || new URL(url).hostname, 180, 'Title', true);
    const description = cleanText(data.description, 800, 'Description');
    const collectionId = ownCollection(user.id, data.collection_id);
    const tags = cleanTags(data.tags ?? []);
    const cover = cleanCover(data.cover);
    const id = Number(db.prepare(`INSERT INTO bookmarks (user_id,collection_id,url,title,description,cover,is_favorite)
      VALUES (?,?,?,?,?,?,?)`).run(user.id, collectionId, url, title, description, cover, data.is_favorite ? 1 : 0).lastInsertRowid);
    setTags(user.id, id, tags);
    return json(res, 201, { id });
  }
  const bmId = idFrom(pathname, 'bookmarks');
  if (bmId !== null && method === 'PATCH') {
    const original = ownBookmark(user.id, bmId);
    const data = await body(req);
    const url = data.url === undefined ? original.url : cleanUrl(data.url);
    const title = data.title === undefined ? original.title : cleanText(data.title, 180, 'Title', true);
    const description = data.description === undefined ? original.description : cleanText(data.description, 800, 'Description');
    const collectionId = data.collection_id === undefined ? original.collection_id : ownCollection(user.id, data.collection_id);
    const cover = data.cover === undefined ? original.cover : cleanCover(data.cover);
    const favorite = data.is_favorite === undefined ? original.is_favorite : (data.is_favorite ? 1 : 0);
    db.prepare(`UPDATE bookmarks SET url=?,title=?,description=?,collection_id=?,cover=?,is_favorite=?,updated_at=datetime('now')
      WHERE id=? AND user_id=?`).run(url,title,description,collectionId,cover,favorite,bmId,user.id);
    if (data.tags !== undefined) setTags(user.id, bmId, cleanTags(data.tags));
    return json(res, 200, { ok: true });
  }
  if (bmId !== null && method === 'DELETE') {
    ownBookmark(user.id, bmId);
    db.prepare("UPDATE bookmarks SET deleted_at=datetime('now') WHERE id=? AND user_id=?").run(bmId,user.id);
    return json(res, 200, { ok: true });
  }
  const restore = pathname.match(/^\/api\/bookmarks\/(\d+)\/restore$/);
  if (restore && method === 'POST') {
    ownBookmark(user.id, Number(restore[1]));
    db.prepare('UPDATE bookmarks SET deleted_at=NULL WHERE id=? AND user_id=?').run(Number(restore[1]),user.id);
    return json(res, 200, { ok: true });
  }
  const permanent = pathname.match(/^\/api\/bookmarks\/(\d+)\/permanent$/);
  if (permanent && method === 'DELETE') {
    ownBookmark(user.id, Number(permanent[1]));
    db.prepare('DELETE FROM bookmarks WHERE id=? AND user_id=?').run(Number(permanent[1]),user.id);
    return json(res, 200, { ok: true });
  }
  fail(404, 'API route not found.');
}
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return json(res,400,{error:'Bad path.'}); }
  if (rel === '/') rel = '/index.html';
  const full = path.resolve(publicDir, `.${rel}`);
  if (full !== publicDir && !full.startsWith(publicDir + path.sep)) return json(res,403,{error:'Forbidden.'});
  let stat;
  try { stat = fs.statSync(full); } catch { return json(res,404,{error:'File not found.'}); }
  if (!stat.isFile()) return json(res,404,{error:'File not found.'});
  const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
  res.writeHead(200, {'Content-Type': mime[path.extname(full)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try { if (pathname.startsWith('/api/')) await api(req,res,pathname); else serveStatic(req,res,pathname); }
  catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return json(res,409,{error:'This item already exists.'});
    if (error.status) return json(res,error.status,{error:error.message});
    console.error(error);
    return json(res,500,{error:'Unexpected server error.'});
  }
});
server.listen(port, () => console.log(`☁ Raindrop Clone running at http://localhost:${port}`));
