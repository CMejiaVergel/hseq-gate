/*
 * PRNG con semilla (mulberry32).  Todo lo aleatorio de un escenario (qué arnés trae el defecto,
 * el orden del CCM…) sale de aquí: con la misma semilla y las mismas acciones, el mismo intento.
 */
export function createRng(seed = 1) {
  let a = (seed >>> 0) || 1
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    /** entero en [0, n) */
    int: (n) => Math.floor(next() * n),
    /** elemento al azar */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** verdadero con probabilidad p */
    chance: (p) => next() < p,
    /** copia barajada (Fisher–Yates) */
    shuffle: (arr) => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b },
  }
}

/** semilla nueva para un intento (no determinista: la que se GUARDA es la que permite reproducirlo) */
export const newSeed = () => (Math.floor(Math.random() * 2 ** 31) >>> 0) || 1
