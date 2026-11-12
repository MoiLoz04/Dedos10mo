# Mediciones Práctica 11 (generado automáticamente)
Fecha: 2026-11-12T05:32:54.620Z | Equipo: MoiLoz | SO: win32 10.0.26200 | Node v24.19.0 | Servidor: psgyneqlcxzecujbfrdh.supabase.co | Conexión: Wi-Fi casa

## Casos de endpoint / BD
| ID | Descripción | Esperado | Observado | Resultado | ms | bytes | código error | Nota |
|---|---|---|---|---|---|---|---|---|
| WEB-01-login | Login correcto (POST /auth/v1/token) | 200 | 200 | COINCIDE | 1049 | 1953 |  |  |
| WEB-02-login | Login con contraseña incorrecta | 400 | 400 | COINCIDE | 195 | 81 | 400 |  |
| WEB-01a | GET quotes propias (token válido) | 200 | 200 | COINCIDE | 627 | 1270 |  |  |
| WEB-01b | GET products (catálogo) | 200 | 200 | COINCIDE | 295 | 552 |  |  |
| WEB-01c | POST quotes (crear borrador) | 201 | 201 | COINCIDE | 410 | 211 |  |  |
| DB-01a | INSERT quote_items válido | 201 | 201 | COINCIDE | 110 | 207 |  |  |
| WEB-02a | GET sin apikey | 401 | 401 | COINCIDE | 96 | 101 |  |  |
| WEB-02b | GET con JWT inválido | 401 | 401 | COINCIDE | 307 | 93 | PGRST301 |  |
| WEB-02c | GET quotes con id que no es UUID | 400 | 400 | COINCIDE | 203 | 106 | 22P02 |  |
| WEB-02d | GET single (objeto) de id inexistente | 406 | 406 | COINCIDE | 146 | 131 | PGRST116 | PostgREST usa 406 (PGRST116) y no 404 cuando .single() no encuentra filas |
| WEB-02e | GET tabla inexistente | 404 | 404 | COINCIDE | 170 | 132 | PGRST205 |  |
| WEB-02f | POST quote_items hacia cotización ajena/inexistente (RLS) | 403 | 403 | COINCIDE | 113 | 124 | 42501 |  |
| WEB-02g | POST quotes con user_id de otra persona (RLS) | 401/403 | 403 | COINCIDE | 194 | 119 | 42501 |  |
| WEB-02h | POST qr_sessions (token nuevo) | 201 | 201 | COINCIDE | 181 | 0 |  |  |
| WEB-02i | POST qr_sessions con token duplicado (UNIQUE) | 409 | 409 | COINCIDE | 116 | 128 | 23505 |  |
| WEB-02j | Códigos 422 y 500: PostgREST no los emite en estas operaciones | 422/500 | - | NO EJECUTADO | 0 | 0 |  | Justificado: PostgREST no los emite aquí; alternativa = validar con RPC/Edge Function |
| DB-02a | INSERT quote_items con cantidad = 0 (CHECK) | 400 | 400 | COINCIDE | 108 | 149 | 23514 |  |
| DB-02b | INSERT quote_items sin nombre_producto (NOT NULL) | 400 | 400 | COINCIDE | 206 | 153 | 23502 |  |
| DB-02c | PATCH quotes con status inválido 'x' (CHECK) | 400 | 400 | COINCIDE | 205 | 137 | 23514 |  |
| DB-03a | SELECT quote_items por id existente | 200 | 200 | COINCIDE | 149 | 207 |  | filas: 1 (esperado 1) |
| DB-03b | SELECT quote_items por id inexistente | 200 | 200 | COINCIDE | 166 | 2 |  | filas: 0 (esperado 0: 200 con lista vacía, no 404) |
| DB-04a | PATCH quote_items cantidad=5 | 200 | 200 | COINCIDE | 291 | 207 |  |  |
| DB-04b | Releer tras actualizar (persistencia) | 200 | 200 | COINCIDE | 109 | 16 |  | cantidad leída: 5 (esperado 5) |
| DB-06a | Dos PATCH simultáneos al mismo item | 200 | 200 | COINCIDE | 94 | 208 |  | HTTP 200 y 200; valor final = 22 (gana la última escritura, sin control de versión) |
| DB-06b | Dos reclamos simultáneos del mismo QR: debe ganar exactamente 1 | 200 | 200 | COINCIDE | 210 | 276 |  | ganadores = 1 (esperado 1) |
| DB-05a | DELETE quote_items | 204 | 204 | COINCIDE | 112 | 0 |  |  |
| DB-05b | Releer tras eliminar | 200 | 200 | COINCIDE | 191 | 2 |  | filas: 0 (esperado 0) |
| WEB-03a | Backend permite ENVIAR una cotización SIN productos (D-06) | 400/403/409/422 | 200 | DIFIERE | 106 | 210 |  | Si observas 200: la regla solo existe en el frontend |
| WEB-03b | Backend permite EDITAR items de una cotización ya enviada (D-06) | 400/403/409/422 | 200 | DIFIERE | 207 | 209 |  | Si observas 200: no hay candado por estado |
| WEB-03c | Backend acepta teléfono 'no-es-telefono' | 400/422 | 200 | DIFIERE | 105 | 220 |  | Si observas 200: sin validación de formato |
| WEB-04a | Anónimo (solo apikey) consulta quotes: RLS devuelve lista vacía | 200 | 200 | COINCIDE | 101 | 2 |  |  |
| WEB-04b | GET profiles sin filtro: solo debe verse el propio | 200 | 200 | COINCIDE | 104 | 64 |  | filas: 1 (esperado 1) |
| WEB-04c | GET support_tickets: no deben aparecer tickets ajenos (rol usuario) | 200 | 200 | COINCIDE | 204 | 194 |  | filas: 2; ajenos: 0 (esperado 0) |
| WEB-04d | Usuario intenta cambiarse role a admin (D-01) | 400/401/403 | 403 | COINCIDE | 103 | 195 | 42501 | protegido |

