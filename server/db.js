import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = process.env.DB_PATH || path.join(root, 'data', 'bookmarks.db');
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT 'default',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS bookmark_tags (
  bookmark_id INTEGER NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(bookmark_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_collection ON bookmarks(user_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_deleted ON bookmarks(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);
`);

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `pbkdf2$${salt}$${pbkdf2Sync(password, salt, 160000, 32, 'sha256').toString('hex')}`;
}
export function verifyPassword(password, saved) {
  const [algorithm, salt, expected] = String(saved).split('$');
  if (algorithm !== 'pbkdf2' || !salt || !expected) return false;
  const actual = Buffer.from(hashPassword(password, salt).split('$')[2], 'hex');
  const original = Buffer.from(expected, 'hex');
  return actual.length === original.length && timingSafeEqual(actual, original);
}
export const hashToken = token => createHash('sha256').update(token).digest('hex');

export function setTags(userId, bookmarkId, names) {
  const unique = [...new Set(names.map(x => String(x).trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, 12);
  db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').run(bookmarkId);
  for (const name of unique) {
    db.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)').run(userId, name);
    const tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?').get(userId, name);
    db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(bookmarkId, tag.id);
  }
}
export function bootstrap(userId) {
  const collections = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY id').all(userId);
  const bookmarks = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC').all(userId);
  const lookup = db.prepare('SELECT t.name FROM tags t JOIN bookmark_tags bt ON bt.tag_id = t.id WHERE bt.bookmark_id = ? ORDER BY t.name');
  for (const bookmark of bookmarks) {
    bookmark.tags = lookup.all(bookmark.id).map(x => x.name);
    bookmark.is_favorite = Boolean(bookmark.is_favorite);
  }
  const tags = db.prepare(`SELECT t.name, COUNT(bt.bookmark_id) AS count FROM tags t
    JOIN bookmark_tags bt ON bt.tag_id = t.id JOIN bookmarks b ON b.id = bt.bookmark_id
    WHERE t.user_id = ? AND b.deleted_at IS NULL GROUP BY t.id ORDER BY count DESC, t.name`).all(userId);
  return { collections, bookmarks, tags };
}

export function seedDemo() {
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get('demo@raindrop.local')) return;
  const userId = Number(db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run('Alex Morgan', 'demo@raindrop.local', hashPassword('Demo12345!')).lastInsertRowid);
  const collections = [
    ['Design inspiration', 'palette', '#a55eea'],
    ['Development', 'code', '#3b82f6'],
    ['Read later', 'book-open', '#eb9c38'],
    ['Photography', 'camera', '#2fb992'],
    ['Travel ideas', 'plane', '#e56d77'],
  ];
  const ids = collections.map(c => Number(db.prepare('INSERT INTO collections (user_id,name,icon,color) VALUES (?,?,?,?)').run(userId, ...c).lastInsertRowid));
  const examples = [
    [0,'https://www.awwwards.com/','Awwwards — Website Awards','Discover the best in web design, creative development, and digital experiences.','awwwards','design,inspiration,web'],
    [0,'https://dribbble.com/','Dribbble — Discover the world’s top designers','A daily dose of inspiration from the global design community.','dribbble','design,ui'],
    [0,'https://www.figma.com/','Figma — Design and build together','Where ideas come to life with collaborative product design.','figma','design,tools'],
    [0,'https://www.behance.net/','Behance — Creative work','Explore standout projects from designers and artists.','behance','portfolio,design'],
    [0,'https://www.typewolf.com/','Typewolf — Typography Inspiration','Independent typography resource for beautiful websites.','typewolf','typography,design'],
    [1,'https://developer.mozilla.org/','MDN Web Docs','Resources for developers, by developers.','mdn','javascript,docs'],
    [1,'https://vuejs.org/','Vue.js — The Progressive JavaScript Framework','An approachable, performant and versatile web framework.','vue','javascript,frontend'],
    [1,'https://github.com/','GitHub — Build and ship software','The home of open source projects and software development.','github','code,tools'],
    [1,'https://roadmap.sh/','Developer Roadmaps','Community-driven learning paths, guides and roadmaps.','roadmap','learning,code'],
    [1,'https://tailwindcss.com/','Tailwind CSS','A utility-first CSS framework for rapidly building interfaces.','tailwind','css,frontend'],
    [2,'https://www.smashingmagazine.com/','Smashing Magazine','Practical tips for web design, UX and frontend development.','smashing','articles,design'],
    [2,'https://www.nngroup.com/articles/','Nielsen Norman Group — UX Research','Evidence-based user experience research and insights.','nng','articles,ux'],
    [3,'https://unsplash.com/','Unsplash — Beautiful Free Images','Beautiful, freely usable images from photographers everywhere.','unsplash','photo,inspiration'],
    [3,'https://www.pexels.com/','Pexels — Free Stock Photos','Discover free photos and videos shared by creators.','pexels','photo,resources'],
    [4,'https://www.atlasobscura.com/','Atlas Obscura — Curious Places','Discover the world’s most wondrous and hidden places.','atlas','travel,ideas'],
    [null,'https://www.wikipedia.org/','Wikipedia — The Free Encyclopedia','The free encyclopedia that anyone can edit.','wiki','learning'],
  ];
  const insert = db.prepare('INSERT INTO bookmarks (user_id,collection_id,url,title,description,cover,is_favorite,created_at) VALUES (?,?,?,?,?,?,?,datetime(\'now\',?))');
  examples.forEach((e, i) => {
    const bId = Number(insert.run(userId, e[0] === null ? null : ids[e[0]], e[1], e[2], e[3], e[4], [0,2,6,12].includes(i) ? 1 : 0, `-${i} hours`).lastInsertRowid);
    setTags(userId, bId, e[5].split(','));
  });
}
