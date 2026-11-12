// Práctica 11 - WB-01/02: pruebas unitarias de TransferService.checksum y buildPayload.
// Los valores esperados se calcularon de forma independiente (Python hashlib.sha256
// sobre JSON compacto con llaves ordenadas), no con el propio código evaluado.
//   flutter test test/transfer_checksum_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:catalogo_b2b_mobile/services/transfer_service.dart';

void main() {
  group('TransferService.checksum', () {
    test('K1 (valor conocido): payload estándar da el SHA-256 esperado', () {
      final p = TransferService.buildPayload('FOLIO-1');
      expect(
        TransferService.checksum(p),
        '9dd56ae0d864fb44453c1a4c4d172581712cd071917e9f212b3046caa4734b69',
      );
    });

    test('K2 (límite): mapa vacío => SHA-256 de "{}"', () {
      expect(
        TransferService.checksum({}),
        '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
      );
    });

    test('K3: el orden de las llaves de primer nivel no cambia el checksum', () {
      expect(
        TransferService.checksum({'b': 1, 'a': 2}),
        TransferService.checksum({'a': 2, 'b': 1}),
      );
    });

    test('K4 (sensibilidad): cambiar un solo valor cambia el checksum', () {
      final p = TransferService.buildPayload('FOLIO-1')..['cantidad'] = 4;
      expect(
        TransferService.checksum(p),
        '28a55d3e98126480bd70b3f4b0e50d3bd75be6cdce11fb8c8bdee621ced830d1',
      );
    });

    test('H4 (hallazgo D-07): llaves de mapas ANIDADOS no se ordenan', () {
      // SplayTreeMap.from() ordena solo el primer nivel. Postgres jsonb reordena
      // también los niveles internos, así que un payload anidado daría un
      // checksum distinto al recuperarlo => falso "datos corruptos".
      final a = TransferService.checksum({'x': {'y': 1, 'z': 2}});
      final b = TransferService.checksum({'x': {'z': 2, 'y': 1}});
      expect(a, isNot(equals(b)));
    });
  });

  group('TransferService.buildPayload', () {
    test('B1: contiene las 4 llaves esperadas con el folio recibido', () {
      final p = TransferService.buildPayload('FOLIO-9');
      expect(p.keys.toSet(), {'folio', 'descripcion', 'cantidad', 'unidad'});
      expect(p['folio'], 'FOLIO-9');
      expect(p['cantidad'], 3);
    });

    test('B2 (límite): folio vacío no se rechaza (sin validación)', () {
      expect(TransferService.buildPayload('')['folio'], '');
    });
  });
}
