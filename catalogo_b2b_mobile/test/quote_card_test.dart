// Copiar a: catalogo_b2b_mobile/test/quote_card_test.dart
// Requiere el mini-refactor de lib/widgets/quote_card.dart (métodos estáticos formatFecha/origenLabel/esEnviada).
// Ejecutar:  flutter test test/quote_card_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:catalogo_b2b_mobile/widgets/quote_card.dart';

void main() {
  group('QuoteCard - lógica de presentación (unitarias, sin red ni Supabase)', () {
    test('U1 (válido): fecha ISO se muestra como dd/mm/aaaa', () {
      // 12:00 UTC evita que el cambio de zona horaria mueva el día.
      expect(QuoteCard.formatFecha('2026-10-15T12:00:00Z'), '15/10/2026');
    });

    test('U2 (límite): día y mes de un dígito se rellenan con cero; null da vacío', () {
      expect(QuoteCard.formatFecha('2026-01-05T12:00:00Z'), '05/01/2026');
      expect(QuoteCard.formatFecha(null), '');
    });

    test('U3 (inválido): una fecha corrupta no truena y devuelve vacío', () {
      expect(QuoteCard.formatFecha('no-es-una-fecha'), '');
      expect(QuoteCard.formatFecha(''), '');
    });

    test('U4: origen "watch" => Smartwatch; cualquier otro/nulo => Web', () {
      expect(QuoteCard.origenLabel('watch'), 'Smartwatch');
      expect(QuoteCard.origenLabel('web'), 'Web');
      expect(QuoteCard.origenLabel(null), 'Web');
    });

    test('U5: solo el estatus "enviada" se marca como enviada', () {
      expect(QuoteCard.esEnviada('enviada'), isTrue);
      expect(QuoteCard.esEnviada('borrador'), isFalse);
      expect(QuoteCard.esEnviada(null), isFalse);
    });
  });
}
