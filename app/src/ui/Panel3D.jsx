import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useApp } from '../store.js'

/*
 * Panel de interfaz en 3D (de Smart Plant 3D).  Un plano con una textura dibujada en Canvas 2D a
 * partir de una lista de widgets.  Los toques (rayo del mando o mira del PC) llegan con coordenada
 * UV y se resuelven contra los rectángulos de los widgets.  Un solo draw call por panel, sin DOM.
 * El lienzo se redibuja SOLO cuando cambian los widgets o el resaltado (lección: 2,6 MB por subida).
 *
 * Widgets:
 *   { type:'title', text, sub }
 *   { type:'text', text, small, color, big }
 *   { type:'buttons', items:[{ id, label, active, color, disabled, sub }], cols, h, font }
 *   { type:'toggle', id, label, value }
 *   { type:'kv', rows:[{ k, v, u, color }] }
 *   { type:'progress', value:0…1, label, color }
 *   { type:'list', items:[{ text, color, mark }] }     filas con marca (✔ ✖ •)
 *   { type:'banner', text, color }                     franja de color con texto grande
 *   { type:'divider' } · { type:'gap', h }
 *
 * En el PC (modo primera persona) los paneles se pulsan con la mira: FirstPerson llama a
 * pressPanelAt(); los eventos de puntero del ratón se ignoran para no duplicar el toque.
 */

const PX = 640
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'
export const C = { bg: 'rgba(10,16,28,0.94)', line: 'rgba(120,170,255,0.35)', ink: '#eef3fb', mute: '#9fb0c8', accent: '#3a7bff', accent2: '#ff7a3d', ok: '#27ae60', warn: '#f39c12', bad: '#e74c3c', card: 'rgba(255,255,255,0.07)', hover: 'rgba(255,255,255,0.16)' }

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
export function wrap(ctx, text, maxW) {
  const out = []
  for (const para of String(text).split('\n')) {
    const words = para.split(' '); let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w } else cur = t }
    out.push(cur)
  }
  return out
}