Formas distintas de cuerpo de error observadas (WEB-06): code,error_code,msg || hint,message || code,details,hint,message

## Tabla B: 10 solicitudes consecutivas a GET quotes
| # | HTTP | ms | bytes |
|---|---|---|---|
| 1 | 200 | 125.7 | 1270 |
| 2 | 200 | 180.9 | 1270 |
| 3 | 200 | 104.8 | 1270 |
| 4 | 200 | 101.5 | 1270 |
| 5 | 200 | 108.9 | 1270 |
| 6 | 200 | 104.2 | 1270 |
| 7 | 200 | 93.9 | 1270 |
| 8 | 200 | 105.3 | 1270 |
| 9 | 200 | 99.2 | 1270 |
| 10 | 200 | 85.7 | 1270 |

Promedio 111.0 ms | mínimo 85.7 ms | máximo 180.9 ms | desv. est. 26.6 ms | P95 180.9 ms (la 1.ª incluye conexión TLS)

## Descarga (GET products?select=*)
| # | HTTP | bytes | s | Mbps |
|---|---|---|---|---|
| 1 | 200 | 3874 | 0.12 | 0.26 |
| 2 | 200 | 3874 | 0.10 | 0.31 |
| 3 | 200 | 3874 | 0.10 | 0.30 |

## Subida (POST transfer_tests, ~200 KB)
| # | HTTP | bytes enviados | s | Mbps |
|---|---|---|---|---|
| 1 | 201 | 200124 | 0.30 | 5.25 |
| 2 | 201 | 200124 | 0.30 | 5.26 |
| 3 | 201 | 200124 | 0.31 | 5.12 |

## Carga controlada (20 solicitudes por escenario)
| Escenario | Usuarios | OK | Fallos | Códigos | Prom ms | P95 ms | Máx ms | req/s | Mbps | CPU cliente % |
|---|---|---|---|---|---|---|---|---|---|---|
| LECTURA GET quotes | 1 | 20 | 0 | {"200":20} | 112.7 | 169.3 | 203.8 | 8.87 | 0.09 | 3.5 |
| LECTURA GET quotes | 5 | 20 | 0 | {"200":20} | 161.7 | 328.8 | 339.7 | 27.84 | 0.28 | 10.9 |
| LECTURA GET quotes | 10 | 20 | 0 | {"200":20} | 182.7 | 315.0 | 337.1 | 47.14 | 0.48 | 25.7 |
| ESCRITURA POST quotes | 1 | 20 | 0 | {"201":20} | 106.6 | 111.0 | 185.9 | 9.38 | 0.02 | 3.7 |
| ESCRITURA POST quotes | 5 | 20 | 0 | {"201":20} | 115.0 | 157.3 | 174.3 | 39.06 | 0.09 | 15.4 |
| ESCRITURA POST quotes | 10 | 20 | 0 | {"201":20} | 115.6 | 204.4 | 205.5 | 65.74 | 0.16 | 25.3 |

CPU/memoria del servidor: revisar en Supabase > Reports > Database durante la ejecución (el CPU de la tabla es del equipo cliente).