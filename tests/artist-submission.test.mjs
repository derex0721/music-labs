import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/artist-submissions.ts';

const origin = 'https://music-labs.pages.dev';
const jpeg = () => new File([new Uint8Array([255,216,255,224,0,0])], 'avatar.jpg', {type:'image/jpeg'});

function form(overrides={}) {
  const values = {
    name: 'Test Artist', email: 'test@example.com', bioZh: '<script>example</script> 這是一段足夠長的中文介紹，描述聲音與創作方式。',
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

async function run(f, requestOrigin=origin) {
  return onRequestPost({
    request: new Request(`${origin}/api/artist-submissions`, {method:'POST', headers:{Origin:requestOrigin}, body:f}),
    env: {RESEND_API_KEY:'mock-only'},
  });
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
  try {
    const response = await run(form());
    assert.equal(response.status, 200);
    assert.deepEqual(mock.sent.to, ['derexbowei0706@gmail.com']);
    assert.match(mock.sent.text, /"schemaVersion": "artist-profile-v2"/);
    assert.match(mock.sent.text, /"status": "pending"/);
    assert.match(mock.sent.html, /&lt;script&gt;/);
    assert.equal(mock.sent.attachments.length, 1);
    assert.equal(mock.sent.reply_to, 'test@example.com');
  } finally { mock.restore(); }
});

test('consent, unsafe links, cross-origin and invalid images are rejected before delivery', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('must not send'); };
  try {
    let f = form({rightsConsent:undefined});
    assert.equal((await run(f)).status, 400);
    f = form({'releaseUrl[]':'javascript:alert(1)'});
    assert.equal((await run(f)).status, 400);
    assert.equal((await run(form(), 'https://other.example')).status, 403);
    f = form(); f.set('avatar', new File(['not an image'], 'fake.jpg', {type:'image/jpeg'}));
    assert.equal((await run(f)).status, 400);
    f = form(); f.set('avatar', new File([new Uint8Array(3*1024*1024+1)], 'large.jpg', {type:'image/jpeg'}));
    assert.equal((await run(f)).status, 400);
  } finally { globalThis.fetch=original; }
});

test('delivery failures do not show success', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async url => String(url).includes('artists-data.json') ? Response.json([]) : new Response('fail',{status:500});
  try { assert.equal((await run(form())).status, 502); }
  finally { globalThis.fetch=original; }
});