function layout(ctx, widgets, hover, measureOnly = false) {
  const hits = []
  let y = 26
  const pad = 28, w = PX - pad * 2
  for (const wd of widgets) {
    if (!wd) continue
    switch (wd.type) {
      case 'title': {
        ctx.font = `800 32px ${FONT}`
        const lines = wrap(ctx, wd.text, w)
        if (!measureOnly) {
          ctx.fillStyle = wd.color || C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
          lines.forEach((l, i) => ctx.fillText(l, pad, y + 30 + i * 36))
        }
        y += lines.length * 36 + 14
        if (wd.sub) {
          ctx.font = `500 20px ${FONT}`
          const sl = wrap(ctx, wd.sub, w)
          if (!measureOnly) { ctx.fillStyle = C.mute; sl.forEach((l, i) => ctx.fillText(l, pad, y + 8 + i * 25)) }
          y += sl.length * 25 + 8
        }
        break
      }
      case 'text': {
        const size = wd.big ? 28 : wd.small ? 20 : 23, lh = Math.round(size * 1.28)
        ctx.font = `${wd.big ? 700 : wd.small ? 400 : 500} ${size}px ${FONT}`
        const lines = wrap(ctx, wd.text, w)
        if (!measureOnly) { ctx.fillStyle = wd.color || (wd.small ? C.mute : C.ink); ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, pad, y + size - 2 + i * lh)) }
        y += lines.length * lh + 10
        break
      }
      case 'banner': {
        ctx.font = `800 28px ${FONT}`
        const lines = wrap(ctx, wd.text, w - 36), h = lines.length * 34 + 26
        if (!measureOnly) {
          ctx.fillStyle = wd.color || C.accent; roundRect(ctx, pad, y, w, h, 14); ctx.fill()
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
          lines.forEach((l, i) => ctx.fillText(l, PX / 2, y + 40 + i * 34))
          ctx.textAlign = 'left'
        }
        y += h + 14
        break
      }
      case 'buttons': {
        const cols = wd.cols || Math.min(3, wd.items.length), gap = 12, bw = (w - gap * (cols - 1)) / cols, bh = wd.h || 60
        wd.items.forEach((it, i) => {
          const r = Math.floor(i / cols), c = i % cols
          const x = pad + c * (bw + gap), yy = y + r * (bh + gap)
          if (!it.disabled) hits.push({ x, y: yy, w: bw, h: bh, id: it.id, kind: 'button' })
          if (!measureOnly) {
            const isHover = hover && hover.id === it.id
            ctx.fillStyle = it.disabled ? 'rgba(255,255,255,0.03)' : it.active ? (it.color || C.accent) : isHover ? C.hover : (it.bg || C.card)
            roundRect(ctx, x, yy, bw, bh, 14); ctx.fill()
            if (it.active || isHover) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke() }
            ctx.fillStyle = it.disabled ? '#6a7890' : '#fff'; ctx.font = `600 ${wd.font || 22}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            if (it.sub) {
              ctx.fillText(it.label, x + bw / 2, yy + bh / 2 - 12)
              ctx.fillStyle = it.disabled ? '#56637a' : '#c4d0e2'; ctx.font = `400 ${Math.round((wd.font || 22) * 0.78)}px ${FONT}`
              ctx.fillText(it.sub, x + bw / 2, yy + bh / 2 + 15)
            } else ctx.fillText(it.label, x + bw / 2, yy + bh / 2 + 1)
            ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
          }
        })
        y += Math.ceil(wd.items.length / cols) * (bh + gap) - gap + 14
        break
      }
      case 'toggle': {
        const h = 54
        hits.push({ x: pad, y, w, h, id: wd.id, kind: 'toggle' })
        if (!measureOnly) {
          ctx.fillStyle = hover && hover.id === wd.id ? C.hover : C.card; roundRect(ctx, pad, y, w, h, 12); ctx.fill()
          ctx.fillStyle = C.ink; ctx.font = `500 23px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(wd.label, pad + 18, y + h / 2 + 1)
          const sw = 64, sh = 32, sx = pad + w - sw - 16, sy = y + (h - sh) / 2
          ctx.fillStyle = wd.value ? C.ok : '#3a4556'; roundRect(ctx, sx, sy, sw, sh, 16); ctx.fill()
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wd.value ? sx + sw - 16 : sx + 16, sy + sh / 2, 12, 0, Math.PI * 2); ctx.fill()
          ctx.textBaseline = 'alphabetic'
        }
        y += h + 10
        break
      }
      case 'kv': {
        const rh = 36
        if (!measureOnly) {
          wd.rows.forEach((r, i) => {
            const yy = y + i * rh
            if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; roundRect(ctx, pad, yy, w, rh, 8); ctx.fill() }
            ctx.fillStyle = C.mute; ctx.font = `500 21px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(r.k, pad + 14, yy + rh / 2 + 1)
            ctx.fillStyle = r.color || C.ink; ctx.font = `700 23px ${FONT}`; ctx.textAlign = 'right'
            ctx.fillText(r.u ? `${r.v} ${r.u}` : String(r.v), pad + w - 14, yy + rh / 2 + 1)
            ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
          })
        }
        y += wd.rows.length * rh + 12
        break
      }
      case 'list': {
        ctx.font = `500 21px ${FONT}`
        for (const it of wd.items) {
          const lines = wrap(ctx, it.text, w - 40)
          if (!measureOnly) {
            ctx.fillStyle = it.color || C.ink; ctx.font = `700 22px ${FONT}`; ctx.fillText(it.mark || '•', pad + 4, y + 22)
            ctx.font = `500 21px ${FONT}`; ctx.fillStyle = it.textColor || C.ink
            lines.forEach((l, i) => ctx.fillText(l, pad + 36, y + 22 + i * 27))
          }
          y += lines.length * 27 + 8
        }
        y += 6
        break
      }
      case 'progress': {
        if (!measureOnly) {
          ctx.fillStyle = C.mute; ctx.font = `500 20px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(wd.label || '', pad, y + 18)
          ctx.fillStyle = '#2a3548'; roundRect(ctx, pad, y + 28, w, 10, 5); ctx.fill()
          ctx.fillStyle = wd.color || C.accent2; roundRect(ctx, pad, y + 28, Math.max(6, w * Math.min(1, wd.value)), 10, 5); ctx.fill()
        }
        y += 48
        break
      }
      case 'divider': { if (!measureOnly) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, y + 8); ctx.lineTo(pad + w, y + 8); ctx.stroke() } y += 20; break }
      case 'gap': y += wd.h || 12; break
      default: break
    }
  }
  return { height: y + 16, hits }
}

