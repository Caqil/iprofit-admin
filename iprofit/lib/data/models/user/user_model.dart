import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import '../auth/signup_request.dart'; // For Address class

part 'user_model.g.dart';

@HiveType(typeId: 55)
@JsonSerializable()
class UserModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final String email;

  @HiveField(3)
  final String? phone;

  @HiveField(4)
  final double balance;

  @HiveField(5)
  final String status;

  @HiveField(6)
  final String kycStatus;

  @HiveField(7)
  final bool emailVerified;

  @HiveField(8)
  final bool phoneVerified;

  @HiveField(9)
  final bool twoFactorEnabled;

  @HiveField(10)
  final String? planId;

  @HiveField(11)
  final String? referralCode;

  @HiveField(12)
  final DateTime? dateOfBirth;

  @HiveField(13)
  final Address? address;

  @HiveField(14)
  final DateTime createdAt;

  @HiveField(15)
  final DateTime updatedAt;

  @HiveField(16)
  final DateTime? lastLoginAt;

  @HiveField(17)
  final String? avatar;

  @HiveField(18)
  final String userType;

  @HiveField(19)
  final UserPreferences? preferences;

  @HiveField(20)
  final UserLimits? limits;

  @HiveField(21)
  final UserStats? stats;

  @HiveField(22)
  final List<String> roles;

  @HiveField(23)
  final Map<String, dynamic>? metadata;

  @HiveField(24)
  final DateTime? emailVerifiedAt;

  @HiveField(25)
  final DateTime? phoneVerifiedAt;

  @HiveField(26)
  final String? timezone;

  @HiveField(27)
  final String? language;

  @HiveField(28)
  final String? currency;

  @HiveField(29)
  final bool isOnline;

  @HiveField(30)
  final DateTime? lastSeenAt;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.balance = 0.0,
    this.status = 'Active',
    this.kycStatus = 'Pending',
    this.emailVerified = false,
    this.phoneVerified = false,
    this.twoFactorEnabled = false,
    this.planId,
    this.referralCode,
    this.dateOfBirth,
    this.address,
    required this.createdAt,
    required this.updatedAt,
    this.lastLoginAt,
    this.avatar,
    this.userType = 'user',
    this.preferences,
    this.limits,
    this.stats,
    this.roles = const [],
    this.metadata,
    this.emailVerifiedAt,
    this.phoneVerifiedAt,
    this.timezone,
    this.language,
    this.currency,
    this.isOnline = false,
    this.lastSeenAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  // Status helpers
  bool get isActive => status.toLowerCase() == 'active';
  bool get isSuspended => status.toLowerCase() == 'suspended';
  bool get isDeactivated => status.toLowerCase() == 'deactivated';
  bool get isBanned => status.toLowerCase() == 'banned';

  // KYC helpers
  bool get isKycApproved => kycStatus.toLowerCase() == 'approved';
  bool get isKycPending => kycStatus.toLowerCase() == 'pending';
  bool get isKycRejected => kycStatus.toLowerCase() == 'rejected';
  bool get isKycUnderReview => kycStatus.toLowerCase() == 'under_review';

  // Verification helpers
  bool get isFullyVerified => emailVerified && phoneVerified && isKycApproved;
  bool get needsVerification =>
      !emailVerified || !phoneVerified || !isKycApproved;
  bool get canTrade => isActive && isFullyVerified;

  // User type helpers
  bool get isUser => userType.toLowerCase() == 'user';
  bool get isAdmin => userType.toLowerCase() == 'admin';
  bool get isModerator => userType.toLowerCase() == 'moderator';
  bool get isVip => roles.contains('vip');
  bool get isPremium => roles.contains('premium');

  // Display helpers
  String get displayName => name.isNotEmpty ? name : email.split('@')[0];
  String get initials => name.isNotEmpty
      ? name.split(' ').map((n) => n[0]).take(2).join().toUpperCase()
      : email[0].toUpperCase();

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'suspended':
        return 'Suspended';
      case 'deactivated':
        return 'Deactivated';
      case 'banned':
        return 'Banned';
      default:
        return status;
    }
  }

  String get displayKycStatus {
    switch (kycStatus.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      default:
        return kycStatus;
    }
  }

  // Age calculation
  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    final age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      return age - 1;
    }
    return age;
  }

  // Membership duration
  int get daysSinceJoined => DateTime.now().difference(createdAt).inDays;
  bool get isNewUser => daysSinceJoined <= 30;

  // Activity helpers
  bool get hasRecentActivity =>
      lastLoginAt != null &&
      DateTime.now().difference(lastLoginAt!).inDays <= 7;

  String get lastSeenText {
    if (isOnline) return 'Online';
    if (lastSeenAt == null) return 'Never';

    final difference = DateTime.now().difference(lastSeenAt!);
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

  // Balance formatting
  String get balanceFormatted {
    final currencySymbol = currency ?? 'BDT';
    return '$currencySymbol ${balance.toStringAsFixed(2)}';
  }

  // Copy with method for updates
  UserModel copyWith({
    String? name,
    String? phone,
    double? balance,
    String? status,
    String? kycStatus,
    bool? emailVerified,
    bool? phoneVerified,
    bool? twoFactorEnabled,
    String? planId,
    DateTime? dateOfBirth,
    Address? address,
    DateTime? updatedAt,
    DateTime? lastLoginAt,
    String? avatar,
    UserPreferences? preferences,
    UserLimits? limits,
    UserStats? stats,
    List<String>? roles,
    Map<String, dynamic>? metadata,
    String? timezone,
    String? language,
    String? currency,
    bool? isOnline,
    DateTime? lastSeenAt,
  }) {
    return UserModel(
      id: id,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      balance: balance ?? this.balance,
      status: status ?? this.status,
      kycStatus: kycStatus ?? this.kycStatus,
      emailVerified: emailVerified ?? this.emailVerified,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
      planId: planId ?? this.planId,
      referralCode: referralCode,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      address: address ?? this.address,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      avatar: avatar ?? this.avatar,
      userType: userType,
      preferences: preferences ?? this.preferences,
      limits: limits ?? this.limits,
      stats: stats ?? this.stats,
      roles: roles ?? this.roles,
      metadata: metadata ?? this.metadata,
      emailVerifiedAt: emailVerifiedAt,
      phoneVerifiedAt: phoneVerifiedAt,
      timezone: timezone ?? this.timezone,
      language: language ?? this.language,
      currency: currency ?? this.currency,
      isOnline: isOnline ?? this.isOnline,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
    );
  }
}

