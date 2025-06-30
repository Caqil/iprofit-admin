import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';

class DeviceUtils {
  /// Check if running on mobile platform
  static bool get isMobile => Platform.isAndroid || Platform.isIOS;

  /// Check if running on desktop platform
  static bool get isDesktop =>
      Platform.isWindows || Platform.isLinux || Platform.isMacOS;

  /// Check if running on web
  static bool get isWeb => kIsWeb;

  /// Check if running on Android
  static bool get isAndroid => Platform.isAndroid;

  /// Check if running on iOS
  static bool get isIOS => Platform.isIOS;

  /// Check if running on Windows
  static bool get isWindows => Platform.isWindows;

  /// Check if running on macOS
  static bool get isMacOS => Platform.isMacOS;

  /// Check if running on Linux
  static bool get isLinux => Platform.isLinux;

  /// Check if app is running in debug mode
  static bool get isDebugMode => kDebugMode;

  /// Check if app is running in release mode
  static bool get isReleaseMode => kReleaseMode;

  /// Check if app is running in profile mode
  static bool get isProfileMode => kProfileMode;

  /// Get platform name as string
  static String get platformName {
    if (kIsWeb) return 'Web';
    if (Platform.isAndroid) return 'Android';
    if (Platform.isIOS) return 'iOS';
    if (Platform.isWindows) return 'Windows';
    if (Platform.isMacOS) return 'macOS';
    if (Platform.isLinux) return 'Linux';
    return 'Unknown';
  }

  /// Hide keyboard
  static void hideKeyboard() {
    SystemChannels.textInput.invokeMethod('TextInput.hide');
  }

  /// Show keyboard
  static void showKeyboard() {
    SystemChannels.textInput.invokeMethod('TextInput.show');
  }

  /// Unfocus current focus
  static void unfocus(BuildContext context) {
    FocusScope.of(context).unfocus();
  }

  /// Haptic feedback - light impact
  static Future<void> lightImpact() async {
    if (isMobile) {
      await HapticFeedback.lightImpact();
    }
  }

  /// Haptic feedback - medium impact
  static Future<void> mediumImpact() async {
    if (isMobile) {
      await HapticFeedback.mediumImpact();
    }
  }

  /// Haptic feedback - heavy impact
  static Future<void> heavyImpact() async {
    if (isMobile) {
      await HapticFeedback.heavyImpact();
    }
  }

  /// Haptic feedback - selection click
  static Future<void> selectionClick() async {
    if (isMobile) {
      await HapticFeedback.selectionClick();
    }
  }

  /// Vibrate device
  static Future<void> vibrate() async {
    if (isMobile) {
      await HapticFeedback.vibrate();
    }
  }

