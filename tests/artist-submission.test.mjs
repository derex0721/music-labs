import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createTestD1} from './d1-test-db.mjs';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') {
      return {url:'data:text/javascript,export%20const%20env%20%3D%20%7B%7D',shortCircuit:true};
    }
    return nextResolve(specifier, context);
  },
});

const {onRequestPost}=await import('../functions/api/artist-submissions.ts');

const origin = 'https://music-labs.pages.dev';
const jpeg = () => new File([new Uint8Array([255,216,255,224,0,0])], 'avatar.jpg', {type:'image/jpeg'});

function form(overrides={}) {
  const values = {
    status: 'pending', publishMode: 'review', name: 'Test Artist', email: 'test@example.com', bioZh: '<script>example</script> 這是一段足夠長的中文介紹，描述聲音與創作方式。',
    roles: 'composer', genres: 'alternative-rnb', 'releaseTitle[]': 'Night Demo', 'releaseType[]': 'Single',
    'releaseUrl[]': 'https://youtube.com/example', instagram: 'https://instagram.com/test-artist',
    consent: 'yes', rightsConsent: 'yes', editConsent: 'yes', ...overrides,
  };
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach(item => f.append(key, item));
    else if (value !== undefined) f.set(key, value);
  }
  f.set('avatar', jpeg());
  return f;
}

async function run(f, requestOrigin=origin, testDb) {
  const database = testDb || createTestD1();
  const response = await onRequestPost({
    request: new Request(`${origin}/api/artist-submissions`, {method:'POST', headers:{Origin:requestOrigin}, body:f}),
    env: {RESEND_API_KEY:'mock-only', DB:database.binding},
  });
  if (!testDb) database.close();
  return response;
}

function mockFetch() {
  let sent;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('artists-data.json')) return Response.json([{id:'summer'}]);
    sent = JSON.parse(String(options?.body));
    return Response.json({id:'mock'});
  };
  return {get sent(){return sent;}, restore(){globalThis.fetch=original;}};
}

test('V2 payload is structured, escaped, and delivered for review', async () => {
  const mock = mockFetch();
  const database = createTestD1();
  try {
    const response = await run(form(),origin,database);
    assert.equal(response.status, 200);
    assert.deepEqual(mock.sent.to, ['derexbowei0706@gmail.com']);
    assert.match(mock.sent.text, /"schemaVersion": "artist-profile-v2"/);
    assert.match(mock.sent.text, /"status": "pending"/);
    assert.match(mock.sent.html, /&lt;script&gt;/);
    assert.equal(mock.sent.attachments.length, 1);
    assert.equal(mock.sent.reply_to, 'test@example.com');
    const saved=database.database.prepare("SELECT type,status,published_at,title,payload_json FROM content_items WHERE type='work'").get();
    assert.equal(saved.type,'work');
    assert.equal(saved.status,'pending');
    assert.equal(saved.published_at,null);
    assert.equal(saved.title,'Night Demo');
    assert.equal(JSON.parse(saved.payload_json).release.url,'https://youtube.com/example');
    assert.equal(database.database.prepare('SELECT status FROM creators').get().status,'pending');
  } finally { mock.restore(); database.close(); }
});

test('consent, unsafe links, cross-origin and invalid images are rejected before delivery', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('must not send'); };
  try {
    let f = form({rightsConsent:undefined});
    assert.equal((await run(f)).status, 400);
    assert.equal((await run(form({status:'published'}))).status, 400);
    f = form({'releaseUrl[]':'javascript:alert(1)'});
    assert.equal((await run(f)).status, 400);
    assert.equal((await run(form(), 'https://other.example')).status, 403);
    f = form(); f.set('avatar', new File(['not an image'], 'fake.jpg', {type:'image/jpeg'}));
    assert.equal((await run(f)).status, 400);
    f = form(); f.set('avatar', new File([new Uint8Array(3*1024*1024+1)], 'large.jpg', {type:'image/jpeg'}));
    assert.equal((await run(f)).status, 400);
  } finally { globalThis.fetch=original; }
});

test('email failures preserve the D1 pending submission and an identical retry does not duplicate it', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async url => String(url).includes('artists-data.json') ? Response.json([]) : new Response('fail',{status:500});
  const database=createTestD1();
  try {
    const response=await run(form(),origin,database);
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.status,'pending');
    const retry=await run(form(),origin,database);
    assert.equal(retry.status,200);
    assert.equal((await retry.json()).id,result.id);
    assert.equal(database.database.prepare("SELECT count(*) AS count FROM content_items WHERE type='work'").get().count,1);
    assert.equal(database.database.prepare('SELECT count(*) AS count FROM creators').get().count,1);
  } finally { globalThis.fetch=original; database.close(); }
});
