import 'package:flutter/material.dart';

import '../theme.dart';
import 'home_screen.dart';
import 'qr_scanner_screen.dart';

class InvalidQrScreen extends StatelessWidget {
  const InvalidQrScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.error_outline, color: AppColors.amber, size: 64),
              const SizedBox(height: 16),
              const Text(
                'Código no válido',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'El código venció, ya se usó o no pertenece a tu cuenta. Genera uno nuevo desde el sitio web.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.steel),
              ),
              const SizedBox(height: 28),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: AppColors.graphite,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Escanear nuevamente'),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const HomeScreen()),
                  (route) => false,
                ),
                child: const Text('Volver al inicio'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
