import 'dart:collection';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_service.dart';

class TransferService {
  TransferService._();
  static final instance = TransferService._();

  SupabaseClient get _c => SupabaseService.instance.client;
  static const _table = 'transfer_tests';
  static const _timeout = Duration(seconds: 8);

  /// SHA-256 sobre JSON con llaves ordenadas (Postgres jsonb reordena llaves).
  static String checksum(Map<String, dynamic> p) => sha256
      .convert(utf8.encode(jsonEncode(SplayTreeMap<String, dynamic>.from(p))))
      .toString();

  static Map<String, dynamic> buildPayload(String folio) => {
    'folio': folio,
    'descripcion': 'Prueba de transferencia',
    'cantidad': 3,
    'unidad': 'pza',
  };

  /// TC-01: llamada directa para poder mostrar el código HTTP.
  Future<({int status, int ms})> ping() async {
    final sw = Stopwatch()..start();
    final token = _c.auth.currentSession?.accessToken ?? supabaseAnonKey;
    final res = await http
        .get(
          Uri.parse('$supabaseUrl/rest/v1/$_table?select=id&limit=1'),
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(_timeout);
    return (status: res.statusCode, ms: sw.elapsedMilliseconds);
  }

  /// TC-02 / TC-07: upsert idempotente; si el id ya existe no duplica.
  Future<void> send(String requestId, Map<String, dynamic> payload) => _c
      .from(_table)
      .upsert(
        {
          'client_request_id': requestId,
          'payload': payload,
          'checksum': checksum(payload),
        },
        onConflict: 'user_id,client_request_id',
        ignoreDuplicates: true,
      )
      .timeout(_timeout);

  /// TC-03: consulta de vuelta.
  Future<List<Map<String, dynamic>>> fetch(String requestId) async {
    final r = await _c
        .from(_table)
        .select()
        .eq('client_request_id', requestId)
        .timeout(_timeout);
    return List<Map<String, dynamic>>.from(r);
  }
}
