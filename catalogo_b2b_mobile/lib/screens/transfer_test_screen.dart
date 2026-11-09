import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/transfer_service.dart';
import '../theme.dart';

String _uuidV4() {
  final r = Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int i) => b[i].toRadixString(16).padLeft(2, '0');
  return '${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-'
      '${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}';
}

class TransferTestScreen extends StatefulWidget {
  const TransferTestScreen({super.key});
  @override
  State<TransferTestScreen> createState() => _TransferTestScreenState();
}

class _TransferTestScreenState extends State<TransferTestScreen> {
  final _svc = TransferService.instance;
  final _logs = <String>[];
  final _tc = <String, ({String res, String obs})>{};

  String? _id;
  Map<String, dynamic>? _payload;
  String? _pendingId; // registro enviado SIN red (TC-05)
  Map<String, dynamic>? _pendingPayload;

  static const _names = {
    'TC-01': 'Establecimiento de conexión',
    'TC-02': 'Envío de información',
    'TC-03': 'Recepción de información',
    'TC-04': 'Integridad de información',
    'TC-05': 'Interrupción de conexión',
    'TC-06': 'Recuperación de conexión',
    'TC-07': 'Prevención de duplicados',
  };

  void _log(String m) {
    final l = '[${DateTime.now().toIso8601String()}] $m';
    debugPrint('TRANSFER $l'); // visible con: adb logcat -s flutter
    setState(() => _logs.insert(0, l));
  }

  void _set(String tc, bool ok, String obs) {
    _tc[tc] = (res: ok ? 'Aprobado' : 'Fallido', obs: obs);
    _log('$tc ${ok ? "OK" : "FALLO"}: $obs');
    setState(() {});
  }

  Future<void> _tc01() async {
    try {
      final r = await _svc.ping();
      _set('TC-01', r.status == 200, 'HTTP ${r.status} en ${r.ms} ms');
    } catch (e) {
      _set('TC-01', false, 'Sin conexión: $e');
    }
  }

  Future<void> _tc02() async {
    _id = _uuidV4();
    _payload = TransferService.buildPayload('FOLIO-${_id!.substring(0, 6)}');
    final sw = Stopwatch()..start();
    try {
      await _svc.send(_id!, _payload!);
      _set('TC-02', true, 'Enviado $_id en ${sw.elapsedMilliseconds} ms');
    } catch (e) {
      _set('TC-02', false, '$e');
    }
  }

  Future<void> _tc03() async {
    if (_id == null) return _log('Ejecuta TC-02 primero');
    try {
      final rows = await _svc.fetch(_id!);
      _set(
        'TC-03',
        rows.isNotEmpty,
        rows.isEmpty
            ? 'No regresó filas'
            : 'Recibido: ${rows.first['payload']}',
      );
    } catch (e) {
      _set('TC-03', false, '$e');
    }
  }

  Future<void> _tc04() async {
    if (_id == null || _payload == null) return _log('Ejecuta TC-02 primero');
    try {
      final rows = await _svc.fetch(_id!);
      if (rows.length != 1) throw 'Se esperaba 1 fila y hay ${rows.length}';
      final got = Map<String, dynamic>.from(rows.first['payload']);
      final sent = TransferService.checksum(_payload!);
      final recv = TransferService.checksum(got);
      final ok = sent == recv && rows.first['checksum'] == sent;
      _set(
        'TC-04',
        ok,
        ok
            ? 'Checksum coincide ($sent)'
            : 'Difiere: enviado=$sent recibido=$recv',
      );
    } catch (e) {
      _set('TC-04', false, '$e');
    }
  }

