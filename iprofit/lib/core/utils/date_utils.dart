import 'package:intl/intl.dart';

class DateUtils {
  // Common date formats
  static const String defaultDateFormat = 'MMM dd, yyyy';
  static const String shortDateFormat = 'MM/dd/yyyy';
  static const String longDateFormat = 'EEEE, MMMM dd, yyyy';
  static const String timeFormat = 'hh:mm a';
  static const String dateTimeFormat = 'MMM dd, yyyy hh:mm a';
  static const String iso8601Format = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
  static const String apiDateFormat = 'yyyy-MM-dd';
  static const String transactionDateFormat = 'MMM dd, yyyy • hh:mm a';
  static const String shortMonthFormat = 'MMM yyyy';

  // Date formatters
  static final DateFormat _defaultFormatter = DateFormat(defaultDateFormat);
  static final DateFormat _shortFormatter = DateFormat(shortDateFormat);
  static final DateFormat _longFormatter = DateFormat(longDateFormat);
  static final DateFormat _timeFormatter = DateFormat(timeFormat);
  static final DateFormat _dateTimeFormatter = DateFormat(dateTimeFormat);
  static final DateFormat _apiFormatter = DateFormat(apiDateFormat);
  static final DateFormat _transactionFormatter = DateFormat(
    transactionDateFormat,
  );
  static final DateFormat _shortMonthFormatter = DateFormat(shortMonthFormat);

  /// Format date using default format (MMM dd, yyyy)
  static String formatDate(DateTime date) {
    return _defaultFormatter.format(date);
  }

  /// Format date using short format (MM/dd/yyyy)
  static String formatShortDate(DateTime date) {
    return _shortFormatter.format(date);
  }

  /// Format date using long format (EEEE, MMMM dd, yyyy)
  static String formatLongDate(DateTime date) {
    return _longFormatter.format(date);
  }

  /// Format time only (hh:mm a)
  static String formatTime(DateTime date) {
    return _timeFormatter.format(date);
  }

  /// Format date and time (MMM dd, yyyy hh:mm a)
  static String formatDateTime(DateTime date) {
    return _dateTimeFormatter.format(date);
  }

  /// Format date for API calls (yyyy-MM-dd)
  static String formatForApi(DateTime date) {
    return _apiFormatter.format(date);
  }

  /// Format date for transactions (MMM dd, yyyy • hh:mm a)
  static String formatTransactionDate(DateTime date) {
    return _transactionFormatter.format(date);
  }

  /// Format month and year (MMM yyyy)
  static String formatShortMonth(DateTime date) {
    return _shortMonthFormatter.format(date);
  }

  /// Format date with custom pattern
  static String formatCustom(DateTime date, String pattern) {
    return DateFormat(pattern).format(date);
  }

  /// Parse date from string with custom format
  static DateTime? parseDate(String dateString, [String? format]) {
    try {
      if (format != null) {
        return DateFormat(format).parse(dateString);
      }
      // Try common formats
      return DateTime.tryParse(dateString);
    } catch (e) {
      return null;
    }
  }

