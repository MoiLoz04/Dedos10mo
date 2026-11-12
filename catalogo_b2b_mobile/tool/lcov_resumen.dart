// Resume coverage/lcov.info: cobertura de líneas (instrucciones) y de ramas por archivo.
// Uso (desde catalogo_b2b_mobile/):
//   flutter test --coverage --branch-coverage
//   dart run tool/lcov_resumen.dart coverage/lcov.info utils/ticket_validator.dart screens/new_ticket_screen.dart
// Si tu Flutter no reconoce --branch-coverage, usa solo --coverage: la cobertura de
// ramas se documenta entonces con las tablas de decisiones/condiciones del reporte.
import 'dart:io';

void main(List<String> args) {
  if (args.length < 2) {
    stderr.writeln('Uso: dart run tool/lcov_resumen.dart <lcov.info> <archivo1> [archivo2 ...]');
    exit(64);
  }
  final lineas = File(args.first).readAsLinesSync();
  final filtros = args.skip(1).map((a) => a.replaceAll('\\', '/')).toList();

  String? sf;
  var lf = 0, lh = 0, brf = 0, brh = 0;
  final filas = <String>[];

  String pct(int a, int b) => b == 0 ? 'n/d' : '${(100 * a / b).toStringAsFixed(1)} %';

  for (final l in lineas) {
    if (l.startsWith('SF:')) {
      sf = l.substring(3).replaceAll('\\', '/');
      lf = lh = brf = brh = 0;
    } else if (l.startsWith('LF:')) {
      lf = int.parse(l.substring(3));
    } else if (l.startsWith('LH:')) {
      lh = int.parse(l.substring(3));
    } else if (l.startsWith('BRF:')) {
      brf = int.parse(l.substring(4));
    } else if (l.startsWith('BRH:')) {
      brh = int.parse(l.substring(4));
    } else if (l == 'end_of_record' && sf != null) {
      final actual = sf;
      if (filtros.any((f) => actual.endsWith(f))) {
        filas.add('${actual.padRight(48)} líneas $lh/$lf = ${pct(lh, lf).padLeft(8)}'
            '   ramas $brh/$brf = ${pct(brh, brf).padLeft(8)}');
      }
      sf = null;
    }
  }
  if (filas.isEmpty) {
    stdout.writeln('Ningún archivo coincide con los filtros. Revisa los nombres.');
  } else {
    filas.forEach(stdout.writeln);
  }
}
