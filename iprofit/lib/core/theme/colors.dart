import 'package:flutter/material.dart';

/// App color constants compatible with ShadCN UI theme system
class AppColors {
  AppColors._();

  // Brand Colors (IProfit Theme)
  static const Color primary = Color(0xFF2563EB); // Blue 600
  static const Color primaryLight = Color(0xFF3B82F6); // Blue 500
  static const Color primaryDark = Color(0xFF1D4ED8); // Blue 700
  static const Color primaryAccent = Color(0xFF1E40AF); // Blue 800

  static const Color secondary = Color(0xFF64748B); // Slate 500
  static const Color secondaryLight = Color(0xFF94A3B8); // Slate 400
  static const Color secondaryDark = Color(0xFF475569); // Slate 600

  // Success Colors (Green palette for positive financial actions)
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color successLight = Color(0xFF34D399); // Emerald 400
  static const Color successDark = Color(0xFF059669); // Emerald 600
  static const Color successBackground = Color(0xFFECFDF5); // Emerald 50

  // Error Colors (Red palette for negative actions/alerts)
  static const Color error = Color(0xFFEF4444); // Red 500
  static const Color errorLight = Color(0xFFF87171); // Red 400
  static const Color errorDark = Color(0xFFDC2626); // Red 600
  static const Color errorBackground = Color(0xFFFEF2F2); // Red 50

  // Warning Colors (Amber palette for caution/pending states)
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningLight = Color(0xFFFBBF24); // Amber 400
  static const Color warningDark = Color(0xFFD97706); // Amber 600
  static const Color warningBackground = Color(0xFFFFFBEB); // Amber 50

  // Info Colors (Blue palette for informational content)
  static const Color info = Color(0xFF3B82F6); // Blue 500
  static const Color infoLight = Color(0xFF60A5FA); // Blue 400
  static const Color infoDark = Color(0xFF2563EB); // Blue 600
  static const Color infoBackground = Color(0xFFEFF6FF); // Blue 50

  // Neutral Colors (Slate palette for text and backgrounds)
  static const Color neutral50 = Color(0xFFF8FAFC);
  static const Color neutral100 = Color(0xFFF1F5F9);
  static const Color neutral200 = Color(0xFFE2E8F0);
  static const Color neutral300 = Color(0xFFCBD5E1);
  static const Color neutral400 = Color(0xFF94A3B8);
  static const Color neutral500 = Color(0xFF64748B);
  static const Color neutral600 = Color(0xFF475569);
  static const Color neutral700 = Color(0xFF334155);
  static const Color neutral800 = Color(0xFF1E293B);
  static const Color neutral900 = Color(0xFF0F172A);

  // Financial Status Colors
  static const Color profit = Color(0xFF10B981); // Green for profits
  static const Color loss = Color(0xFFEF4444); // Red for losses
  static const Color pending = Color(0xFFF59E0B); // Amber for pending
  static const Color approved = Color(0xFF10B981); // Green for approved
  static const Color rejected = Color(0xFFEF4444); // Red for rejected
  static const Color processing = Color(0xFF3B82F6); // Blue for processing

  // Transaction Type Colors
  static const Color deposit = Color(0xFF10B981); // Green
  static const Color withdrawal = Color(0xFFEF4444); // Red
  static const Color transfer = Color(0xFF3B82F6); // Blue
  static const Color bonus = Color(0xFF8B5CF6); // Purple
  static const Color referral = Color(0xFFEC4899); // Pink
  static const Color loan = Color(0xFFF59E0B); // Amber

  // Background Colors
  static const Color backgroundLight = Color(0xFFFFFFFF);
  static const Color backgroundDark = Color(0xFF0F172A);
  static const Color surfaceLight = Color(0xFFF8FAFC);
  static const Color surfaceDark = Color(0xFF1E293B);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color cardDark = Color(0xFF1E293B);

  // Text Colors
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textTertiaryLight = Color(0xFF94A3B8);
  static const Color textTertiaryDark = Color(0xFF64748B);

