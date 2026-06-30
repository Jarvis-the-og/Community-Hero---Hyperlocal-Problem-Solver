import { issueFixtures } from '../server/scripts/seedProductionDemoData.js';
import { buildWardAwareIssue, getWardCatalog } from '../server/services/wardCatalog.js';

const catalog = await getWardCatalog();
const normalized = issueFixtures.map((issue) => buildWardAwareIssue(issue, catalog));

const valid = normalized.filter((issue) => issue.wardNumber && issue.borough);
const missing = normalized.filter((issue) => !issue.wardNumber || !issue.borough);

const invalidBoroughAssignments = normalized.filter((issue) => {
  if (!issue.borough) return false;
  return !String(issue.borough).toLowerCase().includes('borough');
});

const localityMap = new Map();
for (const issue of normalized) {
  const locality = String(issue.location?.locality || issue.locality || '').trim().toLowerCase();
  if (!locality) continue;
  const current = localityMap.get(locality) || [];
  current.push({
    id: issue.id,
    wardNumber: issue.wardNumber,
    borough: issue.borough,
    ward: issue.ward,
  });
  localityMap.set(locality, current);
}

const duplicateLocalityMappings = Array.from(localityMap.entries())
  .filter(([, entries]) => entries.length > 1)
  .map(([locality, entries]) => ({ locality, entries }));

console.log(JSON.stringify({
  totalComplaintsSeeded: normalized.length,
  complaintsWithValidWardMapping: valid.length,
  complaintsWithMissingWardMapping: missing.length,
  duplicateLocalityMappings,
  invalidBoroughAssignments,
  normalizedIssues: normalized.map((issue) => ({
    id: issue.id,
    wardNumber: issue.wardNumber,
    borough: issue.borough,
    ward: issue.ward,
    locality: issue.location?.locality || issue.locality,
  })),
}, null, 2));
