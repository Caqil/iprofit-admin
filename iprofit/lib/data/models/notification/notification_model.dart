import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'notification_model.g.dart';

@HiveType(typeId: 33)
@JsonSerializable()
class NotificationModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final String title;

  @HiveField(3)
  final String message;

  @HiveField(4)
  final String type;

  @HiveField(5)
  final bool read;

  @HiveField(6)
  final DateTime createdAt;

  @HiveField(7)
  final DateTime? readAt;

  @HiveField(8)
  final Map<String, dynamic>? data;

  @HiveField(9)
  final String? actionUrl;

  @HiveField(10)
  final String? actionLabel;

  @HiveField(11)
  final String priority;

  @HiveField(12)
  final String? icon;

  @HiveField(13)
  final String? imageUrl;

  @HiveField(14)
  final DateTime? expiresAt;

  @HiveField(15)
  final bool persistent;

  @HiveField(16)
  final List<String> tags;

  @HiveField(17)
  final String? category;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.type,
    this.read = false,
    required this.createdAt,
    this.readAt,
    this.data,
    this.actionUrl,
    this.actionLabel,
    this.priority = 'normal',
    this.icon,
    this.imageUrl,
    this.expiresAt,
    this.persistent = false,
    this.tags = const [],
    this.category,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      _$NotificationModelFromJson(json);
  Map<String, dynamic> toJson() => _$NotificationModelToJson(this);

  // Status helpers
  bool get isUnread => !read;
  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());
  bool get hasAction => actionUrl != null && actionUrl!.isNotEmpty;
  bool get hasData => data != null && data!.isNotEmpty;

  // Priority helpers
  bool get isLowPriority => priority.toLowerCase() == 'low';
  bool get isNormalPriority => priority.toLowerCase() == 'normal';
  bool get isHighPriority => priority.toLowerCase() == 'high';
  bool get isUrgentPriority => priority.toLowerCase() == 'urgent';

  // Type helpers
  bool get isTransactionNotification => type.toLowerCase() == 'transaction';
  bool get isLoanNotification => type.toLowerCase() == 'loan';
  bool get isAccountNotification => type.toLowerCase() == 'account';
  bool get isSystemNotification => type.toLowerCase() == 'system';
  bool get isPromotionNotification => type.toLowerCase() == 'promotion';
  bool get isSecurityNotification => type.toLowerCase() == 'security';
  bool get isReferralNotification => type.toLowerCase() == 'referral';
  bool get isSupportNotification => type.toLowerCase() == 'support';

  String get displayType {
    switch (type.toLowerCase()) {
      case 'transaction':
        return 'Transaction';
      case 'loan':
        return 'Loan';
      case 'account':
        return 'Account';
      case 'system':
        return 'System';
      case 'promotion':
        return 'Promotion';
      case 'security':
        return 'Security';
      case 'referral':
        return 'Referral';
      case 'support':
        return 'Support';
      default:
        return type;
    }
  }

  String get displayPriority {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'Low';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'High';
      case 'urgent':
        return 'Urgent';
      default:
        return priority;
    }
  }

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  // Helper methods for specific notification types
  String? get transactionId => data?['transactionId'] as String?;
  double? get amount => data?['amount'] as double?;
  String? get loanId => data?['loanId'] as String?;
  String? get ticketId => data?['ticketId'] as String?;
  String? get referralCode => data?['referralCode'] as String?;

  NotificationModel copyWith({
    bool? read,
    DateTime? readAt,
    Map<String, dynamic>? data,
  }) {
    return NotificationModel(
      id: id,
      userId: userId,
      title: title,
      message: message,
      type: type,
      read: read ?? this.read,
      createdAt: createdAt,
      readAt: readAt ?? this.readAt,
      data: data ?? this.data,
      actionUrl: actionUrl,
      actionLabel: actionLabel,
      priority: priority,
      icon: icon,
      imageUrl: imageUrl,
      expiresAt: expiresAt,
      persistent: persistent,
      tags: tags,
      category: category,
    );
  }
}

@HiveType(typeId: 34)
@JsonSerializable()
class NotificationSettings extends HiveObject {
  @HiveField(0)
  final bool pushNotifications;

  @HiveField(1)
  final bool emailNotifications;

  @HiveField(2)
  final bool smsNotifications;

  @HiveField(3)
  final bool transactionNotifications;

  @HiveField(4)
  final bool loanNotifications;

  @HiveField(5)
  final bool promotionNotifications;

  @HiveField(6)
  final bool securityNotifications;

  @HiveField(7)
  final bool referralNotifications;

  @HiveField(8)
  final bool supportNotifications;

  @HiveField(9)
  final String quietHoursStart;

  @HiveField(10)
  final String quietHoursEnd;

  @HiveField(11)
  final bool weekendNotifications;

  @HiveField(12)
  final List<String> mutedCategories;

  NotificationSettings({
    this.pushNotifications = true,
    this.emailNotifications = true,
    this.smsNotifications = false,
    this.transactionNotifications = true,
    this.loanNotifications = true,
    this.promotionNotifications = true,
    this.securityNotifications = true,
    this.referralNotifications = true,
    this.supportNotifications = true,
    this.quietHoursStart = '22:00',
    this.quietHoursEnd = '08:00',
    this.weekendNotifications = true,
    this.mutedCategories = const [],
  });

  factory NotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$NotificationSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$NotificationSettingsToJson(this);

  bool isNotificationEnabled(String type) {
    switch (type.toLowerCase()) {
      case 'transaction':
        return transactionNotifications;
      case 'loan':
        return loanNotifications;
      case 'promotion':
        return promotionNotifications;
      case 'security':
        return securityNotifications;
      case 'referral':
        return referralNotifications;
      case 'support':
        return supportNotifications;
      default:
        return true;
    }
  }

  bool isCategoryMuted(String category) {
    return mutedCategories.contains(category);
  }

  bool isInQuietHours() {
    final now = DateTime.now();
    final currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    // Simple time comparison (assuming same day)
    return currentTime.compareTo(quietHoursStart) >= 0 ||
        currentTime.compareTo(quietHoursEnd) <= 0;
  }
}
