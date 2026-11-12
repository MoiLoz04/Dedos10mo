// Práctica 11 · Pasos 4-6: pruebas de endpoints, BD, rendimiento y carga contra TU proyecto Supabase.
// Usa SOLO un usuario ficticio de pruebas. Requiere Node 18+ (fetch nativo).
//
//   $env:TEST_EMAIL = "usuario_de_pruebas@ejemplo.com"
//   $env:TEST_PASSWORD = Read-Host "Escribe la contraseña de pruebas"
//   $env:CONEXION = "Wi-Fi casa 5 GHz"        # tipo de conexión, para el reporte
//   node p11_mediciones.mjs
//
// Estadísticas de un ping ya guardado (sin login):
//   ping -n 20 psgyneqlcxzecujbfrdh.supabase.co | Tee-Object ping.txt
//   node p11_mediciones.mjs --ping ping.txt
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SUPABASE_URL ?? 'https://psgyneqlcxzecujbfrdh.supabase.co';
// Clave PÚBLICA (publishable), la misma que ya está en la app.
const KEY = process.env.SUPABASE_KEY ?? 'sb_publishable_ksDm1BMx4kkFbbx-0cAMEA_QKVaK97s';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const N = Number(process.env.N_CARGA ?? 20);
const OUT = path.dirname(fileURLToPath(import.meta.url));

// ---------- utilidades ----------
const sum = (a) => a.reduce((x, y) => x + y, 0);
function stats(a) {
  if (!a.length) return { n: 0, avg: 0, min: 0, max: 0, sd: 0, p95: 0 };
  const s = [...a].sort((x, y) => x - y);
  const n = a.length;
  const avg = sum(a) / n;
  const sd = n > 1 ? Math.sqrt(sum(a.map((v) => (v - avg) ** 2)) / (n - 1)) : 0;
  return { n, avg, min: s[0], max: s[n - 1], sd, p95: s[Math.ceil(0.95 * n) - 1] };
}
const f1 = (v) => Number(v).toFixed(1);
const f2 = (v) => Number(v).toFixed(2);

// ---------- modo ping ----------
const iPing = process.argv.indexOf('--ping');
if (iPing > -1) {
  const txt = fs.readFileSync(process.argv[iPing + 1], 'utf8');
  const vals = [...txt.matchAll(/(?:tiempo|time)\s*[=<]\s*(\d+)\s*ms/gi)].map((m) => Number(m[1]));
  const env = txt.match(/(?:enviados|sent)\s*=\s*(\d+)/i);
  const perd = txt.match(/(?:perdidos|lost)\s*=\s*(\d+)/i);
  if (!vals.length) {
    console.log('Sin respuestas ICMP: el servidor puede bloquear ping. Registra la limitación y usa solo mediciones HTTP.');
  } else {
    const s = stats(vals);
    const enviados = env ? Number(env[1]) : vals.length;
    const perdidos = perd ? Number(perd[1]) : enviados - vals.length;
    console.log(`Respuestas: ${vals.length}/${enviados}`);
    console.log(`Ping mínimo ${f1(s.min)} ms | promedio ${f1(s.avg)} ms | máximo ${f1(s.max)} ms | desv. estándar ${f2(s.sd)} ms`);
    console.log(`Pérdida de paquetes: ${f1((100 * perdidos) / enviados)} % (${perdidos}/${enviados})`);
  }
  process.exit(0);
}

if (!EMAIL || !PASSWORD) {
  console.error('Define TEST_EMAIL y TEST_PASSWORD (ver instrucciones al inicio del archivo).');
  process.exit(1);
}

