import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// String extensions for common operations
extension StringExtensions on String {
  /// Check if string is null or empty
  bool get isNullOrEmpty => isEmpty;

  /// Check if string is not null and not empty
  bool get isNotNullOrEmpty => isNotEmpty;

  /// Capitalize first letter
  String get capitalize {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }

  /// Capitalize each word
  String get capitalizeWords {
    if (isEmpty) return this;
    return split(' ').map((word) => word.capitalize).join(' ');
  }

  /// Remove all whitespace
  String get removeWhitespace => replaceAll(RegExp(r'\s+'), '');

  /// Check if string is a valid email
  bool get isValidEmail {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(this);
  }

  /// Check if string is a valid phone number
  bool get isValidPhone {
    return RegExp(r'^\+?[\d\s\-\(\)]{10,}$').hasMatch(this);
  }

  /// Check if string is a valid URL
  bool get isValidUrl {
    return RegExp(
      r'^https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$',
    ).hasMatch(this);
  }

  /// Check if string contains only numbers
  bool get isNumeric {
    return RegExp(r'^[0-9]+$').hasMatch(this);
  }

  /// Check if string contains only alphabets
  bool get isAlphabetic {
    return RegExp(r'^[a-zA-Z]+$').hasMatch(this);
  }

  /// Check if string is alphanumeric
  bool get isAlphanumeric {
    return RegExp(r'^[a-zA-Z0-9]+$').hasMatch(this);
  }

  /// Convert string to double
  double? get toDouble => double.tryParse(this);

  /// Convert string to int
  int? get toInt => int.tryParse(this);

  /// Convert string to DateTime
  DateTime? get toDateTime => DateTime.tryParse(this);

  /// Truncate string with ellipsis
  String truncate(int maxLength, [String suffix = '...']) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength)}$suffix';
  }

  /// Reverse string
  String get reverse => split('').reversed.join('');

  /// Count occurrences of substring
  int countOccurrences(String substring) {
    return RegExp(RegExp.escape(substring)).allMatches(this).length;
  }

  /// Remove HTML tags
  String get removeHtmlTags {
    return replaceAll(RegExp(r'<[^>]*>'), '');
  }

  /// Convert to snake_case
  String get toSnakeCase {
    return replaceAllMapped(
      RegExp(r'[A-Z]'),
      (match) => '_${match.group(0)!.toLowerCase()}',
    ).replaceAll(RegExp(r'^_'), '');
  }

  /// Convert to camelCase
  String get toCamelCase {
    final words = split(RegExp(r'[\s_-]+'));
    if (words.isEmpty) return this;

    final first = words.first.toLowerCase();
    final rest = words.skip(1).map((word) => word.capitalize);
    return [first, ...rest].join('');
  }

  /// Convert to kebab-case
  String get toKebabCase {
    return replaceAllMapped(
      RegExp(r'[A-Z]'),
      (match) => '-${match.group(0)!.toLowerCase()}',
    ).replaceAll(RegExp(r'^-'), '');
  }

  /// Mask email (show first 2 chars and domain)
  String get maskEmail {
    if (!isValidEmail) return this;
    final parts = split('@');
    final username = parts[0];
    final domain = parts[1];
    final maskedUsername = username.length > 2
        ? '${username.substring(0, 2)}${'*' * (username.length - 2)}'
        : username;
    return '$maskedUsername@$domain';
  }

  /// Mask phone number (show last 4 digits)
  String get maskPhone {
    if (length < 4) return this;
    return '${'*' * (length - 4)}${substring(length - 4)}';
  }

  /// Extract numbers from string
  String get extractNumbers => replaceAll(RegExp(r'[^0-9]'), '');

  /// Extract alphabets from string
  String get extractAlphabets => replaceAll(RegExp(r'[^a-zA-Z]'), '');

  /// Check if string is palindrome
  bool get isPalindrome {
    final clean = toLowerCase().removeWhitespace;
    return clean == clean.reverse;
  }

  /// Generate initials from name
  String get initials {
    final words = trim().split(RegExp(r'\s+'));
    return words
        .take(2)
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
        .join('');
  }

  /// Format as currency
  String formatAsCurrency([String symbol = 'BDT']) {
    final amount = toDouble ?? 0.0;
    return '$symbol ${NumberFormat('#,##0.00').format(amount)}';
  }

  /// Convert to title case
  String get toTitleCase {
    return split(' ')
        .map((word) {
          if (word.isEmpty) return word;
          return word[0].toUpperCase() + word.substring(1).toLowerCase();
        })
        .join(' ');
  }
}

