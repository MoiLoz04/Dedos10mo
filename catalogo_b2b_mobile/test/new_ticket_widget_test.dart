// Práctica 11 - WB-04 / WB-05: ejecuta el método REAL NewTicketScreen._crear()
// a través de la pantalla (prueba de widget, sin mocks y sin red).
// Supabase NO se inicializa a propósito: createTicket() lanza una excepción real
// y se comprueba que _crear() la captura y deja la pantalla utilizable.
//   flutter test test/new_ticket_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:catalogo_b2b_mobile/screens/new_ticket_screen.dart';

void main() {
  Future<void> abrir(WidgetTester t) =>
      t.pumpWidget(const MaterialApp(home: NewTicketScreen()));

  testWidgets('W1 [rama de validación]: campos vacíos => mensaje y sin carga', (t) async {
    await abrir(t);
    await t.tap(find.text('Crear caso'));
    await t.pump();

    expect(find.text('Equipo y descripción son obligatorios'), findsOneWidget);
    expect(find.text('Creando...'), findsNothing); // nunca entró a _loading
  });

  testWidgets('W2 [rama catch genérico]: excepción real => se informa y el botón se rehabilita', (t) async {
    await abrir(t);
    final campos = find.byType(TextField); // 0=Equipo, 1=Descripción, 2=ID manual
    await t.enterText(campos.at(0), 'Torno CNC 3');
    await t.enterText(campos.at(1), 'Vibración excesiva');
    await t.tap(find.text('Crear caso'));
    await t.pumpAndSettle();

    // La excepción (Supabase sin inicializar) cae en `catch (_)`:
    expect(find.text('Sin conexión: no se pudo crear el caso'), findsOneWidget);
    // El bloque finally restablece _loading:
    expect(find.text('Crear caso'), findsOneWidget);
    expect(find.text('Creando...'), findsNothing);
    // HALLAZGO D-05: aquí la causa real fue "Supabase sin inicializar", pero el
    // usuario ve "Sin conexión": el catch genérico oculta el motivo verdadero.
  });

  testWidgets('W3 [rama sin error]: con datos válidos el mensaje de validación desaparece', (t) async {
    await abrir(t);
    await t.tap(find.text('Crear caso')); // provoca el error de validación
    await t.pump();
    expect(find.text('Equipo y descripción son obligatorios'), findsOneWidget);

    final campos = find.byType(TextField);
    await t.enterText(campos.at(0), 'Prensa');
    await t.enterText(campos.at(1), 'Fuga de aceite');
    await t.tap(find.text('Crear caso'));
    await t.pumpAndSettle();

    expect(find.text('Equipo y descripción son obligatorios'), findsNothing);
  });
}
