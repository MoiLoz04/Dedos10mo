import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:catalogo_b2b_mobile/main.dart';
import 'package:catalogo_b2b_mobile/services/supabase_service.dart';

const _email = String.fromEnvironment('TEST_EMAIL');
const _password = String.fromEnvironment('TEST_PASSWORD');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('E2E: login inválido, login válido, Inicio y cierre de sesión', (
    tester,
  ) async {
    await SupabaseService.initialize();
    await SupabaseService.instance.signOut();
    await tester.pumpWidget(const IndustriaMobileApp());
    await tester.pumpAndSettle();

    // 1. Pantalla de login inicial
    expect(
      find.text('Inicia sesión para ver tus cotizaciones'),
      findsOneWidget,
    );

    // 2. Credenciales incorrectas => mensaje de error
    await tester.enterText(find.widgetWithText(TextField, 'Correo'), _email);
    await tester.enterText(
      find.widgetWithText(TextField, 'Contraseña'),
      'clave-incorrecta',
    );
    await tester.tap(find.text('Entrar'));

    // Esperar a que aparezca el mensaje de error de Supabase
    await tester.pumpAndSettle(const Duration(seconds: 5));
    expect(find.text('Credenciales inválidas'), findsOneWidget);

    // 3. Credenciales correctas => pantalla Inicio con el correo
    await tester.enterText(
      find.widgetWithText(TextField, 'Contraseña'),
      _password,
    );
    await tester.tap(find.text('Entrar'));

    // IMPORTANTE: Dar tiempo a que Supabase autentique y navegue a HomeScreen
    // Usamos runAsync o un ciclo de bombeo con timeout para la red real
    final inicioFinder = find.text('Inicio');

    // Esperar hasta un máximo de 10 segundos a que cargue la pantalla principal
    bool loaded = false;
    for (int i = 0; i < 10; i++) {
      await tester.pump(const Duration(seconds: 1));
      if (tester.any(inicioFinder)) {
        loaded = true;
        break;
      }
    }

    expect(
      loaded,
      isTrue,
      reason: 'La pantalla de Inicio tardó demasiado en cargar tras el login',
    );
    await tester.pumpAndSettle();

    // Verificaciones de la pantalla HomeScreen
    expect(find.text('Inicio'), findsOneWidget);
    expect(find.text('Hola, $_email'), findsOneWidget);
    expect(find.text('Escanear código QR'), findsNWidgets(2));

    // 4. Cerrar sesión => vuelve al login
    await tester.tap(find.byTooltip('Cerrar sesión'));
    await tester.pumpAndSettle(const Duration(seconds: 3));
    expect(
      find.text('Inicia sesión para ver tus cotizaciones'),
      findsOneWidget,
    );
  });
}
