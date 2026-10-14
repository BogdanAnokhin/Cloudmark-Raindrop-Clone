import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudmark-tests-'));
const port = 40000 + Math.floor(Math.random()*10000);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/index.js'], {
  cwd:projectRoot, env:{ ...process.env, PORT:String(port), DB_PATH:path.join(folder, 'test.db') }, stdio:'ignore'
});
async function waitForServer() {
  for(let i=0;i<80;i++) {
    if (server.exitCode !== null) throw new Error('Server exited unexpectedly');
    try { const r=await fetch(base+'/api/me'); if(r.ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Server did not start');
}
let cookie = '';
async function api(route, method='GET', payload, auth=true) {
  const res=await fetch(base+route,{method,headers:{...(payload ? {'Content-Type':'application/json'}:{}),...(auth && cookie ? {'Cookie':cookie}:{})},body:payload ? JSON.stringify(payload) : undefined});
  const result=await res.json();
  return {status:res.status,data:result,cookie:res.headers.get('set-cookie')};
}
test('full-stack API: users, collections, bookmarks, tags, isolation, trash, validation',async t=>{
  t.after(()=>{
    server.kill('SIGTERM');
    try { fs.rmSync(folder,{recursive:true,force:true}); } catch {}
  });
  await waitForServer();
  assert.equal((await api('/api/bootstrap')).status,401,'Not authenticated');
  assert.equal((await api('/api/auth/login','POST',{email:'demo@raindrop.local',password:'wrong'},false)).status,401);
  const login=await api('/api/auth/login','POST',{email:'demo@raindrop.local',password:'Demo12345!'},false);
  assert.equal(login.status,200);
  cookie=login.cookie.split(';')[0];
  assert.ok(cookie.startsWith('session='));
  const initial=(await api('/api/bootstrap')).data;
  assert.equal(initial.collections.length,5);
  assert.equal(initial.bookmarks.length,16);
  assert.equal(initial.bookmarks.find(b=>b.title.startsWith('Vue.js')).tags.includes('frontend'),true);
  const col=await api('/api/collections','POST',{name:'University resources',icon:'book-open',color:'#3b82f6'});
  assert.equal(col.status,201);const collId=col.data.id;
  const bm=await api('/api/bookmarks','POST',{url:'https://example.org/hello',title:'Example resource',description:'Read later',collection_id:collId,tags:['education','node.js']});
  assert.equal(bm.status,201);const bookmarkId=bm.data.id;
  let state=(await api('/api/bootstrap')).data;
  assert.equal(state.bookmarks.find(b=>b.id===bookmarkId).tags.length,2);
  const change=await api(`/api/bookmarks/${bookmarkId}`,'PATCH',{is_favorite:true,title:'Example Updated',tags:['school','testing']});
  assert.equal(change.status,200);
  state=(await api('/api/bootstrap')).data;
  const edited=state.bookmarks.find(b=>b.id===bookmarkId);
  assert.equal(edited.title,'Example Updated');
  assert.equal(edited.is_favorite,true);
  assert.deepEqual(edited.tags,['school','testing']);
  assert.equal((await api('/api/bookmarks','POST',{url:'javascript:alert(1)',title:'Bad',tags:[]})).status,400);
  assert.equal((await api('/api/bookmarks','POST',{url:'http://example.com',title:'Bad',tags:'x'})).status,400);
  assert.equal((await api(`/api/bookmarks/${bookmarkId}`,'DELETE')).status,200);
  assert.ok((await api('/api/bootstrap')).data.bookmarks.find(b=>b.id===bookmarkId).deleted_at);
  assert.equal((await api(`/api/bookmarks/${bookmarkId}/restore`,'POST')).status,200);
  assert.equal((await api('/api/bootstrap')).data.bookmarks.find(b=>b.id===bookmarkId).deleted_at,null);

  const user=await api('/api/auth/register','POST',{name:'Student',email:'student@example.com',password:'correct horse battery'},false);
  assert.equal(user.status,201);
  const otherCookie=user.cookie.split(';')[0];
  const demoCookie=cookie;cookie=otherCookie;
  const empty=(await api('/api/bootstrap')).data;
  assert.equal(empty.bookmarks.length,0);
  assert.equal(empty.collections.length,0);
  assert.equal((await api(`/api/bookmarks/${bookmarkId}`,'PATCH',{title:'Hacked'})).status,404);
  assert.equal((await api('/api/bookmarks','POST',{url:'https://example.org',collection_id:collId,tags:[]})).status,404);
  cookie=demoCookie;
  assert.equal((await api(`/api/bookmarks/${bookmarkId}/permanent`,'DELETE')).status,200);
  assert.equal((await api('/api/bootstrap')).data.bookmarks.some(b=>b.id===bookmarkId),false);
  assert.equal((await api(`/api/collections/${collId}`,'DELETE')).status,200);
  assert.equal((await api('/api/auth/logout','POST')).status,200);
  assert.equal((await api('/api/bootstrap')).status,401);
});
