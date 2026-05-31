const { describe, it } = require('node:test');
const assert = require('node:assert');
const { healthCheck } = require('../voice/voiceboxProvider.cjs');
const { transcribe } = require('../voice/voiceboxSTTProvider.cjs');

describe('Voicebox Provider', async () => {
  // Try to connect to check if Voicebox is running
  const health = await healthCheck();
  const isOnline = health.ok;

  it('Voicebox health check', { skip: isOnline ? false : 'Requires running Voicebox' }, async () => {
    assert.strictEqual(health.ok, true);
    assert.strictEqual(health.status, 'connected');
    assert.ok(health.details.profileCount >= 0);
  });

  it('Provider module loads', () => {
    const provider = require('../voice/voiceboxProvider.cjs');
    assert.ok(provider.speak);
    assert.ok(provider.generate);
    assert.ok(provider.listProfiles);
    assert.ok(provider.healthCheck);
  });

  it('STT provider module loads', () => {
    const provider = require('../voice/voiceboxSTTProvider.cjs');
    assert.ok(provider.transcribe);
  });

  it('Fallback when offline', async () => {
    // If we call with a bad URL, it should gracefully fail
    const originalUrl = process.env.VOICEBOX_BASE_URL;
    process.env.VOICEBOX_BASE_URL = 'http://127.0.0.1:9999'; // deliberately wrong port
    
    // Clear require cache to reload the module with the new env var
    delete require.cache[require.resolve('../voice/voiceboxProvider.cjs')];
    const offlineProvider = require('../voice/voiceboxProvider.cjs');
    
    const res = await offlineProvider.healthCheck();
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.status, 'offline');
    
    const speakRes = await offlineProvider.speak('test');
    assert.strictEqual(speakRes.ok, false);
    assert.ok(speakRes.error.includes('failed') || speakRes.error.includes('not running'));
    
    // Restore
    process.env.VOICEBOX_BASE_URL = originalUrl;
  });
});
