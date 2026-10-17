/*
 * Certificado de entrenamiento (docs/07): página HTML imprimible / «Guardar como PDF» del
 * navegador.  Logo de Voltac, nombre, cédula, escenario, normas de referencia, fecha, puntaje,
 * código de verificación (id del intento) y aviso de que es una constancia de entrenamiento en
 * simulador.  Solo para intentos APROBADOS en modo evaluación.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fecha = (iso) => { const d = new Date(iso); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` }
const cedulaFmt = (c) => String(c || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function canCertify(attempt) { return !!attempt && attempt.mode === 'evaluacion' && attempt.passed === true }

export function certificateHTML(attempt, scenario, { logoUrl = '', appVersion = '' } = {}) {
  if (!canCertify(attempt)) throw new Error('Solo los intentos aprobados en modo evaluación tienen certificado')
  const t = attempt.trainee || {}
  const norms = (scenario?.norms || []).map(esc).join(' · ')
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Certificado ${esc(attempt.id)} · HSEQ Gate</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Roboto, system-ui, sans-serif; color: #0b1220; background: #fff; }
  .cert { width: 100%; min-height: 180mm; border: 3px solid #0b1220; padding: 14mm 18mm; position: relative; }
  .cert::before { content: ''; position: absolute; inset: 4mm; border: 1px solid #3a7bff; pointer-events: none; }
  header { display: flex; justify-content: space-between; align-items: center; }
  header img { height: 20mm; }
  .brand { text-align: right; font-size: 11pt; color: #44506a; }
  .brand b { display: block; font-size: 16pt; color: #0b1220; letter-spacing: .08em; }
  h1 { margin: 12mm 0 2mm; font-size: 26pt; letter-spacing: .04em; text-align: center; }
  .sub { text-align: center; color: #44506a; margin: 0 0 9mm; }
  .name { text-align: center; font-size: 24pt; font-weight: 800; margin: 2mm 0; }
  .ced { text-align: center; color: #44506a; margin-bottom: 8mm; }
  .txt { text-align: center; font-size: 13pt; line-height: 1.5; max-width: 220mm; margin: 0 auto; }
  .scen { font-weight: 800; }
  table { margin: 9mm auto 0; border-collapse: collapse; font-size: 11pt; }
  td { padding: 2mm 6mm; border-bottom: 1px solid #dfe5ef; }
  td:first-child { color: #44506a; }
  footer { margin-top: 10mm; font-size: 9pt; color: #5a6680; text-align: center; line-height: 1.5; }
  .code { font-family: Consolas, monospace; font-size: 11pt; color: #0b1220; }
  .noprint { margin: 12px; text-align: center; }
  .noprint button { font: inherit; font-weight: 700; padding: 10px 18px; border: 0; border-radius: 8px; background: #3a7bff; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } }
</style></head>
<body>
<div class="noprint"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<div class="cert">
  <header>${logoUrl ? `<img src="${esc(logoUrl)}" alt="Voltac Systems">` : '<span></span>'}<div class="brand"><b>HSEQ GATE</b>Entrenamiento HSEQ en realidad virtual</div></header>
  <h1>CONSTANCIA DE ENTRENAMIENTO</h1>
  <p class="sub">en simulador de realidad virtual</p>
  <div class="name">${esc(t.nombre || 'Aprendiz')}</div>
  <div class="ced">C.C. ${esc(cedulaFmt(t.cedula))}${t.empresa ? ' · ' + esc(t.empresa) : ''}${t.cargo ? ' · ' + esc(t.cargo) : ''}</div>
  <p class="txt">Completó y aprobó en modo evaluación el escenario<br><span class="scen">${esc(attempt.scenarioTitle || scenario?.title || attempt.scenarioId)}</span></p>
  <table>
    <tr><td>Fecha</td><td>${esc(fecha(attempt.endedAt || attempt.startedAt))}</td></tr>
    <tr><td>Puntaje</td><td><b>${esc(attempt.score)} / 100</b> · sin errores críticos</td></tr>
    <tr><td>Normas de referencia</td><td>${norms || '—'}</td></tr>
    <tr><td>Código de verificación</td><td class="code">${esc(attempt.id)}</td></tr>
  </table>
  <footer>
    Esta constancia certifica la ejecución del procedimiento en un simulador de entrenamiento. No reemplaza la formación práctica,
    la certificación oficial exigida por la normatividad colombiana ni la autorización del empleador para ejecutar la tarea.<br>
    Voltac Systems S.A.S. · Cartagena, Colombia · HSEQ Gate ${esc(appVersion)} · Escenario v${esc(attempt.scenarioVersion)} · Semilla ${esc(attempt.seed)}
  </footer>
</div>
</body></html>`
}
