import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../theme.dart';
import 'chat_screen.dart';
import 'new_ticket_screen.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _svc = SupabaseService.instance;
  List<Map<String, dynamic>> _tickets = [];
  bool _loading = true;
  bool _error = false;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _load();
    _channel = _svc.client
        .channel('support_tickets_${DateTime.now().millisecondsSinceEpoch}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'support_tickets',
          callback: (_) => _load(),
        )
        .subscribe();
  }

  @override
  void dispose() {
    if (_channel != null) _svc.client.removeChannel(_channel!);
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await _svc.fetchTickets();
      if (!mounted) return;
      setState(() {
        _tickets = data;
        _loading = false;
        _error = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Soporte'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: AppColors.graphite,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo caso'),
        onPressed: () async {
          await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const NewTicketScreen()),
          );
          _load(); // al volver siempre recarga
        },
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.brand),
      );
    }
    if (_error && _tickets.isEmpty) {
      return const Center(child: Text('No se pudieron cargar los casos'));
    }
    if (_tickets.isEmpty) {
      return const Center(
        child: Text(
          'Aún no tienes casos',
          style: TextStyle(color: AppColors.steel),
        ),
      );
    }
    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: _load,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: _tickets.length,
        itemBuilder: (context, i) {
          final t = _tickets[i];
          return Card(
            color: AppColors.graphite2,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            child: ListTile(
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ChatScreen(ticket: t)),
                );
                _load();
              },
              title: Text(
                '${t['referencia']}',
                style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                '${t['equipo']} · ${t['prioridad']} · ${t['estado']}',
                style: const TextStyle(color: AppColors.steel),
              ),
              trailing: const Icon(
                Icons.chat_bubble_outline,
                color: AppColors.brand,
              ),
            ),
          );
        },
      ),
    );
  }
}
