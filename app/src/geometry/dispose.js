import { useEffect } from 'react'

/*
 * Liberación de recursos de la GPU.  React no libera las primitivas (<primitive object>): lo que
 * se construye con el colector debe liberarse al desmontarse o al reemplazarse por otra versión.
 * Los materiales compartidos del registro (nombres fam: / sp: / so:) nunca se liberan.
 */
export function disposeTree(root) {
  if (!root) return
  root.traverse((o) => {
    if (o.geometry && !o.userData.keepGeometry) o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) if (!/^(fam|sp|so):/.test(m.name || '')) { m.map?.dispose(); m.dispose() }
  })
}

/** libera `obj` cuando cambia (useMemo nuevo) o cuando el componente se desmonta */
export function useDisposable(obj) {
  useEffect(() => () => disposeTree(obj), [obj])
  return obj
}
