import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WARD_SOURCE_PATH = path.resolve(__dirname, '../../ward.md');

function normalizeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function parseWardHint(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/ward\s*(\d+)/i);
  if (match) return Number(match[1]);
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseWardEntries(markdown) {
  const entries = [];
  const boroughBlocks = markdown.split(/^## /m).filter(Boolean);

  boroughBlocks.forEach((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const headingMatch = lines[0]?.match(/^Borough\s+(.+?)(?:\s*\(.*\))?$/);
    const boroughName = headingMatch ? `Borough ${headingMatch[1].trim()}` : (lines[0] || 'Unknown Borough');

    lines.slice(1).forEach((line) => {
      const match = line.match(/^\*\s+Ward\s+(\d+):\s*(.+)$/);
      if (!match) return;

      const wardNumber = Number(match[1]);
      const remainder = match[2];
      const localityParts = remainder
        .split(',')
        .map((value) => normalizeText(value))
        .filter(Boolean);
      const [primaryLocality] = localityParts;
      const importantRoad = localityParts.find((value) => /Road|Street|Lane|Avenue|Square|Park|Place|Boundary|Bustee|Ghat|Para|Colony|Pally|Sarani|Gate|Row|Crossing/i.test(value)) || '';

      entries.push({
        wardNumber,
        wardName: `Ward ${wardNumber}`,
        borough: boroughName,
        locality: primaryLocality || '',
        importantRoad,
        localityCandidates: localityParts,
      });
    });
  });

  return entries;
}

export async function loadWardCatalog() {
  const markdown = await fs.readFile(WARD_SOURCE_PATH, 'utf8');
  return parseWardEntries(markdown);
}

export async function getWardCatalog() {
  return loadWardCatalog();
}

export function resolveWardContext(location = {}, catalog = []) {
  const locality = normalizeText(location.locality || location.address || '');
  const road = normalizeText(location.road || location.importantRoad || '');
  const query = `${locality} ${road}`.trim().toLowerCase();
  const explicitWardNumber = parseWardHint(location.ward || location.wardNumber || location.wardName || location.wardLabel);

  if (explicitWardNumber) {
    const explicitMatch = catalog.find((entry) => entry.wardNumber === explicitWardNumber);
    if (explicitMatch) {
      return {
        wardNumber: explicitMatch.wardNumber,
        wardName: explicitMatch.wardName,
        borough: explicitMatch.borough,
        locality,
        importantRoad: road,
        matched: true,
      };
    }
  }

  if (!catalog.length) {
    return {
      wardNumber: null,
      borough: null,
      locality,
      importantRoad: road,
      wardName: null,
      matched: false,
    };
  }

  const exactMatch = catalog.find((entry) => {
    const candidates = [entry.locality, ...(entry.localityCandidates || [])]
      .map((value) => normalizeText(value).toLowerCase());
    return candidates.some((candidate) => query.includes(candidate) || candidate.includes(query));
  });

  if (exactMatch) {
    return {
      wardNumber: exactMatch.wardNumber,
      wardName: exactMatch.wardName,
      borough: exactMatch.borough,
      locality: locality || exactMatch.locality,
      importantRoad: road || exactMatch.importantRoad,
      matched: true,
    };
  }

  const fallback = catalog.find((entry) => {
    const candidates = [entry.locality, ...(entry.localityCandidates || [])]
      .map((value) => normalizeText(value).toLowerCase());
    return candidates.some((candidate) => candidate.includes(locality.toLowerCase()) || locality.toLowerCase().includes(candidate));
  });

  if (fallback) {
    return {
      wardNumber: fallback.wardNumber,
      wardName: fallback.wardName,
      borough: fallback.borough,
      locality: locality || fallback.locality,
      importantRoad: road || fallback.importantRoad,
      matched: true,
    };
  }

  return {
    wardNumber: null,
    borough: null,
    locality,
    importantRoad: road,
    wardName: null,
    matched: false,
  };
}

export function buildWardAwareIssue(issue = {}, catalog = []) {
  const resolved = resolveWardContext(issue.location || issue, catalog);
  return {
    ...issue,
    location: {
      ...(issue.location || {}),
      wardNumber: resolved.wardNumber,
      ward: resolved.wardName ? `${resolved.wardName} • ${resolved.borough}` : issue.location?.ward || issue.ward,
      borough: resolved.borough,
      locality: resolved.locality || issue.location?.locality || issue.locality,
      importantRoad: resolved.importantRoad || issue.location?.importantRoad || issue.importantRoad,
      lat: issue.location?.lat ?? issue.lat,
      lng: issue.location?.lng ?? issue.lng,
      address: issue.location?.address || issue.address,
    },
    wardNumber: resolved.wardNumber,
    borough: resolved.borough,
    locality: resolved.locality || issue.location?.locality || issue.locality,
    importantRoad: resolved.importantRoad || issue.location?.importantRoad || issue.importantRoad,
  };
}
