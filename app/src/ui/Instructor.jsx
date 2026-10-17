import { useEffect, useMemo, useState } from 'react'
import { useApp, MODES } from '../store.js'
import * as R from '../records/records.js'
import { parseTraineesCSV, resultsToCSV, buildExport, mergeImport, exportName } from '../records/exchange.js'
import { certificateHTML, canCertify } from '../records/certificate.js'
import { SCENARIOS, SCENARIO_INDEX } from '../scenarios/index.js'
import { APP_VERSION } from './XrOverlays.jsx'

/*
 * Panel del instructor (docs/07): página 2D (PC o navegador del visor), fuera de WebXR.
 *   Aprendices   importar CSV (cedula,nombre,empresa,cargo), agregar, eliminar datos de una persona
 *   Resultados   tabla filtrable, detalle con pasos y errores, certificado imprimible
 *   Datos        exportar JSON (con trazas) y CSV, importar JSON de otras gafas
 * Todo queda en este dispositivo (IndexedDB); nada se envía a servidores.
 */
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) }
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.round((s || 0) % 60)).padStart(2, '0')}`

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export default function Instructor() {
  const [tab, setTab] = useState('resultados')
  const [trainees, setTrainees] = useState([])
  const [attempts, setAttempts] = useState([])
  const [msg, setMsg] = useState(null)
  const [cert, setCert] = useState(null)
  const reload = async () => { setTrainees(await R.listTrainees()); setAttempts(await R.listAttempts()) }
  useEffect(() => { reload() }, [])
  const flash = (text, kind = 'ok') => { setMsg({ text, kind }); setTimeout(() => setMsg(null), 5000) }

  const showCert = (a) => {
    const html = certificateHTML(a, SCENARIO_INDEX[a.scenarioId], { logoUrl: new URL(import.meta.env.BASE_URL + 'icons/logo-voltac-claro.png', location.href).href, appVersion: APP_VERSION })
    setCert({ html, id: a.id })
  }

  return (
    <div className="instr">
      <header className="instr-head">
        <div><span className="brand">HSEQ GATE</span> <span className="sub">Panel del instructor · v{APP_VERSION}</span></div>
        <button className="btn ghost" onClick={() => useApp.getState().setScreen('portada')}>← Volver</button>
      </header>
      <p className="habeas">Datos personales tratados conforme a la Ley 1581 de 2012 (habeas data): se usan solo para registrar el entrenamiento, quedan guardados en este dispositivo y nada se envía a servidores. Cualquier persona puede pedir que se eliminen sus datos (pestaña Aprendices).</p>
      <nav className="instr-tabs">
        {[['resultados', `Resultados (${attempts.length})`], ['aprendices', `Aprendices (${trainees.length})`], ['datos', 'Exportar / importar']].map(([id, label]) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {msg && <div className={'msg ' + msg.kind}>{msg.text}</div>}
      {tab === 'resultados' && <Results attempts={attempts} onCert={showCert} onDelete={async (id) => { await R.deleteAttempt(id); reload() }} />}
      {tab === 'aprendices' && <Trainees trainees={trainees} attempts={attempts} reload={reload} flash={flash} />}
      {tab === 'datos' && <Data trainees={trainees} attempts={attempts} reload={reload} flash={flash} />}
      {cert && (
        <div className="cert-overlay">
          <div className="cert-bar">
            <span>Certificado {cert.id}</span>
            <span>
              <button className="btn" onClick={() => document.getElementById('cert-frame')?.contentWindow?.print()}>Imprimir / Guardar PDF</button>
              <button className="btn ghost" onClick={() => download(`hseqgate-certificado-${cert.id}.html`, cert.html, 'text/html')}>Descargar HTML</button>
              <button className="btn ghost" onClick={() => setCert(null)}>Cerrar</button>
            </span>
          </div>
          <iframe id="cert-frame" title="Certificado" srcDoc={cert.html} />
        </div>
      )}
    </div>
  )
}

function Results({ attempts, onCert, onDelete }) {
  const [q, setQ] = useState(''), [sc, setSc] = useState(''), [mode, setMode] = useState(''), [onlyPassed, setOnlyPassed] = useState(false)
  const [sel, setSel] = useState(null)
  const list = useMemo(() => attempts.filter((a) =>
    (!q || `${a.trainee?.cedula} ${a.trainee?.nombre} ${a.trainee?.empresa}`.toLowerCase().includes(q.toLowerCase())) &&
    (!sc || a.scenarioId === sc) && (!mode || a.mode === mode) && (!onlyPassed || a.passed)), [attempts, q, sc, mode, onlyPassed])
  const cur = attempts.find((a) => a.id === sel)
  return (
    <section>
      <div className="filters">
        <input placeholder="Buscar por cédula, nombre o empresa" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sc} onChange={(e) => setSc(e.target.value)}><option value="">Todos los escenarios</option>{SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Todos los modos</option>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label><input type="checkbox" checked={onlyPassed} onChange={(e) => setOnlyPassed(e.target.checked)} /> Solo aprobados</label>
      </div>
      {!list.length ? <p className="empty">No hay intentos registrados con esos filtros.</p> : (
        <table className="grid">
          <thead><tr><th>Fecha</th><th>Aprendiz</th><th>Escenario</th><th>Modo</th><th>Puntaje</th><th>Resultado</th><th>Tiempo</th></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id} className={sel === a.id ? 'sel' : ''} onClick={() => setSel(a.id)}>
              <td>{fmtDate(a.startedAt)}</td><td>{a.trainee?.nombre || '(invitado)'}<small>{a.trainee?.cedula}</small></td>
              <td>{a.scenarioTitle || a.scenarioId}</td><td>{MODES[a.mode]}</td><td className="num">{a.score}</td>
              <td>{a.mode !== 'evaluacion' ? <span className="tag">Entrenamiento</span> : a.passed ? <span className="tag ok">Aprobado</span> : <span className="tag bad">No aprobado</span>}</td>
              <td className="num">{mmss(a.durationSec)}</td>
            </tr>))}</tbody>
        </table>
      )}
      {cur && (
        <div className="detail">
          <h3>{cur.scenarioTitle} · {MODES[cur.mode]} · {cur.score}/100</h3>
          <p>{cur.trainee?.nombre} · C.C. {cur.trainee?.cedula} {cur.trainee?.empresa && `· ${cur.trainee.empresa}`} · {fmtDate(cur.startedAt)} · {cur.device} · semilla {cur.seed} · código <code>{cur.id}</code></p>
          <div className="cols">
            <div><h4>Errores ({cur.errors.length})</h4>{cur.errors.length ? <ul>{cur.errors.map((e, i) => <li key={i} className={'sev-' + e.severity}><b>{e.severity}</b> · {e.message} <small>({Math.round(e.at)} s)</small></li>)}</ul> : <p className="empty">Sin errores.</p>}</div>
            <div><h4>Pasos completados ({cur.steps.length})</h4><ul>{cur.steps.map((s) => <li key={s.id}>{SCENARIO_INDEX[cur.scenarioId]?.phases.flatMap((p) => p.steps).find((x) => x.id === s.id)?.title || s.id} <small>({Math.round(s.doneAt)} s{s.hinted ? ', con pista' : ''})</small></li>)}</ul></div>
          </div>
          <div className="actions">
            {canCertify(cur) ? <button className="btn" onClick={() => onCert(cur)}>Ver certificado</button> : <span className="hint">El certificado se emite solo para intentos aprobados en modo evaluación.</span>}
            <button className="btn ghost danger" onClick={() => { if (confirm('¿Eliminar este intento?')) { onDelete(cur.id); setSel(null) } }}>Eliminar intento</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Trainees({ trainees, attempts, reload, flash }) {
  const [f, setF] = useState({ cedula: '', nombre: '', empresa: '', cargo: '' })
  const [csv, setCsv] = useState('')
  const count = (c) => attempts.filter((a) => a.trainee?.cedula === c).length
  const add = async (e) => {
    e.preventDefault()
    if (!R.normCedula(f.cedula) || !f.nombre.trim()) { flash('Cédula y nombre son obligatorios.', 'bad'); return }
    await R.saveTrainee(f); setF({ cedula: '', nombre: '', empresa: '', cargo: '' }); await reload(); flash('Aprendiz guardado.')
  }
  const importCsv = async (text) => {
    const { trainees: list, errors } = parseTraineesCSV(text)
    for (const t of list) await R.saveTrainee(t)
    await reload(); setCsv('')
    flash(`${list.length} aprendices importados.${errors.length ? ' Revisar: ' + errors.join(' · ') : ''}`, errors.length ? 'warn' : 'ok')
  }
  return (
    <section>
      <div className="cols">
        <form className="card" onSubmit={add}>
          <h4>Agregar aprendiz</h4>
          <input name="cedula" placeholder="Cédula" value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value })} />
          <input name="nombre" placeholder="Nombre completo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          <input name="empresa" placeholder="Empresa" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
          <input name="cargo" placeholder="Cargo" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} />
          <button className="btn" type="submit">Guardar</button>
        </form>
        <div className="card">
          <h4>Importar listado CSV</h4>
          <p className="hint">Columnas: <code>cedula,nombre,empresa,cargo</code> (encabezado opcional; coma o punto y coma).</p>
          <input type="file" accept=".csv,text/csv" onChange={async (e) => { const file = e.target.files?.[0]; if (file) importCsv(await file.text()); e.target.value = '' }} />
          <textarea placeholder="…o pega aquí el contenido del CSV" value={csv} onChange={(e) => setCsv(e.target.value)} rows={4} />
          <button className="btn" disabled={!csv.trim()} onClick={() => importCsv(csv)}>Importar texto</button>
        </div>
      </div>
      {!trainees.length ? <p className="empty">No hay aprendices registrados. Quien entre con una cédula fuera del listado queda como invitado.</p> : (
        <table className="grid">
          <thead><tr><th>Cédula</th><th>Nombre</th><th>Empresa</th><th>Cargo</th><th>Intentos</th><th></th></tr></thead>
          <tbody>{trainees.map((t) => (
            <tr key={t.cedula}><td>{t.cedula}</td><td>{t.nombre}</td><td>{t.empresa}</td><td>{t.cargo}</td><td className="num">{count(t.cedula)}</td>
              <td><button className="btn ghost danger small" onClick={async () => { if (confirm(`¿Eliminar TODOS los datos de ${t.nombre} (aprendiz e intentos)? No se puede deshacer.`)) { await R.deletePerson(t.cedula); await reload(); flash('Datos eliminados.') } }}>Eliminar datos</button></td></tr>))}</tbody>
        </table>
      )}
    </section>
  )
}

function Data({ trainees, attempts, reload, flash }) {
  return (
    <section className="cols">
      <div className="card">
        <h4>Exportar</h4>
        <p className="hint">JSON completo (aprendices + intentos con su traza, reproducible) o CSV de resultados para Excel.</p>
        <button className="btn" onClick={() => download(exportName('json'), JSON.stringify(buildExport({ trainees, attempts, appVersion: APP_VERSION }), null, 1), 'application/json')}>Exportar JSON</button>
        <button className="btn ghost" onClick={() => download(exportName('csv'), resultsToCSV(attempts), 'text/csv')}>Exportar resultados CSV</button>
        <p className="hint">En las gafas el archivo queda en Descargas; desde el PC: <code>quest.ps1 -PullResults</code>.</p>
      </div>
      <div className="card">
        <h4>Importar JSON</h4>
        <p className="hint">Junta en este equipo los intentos exportados desde otras gafas (no se duplican).</p>
        <input type="file" accept=".json,application/json" onChange={async (e) => {
          const file = e.target.files?.[0]; e.target.value = ''
          if (!file) return
          try {
            const m = mergeImport(JSON.parse(await file.text()), { trainees, attempts })
            for (const t of m.trainees) await R.saveTrainee(t)
            for (const a of m.attempts) await R.saveAttempt(a)
            await reload(); flash('Importado: ' + m.summary)
          } catch (err) { flash('No se pudo importar: ' + err.message, 'bad') }
        }} />
      </div>
    </section>
  )
}
