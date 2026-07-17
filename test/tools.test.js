import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, PROFILES } from '../lib/tools.js';

const ids = new Set(TOOLS.map((t) => t.id));

test('tool ids are unique', () => {
  assert.equal(ids.size, TOOLS.length, 'duplicate tool id in TOOLS');
});

test('every tool has the required shape', () => {
  for (const tool of TOOLS) {
    assert.ok(tool.id, 'tool missing id');
    assert.ok(tool.name, `${tool.id}: missing name`);
    assert.ok(tool.description, `${tool.id}: missing description`);
    assert.ok(Array.isArray(tool.platforms) && tool.platforms.length, `${tool.id}: no platforms`);
    assert.equal(typeof tool.optional, 'boolean', `${tool.id}: optional must be boolean`);
  }
});

test('every claimed platform has an installer', () => {
  for (const tool of TOOLS) {
    for (const platform of tool.platforms) {
      assert.ok(tool.install?.[platform], `${tool.id}: claims ${platform} but has no install spec`);
    }
  }
});

test('every profile references only real tools', () => {
  for (const [key, profile] of Object.entries(PROFILES)) {
    assert.ok(profile.name, `${key}: missing name`);
    assert.ok(profile.description, `${key}: missing description`);
    for (const id of profile.ids) {
      assert.ok(ids.has(id), `profile "${key}" references unknown tool "${id}"`);
    }
  }
});

test('profiles contain no duplicate tools', () => {
  for (const [key, profile] of Object.entries(PROFILES)) {
    assert.equal(new Set(profile.ids).size, profile.ids.length, `profile "${key}" has duplicates`);
  }
});

test('bootcamp profile stays lean and beginner-safe', () => {
  const bootcamp = PROFILES.bootcamp;
  assert.ok(bootcamp, 'bootcamp profile is missing');

  // The whole point of this profile is a ~30-minute setup on a personal
  // laptop. These pull in WSL2/virtualisation/daemons and belong in --web.
  for (const heavy of ['docker', 'wsl2', 'minikube', 'kubectl', 'android-studio']) {
    assert.ok(!bootcamp.ids.includes(heavy), `bootcamp must not include "${heavy}"`);
  }
  assert.ok(bootcamp.ids.length <= 8, 'bootcamp profile is growing too large');
});

test('full-stack really does include everything', () => {
  const fullStack = new Set(PROFILES['full-stack'].ids);
  for (const [key, profile] of Object.entries(PROFILES)) {
    if (key === 'full-stack' || key === 'essentials') continue;
    for (const id of profile.ids) {
      assert.ok(fullStack.has(id), `full-stack is missing "${id}" (from profile "${key}")`);
    }
  }
});
