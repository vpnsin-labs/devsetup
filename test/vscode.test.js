import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupVscode, loadRecommendations } from '../lib/vscode.js';

// ── vendored recommended extensions ───────────────────────────────────────────
test('vscode extensions template parses to a non-empty recommendations list', () => {
  const recs = loadRecommendations();
  assert.ok(Array.isArray(recs));
  assert.ok(recs.length >= 10, `expected >=10 recommendations, got ${recs.length}`);
});

test('every recommendation is a publisher.extension id', () => {
  for (const id of loadRecommendations()) {
    assert.match(id, /^[\w-]+\.[\w-]+$/, `bad extension id: ${id}`);
  }
});

test('recommendations have no duplicates', () => {
  const recs = loadRecommendations().map((id) => id.toLowerCase());
  assert.equal(new Set(recs).size, recs.length);
});

test('setupVscode is exported as a function', () => {
  assert.equal(typeof setupVscode, 'function');
});
