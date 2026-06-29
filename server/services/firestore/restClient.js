import { config } from '../../config/index.js';
import { getIdToken } from '../../utils/requestContext.js';

const projectId = () => config.firebase.projectId;

function baseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

function headers(idToken) {
  const h = { 'Content-Type': 'application/json' };
  if (idToken) h.Authorization = `Bearer ${idToken}`;
  return h;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)])
    );
  }
  return null;
}

function docToObject(doc) {
  if (!doc?.fields) return null;
  const data = Object.fromEntries(
    Object.entries(doc.fields).map(([k, v]) => [k, fromFirestoreValue(v)])
  );
  const id = doc.name?.split('/').pop();
  return { id, ...data };
}

export function isRestClientAvailable() {
  return Boolean(projectId() && getIdToken());
}

export async function restGetCollection(collection, filters = {}) {
  const idToken = getIdToken();
  if (!idToken) throw new Error('Authentication required for Firestore');

  const res = await fetch(`${baseUrl()}/${collection}`, { headers: headers(idToken) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore read failed: ${res.status}`);
  }

  const data = await res.json();
  let items = (data.documents || []).map(docToObject).filter(Boolean);

  if (filters.status) items = items.filter((i) => i.status === filters.status);
  if (filters.category) items = items.filter((i) => i.category === filters.category);
  if (filters.priority) items = items.filter((i) => i.priority === filters.priority);
  if (filters.reporterId) items = items.filter((i) => i.reporterId === filters.reporterId);

  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function restGetDoc(collection, id) {
  const idToken = getIdToken();
  if (!idToken) throw new Error('Authentication required for Firestore');

  const res = await fetch(`${baseUrl()}/${collection}/${id}`, { headers: headers(idToken) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore read failed: ${res.status}`);
  }

  return docToObject(await res.json());
}

export async function restAddDoc(collection, data, documentId = null) {
  const idToken = getIdToken();
  if (!idToken) throw new Error('Authentication required for Firestore');

  const url = documentId
    ? `${baseUrl()}/${collection}?documentId=${encodeURIComponent(documentId)}`
    : `${baseUrl()}/${collection}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(idToken),
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])
      ),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore create failed: ${res.status}`);
  }

  const doc = await res.json();
  return docToObject(doc);
}

export async function restUpdateDoc(collection, id, data) {
  const idToken = getIdToken();
  if (!idToken) throw new Error('Authentication required for Firestore');

  const fieldPaths = Object.keys(data);
  const updateMask = fieldPaths.map((p) => `updateMask.fieldPaths=${p}`).join('&');

  const res = await fetch(`${baseUrl()}/${collection}/${id}?${updateMask}`, {
    method: 'PATCH',
    headers: headers(idToken),
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])
      ),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore update failed: ${res.status}`);
  }

  return docToObject(await res.json());
}

export async function restQueryCollection(collection, field, op, value) {
  const idToken = getIdToken();
  if (!idToken) throw new Error('Authentication required for Firestore');

  const res = await fetch(`${baseUrl()}:runQuery`, {
    method: 'POST',
    headers: headers(idToken),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op,
            value: toFirestoreValue(value),
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Firestore query failed: ${res.status}`);
  }

  const results = await res.json();
  return results
    .filter((r) => r.document)
    .map((r) => docToObject(r.document))
    .filter(Boolean);
}
