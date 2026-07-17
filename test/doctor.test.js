/* eslint-disable no-console -- tests stub console.log to silence doctor output */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKLISTS, runDoctor } from '../lib/doctor.js';
import { PROFILES } from '../lib/tools.js';

test('a default checklist exists', () => {
  assert.ok(Array.isArray(CHECKLISTS.default) && CHECKLISTS.default.length);
});

test('every non-default checklist maps to a real profile flag', () => {
  for (const key of Object.keys(CHECKLISTS)) {
    if (key === 'default') continue;
    assert.ok(
      PROFILES[key],
      `checklist "${key}" has no matching profile — --doctor --${key} would confuse`
    );
  }
});

test('the bootcamp checklist covers the first-time-setup essentials', () => {
  for (const id of ['git', 'node', 'npm', 'git-identity', 'vscode']) {
    assert.ok(CHECKLISTS.bootcamp.includes(id), `bootcamp checklist missing "${id}"`);
  }
});

test('runDoctor reports results without throwing and never mutates', () => {
  const log = console.log;
  console.log = () => {}; // silence output during the test
  try {
    const { results, blockers } = runDoctor({ checklist: 'default' });
    assert.ok(Array.isArray(results) && results.length);
    assert.equal(typeof blockers, 'number');
    for (const r of results) {
      assert.ok(['pass', 'fail', 'warn'].includes(r.status), `bad status: ${r.status}`);
      assert.ok(r.label, 'result missing label');
    }
  } finally {
    console.log = log;
  }
});

test('an unknown checklist falls back to default rather than crashing', () => {
  const log = console.log;
  console.log = () => {};
  try {
    const { results } = runDoctor({ checklist: 'does-not-exist' });
    assert.equal(results.length, CHECKLISTS.default.length);
  } finally {
    console.log = log;
  }
});
