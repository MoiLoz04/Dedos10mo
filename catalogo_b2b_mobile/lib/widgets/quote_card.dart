import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';

class QuoteCard extends StatelessWidget {
  final Map<String, dynamic> quote;
  final VoidCallback? onTap;

  const QuoteCard({super.key, required this.quote, this.onTap});

  String _fecha() {
    final d = DateTime.tryParse('${quote['created_at'] ?? ''}')?.toLocal();
    if (d == null) return '';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final enviada = quote['status'] == 'enviada';
    final origen = quote['enviado_desde'] == 'watch' ? 'Smartwatch' : 'Web';
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
          '${_fecha()} · $origen',
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
