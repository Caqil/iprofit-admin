import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'plan_model.g.dart';

@HiveType(typeId: 30)
@JsonSerializable()
class PlanModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final String description;

  @HiveField(3)
  final double price;

  @HiveField(4)
  final String currency;

  @HiveField(5)
  final double depositLimit;

  @HiveField(6)
  final double withdrawalLimit;

  @HiveField(7)
  final double profitLimit;

  @HiveField(8)
  final double minimumDeposit;

  @HiveField(9)
  final double minimumWithdrawal;

  @HiveField(10)
  final double dailyWithdrawalLimit;

  @HiveField(11)
  final double monthlyWithdrawalLimit;

  @HiveField(12)
  final List<String> features;

  @HiveField(13)
  final String color;

  @HiveField(14)
  final bool isActive;

  @HiveField(15)
  final int priority;

  @HiveField(16)
  final DateTime createdAt;

  @HiveField(17)
  final DateTime updatedAt;

  @HiveField(18)
  final PlanLimits? limits;

  @HiveField(19)
  final PlanBenefits? benefits;

  @HiveField(20)
  final String? icon;

  @HiveField(21)
  final String? badge;

  @HiveField(22)
  final bool isPopular;

  @HiveField(23)
  final double? discountPrice;

  @HiveField(24)
  final DateTime? discountValidUntil;

  PlanModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.currency,
    required this.depositLimit,
    required this.withdrawalLimit,
    required this.profitLimit,
    required this.minimumDeposit,
    required this.minimumWithdrawal,
    required this.dailyWithdrawalLimit,
    required this.monthlyWithdrawalLimit,
    required this.features,
    required this.color,
    required this.isActive,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.limits,
    this.benefits,
    this.icon,
    this.badge,
    this.isPopular = false,
    this.discountPrice,
    this.discountValidUntil,
  });

  factory PlanModel.fromJson(Map<String, dynamic> json) =>
      _$PlanModelFromJson(json);
  Map<String, dynamic> toJson() => _$PlanModelToJson(this);

  bool get isFree => price <= 0;
  bool get isPremium => price > 0;
  bool get hasDiscount =>
      discountPrice != null &&
      discountValidUntil != null &&
      discountValidUntil!.isAfter(DateTime.now());

  double get effectivePrice => hasDiscount ? discountPrice! : price;

  double get discountPercentage {
    if (!hasDiscount || price <= 0) return 0.0;
    return ((price - discountPrice!) / price) * 100;
  }

  String get displayPrice {
    if (isFree) return 'Free';
    return '$currency ${effectivePrice.toStringAsFixed(2)}';
  }

  bool canWithdraw(double amount) {
    return amount >= minimumWithdrawal && amount <= withdrawalLimit;
  }

  bool canDeposit(double amount) {
    return amount >= minimumDeposit && amount <= depositLimit;
  }

  bool isWithinDailyLimit(double amount, double dailyTotal) {
    return (dailyTotal + amount) <= dailyWithdrawalLimit;
  }

  bool isWithinMonthlyLimit(double amount, double monthlyTotal) {
    return (monthlyTotal + amount) <= monthlyWithdrawalLimit;
  }
}

@HiveType(typeId: 31)
@JsonSerializable()
class PlanLimits extends HiveObject {
  @HiveField(0)
  final int maxTransactionsPerDay;

  @HiveField(1)
  final int maxTransactionsPerMonth;

  @HiveField(2)
  final double maxTransactionAmount;

  @HiveField(3)
  final int maxActiveLoans;

  @HiveField(4)
  final double maxLoanAmount;

  @HiveField(5)
  final int apiCallsPerMonth;

  @HiveField(6)
  final int supportTicketsPerMonth;

  @HiveField(7)
  final bool canReferEarn;

  @HiveField(8)
  final int maxReferralLevels;

  PlanLimits({
    this.maxTransactionsPerDay = 10,
    this.maxTransactionsPerMonth = 100,
    this.maxTransactionAmount = 10000,
    this.maxActiveLoans = 1,
    this.maxLoanAmount = 50000,
    this.apiCallsPerMonth = 1000,
    this.supportTicketsPerMonth = 5,
    this.canReferEarn = true,
    this.maxReferralLevels = 3,
  });

  factory PlanLimits.fromJson(Map<String, dynamic> json) =>
      _$PlanLimitsFromJson(json);
  Map<String, dynamic> toJson() => _$PlanLimitsToJson(this);
}

@HiveType(typeId: 32)
@JsonSerializable()
class PlanBenefits extends HiveObject {
  @HiveField(0)
  final double bonusPercentage;

  @HiveField(1)
  final double referralCommission;

  @HiveField(2)
  final bool prioritySupport;

  @HiveField(3)
  final bool advancedAnalytics;

  @HiveField(4)
  final bool customReports;

  @HiveField(5)
  final bool apiAccess;

  @HiveField(6)
  final bool whiteLabel;

  @HiveField(7)
  final double reducedFees;

  @HiveField(8)
  final List<String> exclusiveFeatures;

  @HiveField(9)
  final String supportLevel;

  PlanBenefits({
    this.bonusPercentage = 0.0,
    this.referralCommission = 5.0,
    this.prioritySupport = false,
    this.advancedAnalytics = false,
    this.customReports = false,
    this.apiAccess = false,
    this.whiteLabel = false,
    this.reducedFees = 0.0,
    this.exclusiveFeatures = const [],
    this.supportLevel = 'standard',
  });

  factory PlanBenefits.fromJson(Map<String, dynamic> json) =>
      _$PlanBenefitsFromJson(json);
  Map<String, dynamic> toJson() => _$PlanBenefitsToJson(this);

  bool get hasAdvancedFeatures =>
      advancedAnalytics || customReports || apiAccess;
  bool get isPremiumSupport => supportLevel.toLowerCase() != 'standard';
}
