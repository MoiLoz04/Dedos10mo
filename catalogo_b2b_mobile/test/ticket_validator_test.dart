// Práctica 11 - WB-01..WB-05: pruebas unitarias White Box de TicketValidator.
// Sin red, sin Supabase. Ejecutar:
//   flutter test test/ticket_validator_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:catalogo_b2b_mobile/utils/ticket_validator.dart';

void main() {
  // ---------------------------------------------------------------
  // MÉTODO 1: validar()  -> V(G)=3, caminos independientes:
  //   P1: C1=V                 (equipo vacío; C2 no se evalúa: cortocircuito)
  //   P2: C1=F, C2=V           (descripción vacía)
  //   P3: C1=F, C2=F           (datos válidos)
  // Condiciones: C1 = equipo.trim().isEmpty, C2 = descripcion.trim().isEmpty
  // ---------------------------------------------------------------
  group('M1 validar() - instrucciones, decisiones y condiciones', () {
    test('V1 [P1, C1=V]: equipo vacío => error', () {
      expect(
        TicketValidator.validar(equipo: '', descripcion: 'Vibración'),
        TicketValidator.mensajeCamposObligatorios,
      );
    });

    test('V2 [P2, C1=F y C2=V]: descripción vacía => error', () {
      expect(
        TicketValidator.validar(equipo: 'Torno CNC', descripcion: ''),
        TicketValidator.mensajeCamposObligatorios,
      );
    });

    test('V3 [P3, C1=F y C2=F]: datos válidos => null (sin error)', () {
      expect(
        TicketValidator.validar(equipo: 'Torno CNC', descripcion: 'Vibración'),
        isNull,
      );
    });

    // Valores límite
    test('V4 (límite): solo espacios/tabulaciones/saltos cuenta como vacío', () {
      expect(
        TicketValidator.validar(equipo: '   ', descripcion: 'ok'),
        isNotNull,
      );
      expect(
        TicketValidator.validar(equipo: 'ok', descripcion: '\n\t  '),
        isNotNull,
      );
    });

    test('V5 (límite inferior válido): 1 carácter es suficiente', () {
      expect(TicketValidator.validar(equipo: 'a', descripcion: 'b'), isNull);
    });

    test('V6 (límite): espacios alrededor de un texto válido no lo invalidan', () {
      expect(
        TicketValidator.validar(equipo: '  Torno  ', descripcion: '  falla  '),
        isNull,
      );
    });

    // Hallazgos documentados (pruebas de caracterización)
    test('H1 (hallazgo D-08): un carácter invisible U+200B pasa la validación', () {
      // String.trim() de Dart no considera U+200B como espacio, y el CHECK
      // length(TRIM(...))>0 de Postgres tampoco => entra un caso "vacío".
      expect(
        TicketValidator.validar(equipo: '​', descripcion: '​'),
        isNull,
      );
    });

    test('H2 (hallazgo D-08): no existe longitud máxima (10,000 caracteres)', () {
      expect(
        TicketValidator.validar(equipo: 'E', descripcion: 'x' * 10000),
        isNull,
      );
    });
  });

  // ---------------------------------------------------------------
  // MÉTODO 2: construirPayload() -> V(G)=3
  //   P1: referencia == null                      (C1=F)
  //   P2: referencia != null pero solo espacios   (C1=V, C2=F)
  //   P3: referencia con texto                    (C1=V, C2=V)
  // C1 = referencia != null, C2 = referencia.trim().isNotEmpty
  // ---------------------------------------------------------------
  group('M2 construirPayload() - instrucciones, decisiones y condiciones', () {
    Map<String, dynamic> armar({String? ref}) => TicketValidator.construirPayload(
      tipo: 'falla',
      equipo: '  Torno CNC  ',
      descripcion: '  Vibración excesiva  ',
      prioridad: 'Alta',
      referencia: ref,
    );

    test('P1 [C1=F]: sin referencia => el JSON no trae la llave', () {
      final p = armar(ref: null);
      expect(p.containsKey('referencia'), isFalse);
      expect(p.keys, containsAll(['tipo', 'equipo', 'descripcion', 'prioridad']));
      expect(p, hasLength(4));
    });

    test('P2 [C1=V, C2=F]: referencia en blanco => se ignora', () {
      expect(armar(ref: '').containsKey('referencia'), isFalse);
      expect(armar(ref: '    ').containsKey('referencia'), isFalse);
    });

    test('P3 [C1=V, C2=V]: referencia con texto => se recorta y pasa a MAYÚSCULAS', () {
      final p = armar(ref: '  rep001 ');
      expect(p['referencia'], 'REP001');
      expect(p, hasLength(5));
    });

    test('N1: equipo y descripción se recortan; tipo y prioridad no se alteran', () {
      final p = armar();
      expect(p['equipo'], 'Torno CNC');
      expect(p['descripcion'], 'Vibración excesiva');
      expect(p['tipo'], 'falla');
      expect(p['prioridad'], 'Alta');
    });

    test('L1 (límite): referencia de 1 carácter', () {
      expect(armar(ref: 'a')['referencia'], 'A');
    });

    test('H3 (hallazgo D-09): la referencia manual no valida formato ni longitud', () {
      // El formato esperado es REPnnn, pero el código acepta cualquier cosa.
      expect(armar(ref: 'x' * 500)['referencia'], 'X' * 500);
      expect(armar(ref: 'hola mundo')['referencia'], 'HOLA MUNDO');
    });
  });

  // ---------------------------------------------------------------
  // MÉTODO 2b: mensajeParaError() -> V(G)=2 (operador ternario)
  // ---------------------------------------------------------------
  group('mensajeParaError() - decisión (excepciones de BD)', () {
    test('E1: 23505 (unique_violation) => "Ese ID ya existe"', () {
      expect(TicketValidator.mensajeParaError('23505'), 'Ese ID ya existe');
    });

    test('E2: otro código (42501 RLS, 23514 CHECK) o null => mensaje genérico', () {
      expect(TicketValidator.mensajeParaError('42501'), 'No se pudo crear el caso');
      expect(TicketValidator.mensajeParaError('23514'), 'No se pudo crear el caso');
      expect(TicketValidator.mensajeParaError(null), 'No se pudo crear el caso');
    });
  });
}
