import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/supabase_service.dart';
import '../theme.dart';

import 'dart:io';

class ChatScreen extends StatefulWidget {
  final Map<String, dynamic> ticket;
  const ChatScreen({super.key, required this.ticket});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _c = TextEditingController();
  final _scroll = ScrollController();
  final _svc = SupabaseService.instance;

  String _rol = 'usuario';
  String _nombre = 'Usuario';
  List<Map<String, dynamic>> _msgs = [];
  bool _first = true;
  StreamSubscription<List<Map<String, dynamic>>>? _sub;

  String get _ticketId => widget.ticket['id'] as String;

  @override
  void initState() {
    super.initState();
    _svc.fetchMyProfile().then((p) {
      if (!mounted) return;
      setState(() {
        _rol = p['role'] as String;
        _nombre =
            (p['nombre_completo'] as String?) ?? _svc.currentEmail ?? 'Usuario';
      });
    });
    _suscribir();
  }

  void _suscribir() {
    _sub?.cancel();
    _sub = _svc.messagesStream(_ticketId).listen((msgs) {
      if (!mounted) return;
      final me = _svc.currentUserId;
      // Notificación al llegar mensaje de otra persona
      if (!_first && msgs.length > _msgs.length && msgs.isNotEmpty) {
        final last = msgs.last;
        if (last['sender_id'] != me) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Nuevo mensaje de ${last['sender_name']}')),
          );
        }
      }
      _first = false;
      setState(() => _msgs = msgs);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(
            _scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _sub?.cancel();
    _c.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _snack(String t) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));

  Future<void> _enviar() async {
    if (_c.text.trim().isEmpty) {
      _snack('No puedes enviar un mensaje vacío');
      return;
    }
    try {
      await _svc.sendMessage(_ticketId, _c.text, _nombre, _rol);
      _c.clear();
      _snack('Mensaje enviado ✓');
    } catch (_) {
      _snack('Sin conexión: no se pudo enviar');
    }
  }

  Future<void> _adjuntar() async {
    try {
      final files = await FilePicker.pickFiles();
      if (files.isEmpty) return;

      final f = files.first;
      if (f.path == null) {
        _snack('No se pudo leer el archivo');
        return;
      }

      final bytes = await File(f.path!).readAsBytes();
      await _svc.sendFile(_ticketId, f.name, bytes, _nombre, _rol);
      _snack('Archivo enviado ✓');
    } catch (_) {
      _snack('No se pudo subir el archivo');
    }
  }

  Future<void> _abrir(String path) async {
    try {
      final url = await _svc.signedUrl(path);
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (_) {
      _snack('No se pudo abrir el archivo');
    }
  }

  Future<void> _limpiar() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('¿Borrar historial?'),
        content: const Text('Se eliminarán todos los mensajes de este caso.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _svc.clearHistory(_ticketId);
      _first = true;
      _suscribir(); // el stream puede no emitir en delete: se vuelve a suscribir
    } catch (_) {
      _snack('No se pudo borrar');
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = _svc.currentUserId;
    final cont = <String, int>{};
    for (final m in _msgs) {
      final n = '${m['sender_name']}';
      cont[n] = (cont[n] ?? 0) + 1;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.ticket['referencia']}'),
        actions: [
          if (_rol == 'admin')
            IconButton(
              tooltip: 'Limpiar historial',
              icon: const Icon(Icons.delete_outline),
              onPressed: _limpiar,
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              cont.entries.map((e) => '${e.key}: ${e.value}').join(' | '),
              style: const TextStyle(fontSize: 11, color: AppColors.steel),
            ),
          ),
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(12),
              itemCount: _msgs.length,
              itemBuilder: (_, i) => _Burbuja(
                m: _msgs[i],
                mio: _msgs[i]['sender_id'] == me,
                onArchivo: _abrir,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file, color: AppColors.steel),
                    onPressed: _adjuntar,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _c,
                      decoration: const InputDecoration(
                        hintText: 'Escribe un mensaje',
                      ),
                      onSubmitted: (_) => _enviar(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: AppColors.brand),
                    onPressed: _enviar,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Burbuja extends StatelessWidget {
  final Map<String, dynamic> m;
  final bool mio;
  final void Function(String path) onArchivo;
  const _Burbuja({required this.m, required this.mio, required this.onArchivo});

  @override
  Widget build(BuildContext context) {
    final hora = DateTime.tryParse('${m['created_at']}')?.toLocal();
    final hh = hora == null
        ? ''
        : '${hora.hour.toString().padLeft(2, '0')}:${hora.minute.toString().padLeft(2, '0')}';
    final archivo = m['archivo_path'] as String?;

    return Align(
      alignment: mio ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: mio ? AppColors.brand : AppColors.graphite2,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${m['sender_name']} · ${m['sender_role']}',
              style: TextStyle(
                fontSize: 10,
                color: mio ? AppColors.graphite : AppColors.steel,
              ),
            ),
            const SizedBox(height: 2),
            if (archivo != null)
              InkWell(
                onTap: () => onArchivo(archivo),
                child: Text(
                  '📎 ${m['contenido']}',
                  style: TextStyle(
                    decoration: TextDecoration.underline,
                    color: mio ? AppColors.graphite : Colors.white,
                  ),
                ),
              )
            else
              Text(
                '${m['contenido']}',
                style: TextStyle(
                  color: mio ? AppColors.graphite : Colors.white,
                ),
              ),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                hh,
                style: TextStyle(
                  fontSize: 10,
                  color: mio ? AppColors.graphite : AppColors.steel,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