/// Integer extensions
extension IntExtensions on int {
  /// Format as currency
  String formatAsCurrency([String symbol = 'BDT']) {
    return '$symbol ${NumberFormat('#,##0').format(this)}';
  }

  /// Convert to ordinal (1st, 2nd, 3rd, etc.)
  String get ordinal {
    if (this >= 11 && this <= 13) return '${this}th';
    switch (this % 10) {
      case 1:
        return '${this}st';
      case 2:
        return '${this}nd';
      case 3:
        return '${this}rd';
      default:
        return '${this}th';
    }
  }

  /// Check if number is even
  bool get isEven => this % 2 == 0;

  /// Check if number is odd
  bool get isOdd => this % 2 != 0;

  /// Convert to Roman numeral
  String get toRoman {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = [
      'M',
      'CM',
      'D',
      'CD',
      'C',
      'XC',
      'L',
      'XL',
      'X',
      'IX',
      'V',
      'IV',
      'I',
    ];

    String result = '';
    int num = this;

    for (int i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }

    return result;
  }

  /// Format as file size
  String get formatAsFileSize {
    if (this < 1024) return '${this}B';
    if (this < 1024 * 1024) return '${(this / 1024).toStringAsFixed(1)}KB';
    if (this < 1024 * 1024 * 1024)
      return '${(this / (1024 * 1024)).toStringAsFixed(1)}MB';
    return '${(this / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
  }

  /// Convert milliseconds to readable duration
  String get millisecondsToReadable {
    final duration = Duration(milliseconds: this);
    if (duration.inDays > 0) {
      return '${duration.inDays}d ${duration.inHours % 24}h';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else if (duration.inMinutes > 0) {
      return '${duration.inMinutes}m ${duration.inSeconds % 60}s';
    } else {
      return '${duration.inSeconds}s';
    }
  }

  /// Convert to percentage string
  String get toPercentage => '$this%';

  /// Get digit count
  int get digitCount => toString().length;

  /// Check if prime number
  bool get isPrime {
    if (this <= 1) return false;
    if (this <= 3) return true;
    if (this % 2 == 0 || this % 3 == 0) return false;

    for (int i = 5; i * i <= this; i += 6) {
      if (this % i == 0 || this % (i + 2) == 0) return false;
    }

    return true;
  }
}

/// Double extensions
extension DoubleExtensions on double {
  /// Format as currency
  String formatAsCurrency([String symbol = 'BDT']) {
    return '$symbol ${NumberFormat('#,##0.00').format(this)}';
  }

  /// Format as percentage
  String formatAsPercentage([int decimals = 1]) {
    return '${(this * 100).toStringAsFixed(decimals)}%';
  }

  /// Round to specified decimal places
  double roundTo(int decimals) {
    final factor = pow(10, decimals);
    return (this * factor).round() / factor;
  }

  /// Convert to compact format (1.2K, 1.5M, etc.)
  String get toCompact {
    if (this >= 1000000000) {
      return '${(this / 1000000000).toStringAsFixed(1)}B';
    } else if (this >= 1000000) {
      return '${(this / 1000000).toStringAsFixed(1)}M';
    } else if (this >= 1000) {
      return '${(this / 1000).toStringAsFixed(1)}K';
    } else {
      return toStringAsFixed(0);
    }
  }

  /// Check if number is between two values
  bool isBetween(double min, double max) {
    return this >= min && this <= max;
  }

  /// Clamp value between min and max
  double clampTo(double min, double max) {
    return clamp(min, max) as double;
  }

  /// Convert radians to degrees
  double get toDegrees => this * 180 / pi;

