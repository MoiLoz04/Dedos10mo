import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/supabase_service.dart';
import '../theme.dart';

class QuoteDetailScreen extends StatelessWidget {
  final Map<String, dynamic> quote;
  const QuoteDetailScreen({super.key, required this.quote});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${quote['referencia'] ?? 'Borrador'}')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: SupabaseService.instance.fetchQuoteItems('${quote['id']}'),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.brand),
            );
          }
          final items = snap.data ?? [];
          if (items.isEmpty) {
            return const Center(
              child: Text(
                'Sin productos',
                style: TextStyle(color: AppColors.steel),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) =>
                const Divider(color: AppColors.graphite2),
            itemBuilder: (context, i) => ListTile(
              title: Text('${items[i]['nombre_producto']}'),
              trailing: Text(
                'x${items[i]['cantidad']}',
                style: GoogleFonts.jetBrainsMono(
                  color: AppColors.brand,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