// ---------- cliente HTTP con medición ----------
async function call(method, p, { token, body, headers = {}, noKey = false } = {}) {
  const t0 = performance.now();
  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  try {
    const res = await fetch(BASE + p, {
      method,
      headers: {
        ...(noKey ? {} : { apikey: KEY }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: payload,
      signal: AbortSignal.timeout(20000),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString('utf8');
    let json = null;
    try { json = JSON.parse(text); } catch { /* respuesta vacía o no JSON */ }
    return { status: res.status, ms: performance.now() - t0, bytes: buf.length, sent: payload ? Buffer.byteLength(payload) : 0, json };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, bytes: 0, sent: 0, json: null, error: String(e) };
  }
}

const casos = [];
function caso(id, desc, esperado, r, nota = '') {
  const lista = Array.isArray(esperado) ? esperado : [esperado];
  casos.push({
    id, desc,
    esperado: lista.join('/'),
    observado: r.status,
    resultado: lista.includes(r.status) ? 'COINCIDE' : 'DIFIERE',
    ms: Math.round(r.ms),
    bytes: r.bytes,
    forma: r.status >= 400 && r.json ? Object.keys(r.json).sort().join(',') : '',
    codigo: r.status >= 400 && r.json ? (r.json.code ?? r.json.error_code ?? '') : '',
    nota,
  });
  return r;
}

const meta = {
  fecha: new Date().toISOString(),
  equipo: os.hostname(),
  so: `${os.platform()} ${os.release()}`,
  node: process.version,
  servidor: new URL(BASE).host,
  conexion: process.env.CONEXION ?? '(no indicada)',
};

// ---------- login ----------
const auth = await call('POST', '/auth/v1/token?grant_type=password', { body: { email: EMAIL, password: PASSWORD } });
if (auth.status !== 200 || !auth.json?.access_token) {
  console.error(`Login falló (HTTP ${auth.status}). Revisa TEST_EMAIL/TEST_PASSWORD.`);
  process.exit(1);
}
const TOKEN = auth.json.access_token;
const UID = auth.json.user.id;
caso('WEB-01-login', 'Login correcto (POST /auth/v1/token)', 200, auth);
caso('WEB-02-login', 'Login con contraseña incorrecta', 400,
  await call('POST', '/auth/v1/token?grant_type=password', { body: { email: EMAIL, password: randomUUID() } }));

const REP = { Prefer: 'return=representation' };
const creadasQuotes = [];
let rolOriginal = null;
let telOriginal;
let tengoTel = false;

try {
  // ======================= WEB-01: respuestas exitosas =======================
  const urlQuotes = `/rest/v1/quotes?select=*&user_id=eq.${UID}&order=created_at.desc`;
  caso('WEB-01a', 'GET quotes propias (token válido)', 200, await call('GET', urlQuotes, { token: TOKEN }));
  caso('WEB-01b', 'GET products (catálogo)', 200, await call('GET', '/rest/v1/products?select=id,nombre,precio&limit=5', { token: TOKEN }));

  const rq = caso('WEB-01c', 'POST quotes (crear borrador)', 201,
    await call('POST', '/rest/v1/quotes', { token: TOKEN, headers: REP, body: { user_id: UID, status: 'borrador', enviado_desde: 'web' } }));
  const QID = rq.json?.[0]?.id;
  if (QID) creadasQuotes.push(QID);

  let ITEM;
  if (QID) {
    const ri = caso('DB-01a', 'INSERT quote_items válido', 201,
      await call('POST', '/rest/v1/quote_items', { token: TOKEN, headers: REP, body: { quote_id: QID, nombre_producto: 'P11 prueba', cantidad: 2 } }));
    ITEM = ri.json?.[0]?.id;
  }

  // ======================= WEB-02: errores HTTP =======================
  caso('WEB-02a', 'GET sin apikey', 401, await call('GET', urlQuotes, { noKey: true }));
  caso('WEB-02b', 'GET con JWT inválido', 401, await call('GET', urlQuotes, { token: 'abc.def.ghi' }));
  caso('WEB-02c', 'GET quotes con id que no es UUID', 400, await call('GET', '/rest/v1/quotes?id=eq.no-es-uuid', { token: TOKEN }));
  caso('WEB-02d', 'GET single (objeto) de id inexistente', 406,
    await call('GET', `/rest/v1/quotes?id=eq.${randomUUID()}`, { token: TOKEN, headers: { Accept: 'application/vnd.pgrst.object+json' } }),
    'PostgREST usa 406 (PGRST116) y no 404 cuando .single() no encuentra filas');
  caso('WEB-02e', 'GET tabla inexistente', 404, await call('GET', '/rest/v1/tabla_que_no_existe', { token: TOKEN }));
  caso('WEB-02f', 'POST quote_items hacia cotización ajena/inexistente (RLS)', 403,
    await call('POST', '/rest/v1/quote_items', { token: TOKEN, body: { quote_id: randomUUID(), nombre_producto: 'x', cantidad: 1 } }));
  caso('WEB-02g', 'POST quotes con user_id de otra persona (RLS)', [401, 403],
    await call('POST', '/rest/v1/quotes', { token: TOKEN, body: { user_id: randomUUID(), status: 'borrador', enviado_desde: 'web' } }));
  const tokQr = randomUUID();
  const futuro = new Date(Date.now() + 120000).toISOString();
  caso('WEB-02h', 'POST qr_sessions (token nuevo)', 201,
    await call('POST', '/rest/v1/qr_sessions', { token: TOKEN, body: { token: tokQr, user_id: UID, expires_at: futuro } }));
  caso('WEB-02i', 'POST qr_sessions con token duplicado (UNIQUE)', 409,
    await call('POST', '/rest/v1/qr_sessions', { token: TOKEN, body: { token: tokQr, user_id: UID, expires_at: futuro } }));
  caso('WEB-02j', 'Códigos 422 y 500: PostgREST no los emite en estas operaciones', [422, 500], { status: 0, ms: 0, bytes: 0, json: null },
    'Justificado: PostgREST no los emite aquí; alternativa = validar con RPC/Edge Function');
  Object.assign(casos[casos.length - 1], { resultado: 'NO EJECUTADO', observado: '-' });

  // ======================= WEB-03 / DB-02: validación e integridad =======================
  if (QID) {
    caso('DB-02a', 'INSERT quote_items con cantidad = 0 (CHECK)', 400,
      await call('POST', '/rest/v1/quote_items', { token: TOKEN, body: { quote_id: QID, nombre_producto: 'x', cantidad: 0 } }));
    caso('DB-02b', 'INSERT quote_items sin nombre_producto (NOT NULL)', 400,
      await call('POST', '/rest/v1/quote_items', { token: TOKEN, body: { quote_id: QID, cantidad: 1 } }));
    caso('DB-02c', "PATCH quotes con status inválido 'x' (CHECK)", 400,
      await call('PATCH', `/rest/v1/quotes?id=eq.${QID}`, { token: TOKEN, body: { status: 'x' } }));
  }

  // ======================= DB-03 / DB-04 / DB-05: consulta, actualización, eliminación =======================
  if (QID && ITEM) {
    const g = caso('DB-03a', 'SELECT quote_items por id existente', 200,
      await call('GET', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN }));
    casos[casos.length - 1].nota = `filas: ${g.json?.length ?? '?'} (esperado 1)`;
    const g2 = caso('DB-03b', 'SELECT quote_items por id inexistente', 200,
      await call('GET', `/rest/v1/quote_items?id=eq.${randomUUID()}`, { token: TOKEN }));
    casos[casos.length - 1].nota = `filas: ${g2.json?.length ?? '?'} (esperado 0: 200 con lista vacía, no 404)`;
    caso('DB-04a', 'PATCH quote_items cantidad=5', 200,
      await call('PATCH', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN, headers: REP, body: { cantidad: 5 } }));
    const v = await call('GET', `/rest/v1/quote_items?id=eq.${ITEM}&select=cantidad`, { token: TOKEN });
    caso('DB-04b', 'Releer tras actualizar (persistencia)', 200, v, `cantidad leída: ${v.json?.[0]?.cantidad} (esperado 5)`);

    // DB-06 concurrencia: dos PATCH simultáneos al mismo registro
    const [c1, c2] = await Promise.all([
      call('PATCH', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN, headers: REP, body: { cantidad: 11 } }),
      call('PATCH', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN, headers: REP, body: { cantidad: 22 } }),
    ]);
    const fin = await call('GET', `/rest/v1/quote_items?id=eq.${ITEM}&select=cantidad`, { token: TOKEN });
    caso('DB-06a', 'Dos PATCH simultáneos al mismo item', 200, c1);
    casos[casos.length - 1].nota = `HTTP ${c1.status} y ${c2.status}; valor final = ${fin.json?.[0]?.cantidad} (gana la última escritura, sin control de versión)`;

    // DB-06 concurrencia: reclamar un QR dos veces a la vez (compare-and-set atómico)
    const ahora = new Date().toISOString();
    const [q1, q2] = await Promise.all([
      call('PATCH', `/rest/v1/qr_sessions?token=eq.${tokQr}&used_at=is.null`, { token: TOKEN, headers: REP, body: { used_at: ahora } }),
      call('PATCH', `/rest/v1/qr_sessions?token=eq.${tokQr}&used_at=is.null`, { token: TOKEN, headers: REP, body: { used_at: ahora } }),
    ]);
    const ganadores = [q1, q2].filter((x) => x.json?.length === 1).length;
    caso('DB-06b', 'Dos reclamos simultáneos del mismo QR: debe ganar exactamente 1', 200, q1);
    casos[casos.length - 1].resultado = ganadores === 1 ? 'COINCIDE' : 'DIFIERE';
    casos[casos.length - 1].nota = `ganadores = ${ganadores} (esperado 1)`;

    caso('DB-05a', 'DELETE quote_items', 204, await call('DELETE', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN }));
    const gd = caso('DB-05b', 'Releer tras eliminar', 200, await call('GET', `/rest/v1/quote_items?id=eq.${ITEM}`, { token: TOKEN }));
    casos[casos.length - 1].nota = `filas: ${gd.json?.length ?? '?'} (esperado 0)`;
  }

  // ======================= WEB-03: ¿el backend valida reglas de negocio? (D-06) =======================
  const r2 = await call('POST', '/rest/v1/quotes', { token: TOKEN, headers: REP, body: { user_id: UID, status: 'borrador', enviado_desde: 'web' } });
  const Q2 = r2.json?.[0]?.id;
  if (Q2) {
    creadasQuotes.push(Q2);
    caso('WEB-03a', 'Backend permite ENVIAR una cotización SIN productos (D-06)', [400, 403, 409, 422],
      await call('PATCH', `/rest/v1/quotes?id=eq.${Q2}`, { token: TOKEN, headers: REP, body: { status: 'enviada' } }),
      'Si observas 200: la regla solo existe en el frontend');
  }
  const r3 = await call('POST', '/rest/v1/quotes', { token: TOKEN, headers: REP, body: { user_id: UID, status: 'borrador', enviado_desde: 'web' } });
  const Q3 = r3.json?.[0]?.id;
  if (Q3) {
    creadasQuotes.push(Q3);
    const i3 = await call('POST', '/rest/v1/quote_items', { token: TOKEN, headers: REP, body: { quote_id: Q3, nombre_producto: 'P11 enviada', cantidad: 1 } });
    await call('PATCH', `/rest/v1/quotes?id=eq.${Q3}`, { token: TOKEN, body: { status: 'enviada' } });
    caso('WEB-03b', 'Backend permite EDITAR items de una cotización ya enviada (D-06)', [400, 403, 409, 422],
      await call('PATCH', `/rest/v1/quote_items?id=eq.${i3.json?.[0]?.id}`, { token: TOKEN, headers: REP, body: { cantidad: 99 } }),
      'Si observas 200: no hay candado por estado');
  }
  // teléfono sin validar (hallazgo menor)
  const perfil = await call('GET', `/rest/v1/profiles?id=eq.${UID}&select=telefono,role`, { token: TOKEN });
  if (perfil.json?.length === 1) {
    tengoTel = true;
    telOriginal = perfil.json[0].telefono ?? null;
    rolOriginal = perfil.json[0].role;
    caso('WEB-03c', "Backend acepta teléfono 'no-es-telefono'", [400, 422],
      await call('PATCH', `/rest/v1/profiles?id=eq.${UID}`, { token: TOKEN, headers: REP, body: { telefono: 'no-es-telefono' } }),
      'Si observas 200: sin validación de formato');
  }

  // ======================= WEB-04: autenticación y autorización =======================
  caso('WEB-04a', 'Anónimo (solo apikey) consulta quotes: RLS devuelve lista vacía', 200,
    await call('GET', '/rest/v1/quotes?select=id'));
  const ap = await call('GET', '/rest/v1/profiles?select=id,role', { token: TOKEN });
  caso('WEB-04b', 'GET profiles sin filtro: solo debe verse el propio', 200, ap,
    `filas: ${ap.json?.length ?? '?'} (esperado 1)`);
  const at = await call('GET', '/rest/v1/support_tickets?select=id,user_id', { token: TOKEN });
  const ajenos = (at.json ?? []).filter((t) => t.user_id !== UID).length;
  caso('WEB-04c', 'GET support_tickets: no deben aparecer tickets ajenos (rol usuario)', 200, at,
    `filas: ${at.json?.length ?? '?'}; ajenos: ${ajenos} (esperado 0)`);

  // D-01: escalada de privilegios. Se intenta y se REVIERTE siempre.
  if (tengoTel && rolOriginal !== 'admin') {
    const esc = await call('PATCH', `/rest/v1/profiles?id=eq.${UID}`, { token: TOKEN, headers: REP, body: { role: 'admin' } });
    const subio = esc.status === 200 && esc.json?.[0]?.role === 'admin';
    caso('WEB-04d', 'Usuario intenta cambiarse role a admin (D-01)', [400, 401, 403], esc,
      subio ? 'VULNERABLE: el rol cambió a admin' : 'protegido');
    casos[casos.length - 1].resultado = subio ? 'DIFIERE (VULNERABLE)' : 'COINCIDE';
  }
} finally {
  // ---------- restauración y limpieza ----------
  if (tengoTel) {
    await call('PATCH', `/rest/v1/profiles?id=eq.${UID}`, { token: TOKEN, body: { role: rolOriginal, telefono: telOriginal } });
  }
  for (const q of creadasQuotes) {
    await call('DELETE', `/rest/v1/quote_items?quote_id=eq.${q}`, { token: TOKEN });
    await call('DELETE', `/rest/v1/quotes?id=eq.${q}`, { token: TOKEN });
  }
}