  /// Convert degrees to radians
  double get toRadians => this * pi / 180;

  /// Check if value is approximately equal (with tolerance)
  bool isApproximatelyEqual(double other, [double tolerance = 0.001]) {
    return (this - other).abs() < tolerance;
  }

  /// Format as decimal with specified places
  String toDecimal(int places) {
    return toStringAsFixed(places);
  }

  /// Convert to integer percentage
  int get toIntPercentage => (this * 100).round();
}

/// DateTime extensions
extension DateTimeExtensions on DateTime {
  /// Check if date is today
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  /// Check if date is yesterday
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year &&
        month == yesterday.month &&
        day == yesterday.day;
  }

  /// Check if date is tomorrow
  bool get isTomorrow {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return year == tomorrow.year &&
        month == tomorrow.month &&
        day == tomorrow.day;
  }

  /// Get relative time string
  String get relativeTime {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM dd, yyyy').format(this);
    }
  }

  /// Get start of day
  DateTime get startOfDay => DateTime(year, month, day);

  /// Get end of day
  DateTime get endOfDay => DateTime(year, month, day, 23, 59, 59, 999);

  /// Get start of week
  DateTime get startOfWeek {
    final daysFromMonday = weekday - 1;
    return startOfDay.subtract(Duration(days: daysFromMonday));
  }

  /// Get end of week
  DateTime get endOfWeek {
    final daysToSunday = 7 - weekday;
    return endOfDay.add(Duration(days: daysToSunday));
  }

  /// Get start of month
  DateTime get startOfMonth => DateTime(year, month, 1);

  /// Get end of month
  DateTime get endOfMonth {
    final nextMonth = month == 12 ? 1 : month + 1;
    final nextYear = month == 12 ? year + 1 : year;
    return DateTime(nextYear, nextMonth, 1).subtract(const Duration(days: 1));
  }

  /// Get start of year
  DateTime get startOfYear => DateTime(year, 1, 1);

  /// Get end of year
  DateTime get endOfYear => DateTime(year, 12, 31, 23, 59, 59, 999);

  /// Check if weekend
  bool get isWeekend =>
      weekday == DateTime.saturday || weekday == DateTime.sunday;

  /// Check if weekday
  bool get isWeekday => !isWeekend;

  /// Get age from birth date
  int get age {
    final now = DateTime.now();
    int calculatedAge = now.year - year;

    if (now.month < month || (now.month == month && now.day < day)) {
      calculatedAge--;
    }

    return calculatedAge;
  }

  /// Get quarter (1-4)
  int get quarter => ((month - 1) ~/ 3) + 1;

  /// Get days in month
  int get daysInMonth {
    final nextMonth = month == 12
        ? DateTime(year + 1, 1, 1)
        : DateTime(year, month + 1, 1);
    return nextMonth.subtract(const Duration(days: 1)).day;
  }

  /// Format as time only
  String get timeString => DateFormat('hh:mm a').format(this);

  /// Format as date only
  String get dateString => DateFormat('MMM dd, yyyy').format(this);

  /// Format as short date
  String get shortDateString => DateFormat('MM/dd/yyyy').format(this);

  /// Check if date is in future
  bool get isFuture => isAfter(DateTime.now());

  /// Check if date is in past
  bool get isPast => isBefore(DateTime.now());

  /// Copy with time set to specific hour and minute
  DateTime copyWithTime(int hour, int minute, [int second = 0]) {
    return DateTime(year, month, day, hour, minute, second);
  }

  /// Add business days (excluding weekends)
  DateTime addBusinessDays(int days) {
    DateTime result = this;
    int remainingDays = days;

    while (remainingDays > 0) {
      result = result.add(const Duration(days: 1));
      if (result.isWeekday) {
        remainingDays--;
      }
    }

    return result;
  }

  /// Get next business day
  DateTime get nextBusinessDay {
    DateTime next = add(const Duration(days: 1));
    while (next.isWeekend) {
      next = next.add(const Duration(days: 1));
    }
    return next;
  }
}

