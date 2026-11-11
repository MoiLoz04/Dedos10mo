import 'package:supabase_flutter/supabase_flutter.dart';

import 'dart:typed_data';

const String supabaseUrl = 'https://psgyneqlcxzecujbfrdh.supabase.co';
const String supabaseAnonKey = 'sb_publishable_ksDm1BMx4kkFbbx-0cAMEA_QKVaK97s';

/// Único punto de acceso a Supabase (patrón Singleton).
class SupabaseService {
  SupabaseService._();
  static final SupabaseService instance = SupabaseService._();

  SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() =>
      Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);

  bool get isLoggedIn => client.auth.currentSession != null;
  String? get currentUserId => client.auth.currentUser?.id;
  String? get currentEmail => client.auth.currentUser?.email;

  Future<AuthResponse> signIn(String email, String password) =>
      client.auth.signInWithPassword(email: email, password: password);

  Future<void> signOut() => client.auth.signOut();

  /// Valida el token del QR y lo marca como usado.
  /// Devuelve true solo si existe, es del usuario, no venció y no se usó.
  Future<bool> claimQrToken(String token) async {
    final ahora = DateTime.now().toUtc().toIso8601String();

    final row = await client
        .from('qr_sessions')
        .select('id')
        .eq('token', token)
        .isFilter('used_at', null)
        .gt('expires_at', ahora)
        .maybeSingle();
    if (row == null) return false;

    final updated = await client
        .from('qr_sessions')
        .update({'used_at': ahora})
        .eq('id', row['id'])
        .isFilter('used_at', null)
        .select('id');
    return updated.isNotEmpty;
  }

  Future<List<Map<String, dynamic>>> fetchQuotes() async {
    final res = await client
        .from('quotes')
        .select()
        .eq('user_id', currentUserId!)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  Future<List<Map<String, dynamic>>> fetchQuoteItems(String quoteId) async {
    final res = await client
        .from('quote_items')
        .select()
        .eq('quote_id', quoteId)
        .order('created_at', ascending: true);
    return List<Map<String, dynamic>>.from(res);
  }

  // ===== SOPORTE =====
  Future<Map<String, dynamic>> fetchMyProfile() async {
    return await client
        .from('profiles')
        .select('role,nombre_completo')
        .eq('id', currentUserId!)
        .single();
  }

  /// RLS ya filtra: usuario = suyos, agente = asignados, admin = todos.
  Future<List<Map<String, dynamic>>> fetchTickets() async {
    final res = await client
        .from('support_tickets')
        .select()
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  Stream<List<Map<String, dynamic>>> ticketsStream() => client
      .from('support_tickets')
      .stream(primaryKey: ['id'])
      .order('created_at', ascending: false);
  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> t) =>
      client.from('support_tickets').insert(t).select().single();

  Stream<List<Map<String, dynamic>>> messagesStream(String ticketId) => client
      .from('support_messages')
      .stream(primaryKey: ['id'])
      .eq('ticket_id', ticketId)
      .order('created_at');

  Future<void> sendMessage(
    String ticketId,
    String texto,
    String nombre,
    String rol,
  ) => client.from('support_messages').insert({
    'ticket_id': ticketId,
    'contenido': texto.trim(),
    'sender_name': nombre,
    'sender_role': rol,
  });

  Future<void> sendFile(
    String ticketId,
    String fileName,
    List<int> bytes,
    String nombre,
    String rol,
  ) async {
    final limpio = fileName.replaceAll(RegExp(r'[^\w.\-]'), '_');
    final path = '$ticketId/${DateTime.now().millisecondsSinceEpoch}_$limpio';
    await client.storage
        .from('support-files')
        .uploadBinary(path, Uint8List.fromList(bytes));
    await client.from('support_messages').insert({
      'ticket_id': ticketId,
      'archivo_path': path,
      'contenido': fileName,
      'sender_name': nombre,
      'sender_role': rol,
    });
  }

  Future<String> signedUrl(String path) =>
      client.storage.from('support-files').createSignedUrl(path, 60);

  Future<void> clearHistory(String ticketId) =>
      client.from('support_messages').delete().eq('ticket_id', ticketId);
}