// ======================= NET-02 / WEB-05: 10 solicitudes consecutivas =======================
const urlLect = `/rest/v1/quotes?select=*&user_id=eq.${UID}&order=created_at.desc`;
const diez = [];
for (let i = 1; i <= 10; i++) diez.push(await call('GET', urlLect, { token: TOKEN }));
const sDiez = stats(diez.map((r) => r.ms));

// ======================= NET-03: descarga (3 mediciones) =======================
const desc = [];
for (let i = 1; i <= 3; i++) {
  const r = await call('GET', '/rest/v1/products?select=*', { token: TOKEN });
  desc.push({ i, status: r.status, bytes: r.bytes, s: r.ms / 1000, mbps: (r.bytes * 8) / ((r.ms / 1000) * 1e6) });
}

// ======================= NET-04: subida (3 mediciones, ~200 KB) =======================
const subida = [];
const relleno = 'x'.repeat(200000);
for (let i = 1; i <= 3; i++) {
  const r = await call('POST', '/rest/v1/transfer_tests', {
    token: TOKEN,
    body: { client_request_id: randomUUID(), payload: { origen: 'p11-subida', relleno }, checksum: 'p11' },
  });
  subida.push({ i, status: r.status, bytes: r.sent, s: r.ms / 1000, mbps: (r.sent * 8) / ((r.ms / 1000) * 1e6) });
}