/// Color extensions
extension ColorExtensions on Color {
  /// Convert to hex string
  String get toHex =>
      '#${value.toRadixString(16).padLeft(8, '0').substring(2)}';

  /// Darken color by percentage
  Color darken([double amount = 0.1]) {
    final hsl = HSLColor.fromColor(this);
    final darkened = hsl.withLightness(
      (hsl.lightness - amount).clamp(0.0, 1.0),
    );
    return darkened.toColor();
  }

  /// Lighten color by percentage
  Color lighten([double amount = 0.1]) {
    final hsl = HSLColor.fromColor(this);
    final lightened = hsl.withLightness(
      (hsl.lightness + amount).clamp(0.0, 1.0),
    );
    return lightened.toColor();
  }

  /// Get complementary color
  Color get complementary {
    final hsl = HSLColor.fromColor(this);
    final complementaryHue = (hsl.hue + 180) % 360;
    return hsl.withHue(complementaryHue).toColor();
  }

  /// Check if color is light
  bool get isLight => computeLuminance() > 0.5;

  /// Check if color is dark
  bool get isDark => !isLight;

  /// Get contrast color (white or black)
  Color get contrastColor => isLight ? Colors.black : Colors.white;

  /// Blend with another color
  Color blend(Color other, double ratio) {
    return Color.lerp(this, other, ratio) ?? this;
  }
}

/// List extensions
extension ListExtensions<T> on List<T> {
  /// Get random element
  T? get random {
    if (isEmpty) return null;
    return this[Random().nextInt(length)];
  }

  /// Get element at index or null if out of bounds
  T? elementAtOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }

  /// Check if index is valid
  bool isValidIndex(int index) {
    return index >= 0 && index < length;
  }

  /// Get first n elements
  List<T> takeFirst(int count) {
    return take(count).toList();
  }

  /// Get last n elements
  List<T> takeLast(int count) {
    if (count >= length) return List.from(this);
    return skip(length - count).toList();
  }

  /// Chunk list into smaller lists
  List<List<T>> chunk(int size) {
    if (size <= 0) return [this];

    final chunks = <List<T>>[];
    for (int i = 0; i < length; i += size) {
      final end = (i + size < length) ? i + size : length;
      chunks.add(sublist(i, end));
    }
    return chunks;
  }

  /// Remove duplicates while preserving order
  List<T> get distinct {
    final seen = <T>{};
    return where(seen.add).toList();
  }

  /// Get duplicates
  List<T> get duplicates {
    final seen = <T>{};
    final duplicates = <T>{};

    for (final item in this) {
      if (!seen.add(item)) {
        duplicates.add(item);
      }
    }

    return duplicates.toList();
  }

  /// Count occurrences of element
  int count(T element) {
    return where((item) => item == element).length;
  }

  /// Check if all elements satisfy condition
  bool all(bool Function(T) test) {
    return every(test);
  }

  /// Check if any element satisfies condition
  bool any(bool Function(T) test) {
    return any(test);
  }

  /// Get elements between two indices
  List<T> slice(int start, [int? end]) {
    final actualEnd = end ?? length;
    return sublist(start, actualEnd);
  }
}

/// Map extensions
extension MapExtensions<K, V> on Map<K, V> {
  /// Get value or default if key doesn't exist
  V getOrDefault(K key, V defaultValue) {
    return this[key] ?? defaultValue;
  }

  /// Check if map has all keys
  bool hasKeys(Iterable<K> keys) {
    return keys.every(containsKey);
  }

  /// Check if map has any of the keys
  bool hasAnyKey(Iterable<K> keys) {
    return keys.any(containsKey);
  }

  /// Get map with only specified keys
  Map<K, V> only(Iterable<K> keys) {
    return Map.fromEntries(entries.where((entry) => keys.contains(entry.key)));
  }

  /// Get map without specified keys
  Map<K, V> except(Iterable<K> keys) {
    return Map.fromEntries(entries.where((entry) => !keys.contains(entry.key)));
  }

  /// Merge with another map
  Map<K, V> merge(Map<K, V> other) {
    return {...this, ...other};
  }
}
