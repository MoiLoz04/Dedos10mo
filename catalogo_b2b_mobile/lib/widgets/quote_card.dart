import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';

class QuoteCard extends StatelessWidget {
  final Map<String, dynamic> quote;
  final VoidCallback? onTap;

  const QuoteCard({super.key, required this.quote, this.onTap});

  @visibleForTesting
  static String formatFecha(Object? createdAt) {
    final d = DateTime.tryParse('${createdAt ?? ''}')?.toLocal();
    if (d == null) return '';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }

  @visibleForTesting
  static String origenLabel(Object? enviadoDesde) =>
      enviadoDesde == 'watch' ? 'Smartwatch' : 'Web';

  @visibleForTesting
  static bool esEnviada(Object? status) => status == 'enviada';

  @override
  Widget build(BuildContext context) {
    final enviada = esEnviada(quote['status']);
    final origen = origenLabel(quote['enviado_desde']);
    final color = enviada ? AppColors.brand : AppColors.amber;

    return Card(
      color: AppColors.graphite2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        onTap: onTap,
        title: Text(
          '${quote['referencia'] ?? 'Borrador'}',
          style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${formatFecha(quote['created_at'])} · $origen',
          style: const TextStyle(color: AppColors.steel),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '${quote['status']}',
            style: TextStyle(color: color, fontSize: 12),
          ),
        ),
      ),
    );
  }
}
