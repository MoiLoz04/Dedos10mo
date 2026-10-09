import 'package:flutter/material.dart';

import '../services/supabase_service.dart';
import '../theme.dart';
import '../widgets/quote_card.dart';
import 'quote_detail_screen.dart';

class QuotesScreen extends StatefulWidget {
  const QuotesScreen({super.key});

  @override
  State<QuotesScreen> createState() => _QuotesScreenState();
}

class _QuotesScreenState extends State<QuotesScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = SupabaseService.instance.fetchQuotes();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis cotizaciones')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.brand),
            );
          }
          if (snap.hasError) {
            return const Center(
              child: Text('No se pudieron cargar las cotizaciones'),
            );
          }
          final quotes = snap.data ?? [];
          if (quotes.isEmpty) {
            return const Center(
              child: Text(
                'Aún no tienes cotizaciones',
                style: TextStyle(color: AppColors.steel),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: quotes.length,
            itemBuilder: (context, i) => QuoteCard(
              quote: quotes[i],
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => QuoteDetailScreen(quote: quotes[i]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