  // Border Colors
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color borderDark = Color(0xFF334155);
  static const Color dividerLight = Color(0xFFF1F5F9);
  static const Color dividerDark = Color(0xFF1E293B);

  // Special Colors
  static const Color gold = Color(0xFFEAB308); // Yellow 500 for premium/VIP
  static const Color silver = Color(0xFF94A3B8); // Slate 400 for silver tier
  static const Color bronze = Color(0xFFEA580C); // Orange 600 for bronze tier
  static const Color platinum = Color(0xFF6366F1); // Indigo 500 for platinum

  // KYC Status Colors
  static const Color kycPending = Color(0xFFF59E0B); // Amber
  static const Color kycApproved = Color(0xFF10B981); // Green
  static const Color kycRejected = Color(0xFFEF4444); // Red
  static const Color kycUnderReview = Color(0xFF3B82F6); // Blue

  // Loan Status Colors
  static const Color loanActive = Color(0xFF10B981); // Green
  static const Color loanOverdue = Color(0xFFEF4444); // Red
  static const Color loanCompleted = Color(0xFF64748B); // Slate
  static const Color loanPending = Color(0xFFF59E0B); // Amber

  // Plan Colors
  static const Color freePlan = Color(0xFF64748B); // Slate
  static const Color basicPlan = Color(0xFF3B82F6); // Blue
  static const Color premiumPlan = Color(0xFF8B5CF6); // Purple
  static const Color vipPlan = Color(0xFFEAB308); // Gold

  // Chart Colors (for data visualization)
  static const List<Color> chartColors = [
    Color(0xFF3B82F6), // Blue
    Color(0xFF10B981), // Green
    Color(0xFFF59E0B), // Amber
    Color(0xFFEF4444), // Red
    Color(0xFF8B5CF6), // Purple
    Color(0xFFEC4899), // Pink
    Color(0xFF06B6D4), // Cyan
    Color(0xFF84CC16), // Lime
  ];

  // Gradient Colors
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryLight, primary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [successLight, success],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warningGradient = LinearGradient(
    colors: [warningLight, warning],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient errorGradient = LinearGradient(
    colors: [errorLight, error],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Glass morphism colors
  static const Color glassLight = Color(0x10FFFFFF);
  static const Color glassDark = Color(0x10000000);

  /// Get color by transaction type
  static Color getTransactionColor(String type) {
    switch (type.toLowerCase()) {
      case 'deposit':
        return deposit;
      case 'withdrawal':
        return withdrawal;
      case 'transfer':
        return transfer;
      case 'bonus':
        return bonus;
      case 'profit':
        return profit;
      case 'referral':
        return referral;
      case 'loan_repayment':
        return loan;
      default:
        return neutral500;
    }
  }

  /// Get color by status
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'success':
      case 'active':
        return success;
      case 'pending':
      case 'processing':
      case 'under_review':
        return warning;
      case 'rejected':
      case 'failed':
      case 'cancelled':
      case 'overdue':
        return error;
      case 'draft':
      case 'inactive':
        return neutral500;
      default:
        return neutral500;
    }
  }

