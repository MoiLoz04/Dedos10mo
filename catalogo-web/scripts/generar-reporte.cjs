const fs=require('fs');
const pathm=require('path');
const EVID=process.argv[2]||'evidencias';
const OUT=process.argv[3]||'Practica8_Reporte_BlackBox_IndustrIA.docx';
function pngSize(buf){return {w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)};}
function archivos(tc,ext){try{return fs.readdirSync(EVID).filter(f=>f.startsWith(tc+'_')&&f.toLowerCase().endsWith(ext)).sort();}catch(e){return [];}}

const {ImageRun,Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,BorderStyle,HeadingLevel,AlignmentType,PageBreak,Footer,PageNumber,LevelFormat,PageOrientation}=require('docx');
const F="Arial";
const PEND="[PENDIENTE — completar tras ejecutar]";
const bd={style:BorderStyle.SINGLE,size:4,color:"999999"};
const borders={top:bd,bottom:bd,left:bd,right:bd};
const W=9360;
const p=(t,o={})=>new Paragraph({spacing:{after:100},alignment:o.align,children:[new TextRun({text:t,font:F,size:o.size||22,bold:o.bold,italics:o.it,color:o.color})]});
const h1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t})]});
const h2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t})]});
const h3=t=>new Paragraph({heading:HeadingLevel.HEADING_3,children:[new TextRun({text:t})]});
const bl=t=>new Paragraph({numbering:{reference:"b",level:0},spacing:{after:60},children:[new TextRun({text:t,font:F,size:22})]});
function cell(t,w,o={}){return new TableCell({width:{size:w,type:WidthType.DXA},borders,margins:{top:60,bottom:60,left:90,right:90},shading:o.fill?{fill:o.fill,type:ShadingType.CLEAR,color:"auto"}:undefined,children:String(t).split("\n").map(l=>new Paragraph({children:[new TextRun({text:l,font:F,size:o.size||18,bold:o.bold,color:o.color})]}))});}
function table(head,rows,widths,size){
  const tw=widths.reduce((a,b)=>a+b,0);
  return new Table({width:{size:tw,type:WidthType.DXA},columnWidths:widths,rows:[
    new TableRow({tableHeader:true,children:head.map((h,i)=>cell(h,widths[i],{fill:"1F3864",bold:true,color:"FFFFFF",size}))}),
    ...rows.map(r=>new TableRow({cantSplit:true,children:r.map((c,i)=>cell(c,widths[i],{size}))}))]});
}
function kv(rows){return new Table({width:{size:W,type:WidthType.DXA},columnWidths:[2300,7060],rows:rows.map(([k,v])=>new TableRow({children:[cell(k,2300,{fill:"D9E2F3",bold:true,size:19}),cell(v,7060,{size:19})]}))});}
function evid(name){return new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({height:{value:3000,rule:"atLeast"},children:[new TableCell({width:{size:W,type:WidthType.DXA},borders:{top:{...bd,style:BorderStyle.DASHED},bottom:{...bd,style:BorderStyle.DASHED},left:{...bd,style:BorderStyle.DASHED},right:{...bd,style:BorderStyle.DASHED}},margins:{top:80,bottom:80,left:100,right:100},children:[new Paragraph({children:[new TextRun({text:"EVIDENCIA: "+name,font:F,size:18,bold:true,color:"C00000"})]}),new Paragraph({children:[new TextRun({text:"Pegar aquí la captura (archivo en catalogo-web/evidencias/ para casos web).",font:F,size:18,italics:true,color:"7F7F7F"})]})]})]})]});}
function imgs(tc){
  const out=[];
  for(const f of archivos(tc,'.png')){
    const buf=fs.readFileSync(pathm.join(EVID,f));const {w,h}=pngSize(buf);
    let tw=600,th=Math.round(h*tw/w); if(th>640){th=640;tw=Math.round(w*th/h);}
    out.push(new Paragraph({keepNext:true,spacing:{before:120,after:40},children:[new TextRun({text:"Evidencia: "+f,font:F,size:18,bold:true})]}));
    out.push(new Paragraph({spacing:{after:140},alignment:AlignmentType.CENTER,children:[new ImageRun({type:'png',data:buf,transformation:{width:tw,height:th},altText:{title:f,description:f,name:f}})]}));
  }
  for(const f of archivos(tc,'.json')){
    const txt=fs.readFileSync(pathm.join(EVID,f),'utf-8').split('\n').slice(0,40);
    out.push(new Paragraph({keepNext:true,spacing:{before:120,after:40},children:[new TextRun({text:"Evidencia: "+f,font:F,size:18,bold:true})]}));
    txt.forEach(l=>out.push(new Paragraph({children:[new TextRun({text:l||' ',font:"Courier New",size:16})]})));
  }
  return out;
}
const sp=()=>new Paragraph({spacing:{after:80},children:[]});

