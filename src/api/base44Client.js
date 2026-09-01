// Local, backend-free replacement for the Base44 client.
//
// The app was built against the Base44 SDK surface (`base44.entities.X`,
// `base44.integrations.Core.UploadFile`, `base44.auth.*`). To publish the app as
// a static site (GitHub Pages) with no backend, this module re-implements that
// exact surface on top of the browser's IndexedDB. All data and uploaded images
// (stored as data URLs) live in the visitor's browser — there is no server, no
// sync between devices, and no login.

const DB_NAME = "nettrack";
const DB_VERSION = 1;
const STORES = [
  "InstallationPoint",
  "Technician",
  "ChecklistTemplate",
  "ProjectInfo",
  "Floor",
  "Space",
  "User",
  "LabelTemplate",
];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqP(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

async function getAll(store) {
  const db = await openDb();
  return reqP(db.transaction(store, "readonly").objectStore(store).getAll());
}

async function getOne(store, id) {
  const db = await openDb();
  return reqP(db.transaction(store, "readonly").objectStore(store).get(id));
}

async function putOne(store, record) {
  const db = await openDb();
  const t = db.transaction(store, "readwrite");
  t.objectStore(store).put(record);
  await txDone(t);
  return record;
}

async function deleteOne(store, id) {
  const db = await openDb();
  const t = db.transaction(store, "readwrite");
  t.objectStore(store).delete(id);
  await txDone(t);
}

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Mimics Base44's "field" / "-field" ordering strings.
function sortRecords(records, order) {
  if (!order) return records;
  const desc = order.startsWith("-");
  const field = desc ? order.slice(1) : order;
  return [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    const cmp = av < bv ? -1 : 1;
    return desc ? -cmp : cmp;
  });
}

function matches(record, query) {
  return Object.entries(query || {}).every(([k, v]) => record[k] === v);
}

function makeEntity(store) {
  return {
    async list(order, limit) {
      const rows = sortRecords(await getAll(store), order);
      return typeof limit === "number" ? rows.slice(0, limit) : rows;
    },
    async filter(query = {}, order, limit) {
      const rows = sortRecords((await getAll(store)).filter((r) => matches(r, query)), order);
      return typeof limit === "number" ? rows.slice(0, limit) : rows;
    },
    get(id) {
      return getOne(store, id);
    },
    create(data) {
      const now = new Date().toISOString();
      const record = { ...data, id: genId(), created_date: now, updated_date: now };
      return putOne(store, record);
    },
    async update(id, data) {
      const existing = (await getOne(store, id)) || { id };
      const record = { ...existing, ...data, id, updated_date: new Date().toISOString() };
      return putOne(store, record);
    },
    delete(id) {
      return deleteOne(store, id);
    },
    async deleteMany(query = {}) {
      const hits = (await getAll(store)).filter((r) => matches(r, query));
      for (const h of hits) await deleteOne(store, h.id);
      return { deleted: hits.length };
    },
  };
}

const entities = Object.fromEntries(STORES.map((s) => [s, makeEntity(s)]));

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Uploaded files become data URLs stored inline on the records that reference
// them, so images survive with no file server.
const integrations = {
  Core: {
    async UploadFile({ file }) {
      return { file_url: await fileToDataUrl(file) };
    },
  },
};

// No accounts in the static build: a single implicit local user.
const LOCAL_USER = { id: "local", full_name: "Usuario local", email: "" };
const auth = {
  me: async () => LOCAL_USER,
  isAuthenticated: () => true,
  logout: () => {},
  redirectToLogin: () => {},
};

export const base44 = { entities, integrations, auth };
