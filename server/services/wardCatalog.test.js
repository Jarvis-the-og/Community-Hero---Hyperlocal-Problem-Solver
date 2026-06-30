import test from 'node:test';
import assert from 'node:assert/strict';
import { issueFixtures } from '../scripts/seedProductionDemoData.js';
import { buildWardAwareIssue, loadWardCatalog, resolveWardContext } from './wardCatalog.js';

test('loads the uploaded ward mapping and exposes the expected boroughs and wards', async () => {
  const catalog = await loadWardCatalog();

  assert.ok(catalog.length >= 140, `expected at least 140 ward entries, received ${catalog.length}`);

  const ward63 = catalog.find((entry) => entry.wardNumber === 63);
  assert.ok(ward63, 'expected Ward 63 to be present');
  assert.equal(ward63.borough, 'Borough VII');
  assert.equal(ward63.wardName, 'Ward 63');
});

test('resolves locality and road information to the correct ward context', async () => {
  const catalog = await loadWardCatalog();
  const context = resolveWardContext({ locality: 'Park Street', road: 'Theatre Road' }, catalog);

  assert.equal(context.wardNumber, 63);
  assert.equal(context.borough, 'Borough VII');
  assert.equal(context.locality, 'Park Street');
  assert.equal(context.importantRoad, 'Theatre Road');
});

test('all seeded complaints resolve to a ward from the uploaded catalog', async () => {
  const catalog = await loadWardCatalog();
  const resolved = issueFixtures.map((issue) => buildWardAwareIssue(issue, catalog));
  const unresolved = resolved.filter((issue) => !issue.wardNumber || !issue.borough);

  assert.deepEqual(unresolved, [], `expected all seeded complaints to resolve, received ${unresolved.map((issue) => issue.id).join(', ')}`);
});