// ---------------- requisitos
const RF=[
["RF-001","Operación principal","Registro de usuario","Con correo válido y contraseña de 6 caracteres, el sistema muestra “Cuenta creada. Redirigiendo a inicio de sesión...” y redirige a /login en ≤ 5 s.","Sí"],
["RF-002","Operación principal","Inicio de sesión","Con credenciales válidas, el usuario llega al catálogo (ruta /) con el encabezado y el botón “Cerrar sesión” visibles en ≤ 5 s.","Sí"],
["RF-003","Operación principal","Agregar productos y ajustar cantidad en la cotización","Al agregar un producto aparece en el panel lateral con cantidad 1; “Aumentar” sube +1 y “Disminuir” baja −1.","Sí"],
["RF-004","Operación principal","Enviar cotización (equivale a crear solicitud)","Con ≥1 producto, al enviar se muestra “Cotización enviada” con folio COT-XXXXX y el historial la lista con estado “enviada”; con carrito vacío se muestra “Agrega al menos un producto antes de enviar la cotización.” y no se crea registro.","Sí"],
["RF-005","Validación","Validación del registro","Contraseña de 5 caracteres y correo con formato inválido son rechazados (no se crea cuenta; se muestra el aviso de validación).","Sí"],
["RF-006","Validación","Validación del inicio de sesión","Contraseña incorrecta, usuario inexistente o campos vacíos muestran “Credenciales inválidas. Verifica tu correo y contraseña.” o el aviso de campo requerido y no se inicia sesión.","Sí"],
["RF-007","Validación","Validación del código QR de vinculación móvil","Un QR vigente se reclama una sola vez con éxito; un QR ya usado, expirado o inexistente es rechazado y se muestra pantalla de QR inválido (app móvil).","Parcial (móvil; requiere ejecución Flutter/manual)"],
["RF-008","Persistencia","Persistencia del borrador de cotización","Tras recargar la página y tras cerrar e iniciar sesión nuevamente, los productos y cantidades del borrador son idénticos (0 diferencias).","Sí"],
["RF-009","Consistencia","Consistencia historial vs. base de datos","La referencia, estado “enviada” y origen “Web” mostrados en el historial coinciden con el registro en Supabase (0 discrepancias).","Sí (web) / Parcial (móvil)"],
["RF-010","Navegación / permisos","Rutas protegidas","Sin sesión, acceder a /, /historial, /quote-form y /vincular-movil redirige a /login (4 de 4 rutas).","Sí"],
["RF-011","Navegación / permisos","Aislamiento de datos entre usuarios","El usuario B no puede leer ni modificar cotizaciones ni ítems del usuario A: 0 filas devueltas/afectadas y su historial no muestra folios de A.","Sí (depende de RLS)"],
["RF-012","Manejo de errores","Búsqueda con Elasticsearch caído","Si el servicio de búsqueda no responde, la app muestra “(búsqueda local — Elasticsearch no respondió)” y sigue mostrando resultados, sin pantalla en blanco.","Sí"],
["RF-013","Operación (adicional)","Eliminar productos de la cotización","El botón “Quitar producto” y la cantidad en 0 (valor límite) eliminan el ítem del panel.","Sí"],
["RF-014","Persistencia (adicional)","Conservación de datos de contacto","Nombre y teléfono capturados al enviar se conservan al reabrir el formulario (posible defecto a verificar).","Sí"],
];
// ---------------- casos
const TC=[
["TC-001","RF-001","Partición de equivalencia / valor límite inferior (6)","Registro con datos válidos","Sin sesión. Correo único practica8+<timestamp>@example.com; contraseña Abc123 (6).","1. Abrir /register. 2. Llenar correo y contraseña. 3. Enviar.","Mensaje “Cuenta creada. Redirigiendo a inicio de sesión...” y redirección a /login.",["TC-001_a_formulario_lleno","TC-001_b_confirmacion","TC-001_c_redireccion_login"]],
["TC-002","RF-002","Positiva / escenario","Login válido","Usuario A existente.","1. Abrir /login. 2. Ingresar credenciales. 3. Pulsar “Entrar”.","Se muestra el catálogo y el botón “Cerrar sesión”.",["TC-002_a_formulario_login","TC-002_b_catalogo"]],
["TC-003","RF-003","Escenario / valores límite","Agregar producto y ajustar cantidad","Usuario A autenticado, borrador vacío.","1. Agregar primer producto. 2. Pulsar “Aumentar cantidad”. 3. Pulsar “Disminuir cantidad”.","Cantidad 1 → 2 → 1 en el panel lateral.",["TC-003_a_producto_agregado","TC-003_b_cantidad_2","TC-003_c_cantidad_1"]],
["TC-004","RF-004","Transición de estado (borrador → enviada)","Enviar cotización","Usuario A con ≥1 producto en el borrador.","1. Ir a “Proceed to Quote Form”. 2. Llenar nombre, teléfono, instrucciones. 3. “Submit Quote Request”. 4. “Ver historial”.","Pantalla “Cotización enviada” con folio COT-XXXXX; historial con la referencia y estado “enviada”.",["TC-004_a_formulario","TC-004_b_confirmacion_folio","TC-004_c_historial_con_folio"]],
["TC-005","RF-004","Negativa / tabla de decisión","Envío con carrito vacío","Usuario A con borrador vacío.","1. Abrir /quote-form. 2. Enviar.","Mensaje “Agrega al menos un producto antes de enviar la cotización.” y sin folio nuevo.",["TC-005_carrito_vacio"]],
["TC-006","RF-005","Valor límite (5 caracteres)","Contraseña de 5 caracteres","Sin sesión.","1. Abrir /register. 2. Correo válido y contraseña Abc12 (5). 3. Enviar.","Rechazo por longitud mínima; no se crea la cuenta.",["TC-006_registro_password_5"]],
["TC-007","RF-005","Partición de equivalencia inválida","Correo con formato inválido","Sin sesión.","1. Abrir /register. 2. Correo sin “@”. 3. Enviar.","Rechazo por formato de correo.",["TC-007_registro_correo_invalido"]],
["TC-008","RF-006","Negativa / tabla de decisión","Credenciales incorrectas","Usuario A existente.","1. Login con contraseña errónea. 2. Login con usuario inexistente.","Ambos muestran “Credenciales inválidas. Verifica tu correo y contraseña.”",["TC-008_a_password_incorrecta","TC-008_b_usuario_inexistente"]],
["TC-009","RF-006","Valor límite (vacío)","Login con campos vacíos","Sin sesión.","1. Abrir /login. 2. Pulsar “Entrar” sin datos.","Aviso de campo requerido; no inicia sesión.",["TC-009_login_vacio"]],
["TC-010","RF-007","Escenario / negativa (móvil)","Validación de QR de vinculación","App móvil, usuario de prueba, QR generado en /vincular-movil.","Ver guía móvil: I1–I4 (reclamo válido, reuso, expirado, inexistente) + captura manual de pantalla de QR inválido.","QR válido se reclama una vez; QR usado/expirado/inexistente es rechazado.",["TC-010_a_resultado_flutter_test","TC-010_b_qr_invalido_app"]],
["TC-011","RF-008","Escenario de persistencia","Borrador persiste","Usuario A con un producto en el borrador.","1. Capturar panel. 2. Recargar (F5). 3. Cerrar sesión e iniciar de nuevo.","Mismos productos y cantidades en las tres capturas.",["TC-011_a_antes_de_recargar","TC-011_b_tras_recargar","TC-011_c_tras_nuevo_login"]],
["TC-012","RF-009","Consistencia UI vs. BD","Historial coincide con BD","Cotización enviada desde web.","1. Abrir /historial. 2. Consultar registro vía API con la sesión del usuario.","Referencia, estado “enviada” y enviado_desde “web” coinciden.",["TC-012_a_historial_web","TC-012_b_registro_en_base_de_datos (JSON)"]],
["TC-013","RF-010","Navegación / permisos","Rutas protegidas sin sesión","Sin sesión.","Abrir /, /historial, /quote-form, /vincular-movil.","Redirección a /login en las 4 rutas.",["TC-013_raiz","TC-013_historial","TC-013_quote-form","TC-013_vincular-movil"]],
["TC-014","RF-011","Permisos / aislamiento","Usuario B vs. datos de A","Usuarios A y B con cotizaciones propias.","1. B consulta/actualiza por API cotizaciones e ítems de A. 2. B abre su historial.","0 filas leídas/afectadas; historial de B sin folios de A.",["TC-014_resultados_api (JSON)","TC-014_historial_de_B"]],
["TC-015","RF-012","Manejo de errores","Elasticsearch caído","Catálogo cargado; petición a /products/_search abortada por la prueba.","1. Buscar una palabra de producto.","Mensaje de respaldo local y resultados visibles.",["TC-015_elasticsearch_caido_respaldo_local"]],
["TC-016","RF-013","Valor límite (cantidad 0)","Eliminar ítem","Usuario A con productos en borrador.","1. “Quitar producto”. 2. Disminuir cantidad hasta 0.","El ítem desaparece en ambos casos.",["TC-016_a_quitado_con_boton","TC-016_b_cantidad_cero_elimina"]],
["TC-017","RF-014","Persistencia / posible defecto","Datos de contacto conservados","Usuario A con producto; nombre y teléfono de prueba.","1. Enviar cotización con nombre y teléfono. 2. Verificar perfil por API. 3. Reabrir formulario.","Nombre y teléfono conservados (si no, registrar defecto).",["TC-017_a_envio","TC-017_b_perfil_en_base_de_datos (JSON)","TC-017_c_formulario_reabierto"]],
["TC-018","RF-009","Consistencia (móvil)","Cotización enviada desde web visible en la app","Cotización enviada en TC-004; sesión de A en la app móvil.","1. Abrir la pestaña de cotizaciones en la app. 2. Comparar folio/estado con la web.","Mismo folio y estado “enviada” en ambas plataformas.",["TC-018_a_app_cotizaciones","TC-018_b_detalle_cotizacion"]],
];
const children=[];
// portada
children.push(sp(),sp(),p("[Nombre de la universidad]",{align:AlignmentType.CENTER,bold:true,size:28}));
children.push(p("Práctica 8",{align:AlignmentType.CENTER,bold:true,size:36}));
children.push(p("Evaluación de calidad de software mediante pruebas de caja negra (Black Box Testing)",{align:AlignmentType.CENTER,size:28}));
children.push(sp(),p("Sistema evaluado: IndustrIA — Catálogo B2B con cotizaciones (web y app móvil)",{align:AlignmentType.CENTER,size:24}));
children.push(sp(),kv([["Alumno","[Nombre completo]"],["Matrícula","[Completar]"],["Materia / Grupo","[Completar]"],["Docente","[Completar]"],["Fecha","[Completar]"],["Repositorio","MoiLoz04/Dedos10mo"]]));
children.push(sp(),p("Nota: este documento es una plantilla editable. Los campos marcados como PENDIENTE y los recuadros de evidencia deben completarse únicamente con resultados reales de la ejecución. No se incluyen resultados inventados.",{it:true,size:20,color:"C00000"}));
children.push(new Paragraph({children:[new PageBreak()]}));

