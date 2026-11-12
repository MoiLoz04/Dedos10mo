import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../theme.dart';
import '../utils/ticket_validator.dart';

class NewTicketScreen extends StatefulWidget {
  const NewTicketScreen({super.key});

  @override
  State<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends State<NewTicketScreen> {
  final _equipo = TextEditingController();
  final _desc = TextEditingController();
  final _ref = TextEditingController();
  String _tipo = 'falla';
  String _prioridad = 'Media';
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _equipo.dispose();
    _desc.dispose();
    _ref.dispose();
    super.dispose();
  }

  Future<void> _crear() async {
    // P11: la validación y el armado del payload ahora viven en TicketValidator
    // (misma lógica de antes, pero probable con pruebas unitarias).
    final errorValidacion = TicketValidator.validar(
      equipo: _equipo.text,
      descripcion: _desc.text,
    );
    if (errorValidacion != null) {
      setState(() => _error = errorValidacion);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final payload = TicketValidator.construirPayload(
        tipo: _tipo,
        equipo: _equipo.text,
        descripcion: _desc.text,
        prioridad: _prioridad,
        referencia: _ref.text,
      );
      await SupabaseService.instance.createTicket(payload);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on PostgrestException catch (e) {
      setState(() => _error = TicketValidator.mensajeParaError(e.code));
    } catch (_) {
      setState(() => _error = 'Sin conexión: no se pudo crear el caso');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo caso')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          DropdownButtonFormField<String>(
            value: _tipo,
            decoration: const InputDecoration(labelText: 'Tipo'),
            items: const [
              DropdownMenuItem(value: 'falla', child: Text('Reporte de falla')),
              DropdownMenuItem(value: 'atencion', child: Text('Atención')),
              DropdownMenuItem(value: 'acceso', child: Text('Acceso perdido')),
            ],
            onChanged: (v) => setState(() => _tipo = v!),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _equipo,
            decoration: const InputDecoration(labelText: 'Equipo'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _desc,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Descripción'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _prioridad,
            decoration: const InputDecoration(labelText: 'Prioridad'),
            items: const [
              'Baja',
              'Media',
              'Alta',
            ].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
            onChanged: (v) => setState(() => _prioridad = v!),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _ref,
            decoration: const InputDecoration(
              labelText: 'ID manual (opcional, ej. REP001)',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.amber)),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _loading ? null : _crear,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brand,
              foregroundColor: AppColors.graphite,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: Text(_loading ? 'Creando...' : 'Crear caso'),
          ),
        ],
      ),
    );
  }
}
