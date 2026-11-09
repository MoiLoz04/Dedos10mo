// Copiar a: catalogo_b2b_mobile/test/qr_claim_integration_test.dart
// Prueba de INTEGRACIÓN: SupabaseService.claimQrToken (código real) contra Supabase real. Sin mocks.
// Usa un usuario FICTICIO de pruebas que tú creas en Supabase (Auth > Users).
// Ejecutar:
//   flutter test test/qr_claim_integration_test.dart \
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
    HttpOverrides.global = null; // flutter_test bloquea HTTP por defecto
    SharedPreferences.setMockInitialValues({});
    await SupabaseService.initialize();
    await svc.signIn(_email, _password);
  });

  tearDownAll(() async {
    for (final t in creados) {
      try {
        await svc.client.from('qr_sessions').delete().eq('token', t);
      } catch (_) {}
    }
    await svc.signOut();
  });

  test('I1 (camino feliz): token vigente y no usado => true y queda marcado used_at', () async {
    final token = await crearToken(expiraEn: const Duration(minutes: 2));

    expect(await svc.claimQrToken(token), isTrue);

    final row = await svc.client
        .from('qr_sessions').select('used_at').eq('token', token).single();
    expect(row['used_at'], isNotNull);
  });

  test('I2 (error): el mismo token reutilizado => false', () async {
    final token = await crearToken(expiraEn: const Duration(minutes: 2));
    expect(await svc.claimQrToken(token), isTrue); // primer uso
    expect(await svc.claimQrToken(token), isFalse); // segundo uso
  });

  test('I3 (error): token vencido => false', () async {
    final token = await crearToken(expiraEn: const Duration(minutes: -1));
    expect(await svc.claimQrToken(token), isFalse);
  });

  test('I4 (error): token inexistente => false', () async {
    expect(await svc.claimQrToken(_uuid()), isFalse);
  });
}