// ======================= NET-07: carga controlada =======================
const creadasCarga = [];
async function escenario(nombre, conc, total, fn) {
  const lat = []; const codes = {}; let ok = 0; let fail = 0; let bytes = 0; let idx = 0;
  const cpu0 = process.cpuUsage(); const t0 = performance.now();
  async function worker() {
    for (;;) {
      const i = idx++;
      if (i >= total) return;
      const r = await fn(i);
      lat.push(r.ms); bytes += r.bytes + r.sent;
      codes[r.status] = (codes[r.status] || 0) + 1;
      if (r.status >= 200 && r.status < 300) ok++; else fail++;
    }
  }
  await Promise.all(Array.from({ length: conc }, () => worker()));
  const wall = (performance.now() - t0) / 1000;
  const cpu = process.cpuUsage(cpu0);
  const s = stats(lat);
  return { nombre, conc, total, ok, fail, codes, ...s, wall, rps: total / wall, mbps: (bytes * 8) / (wall * 1e6), cpuCliente: ((cpu.user + cpu.system) / 1e6 / wall) * 100 };
}
const carga = [];
for (const conc of [1, 5, 10]) {
  carga.push(await escenario('LECTURA GET quotes', conc, N, () => call('GET', urlLect, { token: TOKEN })));
}
for (const conc of [1, 5, 10]) {
  carga.push(await escenario('ESCRITURA POST quotes', conc, N, async (i) => {
    const r = await call('POST', '/rest/v1/quotes', { token: TOKEN, headers: REP, body: { user_id: UID, status: 'borrador', enviado_desde: 'web' } });
    if (r.json?.[0]?.id) creadasCarga.push(r.json[0].id);
    return r;
  }));
}
for (let i = 0; i < creadasCarga.length; i += 20) {
  const lote = creadasCarga.slice(i, i + 20).join(',');
  await call('DELETE', `/rest/v1/quotes?id=in.(${lote})`, { token: TOKEN });
}