  /// Get relative time string (e.g., "2 hours ago", "Yesterday")
  static String getRelativeTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

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
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '${weeks}w ago';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '${months}mo ago';
    } else {
      final years = (difference.inDays / 365).floor();
      return '${years}y ago';
    }
  }

  /// Get time ago with detailed format
  static String getDetailedTimeAgo(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final minutes = difference.inMinutes;
      return '$minutes minute${minutes == 1 ? '' : 's'} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours hour${hours == 1 ? '' : 's'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return '$days day${days == 1 ? '' : 's'} ago';
    } else {
      return formatDate(date);
    }
  }

  /// Check if date is today
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Check if date is yesterday
  static bool isYesterday(DateTime date) {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year &&
        date.month == yesterday.month &&
        date.day == yesterday.day;
  }

  /// Check if date is in current week
  static bool isThisWeek(DateTime date) {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final endOfWeek = startOfWeek.add(const Duration(days: 6));

    return date.isAfter(startOfWeek.subtract(const Duration(days: 1))) &&
        date.isBefore(endOfWeek.add(const Duration(days: 1)));
  }

  /// Check if date is in current month
  static bool isThisMonth(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month;
  }

  /// Check if date is in current year
  static bool isThisYear(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year;
  }

  /// Get start of day
  static DateTime startOfDay(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  /// Get end of day
  static DateTime endOfDay(DateTime date) {
    return DateTime(date.year, date.month, date.day, 23, 59, 59, 999);
  }

  /// Get start of week (Monday)
  static DateTime startOfWeek(DateTime date) {
    final daysFromMonday = date.weekday - 1;
    return startOfDay(date.subtract(Duration(days: daysFromMonday)));
  }

  /// Get end of week (Sunday)
  static DateTime endOfWeek(DateTime date) {
    final daysToSunday = 7 - date.weekday;
    return endOfDay(date.add(Duration(days: daysToSunday)));
  }

  /// Get start of month
  static DateTime startOfMonth(DateTime date) {
    return DateTime(date.year, date.month, 1);
  }

  /// Get end of month
  static DateTime endOfMonth(DateTime date) {
    final nextMonth = date.month == 12 ? 1 : date.month + 1;
    final year = date.month == 12 ? date.year + 1 : date.year;
    return DateTime(year, nextMonth, 1).subtract(const Duration(days: 1));
  }

  /// Get start of year
  static DateTime startOfYear(DateTime date) {
    return DateTime(date.year, 1, 1);
  }

  /// Get end of year
  static DateTime endOfYear(DateTime date) {
    return DateTime(date.year, 12, 31, 23, 59, 59, 999);
  }

  /// Calculate age from birth date
  static int calculateAge(DateTime birthDate) {
    final now = DateTime.now();
    int age = now.year - birthDate.year;

    if (now.month < birthDate.month ||
        (now.month == birthDate.month && now.day < birthDate.day)) {
      age--;
    }

    return age;
  }

  /// Get days between two dates
  static int daysBetween(DateTime from, DateTime to) {
    return to.difference(from).inDays;
  }

  /// Get working days between two dates (excluding weekends)
  static int workingDaysBetween(DateTime from, DateTime to) {
    int workingDays = 0;
    DateTime current = startOfDay(from);
    final end = startOfDay(to);

    while (current.isBefore(end) || current.isAtSameMomentAs(end)) {
      if (current.weekday != DateTime.saturday &&
          current.weekday != DateTime.sunday) {
        workingDays++;
      }
      current = current.add(const Duration(days: 1));
    }

    return workingDays;
  }

  /// Check if date is weekend
  static bool isWeekend(DateTime date) {
    return date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
  }

  /// Check if date is weekday
  static bool isWeekday(DateTime date) {
    return !isWeekend(date);
  }

  /// Get next working day
  static DateTime nextWorkingDay(DateTime date) {
    DateTime next = date.add(const Duration(days: 1));
    while (isWeekend(next)) {
      next = next.add(const Duration(days: 1));
    }
    return next;
  }

  /// Get previous working day
  static DateTime previousWorkingDay(DateTime date) {
    DateTime previous = date.subtract(const Duration(days: 1));
    while (isWeekend(previous)) {
      previous = previous.subtract(const Duration(days: 1));
    }
    return previous;
  }

  /// Get financial quarter from date
  static int getQuarter(DateTime date) {
    return ((date.month - 1) ~/ 3) + 1;
  }

  /// Get quarter name (Q1, Q2, Q3, Q4)
  static String getQuarterName(DateTime date) {
    return 'Q${getQuarter(date)}';
  }

  /// Get start of quarter
  static DateTime startOfQuarter(DateTime date) {
    final quarter = getQuarter(date);
    final month = (quarter - 1) * 3 + 1;
    return DateTime(date.year, month, 1);
  }

  /// Get end of quarter
  static DateTime endOfQuarter(DateTime date) {
    final quarter = getQuarter(date);
    final month = quarter * 3;
    return endOfMonth(DateTime(date.year, month, 1));
  }

  /// Check if date is in business hours (9 AM - 5 PM)
  static bool isBusinessHours(DateTime date) {
    return date.hour >= 9 && date.hour < 17 && isWeekday(date);
  }

  /// Get next business day with business hours
  static DateTime nextBusinessDateTime(DateTime date) {
    DateTime next = date;

    // If after business hours, move to next day 9 AM
    if (next.hour >= 17) {
      next = DateTime(next.year, next.month, next.day + 1, 9, 0);
    }

    // If weekend, move to Monday 9 AM
    while (isWeekend(next)) {
      next = next.add(const Duration(days: 1));
    }

    // If before business hours, set to 9 AM
    if (next.hour < 9) {
      next = DateTime(next.year, next.month, next.day, 9, 0);
    }

    return next;
  }

  /// Format duration in human readable format
  static String formatDuration(Duration duration) {
    if (duration.inDays > 0) {
      return '${duration.inDays}d ${duration.inHours % 24}h';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else if (duration.inMinutes > 0) {
      return '${duration.inMinutes}m';
    } else {
      return '${duration.inSeconds}s';
    }
  }

  /// Get date range string (e.g., "Jan 1 - Jan 31, 2024")
  static String formatDateRange(DateTime start, DateTime end) {
    if (start.year == end.year) {
      if (start.month == end.month) {
        return '${DateFormat('MMM d').format(start)} - ${DateFormat('d, yyyy').format(end)}';
      } else {
        return '${DateFormat('MMM d').format(start)} - ${DateFormat('MMM d, yyyy').format(end)}';
      }
    } else {
      return '${DateFormat('MMM d, yyyy').format(start)} - ${DateFormat('MMM d, yyyy').format(end)}';
    }
  }

  /// Convert DateTime to UTC ISO string for API
  static String toUtcIsoString(DateTime date) {
    return date.toUtc().toIso8601String();
  }

  /// Parse UTC ISO string from API
  static DateTime? fromUtcIsoString(String isoString) {
    try {
      return DateTime.parse(isoString).toLocal();
    } catch (e) {
      return null;
    }
  }
}
