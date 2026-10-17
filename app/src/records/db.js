/*
 * Persistencia local (docs/07): IndexedDB con un envoltorio mínimo propio, sin dependencias.
 * Stores: `trainees` (clave cédula) y `attempts` (clave id).  Todo queda en el dispositivo
 * (funciona sin conexión); para juntar datos de varias gafas → exportar/importar JSON.
 *
 * Si IndexedDB no existe (pruebas en Node) o falla (navegación privada), se usa un almacén en
 * memoria con la misma interfaz.
 */
const DB_NAME = 'hseqgate', DB_VERSION = 1

export function memoryAdapter() {
  const S = { trainees: new Map(), attempts: new Map() }
  return {
    kind: 'memory',
    async all(store) { return [...S[store].values()].map((v) => structuredClone(v)) },
    async get(store, key) { const v = S[store].get(key); return v ? structuredClone(v) : null },
    async put(store, value) { const key = store === 'trainees' ? value.cedula : value.id; S[store].set(key, structuredClone(value)); return key },
    async del(store, key) { S[store].delete(key) },
    async clear(store) { S[store].clear() },
  }
}

export function indexedDbAdapter() {
  let dbp = null
  const open = () => dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('trainees')) db.createObjectStore('trainees', { keyPath: 'cedula' })
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id' })
        s.createIndex('cedula', 'trainee.cedula')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const tx = async (store, mode, fn) => {
    const db = await open()
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode)
      const r = fn(t.objectStore(store))
      t.oncomplete = () => resolve(r?.result)
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
    })
  }
  return {
    kind: 'indexeddb',
    all: (store) => tx(store, 'readonly', (s) => s.getAll()),
    get: async (store, key) => (await tx(store, 'readonly', (s) => s.get(key))) ?? null,
    put: (store, value) => tx(store, 'readwrite', (s) => s.put(value)),
    del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
    clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  }
}

let adapter = null
export function getAdapter() {
  if (!adapter) adapter = typeof indexedDB !== 'undefined' ? indexedDbAdapter() : memoryAdapter()
  return adapter
}
export function setAdapter(a) { adapter = a }
