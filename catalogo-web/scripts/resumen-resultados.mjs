// catalogo-web/scripts/resumen-resultados.mjs
// Lee resultados/resultados.json (reporter JSON de Playwright) y genera:
//  - resultados/resumen.csv  (TC, estado, duración, error)
//  - consola: tabla y conteos para la sección "Evaluación de calidad" del reporte
import fs from "node:fs";

const ruta = "resultados/resultados.json";
if (!fs.existsSync(ruta)) {
  console.error("No existe " + ruta + ". Ejecuta primero: npm run test:e2e");
  process.exit(1);
}
const json = JSON.parse(fs.readFileSync(ruta, "utf-8"));
const filas = [];

function recorrer(suite) {
  for (const spec of suite.specs || []) {
    const resultado = spec.tests?.[0]?.results?.at(-1);
    const estado = spec.tests?.[0]?.status; // expected | unexpected | skipped | flaky
    const mapa = { expected: "Aprobado", unexpected: "Fallido", skipped: "No ejecutado", flaky: "Inestable" };
    const err = (resultado?.error?.message || "").replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0];
    filas.push({
      tc: (spec.title.match(/TC-\d+/) || [""])[0],
      rf: (spec.title.match(/\[(RF-\d+)\]/) || ["", ""])[1],
      titulo: spec.title,
      estado: mapa[estado] || estado,
      ms: resultado?.duration ?? 0,
      error: err,
    });
  }
  for (const s of suite.suites || []) recorrer(s);
}
for (const s of json.suites || []) recorrer(s);
filas.sort((a, b) => a.tc.localeCompare(b.tc));

const csv = ["TC,RF,Estado,Duracion_ms,Error"]
  .concat(filas.map((f) => [f.tc, f.rf, f.estado, f.ms, `"${f.error.replace(/"/g, "'")}"`].join(",")))
  .join("\n");
fs.writeFileSync("resultados/resumen.csv", csv, "utf-8");

console.table(filas.map(({ tc, rf, estado, ms, error }) => ({ tc, rf, estado, ms, error })));
const cuenta = (e) => filas.filter((f) => f.estado === e).length;
const ejecutados = filas.length - cuenta("No ejecutado");
console.log(`Casos automatizados: ${filas.length}`);
console.log(`Aprobados: ${cuenta("Aprobado")} | Fallidos: ${cuenta("Fallido")} | No ejecutados: ${cuenta("No ejecutado")} | Inestables: ${cuenta("Inestable")}`);
console.log(`% aprobación sobre ejecutados: ${ejecutados ? ((cuenta("Aprobado") / ejecutados) * 100).toFixed(1) : 0}%`);
console.log("CSV: resultados/resumen.csv");