/* paneles visibles, para pulsarlos con la mira en el PC */
const PANELS = new Set()
const _hits = []
/** pulsa el panel que cruza el rayo del raycaster (ya puesto); true si tocó alguno */
export function pressPanelAt(raycaster) {
  const list = [...PANELS].filter((m) => { for (let p = m; p; p = p.parent) if (!p.visible) return false; return true })
  if (!list.length) return false
  _hits.length = 0
  raycaster.intersectObjects(list, false, _hits)
  const h = _hits[0]
  if (!h || !h.uv) return false
  h.object.userData.press(h.uv)
  return true
}

export default function Panel3D({ ref, widgets, width = 0.42, onAction, position, rotation, children, ...rest }) {
  const [hover, setHover] = useState(null)
  const hitsRef = useRef([])
  const meshRef = useRef()
  const canvas = useMemo(() => Object.assign(document.createElement('canvas'), { width: PX, height: 1024 }), [])
  const texture = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }, [canvas])
  const [height, setHeight] = useState(1024)
  const CH = canvas.height
  const drawn = useRef('')
  useEffect(() => () => texture.dispose(), [texture])

  /* El lienzo nunca cambia de tamaño (three asigna la textura con almacenamiento inmutable): se dibuja
     en la franja superior y la textura muestra solo esa franja con repeat/offset. */
  useEffect(() => {
    /* solo se redibuja (y se sube a la GPU) si el contenido cambió de verdad */
    const key = JSON.stringify(widgets) + '|' + (hover?.id ?? '')
    if (key === drawn.current) return
    drawn.current = key
    const ctx = canvas.getContext('2d')
    const { height: h } = layout(ctx, widgets, hover, true)
    const H = Math.min(CH, Math.max(120, Math.ceil(h / 8) * 8))
    ctx.clearRect(0, 0, PX, CH)
    ctx.fillStyle = C.bg; roundRect(ctx, 0, 0, PX, H, 30); ctx.fill()
    ctx.strokeStyle = C.line; ctx.lineWidth = 3; roundRect(ctx, 1.5, 1.5, PX - 3, H - 3, 29); ctx.stroke()
    const { hits } = layout(ctx, widgets, hover, false)
    hitsRef.current = hits
    texture.repeat.set(1, H / CH)
    texture.offset.set(0, 1 - H / CH)
    setHeight(H)
    texture.needsUpdate = true
  }, [widgets, hover, canvas, texture, CH])

  const hitAt = (uv) => {
    if (!uv) return null
    const p = { x: uv.x * PX, y: (1 - uv.y) * height }
    return hitsRef.current.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
  }
  /* toque por UV (mira del PC) */
  const press = (uv) => { const r = hitAt(uv); if (r) onAction?.(r.id, r.kind) }
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.userData.press = press
    PANELS.add(m)
    return () => PANELS.delete(m)
  })

  const fp = () => useApp.getState().view === 'fp'
  const onPointerDown = (e) => { if (fp()) return; e.stopPropagation(); const r = hitAt(e.uv); if (r) onAction?.(r.id, r.kind) }
  const onPointerMove = (e) => { if (fp()) return; const id = hitAt(e.uv)?.id ?? null; if ((hover?.id ?? null) !== id) setHover(id ? { id } : null) }
  const onPointerOut = () => { if (hover) setHover(null) }

  const h = width * (height / PX)
  return (
    <group ref={ref} position={position} rotation={rotation} {...rest}>
      <mesh position={[0, 0, -0.004]} raycast={() => null}>
        <boxGeometry args={[width + 0.012, h + 0.012, 0.006]} />
        <meshStandardMaterial color="#0b1220" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh ref={meshRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      {children}
    </group>
  )
}