  /// Get color by priority
  static Color getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'urgent':
        return error;
      case 'medium':
        return warning;
      case 'low':
        return info;
      default:
        return neutral500;
    }
  }

  /// Get color by KYC status
  static Color getKycStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return kycApproved;
      case 'pending':
        return kycPending;
      case 'rejected':
        return kycRejected;
      case 'under_review':
        return kycUnderReview;
      default:
        return neutral500;
    }
  }

  /// Get color by loan status
  static Color getLoanStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'disbursed':
        return loanActive;
      case 'overdue':
        return loanOverdue;
      case 'completed':
      case 'closed':
        return loanCompleted;
      case 'pending':
      case 'under_review':
        return loanPending;
      case 'rejected':
        return error;
      default:
        return neutral500;
    }
  }

  /// Get color by plan type
  static Color getPlanColor(String planName) {
    switch (planName.toLowerCase()) {
      case 'free':
        return freePlan;
      case 'basic':
        return basicPlan;
      case 'premium':
        return premiumPlan;
      case 'vip':
        return vipPlan;
      default:
        return neutral500;
    }
  }

  /// Get random chart color
  static Color getChartColor(int index) {
    return chartColors[index % chartColors.length];
  }

  /// Get background color based on theme
  static Color getBackgroundColor(bool isDark) {
    return isDark ? backgroundDark : backgroundLight;
  }

  /// Get surface color based on theme
  static Color getSurfaceColor(bool isDark) {
    return isDark ? surfaceDark : surfaceLight;
  }

  /// Get card color based on theme
  static Color getCardColor(bool isDark) {
    return isDark ? cardDark : cardLight;
  }

  /// Get primary text color based on theme
  static Color getPrimaryTextColor(bool isDark) {
    return isDark ? textPrimaryDark : textPrimaryLight;
  }

  /// Get secondary text color based on theme
  static Color getSecondaryTextColor(bool isDark) {
    return isDark ? textSecondaryDark : textSecondaryLight;
  }

  /// Get border color based on theme
  static Color getBorderColor(bool isDark) {
    return isDark ? borderDark : borderLight;
  }

  /// Convert hex string to Color
  static Color fromHex(String hex) {
    String hexColor = hex.replaceAll('#', '');
    if (hexColor.length == 6) {
      hexColor = 'FF$hexColor';
    }
    return Color(int.parse(hexColor, radix: 16));
  }

  /// Convert Color to hex string
  static String toHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2).toUpperCase()}';
  }

  /// Lighten a color by a percentage
  static Color lighten(Color color, [double amount = 0.1]) {
    final hsl = HSLColor.fromColor(color);
    final lightened = hsl.withLightness(
      (hsl.lightness + amount).clamp(0.0, 1.0),
    );
    return lightened.toColor();
  }

  /// Darken a color by a percentage
  static Color darken(Color color, [double amount = 0.1]) {
    final hsl = HSLColor.fromColor(color);
    final darkened = hsl.withLightness(
      (hsl.lightness - amount).clamp(0.0, 1.0),
    );
    return darkened.toColor();
  }

  /// Make a color more or less saturated
  static Color saturate(Color color, [double amount = 0.1]) {
    final hsl = HSLColor.fromColor(color);
    final saturated = hsl.withSaturation(
      (hsl.saturation + amount).clamp(0.0, 1.0),
    );
    return saturated.toColor();
  }

  /// Desaturate a color
  static Color desaturate(Color color, [double amount = 0.1]) {
    final hsl = HSLColor.fromColor(color);
    final desaturated = hsl.withSaturation(
      (hsl.saturation - amount).clamp(0.0, 1.0),
    );
    return desaturated.toColor();
  }

  /// Get the complementary color
  static Color complementary(Color color) {
    final hsl = HSLColor.fromColor(color);
    final complementaryHue = (hsl.hue + 180) % 360;
    return hsl.withHue(complementaryHue).toColor();
  }

  /// Check if a color is light
  static bool isLight(Color color) {
    return color.computeLuminance() > 0.5;
  }

  /// Check if a color is dark
  static bool isDark(Color color) {
    return !isLight(color);
  }

  /// Get contrast color (white or black) for text on colored background
  static Color getContrastColor(Color backgroundColor) {
    return isLight(backgroundColor) ? Colors.black : Colors.white;
  }

  /// Generate material color swatch from single color
  static MaterialColor generateMaterialColor(Color color) {
    final strengths = <double>[.05];
    final swatch = <int, Color>{};
    final r = color.red, g = color.green, b = color.blue;

    for (int i = 1; i < 10; i++) {
      strengths.add(0.1 * i);
    }

    for (final strength in strengths) {
      final double ds = 0.5 - strength;
      swatch[(strength * 1000).round()] = Color.fromRGBO(
        r + ((ds < 0 ? r : (255 - r)) * ds).round(),
        g + ((ds < 0 ? g : (255 - g)) * ds).round(),
        b + ((ds < 0 ? b : (255 - b)) * ds).round(),
        1,
      );
    }

    return MaterialColor(color.value, swatch);
  }
}