// 1
children.push(h1("1. Descripción del sistema y alcance"));
children.push(p("IndustrIA es un catálogo B2B donde los usuarios autenticados buscan productos, los agregan a un borrador de cotización y lo envían; el sistema asigna un folio COT-XXXXX y conserva un historial. La web (React + Vite) y la app móvil (Flutter) se comunican directamente con Supabase (Auth, PostgREST, Realtime); no existe backend propio. La búsqueda usa Elasticsearch con respaldo local."));
children.push(h2("1.1 Dentro del alcance"));
["Aplicación web: registro, inicio de sesión, catálogo, cotización, historial, vinculación móvil.","Aplicación móvil Flutter: inicio de sesión, escaneo/validación de QR, listado y detalle de cotizaciones.","Las cotizaciones cumplen el papel de “solicitudes” del enunciado de la práctica."].forEach(t=>children.push(bl(t)));
children.push(h2("1.2 Fuera del alcance"));
["App de smartwatch (catalogo_b2b_watch).","Chat de soporte y panel de administración: no existen en el proyecto y no se requieren para esta práctica.","Pruebas de caja blanca, rendimiento y seguridad profunda."].forEach(t=>children.push(bl(t)));
children.push(h2("1.3 Entorno de prueba"));
children.push(kv([["Navegador","Chromium (Playwright) — versión: "+PEND],["Sistema operativo","[Completar]"],["Web","http://localhost:5173 (npm run dev)"],["Móvil","[Dispositivo/emulador y versión de Android/iOS]"],["Backend","Supabase (proyecto de pruebas)"],["Usuarios de prueba","Usuario A y Usuario B (datos ficticios)"],["Herramientas","Playwright, flutter test, capturas manuales"]]));
children.push(h2("1.4 Enfoque de caja negra"));
children.push(p("Las pruebas se diseñan solo a partir del comportamiento observable (entradas y salidas en la interfaz o la API pública), sin usar el código fuente como oráculo. Técnicas: partición de equivalencia, valores límite, tabla de decisión, transición de estados y escenarios positivos/negativos."));