@HiveType(typeId: 56)
@JsonSerializable()
class UserPreferences extends HiveObject {
  @HiveField(0)
  final String theme;

  @HiveField(1)
  final String language;

  @HiveField(2)
  final String currency;

  @HiveField(3)
  final String timezone;

  @HiveField(4)
  final bool notifications;

  @HiveField(5)
  final bool emailUpdates;

  @HiveField(6)
  final bool smsUpdates;

  @HiveField(7)
  final bool pushNotifications;

  @HiveField(8)
  final bool marketingEmails;

  @HiveField(9)
  final bool twoFactorRequired;

  @HiveField(10)
  final String dateFormat;

  @HiveField(11)
  final String timeFormat;

  @HiveField(12)
  final String numberFormat;

  @HiveField(13)
  final bool showBalance;

  @HiveField(14)
  final bool biometricAuth;

  @HiveField(15)
  final Map<String, dynamic>? customSettings;

  UserPreferences({
    this.theme = 'system',
    this.language = 'en',
    this.currency = 'BDT',
    this.timezone = 'Asia/Dhaka',
    this.notifications = true,
    this.emailUpdates = true,
    this.smsUpdates = false,
    this.pushNotifications = true,
    this.marketingEmails = false,
    this.twoFactorRequired = false,
    this.dateFormat = 'MM/dd/yyyy',
    this.timeFormat = '12h',
    this.numberFormat = 'en_US',
    this.showBalance = true,
    this.biometricAuth = false,
    this.customSettings,
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) =>
      _$UserPreferencesFromJson(json);
  Map<String, dynamic> toJson() => _$UserPreferencesToJson(this);

  bool get isDarkTheme => theme.toLowerCase() == 'dark';
  bool get isLightTheme => theme.toLowerCase() == 'light';
  bool get isSystemTheme => theme.toLowerCase() == 'system';
  bool get is24HourFormat => timeFormat == '24h';
}

@HiveType(typeId: 57)
@JsonSerializable()
class UserLimits extends HiveObject {
  @HiveField(0)
  final double dailyWithdrawalLimit;

