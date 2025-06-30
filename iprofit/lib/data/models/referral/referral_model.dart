import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'referral_model.g.dart';

@HiveType(typeId: 26)
@JsonSerializable()
class ReferralModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String referrerId;

  @HiveField(2)
  final String referralCode;

  @HiveField(3)
  final String referralLink;

  @HiveField(4)
  final int totalReferrals;

  @HiveField(5)
  final double totalEarnings;

  @HiveField(6)
  final double pendingEarnings;

  @HiveField(7)
  final double paidEarnings;

  @HiveField(8)
  final List<ReferralUser> referrals;

  @HiveField(9)
  final List<ReferralEarning> earnings;

  @HiveField(10)
  final DateTime createdAt;

  @HiveField(11)
  final DateTime updatedAt;

  @HiveField(12)
  final ReferralSettings? settings;

  ReferralModel({
    required this.id,
    required this.referrerId,
    required this.referralCode,
    required this.referralLink,
    this.totalReferrals = 0,
    this.totalEarnings = 0.0,
    this.pendingEarnings = 0.0,
    this.paidEarnings = 0.0,
    this.referrals = const [],
    this.earnings = const [],
    required this.createdAt,
    required this.updatedAt,
    this.settings,
  });

  factory ReferralModel.fromJson(Map<String, dynamic> json) =>
      _$ReferralModelFromJson(json);
  Map<String, dynamic> toJson() => _$ReferralModelToJson(this);

  double get conversionRate {
    if (totalReferrals == 0) return 0.0;
    int activeReferrals = referrals.where((r) => r.isActive).length;
    return (activeReferrals / totalReferrals) * 100;
  }

  int get activeReferrals => referrals.where((r) => r.isActive).length;
  int get pendingReferrals => referrals.where((r) => r.isPending).length;
}

@HiveType(typeId: 27)
@JsonSerializable()
class ReferralUser extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String refereeId;

  @HiveField(2)
  final String refereeName;

  @HiveField(3)
  final String refereeEmail;

  @HiveField(4)
  final DateTime joinedAt;

  @HiveField(5)
  final String status;

  @HiveField(6)
  final double bonusEarned;

  @HiveField(7)
  final String bonusStatus;

  @HiveField(8)
  final DateTime? bonusPaidAt;

  @HiveField(9)
  final double refereeDeposits;

  @HiveField(10)
  final DateTime? firstDepositAt;

  @HiveField(11)
  final int level;

  ReferralUser({
    required this.id,
    required this.refereeId,
    required this.refereeName,
    required this.refereeEmail,
    required this.joinedAt,
    required this.status,
    this.bonusEarned = 0.0,
    this.bonusStatus = 'pending',
    this.bonusPaidAt,
    this.refereeDeposits = 0.0,
    this.firstDepositAt,
    this.level = 1,
  });

  factory ReferralUser.fromJson(Map<String, dynamic> json) =>
      _$ReferralUserFromJson(json);
  Map<String, dynamic> toJson() => _$ReferralUserToJson(this);

  bool get isActive => status.toLowerCase() == 'active';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isInactive => status.toLowerCase() == 'inactive';
  bool get isBonusPaid => bonusStatus.toLowerCase() == 'paid';
  bool get hasMadeDeposit => refereeDeposits > 0;
}

@HiveType(typeId: 28)
@JsonSerializable()
class ReferralEarning extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String refereeId;

  @HiveField(2)
  final String type;

  @HiveField(3)
  final double amount;

  @HiveField(4)
  final String status;

  @HiveField(5)
  final DateTime earnedAt;

  @HiveField(6)
  final DateTime? paidAt;

  @HiveField(7)
  final String? transactionId;

  @HiveField(8)
  final String description;

  @HiveField(9)
  final int level;

  @HiveField(10)
  final double? baseAmount;

  @HiveField(11)
  final double? commissionRate;

  ReferralEarning({
    required this.id,
    required this.refereeId,
    required this.type,
    required this.amount,
    required this.status,
    required this.earnedAt,
    this.paidAt,
    this.transactionId,
    required this.description,
    this.level = 1,
    this.baseAmount,
    this.commissionRate,
  });

  factory ReferralEarning.fromJson(Map<String, dynamic> json) =>
      _$ReferralEarningFromJson(json);
  Map<String, dynamic> toJson() => _$ReferralEarningToJson(this);

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isPaid => status.toLowerCase() == 'paid';
  bool get isCancelled => status.toLowerCase() == 'cancelled';

  // Earning types
  bool get isSignupBonus => type.toLowerCase() == 'signup_bonus';
  bool get isDepositCommission => type.toLowerCase() == 'deposit_commission';
  bool get isProfitCommission => type.toLowerCase() == 'profit_commission';
  bool get isLevelBonus => type.toLowerCase() == 'level_bonus';
}

@HiveType(typeId: 29)
@JsonSerializable()
class ReferralSettings extends HiveObject {
  @HiveField(0)
  final double signupBonus;

  @HiveField(1)
  final double depositCommissionRate;

  @HiveField(2)
  final double profitCommissionRate;

  @HiveField(3)
  final int maxLevels;

  @HiveField(4)
  final List<double> levelCommissions;

  @HiveField(5)
  final double minimumWithdrawal;

  @HiveField(6)
  final bool autoPayment;

  @HiveField(7)
  final int paymentFrequencyDays;

  ReferralSettings({
    this.signupBonus = 10.0,
    this.depositCommissionRate = 5.0,
    this.profitCommissionRate = 2.0,
    this.maxLevels = 3,
    this.levelCommissions = const [5.0, 3.0, 1.0],
    this.minimumWithdrawal = 50.0,
    this.autoPayment = false,
    this.paymentFrequencyDays = 7,
  });

  factory ReferralSettings.fromJson(Map<String, dynamic> json) =>
      _$ReferralSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$ReferralSettingsToJson(this);

  double getCommissionForLevel(int level) {
    if (level <= 0 || level > levelCommissions.length) return 0.0;
    return levelCommissions[level - 1];
  }
}
