import * as THREE from 'three'

/*
 * Señalética y rótulos con textura de lienzo, dibujados UNA vez al construir el entorno
 * (nunca por cuadro).  Colores según la convención de seguridad: rojo prohibición/peligro,
 * amarillo advertencia, azul obligación, verde información/salvamento.
 */
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'
const KIND = {
  peligro: { bg: '#ffffff', band: '#c62828', ink: '#111', bandInk: '#fff', title: 'PELIGRO' },
  advertencia: { bg: '#f7c600', band: '#111111', ink: '#111', bandInk: '#f7c600', title: 'ADVERTENCIA' },
  obligacion: { bg: '#1e5aa8', band: '#ffffff', ink: '#fff', bandInk: '#1e5aa8', title: 'OBLIGATORIO' },
  info: { bg: '#1f7a46', band: '#ffffff', ink: '#fff', bandInk: '#1f7a46', title: '' },
  rotulo: { bg: '#f2f2f2', band: '#222222', ink: '#111', bandInk: '#fff', title: '' },
  oscuro: { bg: '#0b1220', band: '#3a7bff', ink: '#eef3fb', bandInk: '#fff', title: '' },
}

function lines(ctx, text, maxW) {
  const out = []
  for (const p of String(text).split('\n')) {
    let cur = ''
    for (const w of p.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w } else cur = t }
    out.push(cur)
  }
  return out
}

/** lienzo con un letrero; w×h en metros determinan la proporción */
export function signTexture(text, { kind = 'rotulo', title, w = 0.6, h = 0.4, px = 512, size } = {}) {
  const K = KIND[kind] || KIND.rotulo
  const W = px, H = Math.round(px * h / w)
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const ctx = c.getContext('2d')
  ctx.fillStyle = K.bg; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = K.band; ctx.lineWidth = Math.max(6, W * 0.02); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth)
  let y0 = 0
  const tt = title ?? K.title
  if (tt) {
    const bh = H * 0.28
    ctx.fillStyle = K.band; ctx.fillRect(0, 0, W, bh)
    ctx.fillStyle = K.bandInk; ctx.font = `900 ${Math.round(bh * 0.62)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(tt, W / 2, bh / 2 + 2)
    y0 = bh
  }
  const fs = size || Math.round(tt ? Math.min(H * 0.2, W * 0.09) : Math.min(H * 0.34, W * 0.1))
  ctx.font = `800 ${fs}px ${FONT}`
  const L = lines(ctx, text, W * 0.88)
  ctx.fillStyle = K.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const cy = y0 + (H - y0) / 2, lh = fs * 1.15
  L.forEach((l, i) => ctx.fillText(l, W / 2, cy - ((L.length - 1) * lh) / 2 + i * lh))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}

/** malla de letrero estática (plano), mirando hacia +Z local */
export function signMesh(text, opts = {}) {
  const { w = 0.6, h = 0.4, pos = [0, 1.6, 0], rotY = 0 } = opts
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, opts), toneMapped: false }))
  m.position.set(pos[0], pos[1], pos[2]); m.rotation.y = rotY
  m.updateMatrix(); m.matrixAutoUpdate = false
  m.raycast = () => null
  m.name = 'sign'
  return m
}

/**
 * Varios letreros en UNA sola malla (atlas): una llamada de dibujo para toda la señalética del
 * entorno.  items: [{ text, kind, title, w, h, pos, rotY }]
 */
export function signAtlas(items, px = 384) {
  const cols = Math.ceil(Math.sqrt(items.length)), rows = Math.ceil(items.length / cols)
  const cw = px, ch = px
  const canvas = Object.assign(document.createElement('canvas'), { width: cols * cw, height: rows * ch })
  const ctx = canvas.getContext('2d')
  const geos = []
  items.forEach((it, i) => {
    const tex = signTexture(it.text, { ...it, px: cw })
    const img = tex.image
    const c = i % cols, r = Math.floor(i / cols)
    const hh = Math.min(ch, img.height)
    ctx.drawImage(img, 0, 0, img.width, img.height, c * cw, r * ch, cw, hh)
    tex.dispose()
    const g = new THREE.PlaneGeometry(it.w ?? 0.6, it.h ?? 0.4)
    const uv = g.attributes.uv
    const u0 = c / cols, u1 = (c + 1) / cols, v1 = 1 - r / rows, v0 = 1 - (r + hh / ch) / rows
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0)
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...(it.pos || [0, 1.6, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.rotY || 0, 0)), new THREE.Vector3(1, 1, 1))
    g.applyMatrix4(m)
    geos.push(g.toNonIndexed())
  })
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const geo = geos.length === 1 ? geos[0] : mergeAll(geos)
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }))
  mesh.matrixAutoUpdate = false; mesh.raycast = () => null; mesh.name = 'signs'
  return mesh
}
function mergeAll(geos) {
  let n = 0
  for (const g of geos) n += g.attributes.position.count
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3)
  let o = 0
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); uv.set(g.attributes.uv.array, o * 2); nor.set(g.attributes.normal.array, o * 3)
    o += g.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.computeBoundingSphere()
  return out
}