// 2
children.push(h1("2. Requisitos verificables"));
children.push(p("Se definen 14 requisitos (mínimo exigido: 12) con identificador único y criterio de aceptación medible."));
children.push(table(["ID","Categoría","Requisito","Criterio de aceptación","¿Verificable?"],RF,[800,1250,1800,4310,1200],16));
children.push(sp());
children.push(h2("2.1 Requisitos no verificables o verificables solo parcialmente"));
["RF-007 y la parte móvil de RF-009: Playwright no automatiza Flutter; se verifican con pruebas de Flutter y capturas manuales.","RF-011: el resultado depende de las políticas RLS de Supabase, cuyo código no se usa como referencia (caja negra); solo se observa el comportamiento.","RF-001: el registro depende de la configuración de confirmación de correo y límites de envío de Supabase; puede requerir ajuste del entorno.","No existe un requisito de roles (administrador/usuario) porque el sistema no los implementa."].forEach(t=>children.push(bl(t)));

// 3
children.push(h1("3. Diseño de casos de prueba"));
children.push(table(["ID","Req.","Técnica","Caso","Entrada / datos","Resultado esperado"],TC.map(t=>[t[0],t[1],t[2],t[3],t[4],t[6]]),[700,700,1500,1500,2400,2560],15));

// 4
children.push(new Paragraph({children:[new PageBreak()]}));
children.push(h1("4. Ejecución y evidencias"));
children.push(p("Para cada caso: pegar las capturas indicadas, anotar el resultado obtenido real y marcar el estado. Las capturas web se generan automáticamente en catalogo-web/evidencias/ al ejecutar npm run test:e2e."));
TC.forEach(t=>{
  children.push(h2(`${t[0]} — ${t[3]} (${t[1]})`));
  children.push(kv([["Técnica",t[2]],["Precondiciones",t[4]],["Pasos",t[5]],["Resultado esperado",t[6]],["Fecha / hora de ejecución",PEND],["Resultado obtenido",PEND],["Estado","☐ Aprobado   ☐ Fallido   ☐ Bloqueado"],["Defecto asociado","☐ Ninguno   ☐ DEF-___"]]));
  children.push(sp());
  const im=imgs(t[0]); if(im.length){im.forEach(x=>children.push(x));} else {t[7].forEach(n=>{children.push(evid(n+".png"));children.push(sp());});}
});

