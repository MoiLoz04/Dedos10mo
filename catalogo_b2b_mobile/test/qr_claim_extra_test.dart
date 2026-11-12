// Práctica 11 - WB-04 / DB-06: pruebas de INTEGRACIÓN adicionales de
// SupabaseService.claimQrToken (código real contra Supabase real, sin mocks).
// Complementan I1-I4 de qr_claim_integration_test.dart.
// Usa un usuario FICTICIO de pruebas. Ejecutar:
//   flutter test test/qr_claim_extra_test.dart \
//     --dart-define=TEST_EMAIL=testa@example.com --dart-define=TEST_PASSWORD=tu_clave_de_prueba
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:catalogo_b2b_mobile/services/supabase_service.dart';

const _email = String.fromEnvironment('TEST_EMAIL');
const _password = String.fromEnvironment('TEST_PASSWORD');

String _uuid() {
  final r = Random.secure();
  String h(int n) => List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  return '${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final svc = SupabaseService.instance;
  final creados = <String>[];

  Future<String> crearToken({required Duration expiraEn}) async {
    final token = _uuid();
    await svc.client.from('qr_sessions').insert({
      'token': token,
      'user_id': svc.currentUserId,
      'expires_at': DateTime.now().toUtc().add(expiraEn).toIso8601String(),
    });
    creados.add(token);
    return token;
  }

  setUpAll(() async {
    HttpOverrides.global = null;
    SharedPreferences.setMockInitialValues({});
    await SupabaseService.initialize();
    await svc.signIn(_email, _password);
  });

  tearDownAll(() async {
    try {
      if (!svc.isLoggedIn) await svc.signIn(_email, _password);
      for (final t in creados) {
        await svc.client.from('qr_sessions').delete().eq('token', t);
      }
    } catch (_) {}
    await svc.signOut();
  });

  test('I5 (DB-06 concurrencia): dos escaneos simultáneos => exactamente UNO gana', () async {
    final token = await crearToken(expiraEn: const Duration(minutes: 2));

    final r = await Future.wait([
      svc.claimQrToken(token),
      svc.claimQrToken(token),
    ]);

    expect(r.where((ok) => ok).length, 1, reason: 'resultados: $r');
    final row = await svc.client
        .from('qr_sessions').select('used_at').eq('token', token).single();
    expect(row['used_at'], isNotNull);
  });

  test('I6 (inyección): un token con comillas/SQL se trata como dato, no como código', () async {
    expect(await svc.claimQrToken("' OR '1'='1"), isFalse);
    expect(await svc.claimQrToken("x'; DROP TABLE qr_sessions;--"), isFalse);
    // La tabla sigue viva y consultable:
    final rows = await svc.client.from('qr_sessions').select('id').limit(1);
    expect(rows, isA<List>());
  });

  test('I7 (RLS): sin sesión el token vigente NO se puede reclamar; con sesión sí', () async {
    final token = await crearToken(expiraEn: const Duration(minutes: 2));

    await svc.signOut();
    expect(await svc.claimQrToken(token), isFalse); // RLS oculta la fila (no lanza error)

    await svc.signIn(_email, _password);
    expect(await svc.claimQrToken(token), isTrue);
  });
}