  /// Ejecutar con Wi-Fi/datos APAGADOS. Aprobado = la app detecta el fallo.
  Future<void> _tc05() async {
    _pendingId = _uuidV4();
    _pendingPayload = TransferService.buildPayload(
      'OFFLINE-${_pendingId!.substring(0, 6)}',
    );
    try {
      await _svc.send(_pendingId!, _pendingPayload!);
      _set('TC-05', false, 'Se reportó éxito sin conexión (incorrecto)');
    } catch (e) {
      _set('TC-05', true, 'Fallo detectado y mostrado: ${e.runtimeType}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sin conexión: no se pudo enviar')),
        );
      }
    }
  }

  /// Ejecutar con la red REACTIVADA: reintenta el mismo registro de TC-05.
  Future<void> _tc06() async {
    if (_pendingId == null) return _log('Ejecuta TC-05 primero');
    try {
      await _svc.send(_pendingId!, _pendingPayload!);
      final rows = await _svc.fetch(_pendingId!);
      _set('TC-06', rows.length == 1, 'Reintento OK, filas=${rows.length}');
    } catch (e) {
      _set('TC-06', false, '$e');
    }
  }

  Future<void> _tc07() async {
    final id = _uuidV4();
    final p = TransferService.buildPayload('DUP-${id.substring(0, 6)}');
    try {
      await _svc.send(id, p);
      await _svc.send(id, p);
      await _svc.send(id, p);
      final rows = await _svc.fetch(id);
      _set(
        'TC-07',
        rows.length == 1,
        '3 envíos del mismo id → ${rows.length} fila(s)',
      );
    } catch (e) {
      _set('TC-07', false, '$e');
    }
  }

  Future<void> _finalTransfer() async {
    final id = _uuidV4();
    final p = TransferService.buildPayload('FINAL-${id.substring(0, 6)}');
    final sw = Stopwatch()..start();
    try {
      await _svc.send(id, p);
      final tSend = sw.elapsedMilliseconds;
      final rows = await _svc.fetch(id);
      final tTotal = sw.elapsedMilliseconds;
      final ok =
          rows.length == 1 &&
          TransferService.checksum(
                Map<String, dynamic>.from(rows.first['payload']),
              ) ==
              TransferService.checksum(p);
      _log(
        'FINAL envío=${tSend}ms ida+vuelta=${tTotal}ms integridad=${ok ? "OK" : "FALLA"}',
      );
    } catch (e) {
      _log('FINAL FALLO: $e');
    }
  }

  String _report() {
    final b = StringBuffer('MATRIZ DE PRUEBAS\n\n');
    for (final e in _names.entries) {
      final r = _tc[e.key];
      b.writeln('${e.key} ${e.value}');
      b.writeln('Resultado: ${r?.res ?? "Sin ejecutar"}');
      b.writeln('Observación: ${r?.obs ?? "Sin observaciones"}\n');
    }
    b.writeln('LOG\n${_logs.reversed.join("\n")}');
    return b.toString();
  }

  @override
  Widget build(BuildContext context) {
    Widget btn(String t, VoidCallback f) =>
        ElevatedButton(onPressed: f, child: Text(t));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prueba de transferencia'),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy),
            tooltip: 'Copiar reporte',
            onPressed: () => Clipboard.setData(ClipboardData(text: _report())),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              btn('TC-01 Conexión', _tc01),
              btn('TC-02 Enviar', _tc02),
              btn('TC-03 Recibir', _tc03),
              btn('TC-04 Integridad', _tc04),
              btn('TC-05 Sin red', _tc05),
              btn('TC-06 Recuperar', _tc06),
              btn('TC-07 Duplicados', _tc07),
              btn('Transferencia final', _finalTransfer),
            ],
          ),
          const SizedBox(height: 16),
          for (final e in _names.entries)
            ListTile(
              dense: true,
              title: Text('${e.key} ${e.value}'),
              subtitle: Text(
                _tc[e.key]?.obs ?? 'Sin ejecutar',
                style: const TextStyle(color: AppColors.steel),
              ),
              trailing: Text(
                _tc[e.key]?.res ?? '—',
                style: TextStyle(
                  color: _tc[e.key]?.res == 'Aprobado'
                      ? AppColors.brand
                      : AppColors.amber,
                ),
              ),
            ),
          const Divider(),
          for (final l in _logs)
            Text(
              l,
              style: const TextStyle(fontSize: 10, color: AppColors.steel),
            ),
        ],
      ),
    );
  }
}