// ======================= reporte =======================
const formas = [...new Set(casos.filter((c) => c.forma).map((c) => c.forma))];
const sinEjecutar = casos.filter((c) => c.id === 'WEB-02j');
const md = [];
md.push('# Mediciones Práctica 11 (generado automáticamente)');
md.push(`Fecha: ${meta.fecha} | Equipo: ${meta.equipo} | SO: ${meta.so} | Node ${meta.node} | Servidor: ${meta.servidor} | Conexión: ${meta.conexion}\n`);
md.push('## Casos de endpoint / BD\n| ID | Descripción | Esperado | Observado | Resultado | ms | bytes | código error | Nota |\n|---|---|---|---|---|---|---|---|---|');
for (const c of casos) md.push(`| ${c.id} | ${c.desc} | ${c.esperado} | ${c.observado} | ${c.resultado} | ${c.ms} | ${c.bytes} | ${c.codigo} | ${c.nota} |`);
md.push(`\nFormas distintas de cuerpo de error observadas (WEB-06): ${formas.length ? formas.join(' || ') : '(ninguna)'}`);
md.push('\n## Tabla B: 10 solicitudes consecutivas a GET quotes\n| # | HTTP | ms | bytes |\n|---|---|---|---|');
diez.forEach((r, i) => md.push(`| ${i + 1} | ${r.status} | ${f1(r.ms)} | ${r.bytes} |`));
md.push(`\nPromedio ${f1(sDiez.avg)} ms | mínimo ${f1(sDiez.min)} ms | máximo ${f1(sDiez.max)} ms | desv. est. ${f1(sDiez.sd)} ms | P95 ${f1(sDiez.p95)} ms (la 1.ª incluye conexión TLS)`);
md.push('\n## Descarga (GET products?select=*)\n| # | HTTP | bytes | s | Mbps |\n|---|---|---|---|---|');
desc.forEach((d) => md.push(`| ${d.i} | ${d.status} | ${d.bytes} | ${f2(d.s)} | ${f2(d.mbps)} |`));
md.push('\n## Subida (POST transfer_tests, ~200 KB)\n| # | HTTP | bytes enviados | s | Mbps |\n|---|---|---|---|---|');
subida.forEach((d) => md.push(`| ${d.i} | ${d.status} | ${d.bytes} | ${f2(d.s)} | ${f2(d.mbps)} |`));
md.push(`\n## Carga controlada (${N} solicitudes por escenario)\n| Escenario | Usuarios | OK | Fallos | Códigos | Prom ms | P95 ms | Máx ms | req/s | Mbps | CPU cliente % |\n|---|---|---|---|---|---|---|---|---|---|---|`);
for (const c of carga) md.push(`| ${c.nombre} | ${c.conc} | ${c.ok} | ${c.fail} | ${JSON.stringify(c.codes)} | ${f1(c.avg)} | ${f1(c.p95)} | ${f1(c.max)} | ${f2(c.rps)} | ${f2(c.mbps)} | ${f1(c.cpuCliente)} |`);
md.push('\nCPU/memoria del servidor: revisar en Supabase > Reports > Database durante la ejecución (el CPU de la tabla es del equipo cliente).');
fs.writeFileSync(path.join(OUT, 'mediciones.md'), md.join('\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'mediciones.json'), JSON.stringify({ meta, casos, diez: diez.map((r) => ({ status: r.status, ms: r.ms, bytes: r.bytes })), sDiez, desc, subida, carga, sinEjecutar }, null, 2), 'utf8');

console.log(md.join('\n'));
console.log(`\nGuardado en ${path.join(OUT, 'mediciones.md')} y mediciones.json`);
