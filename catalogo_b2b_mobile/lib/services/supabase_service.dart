import 'package:supabase_flutter/supabase_flutter.dart';

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
}
