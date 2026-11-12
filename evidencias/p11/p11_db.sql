-- Práctica 11 · Paso 5 (BD). Ejecuta cada bloque POR SEPARADO en Supabase > SQL Editor
-- y guarda captura + el texto del resultado en evidencias/p11/.
-- Reemplaza <UID>, <QID> y <TOKEN> por valores reales de tu usuario de pruebas
-- (UID: Authentication > Users; QID y TOKEN: SELECT id FROM quotes LIMIT 1 / SELECT token FROM qr_sessions LIMIT 1).
-- OJO: el SQL Editor corre como rol postgres (ignora RLS). El tiempo que mide la app incluye RLS + red.

-- ===== BLOQUE 1: plan y tiempo de 4 consultas (DB-03, "Tiempo de consulta DB") =====
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.quotes WHERE user_id = '<UID>' ORDER BY created_at DESC;
-- (ejecutar por separado)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.quote_items WHERE quote_id = '<QID>' ORDER BY created_at;
-- (ejecutar por separado)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.qr_sessions WHERE token = '<TOKEN>';
-- (ejecutar por separado)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.support_tickets ORDER BY created_at DESC;
-- Anota "Execution Time" de cada una. Si ves Seq Scan con pocas filas es normal: el planificador
-- lo prefiere a un índice. Solo es defecto si la tabla es grande o crece.

-- ===== BLOQUE 2: índices existentes (¿falta alguno en user_id, quote_id, ticket_id?) =====
SELECT tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- ===== BLOQUE 3: ¿RLS activo en TODAS las tablas? (D-02: role_invites) =====
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo, c.relforcerowsecurity AS rls_forzado
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname;
-- Si role_invites sale rls_activo = false, cualquiera con la anon key podría leer los tokens: crítico.

-- ===== BLOQUE 4: funciones de seguridad (my_role, claim_role_invite) =====
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig AS config, pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('my_role', 'claim_role_invite');
-- Revisa: SECURITY DEFINER debe llevar "SET search_path"; my_role() debe leer profiles.role.

-- ===== BLOQUE 5: triggers (¿quién genera quotes.referencia? ¿hay validaciones en BD?) =====
SELECT event_object_table AS tabla, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY 1, 2;

-- ===== BLOQUE 6: ¿existe el UNIQUE (user_id, client_request_id) que usa el upsert idempotente? =====
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'transfer_tests';

-- ===== BLOQUE 7: transacción parcial (pregunta 8) - demostración =====
-- Esto simula lo que hace submitQuote en dos pasos y qué pasa si el segundo falla.
BEGIN;
  UPDATE public.profiles SET instrucciones_default = 'prueba P11' WHERE id = '<UID>';
  UPDATE public.quotes SET status = 'valor_invalido' WHERE id = '<QID>';   -- falla por el CHECK
ROLLBACK;  -- con transacción NADA queda a medias; sin ella, el primer UPDATE ya estaría guardado
SELECT instrucciones_default FROM public.profiles WHERE id = '<UID>';      -- debe seguir igual

-- ===== BLOQUE 8: LIMPIEZA de datos de prueba (ejecutar al terminar) =====
DELETE FROM public.transfer_tests WHERE payload->>'origen' = 'p11-subida';
DELETE FROM public.qr_sessions WHERE user_id = '<UID>';
-- (las políticas no permiten borrar estas tablas desde la app; aquí sí porque corres como postgres)