// 5
children.push(new Paragraph({children:[new PageBreak()]}));
children.push(h1("5. Bitácora de defectos"));
children.push(p("Registrar solo defectos confirmados durante la ejecución. Copiar una fila por defecto."));
children.push(table(["ID","Req. / TC","Descripción","Pasos para reproducir","Esperado","Obtenido","Severidad","Prioridad","Estado"],
 [["DEF-001","","","","","","","",""],["DEF-002","","","","","","","",""],["DEF-003","","","","","","","",""],["DEF-004","","","","","","","",""]],[800,900,1300,1400,1100,1100,900,900,960],15));
children.push(sp());
children.push(h2("5.1 Puntos a vigilar durante la ejecución (hipótesis, sin confirmar)"));
["Los datos de nombre y teléfono del formulario de cotización podrían no conservarse (TC-017).","Si las políticas RLS no restringen por usuario, TC-014 fallaría.","La búsqueda apunta a Elasticsearch en localhost por defecto; verificar el comportamiento del respaldo (TC-015)."].forEach(t=>children.push(bl(t)));

// 6
children.push(h1("6. Matriz de trazabilidad"));
const rfs=RF.map(r=>r[0]);
children.push(table(["Requisito","Casos de prueba","Resultado","Defectos"],rfs.map(r=>[r+" — "+RF.find(x=>x[0]===r)[2],TC.filter(t=>t[1]===r).map(t=>t[0]).join(", "),"☐ Aprobado ☐ Fallido","—"]),[3600,2200,2200,1360],17));

