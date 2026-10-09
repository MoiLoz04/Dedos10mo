import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const graphite = Color(0xFF14171C);
  static const graphite2 = Color(0xFF1C2128);
  static const bone = Color(0xFFF7F7F4);
  static const steel = Color(0xFF5B6470);
  static const brand = Color(0xFF22C55E);
  static const amber = Color(0xFFF59E0B);
}

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.graphite,
    fontFamily: GoogleFonts.inter().fontFamily,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.brand,
      brightness: Brightness.dark,
      surface: AppColors.graphite,
    ),
  );
}