  /// Set system UI overlay style
  static void setSystemUIOverlayStyle({
    Color? statusBarColor,
    Brightness? statusBarIconBrightness,
    Color? systemNavigationBarColor,
    Brightness? systemNavigationBarIconBrightness,
  }) {
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: statusBarColor ?? Colors.transparent,
        statusBarIconBrightness: statusBarIconBrightness ?? Brightness.dark,
        systemNavigationBarColor: systemNavigationBarColor,
        systemNavigationBarIconBrightness: systemNavigationBarIconBrightness,
      ),
    );
  }

  /// Set preferred orientations
  static Future<void> setPreferredOrientations(
    List<DeviceOrientation> orientations,
  ) async {
    await SystemChrome.setPreferredOrientations(orientations);
  }

  /// Lock to portrait mode
  static Future<void> lockPortrait() async {
    await setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  }

  /// Lock to landscape mode
  static Future<void> lockLandscape() async {
    await setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  /// Allow all orientations
  static Future<void> allowAllOrientations() async {
    await setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  /// Get screen size
  static Size getScreenSize(BuildContext context) {
    return MediaQuery.of(context).size;
  }

  /// Get screen width
  static double getScreenWidth(BuildContext context) {
    return MediaQuery.of(context).size.width;
  }

  /// Get screen height
  static double getScreenHeight(BuildContext context) {
    return MediaQuery.of(context).size.height;
  }

  /// Get device pixel ratio
  static double getPixelRatio(BuildContext context) {
    return MediaQuery.of(context).devicePixelRatio;
  }

  /// Get status bar height
  static double getStatusBarHeight(BuildContext context) {
    return MediaQuery.of(context).padding.top;
  }

  /// Get bottom padding (safe area)
  static double getBottomPadding(BuildContext context) {
    return MediaQuery.of(context).padding.bottom;
  }

  /// Get keyboard height
  static double getKeyboardHeight(BuildContext context) {
    return MediaQuery.of(context).viewInsets.bottom;
  }

  /// Check if keyboard is visible
  static bool isKeyboardVisible(BuildContext context) {
    return MediaQuery.of(context).viewInsets.bottom > 0;
  }

  /// Check if device is in dark mode
  static bool isDarkMode(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark;
  }

  /// Check if device is in portrait mode
  static bool isPortrait(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.portrait;
  }

  /// Check if device is in landscape mode
  static bool isLandscape(BuildContext context) {
    return MediaQuery.of(context).orientation == Orientation.landscape;
  }

  /// Check if device is a tablet
  static bool isTablet(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final diagonal = sqrt(pow(size.width, 2) + pow(size.height, 2));
    final pixelRatio = MediaQuery.of(context).devicePixelRatio;
    final diagonalInches = diagonal / (pixelRatio * 160);
    return diagonalInches >= 7.0;
  }

  /// Check if device is a phone
  static bool isPhone(BuildContext context) {
    return !isTablet(context);
  }

  /// Get device type as string
  static String getDeviceType(BuildContext context) {
    if (isTablet(context)) return 'Tablet';
    if (isPhone(context)) return 'Phone';
    return 'Unknown';
  }

  /// Get responsive value based on device type
  static T responsive<T>(
    BuildContext context, {
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    if (isDesktop) return desktop ?? tablet ?? mobile;
    if (isTablet(context)) return tablet ?? mobile;
    return mobile;
  }

  /// Get responsive padding
  static EdgeInsets getResponsivePadding(BuildContext context) {
    return responsive(
      context,
      mobile: const EdgeInsets.all(16.0),
      tablet: const EdgeInsets.all(24.0),
      desktop: const EdgeInsets.all(32.0),
    );
  }

  /// Get responsive font size
  static double getResponsiveFontSize(
    BuildContext context, {
    required double mobile,
    double? tablet,
    double? desktop,
  }) {
    return responsive(
      context,
      mobile: mobile,
      tablet: tablet ?? mobile * 1.1,
      desktop: desktop ?? mobile * 1.2,
    );
  }

  /// Get responsive grid count
  static int getResponsiveGridCount(BuildContext context) {
    return responsive(context, mobile: 2, tablet: 3, desktop: 4);
  }

  /// Check if text scale factor is large (accessibility)
  static bool isLargeTextScale(BuildContext context) {
    return MediaQuery.of(context).textScaleFactor > 1.3;
  }

  /// Get safe text scale factor (max 1.3)
  static double getSafeTextScaleFactor(BuildContext context) {
    final scale = MediaQuery.of(context).textScaleFactor;
    return scale > 1.3 ? 1.3 : scale;
  }

  /// Copy text to clipboard
  static Future<void> copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
  }

  /// Get text from clipboard
  static Future<String?> getClipboardText() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    return data?.text;
  }

  /// Check if clipboard has text
  static Future<bool> hasClipboardText() async {
    return await Clipboard.hasStrings();
  }

  /// Generate a random device identifier
  static String generateDeviceId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random.secure();
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final randomPart = List.generate(
      8,
      (index) => chars[random.nextInt(chars.length)],
    ).join();
    return '${platformName.toLowerCase()}_${timestamp}_$randomPart';
  }

  /// Get app bar height
  static double getAppBarHeight() {
    return kToolbarHeight;
  }

  /// Get bottom navigation bar height
  static double getBottomNavBarHeight() {
    return kBottomNavigationBarHeight;
  }

  /// Get floating action button height
  static double getFabHeight() {
    return 56.0;
  }

  /// Calculate content height (screen height - app bar - bottom nav - status bar)
  static double getContentHeight(BuildContext context) {
    final screenHeight = getScreenHeight(context);
    final statusBarHeight = getStatusBarHeight(context);
    final appBarHeight = getAppBarHeight();
    final bottomNavHeight = getBottomNavBarHeight();
    final bottomPadding = getBottomPadding(context);

    return screenHeight -
        statusBarHeight -
        appBarHeight -
        bottomNavHeight -
        bottomPadding;
  }

  /// Check if device supports biometrics
  static bool get supportsBiometrics {
    // This would typically use local_auth package
    // For now, return true for mobile platforms
    return isMobile;
  }

  /// Check if device supports NFC
  static bool get supportsNFC {
    // This would typically use nfc package
    // For now, return true for Android
    return isAndroid;
  }

  /// Check if device has network connectivity
  static bool get hasNetworkConnectivity {
    // This would typically use connectivity_plus package
    // For now, return true (should be handled by connectivity provider)
    return true;
  }

  /// Get device performance tier
  static DevicePerformanceTier getPerformanceTier(BuildContext context) {
    final pixelRatio = getPixelRatio(context);
    final screenSize = getScreenSize(context);
    final totalPixels = screenSize.width * screenSize.height * pixelRatio;

    // Basic heuristic based on screen resolution
    if (totalPixels > 2000000) {
      // High resolution devices
      return DevicePerformanceTier.high;
    } else if (totalPixels > 1000000) {
      // Medium resolution devices
      return DevicePerformanceTier.medium;
    } else {
      return DevicePerformanceTier.low;
    }
  }

  /// Check if device is low-end
  static bool isLowEndDevice(BuildContext context) {
    return getPerformanceTier(context) == DevicePerformanceTier.low;
  }

  /// Check if device is high-end
  static bool isHighEndDevice(BuildContext context) {
    return getPerformanceTier(context) == DevicePerformanceTier.high;
  }

  /// Get optimal image quality based on device performance
  static double getOptimalImageQuality(BuildContext context) {
    switch (getPerformanceTier(context)) {
      case DevicePerformanceTier.high:
        return 1.0;
      case DevicePerformanceTier.medium:
        return 0.8;
      case DevicePerformanceTier.low:
        return 0.6;
    }
  }

  /// Get maximum concurrent network requests based on device performance
  static int getMaxConcurrentRequests(BuildContext context) {
    switch (getPerformanceTier(context)) {
      case DevicePerformanceTier.high:
        return 6;
      case DevicePerformanceTier.medium:
        return 4;
      case DevicePerformanceTier.low:
        return 2;
    }
  }

  /// Get cache size based on device performance
  static int getCacheSize(BuildContext context) {
    switch (getPerformanceTier(context)) {
      case DevicePerformanceTier.high:
        return 100 * 1024 * 1024; // 100MB
      case DevicePerformanceTier.medium:
        return 50 * 1024 * 1024; // 50MB
      case DevicePerformanceTier.low:
        return 25 * 1024 * 1024; // 25MB
    }
  }

  /// Check if device supports advanced animations
  static bool supportsAdvancedAnimations(BuildContext context) {
    return !isLowEndDevice(context);
  }

  /// Get animation duration based on device performance
  static Duration getAnimationDuration(BuildContext context) {
    if (isLowEndDevice(context)) {
      return const Duration(milliseconds: 150);
    }
    return const Duration(milliseconds: 300);
  }
}

enum DevicePerformanceTier { low, medium, high }
