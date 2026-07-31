import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupOllama } from '../lib/ollama.js';
import { TOOLS, PROFILES } from '../lib/tools.js';

test('setupOllama is exported as a function', () => {
  assert.equal(typeof setupOllama, 'function');
});

test('ollama remains a real, installable entry in the tool catalogue', () => {
  const ollama = TOOLS.find((t) => t.id === 'ollama');
  assert.ok(ollama, 'ollama tool definition is missing');
  for (const platform of ollama.platforms) {
    assert.ok(ollama.install?.[platform], `ollama claims ${platform} but has no install spec`);
  }
});

test('ollama is the standalone --ollama command, not part of any profile', () => {
  for (const [key, profile] of Object.entries(PROFILES)) {
    assert.ok(
      !profile.ids.includes('ollama'),
      `profile "${key}" must not include ollama — it ships as the standalone --ollama command`
    );
  }
});
