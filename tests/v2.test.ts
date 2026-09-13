import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicSynth, envelopeLevel } from '../lib/musicSynthBrowser.ts';
import { onRequest, issueSession, validSession } from '../functions/_middleware.ts';

class Param {
  value = 0;
  events: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) { this.events.push(['set',v,t]); }
  linearRampToValueAtTime(v: number, t: number) { this.events.push(['linear',v,t]); }
  exponentialRampToValueAtTime(v: number, t: number) { assert.ok(v > 0); this.events.push(['exp',v,t]); }
  cancelScheduledValues(t: number) { this.events.push(['cancel',0,t]); }
}
class Node {
  gain = new Param(); frequency = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  onended?: () => void; disconnected = false; stopTime = 0;
  connect(n: Node) { return n; }
  disconnect() { this.disconnected = true; }
  start() {}
  stop(t: number) { this.stopTime = t; }
}
class Context {
  static latest: Context;
  state = 'running'; currentTime = 0; destination = new Node(); sampleRate = 48000;
  oscillators: Node[] = []; gains: Node[] = []; limiter = new Node();
  constructor() { Context.latest = this; }
  createGain() { const n = new Node(); this.gains.push(n); return n; }
  createOscillator() { const n = new Node(); this.oscillators.push(n); return n; }
  createDynamicsCompressor() { return this.limiter; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}
Object.assign(globalThis, { window: { AudioContext: Context, setTimeout, clearTimeout, setInterval, clearInterval }, document: { documentElement: { dataset: {} } } });
const adsr = { attack: .01, decay: .15, sustain: .65, release: .25 };
test('ADSR interpolation and early release preserve instantaneous level', async () => {
  const synth = new MusicSynth(); await synth.noteOn(69);
  const ctx = Context.latest; ctx.currentTime = .005;
  synth.noteOff(69);
  const events = ctx.gains[1].gain.events;
  assert.deepEqual(events.at(-3), ['cancel',0,.005]);
  assert.ok(Math.abs(events.at(-2)![1] - envelopeLevel(.005,0,.144,adsr)) < 1e-9);
  assert.deepEqual(events.at(-1), ['exp',.0001,.255]);
  assert.equal(ctx.limiter.attack.value,.003); assert.equal(ctx.limiter.ratio.value,12);
  ctx.oscillators[0].onended!(); assert.ok(ctx.gains[1].disconnected && ctx.oscillators[0].disconnected);
  await synth.dispose();
});
test('decay, silent sustain, retrigger identity, and cleanup', async () => {
  assert.ok(envelopeLevel(.05,0,.144,adsr) < .144);
  assert.equal(envelopeLevel(1,0,.144,{...adsr,sustain:0}),.0001);
  const synth = new MusicSynth(); await synth.noteOn(60); await synth.noteOn(60);
  const ctx = Context.latest; ctx.oscillators[0].onended!();
  ctx.currentTime=.1; synth.noteOff(60);
  assert.equal(ctx.oscillators[1].stopTime,.35);
  await synth.dispose(); assert.ok(ctx.oscillators.every(n=>n.disconnected));
  await assert.rejects(synth.noteOn(60));
});
test('stop cancels pending note and pending playback; invalid parameters reject', async () => {
  const synth = new MusicSynth(); const note = synth.noteOn(60); synth.noteOff(60); await note;
  const play = synth.play(['C4']); synth.allNotesOff(); await play;
  assert.equal(Context.latest.oscillators.length,0);
  assert.throws(()=>synth.setADSR({sustain:2}),RangeError);
  await assert.rejects(synth.noteOn(NaN)); await synth.dispose();
});
test('pre-scheduled voices stop on allNotesOff', async () => {
  const synth = new MusicSynth(); await synth.playProgression([['C4'],['E4']]);
  synth.allNotesOff(); assert.ok(Context.latest.oscillators.every(n=>n.stopTime === .25));
  await synth.dispose();
});
const env = { TURNSTILE_SITE_KEY: 'public-key', TURNSTILE_SECRET_KEY: 'test-secret', VERIFICATION_SESSION_SECRET: 'x'.repeat(40), CF_PAGES_BRANCH: 'v2/audio-security' };
const run = (request: Request, configuration = env) => (onRequest as Function)({ request, env: configuration, next: async () => new Response('protected', {status:201,headers:{'Content-Type':'text/plain'}}) }) as Promise<Response>;
test('session signatures reject tampering, expiry and cross-host reuse', async () => {
  const now = Date.now(); const value = await issueSession('example.com',env.VERIFICATION_SESSION_SECRET,now);
  assert.ok(await validSession(value,'example.com',env.VERIFICATION_SESSION_SECRET,now));
  assert.equal(await validSession(value,'other.com',env.VERIFICATION_SESSION_SECRET,now),false);
  assert.equal(await validSession(value+'0','example.com',env.VERIFICATION_SESSION_SECRET,now),false);
  assert.equal(await validSession(value,'example.com',env.VERIFICATION_SESSION_SECRET,now+3600001),false);
});
test('gate fails closed, protects API, preserves upstream status and adds noindex', async () => {
  assert.equal((await run(new Request('https://example.com/'),{...env,TURNSTILE_SECRET_KEY:''})).status,503);
  assert.equal((await run(new Request('https://example.com/api/feedback'))).status,401);
  assert.match(await (await run(new Request('https://example.com/'))).text(),/cf-turnstile/);
  const cookie = await issueSession('example.com',env.VERIFICATION_SESSION_SECRET);
  const response = await run(new Request('https://example.com/',{headers:{Cookie:`__Host-ml-verified=${cookie}`}}));
  assert.equal(response.status,201); assert.equal(await response.text(),'protected');
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('siteverify requires origin, success, matching hostname and action', async () => {
  const original = globalThis.fetch;
  const request = (origin='https://example.com') => new Request('https://example.com/__verify',{method:'POST',headers:{Origin:origin},body:JSON.stringify({token:'token'})});
  try {
    globalThis.fetch = async () => Response.json({success:true,hostname:'example.com',action:'entry'});
    assert.equal((await run(request('https://evil.com'))).status,403);
    const ok = await run(request()); assert.equal(ok.status,204); assert.match(ok.headers.get('Set-Cookie')!,/HttpOnly; Secure; SameSite=Lax/);
    for (const result of [{success:false},{success:true,hostname:'evil.com',action:'entry'},{success:true,hostname:'example.com',action:'other'}]) {
      globalThis.fetch = async () => Response.json(result);
      assert.equal((await run(request())).status,403);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal((await run(request())).status,503);
  } finally { globalThis.fetch = original; }
});