// 7
children.push(h1("7. Evaluación de calidad"));
children.push(p("Completar con las cifras reales (npm run resumen entrega los totales de las pruebas web)."));
children.push(table(["Métrica","Valor"],[["Casos diseñados","18"],["Casos ejecutados",PEND],["Aprobados",PEND],["Fallidos",PEND],["Bloqueados / no ejecutados",PEND],["% de aprobación (aprobados / ejecutados)",PEND],["Requisitos cubiertos por al menos un caso","14 de 14 (diseño)"],["Defectos por severidad (crítica/alta/media/baja)",PEND]],[5600,3760],19));
children.push(sp(),h2("7.1 Análisis"));
children.push(p(PEND+" Interpretar los resultados: áreas más débiles, tipos de defecto recurrentes y limitaciones de la evaluación."));
children.push(h2("7.2 Limitaciones"));
["Smartwatch, chat y administración quedaron fuera de alcance.","Las pruebas móviles son parcialmente manuales.","Se usó un único navegador (Chromium).","Los resultados corresponden al entorno y datos de prueba descritos."].forEach(t=>children.push(bl(t)));

// 8
children.push(h1("8. Decisión de liberación"));
children.push(p("Criterio sugerido (ajustable): liberar solo si no hay defectos críticos o altos abiertos y el % de aprobación de requisitos principales (RF-001 a RF-004, RF-010, RF-011) es 100 %."));
children.push(kv([["Decisión","☐ Liberar   ☐ Liberar con condiciones   ☐ No liberar"],["Justificación",PEND],["Condiciones / acciones pendientes",PEND],["Riesgos residuales",PEND]]));

// 9
children.push(h1("9. Conclusiones"));
children.push(p(PEND+" Redactar conclusiones propias a partir de los resultados reales y las lecciones sobre la técnica de caja negra."));
children.push(h1("Anexos"));
["A. Salida de npm run test:e2e / reporte HTML (captura).","B. Salida de flutter test (captura).","C. Archivos JSON de evidencia (TC-012, TC-014, TC-017).","D. Código: catalogo-web/tests/practica8.spec.js y playwright.config.js."].forEach(t=>children.push(bl(t)));

const doc=new Document({
 styles:{default:{document:{run:{font:F,size:22}}},paragraphStyles:[
  {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:F,size:30,bold:true,color:"1F3864"},paragraph:{spacing:{before:300,after:140},keepNext:true,outlineLevel:0}},
  {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:F,size:24,bold:true,color:"2F5496"},paragraph:{spacing:{before:240,after:100},keepNext:true,outlineLevel:1}},
  {id:"Heading3",name:"Heading 3",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:F,size:22,bold:true},paragraph:{spacing:{before:160,after:80},keepNext:true,outlineLevel:2}}]},
 numbering:{config:[{reference:"b",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},
 sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,bottom:1440,left:1440,right:1440}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Práctica 8 — Black Box Testing — IndustrIA   |   Página ",font:F,size:16}),new TextRun({children:[PageNumber.CURRENT],font:F,size:16})]})]})},
  children}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(OUT,b);console.log('Generado: '+OUT)});