  @HiveField(1)
  final double monthlyWithdrawalLimit;

  @HiveField(2)
  final double dailyDepositLimit;

  @HiveField(3)
  final double monthlyDepositLimit;

  @HiveField(4)
  final double maxTransactionAmount;

  @HiveField(5)
  final int dailyTransactionCount;

  @HiveField(6)
  final int monthlyTransactionCount;

  @HiveField(7)
  final double loanLimit;

  @HiveField(8)
  final int maxActiveLoans;

  @HiveField(9)
  final bool canTrade;

  @HiveField(10)
  final bool canWithdraw;

  @HiveField(11)
  final bool canDeposit;

  @HiveField(12)
  final bool canBorrow;

  UserLimits({
    this.dailyWithdrawalLimit = 10000.0,
    this.monthlyWithdrawalLimit = 100000.0,
    this.dailyDepositLimit = 50000.0,
    this.monthlyDepositLimit = 500000.0,
    this.maxTransactionAmount = 100000.0,
    this.dailyTransactionCount = 20,
    this.monthlyTransactionCount = 200,
    this.loanLimit = 100000.0,
    this.maxActiveLoans = 2,
    this.canTrade = true,
    this.canWithdraw = true,
    this.canDeposit = true,
    this.canBorrow = true,
  });

  factory UserLimits.fromJson(Map<String, dynamic> json) =>
      _$UserLimitsFromJson(json);
  Map<String, dynamic> toJson() => _$UserLimitsToJson(this);

  bool canWithdrawAmount(double amount) =>
      amount <= dailyWithdrawalLimit && canWithdraw;
  bool canDepositAmount(double amount) =>
      amount <= dailyDepositLimit && canDeposit;
  bool canTransact(double amount) => amount <= maxTransactionAmount;
}

@HiveType(typeId: 58)
@JsonSerializable()
class UserStats extends HiveObject {
  @HiveField(0)
  final int totalTransactions;

  @HiveField(1)
  final double totalDeposited;

  @HiveField(2)
  final double totalWithdrawn;

  @HiveField(3)
  final double totalProfit;

  @HiveField(4)
  final int successfulTransactions;

  @HiveField(5)
  final int failedTransactions;

  @HiveField(6)
  final double averageTransactionAmount;

  @HiveField(7)
  final int loginCount;

  @HiveField(8)
  final int currentLoginStreak;

  @HiveField(9)
  final int maxLoginStreak;

  @HiveField(10)
  final DateTime? firstTransactionAt;

  @HiveField(11)
  final DateTime? lastTransactionAt;

  @HiveField(12)
  final int referralCount;

  @HiveField(13)
  final double referralEarnings;

  @HiveField(14)
  final int supportTickets;

  @HiveField(15)
  final double portfolioValue;

  @HiveField(16)
  final double portfolioROI;

  UserStats({
    this.totalTransactions = 0,
    this.totalDeposited = 0.0,
    this.totalWithdrawn = 0.0,
    this.totalProfit = 0.0,
    this.successfulTransactions = 0,
    this.failedTransactions = 0,
    this.averageTransactionAmount = 0.0,
    this.loginCount = 0,
    this.currentLoginStreak = 0,
    this.maxLoginStreak = 0,
    this.firstTransactionAt,
    this.lastTransactionAt,
    this.referralCount = 0,
    this.referralEarnings = 0.0,
    this.supportTickets = 0,
    this.portfolioValue = 0.0,
    this.portfolioROI = 0.0,
  });

  factory UserStats.fromJson(Map<String, dynamic> json) =>
      _$UserStatsFromJson(json);
  Map<String, dynamic> toJson() => _$UserStatsToJson(this);

  double get successRate => totalTransactions > 0
      ? (successfulTransactions / totalTransactions) * 100
      : 0.0;

  double get netGain => totalProfit + referralEarnings;
  double get totalVolume => totalDeposited + totalWithdrawn;
  bool get hasTransacted => totalTransactions > 0;
  bool get isActiveTrader =>
      lastTransactionAt != null &&
      DateTime.now().difference(lastTransactionAt!).inDays <= 30;
}
