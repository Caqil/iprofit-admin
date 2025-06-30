import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class AppTheme {
  static ShadThemeData get lightTheme {
    return ShadThemeData(
      colorScheme: const ShadSlateColorScheme.light(),
      brightness: Brightness.light,
    );
  }

  static ShadThemeData get darkTheme {
    return ShadThemeData(
      colorScheme: const ShadSlateColorScheme.dark(),
      brightness: Brightness.dark,
    );
  }
}
