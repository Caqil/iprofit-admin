import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import '../transaction/transaction_model.dart';

part 'dashboard_metrics.g.dart';

@HiveType(typeId: 35)
@JsonSerializable()
class DashboardMetrics extends HiveObject {
  @HiveField(0)
  final double totalBalance;

  @HiveField(1)
  final double totalDeposits;

  @HiveField(2)
  final double totalWithdrawals;

  @HiveField(3)
  final double totalProfit;

  @HiveField(4)
  final int pendingTransactions;

  @HiveField(5)
  final int activeLoans;

  @HiveField(6)
  final int totalReferrals;

  @HiveField(7)
  final double referralEarnings;

  @HiveField(8)
  final List<TransactionModel> recentTransactions;

  @HiveField(9)
  final List<QuickAction> quickActions;

  @HiveField(10)
  final BalanceBreakdown balanceBreakdown;

  @HiveField(11)
  final List<ChartData> profitChart;

  @HiveField(12)
  final List<ChartData> transactionChart;

  @HiveField(13)
  final DateTime lastUpdated;

  @HiveField(14)
  final UserStats userStats;

  @HiveField(15)
  final List<Achievement> achievements;

  @HiveField(16)
  final PortfolioPerformance? portfolioPerformance;

  DashboardMetrics({
    this.totalBalance = 0.0,
    this.totalDeposits = 0.0,
    this.totalWithdrawals = 0.0,
    this.totalProfit = 0.0,
    this.pendingTransactions = 0,
    this.activeLoans = 0,
    this.totalReferrals = 0,
    this.referralEarnings = 0.0,
    this.recentTransactions = const [],
    this.quickActions = const [],
    required this.balanceBreakdown,
    this.profitChart = const [],
    this.transactionChart = const [],
    required this.lastUpdated,
    required this.userStats,
    this.achievements = const [],
    this.portfolioPerformance,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) =>
      _$DashboardMetricsFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardMetricsToJson(this);

  double get netWorth => totalBalance + totalProfit;
  double get totalTransactionVolume => totalDeposits + totalWithdrawals;
  double get profitMargin =>
      totalDeposits > 0 ? (totalProfit / totalDeposits) * 100 : 0.0;

  bool get hasActiveLoans => activeLoans > 0;
  bool get hasPendingTransactions => pendingTransactions > 0;
  bool get hasRecentActivity => recentTransactions.isNotEmpty;

  String get balanceFormatted => 'BDT ${totalBalance.toStringAsFixed(2)}';
  String get profitFormatted => 'BDT ${totalProfit.toStringAsFixed(2)}';
}

@HiveType(typeId: 36)
@JsonSerializable()
class QuickAction extends HiveObject {
  @HiveField(0)
  final String title;

  @HiveField(1)
  final String icon;

  @HiveField(2)
  final String route;

  @HiveField(3)
  final String? description;

  @HiveField(4)
  final String color;

  @HiveField(5)
  final bool enabled;

  @HiveField(6)
  final int priority;

  QuickAction({
    required this.title,
    required this.icon,
    required this.route,
    this.description,
    this.color = '#6B7280',
    this.enabled = true,
    this.priority = 0,
  });

  factory QuickAction.fromJson(Map<String, dynamic> json) =>
      _$QuickActionFromJson(json);
  Map<String, dynamic> toJson() => _$QuickActionToJson(this);
}

@HiveType(typeId: 37)
@JsonSerializable()
class BalanceBreakdown extends HiveObject {
  @HiveField(0)
  final double availableBalance;

  @HiveField(1)
  final double lockedBalance;

  @HiveField(2)
  final double profitBalance;

  @HiveField(3)
  final double bonusBalance;

  @HiveField(4)
  final double referralBalance;

  @HiveField(5)
  final double loanBalance;

  @HiveField(6)
  final double pendingBalance;

  BalanceBreakdown({
    this.availableBalance = 0.0,
    this.lockedBalance = 0.0,
    this.profitBalance = 0.0,
    this.bonusBalance = 0.0,
    this.referralBalance = 0.0,
    this.loanBalance = 0.0,
    this.pendingBalance = 0.0,
  });

  factory BalanceBreakdown.fromJson(Map<String, dynamic> json) =>
      _$BalanceBreakdownFromJson(json);
  Map<String, dynamic> toJson() => _$BalanceBreakdownToJson(this);

  double get totalBalance =>
      availableBalance +
      lockedBalance +
      profitBalance +
      bonusBalance +
      referralBalance +
      pendingBalance;

  List<BalanceItem> get items => [
    BalanceItem('Available', availableBalance, '#10B981'),
    BalanceItem('Profit', profitBalance, '#3B82F6'),
    BalanceItem('Bonus', bonusBalance, '#F59E0B'),
    BalanceItem('Referral', referralBalance, '#8B5CF6'),
    BalanceItem('Locked', lockedBalance, '#EF4444'),
    BalanceItem('Pending', pendingBalance, '#6B7280'),
  ].where((item) => item.amount > 0).toList();
}

@HiveType(typeId: 38)
@JsonSerializable()
class BalanceItem extends HiveObject {
  @HiveField(0)
  final String label;

  @HiveField(1)
  final double amount;

  @HiveField(2)
  final String color;

  BalanceItem(this.label, this.amount, this.color);

  factory BalanceItem.fromJson(Map<String, dynamic> json) =>
      _$BalanceItemFromJson(json);
  Map<String, dynamic> toJson() => _$BalanceItemToJson(this);
}

@HiveType(typeId: 39)
@JsonSerializable()
class ChartData extends HiveObject {
  @HiveField(0)
  final String label;

  @HiveField(1)
  final double value;

  @HiveField(2)
  final DateTime date;

  @HiveField(3)
  final String? category;

  @HiveField(4)
  final Map<String, dynamic>? metadata;

  ChartData({
    required this.label,
    required this.value,
    required this.date,
    this.category,
    this.metadata,
  });

  factory ChartData.fromJson(Map<String, dynamic> json) =>
      _$ChartDataFromJson(json);
  Map<String, dynamic> toJson() => _$ChartDataToJson(this);
}

@HiveType(typeId: 40)
@JsonSerializable()
class UserStats extends HiveObject {
  @HiveField(0)
  final DateTime joinedDate;

  @HiveField(1)
  final int daysActive;

  @HiveField(2)
  final int totalTransactions;

  @HiveField(3)
  final double averageTransactionAmount;

  @HiveField(4)
  final int successfulTransactions;

  @HiveField(5)
  final double successRate;

  @HiveField(6)
  final String membershipLevel;

  @HiveField(7)
  final int loyaltyPoints;

  @HiveField(8)
  final DateTime? lastLoginAt;

  @HiveField(9)
  final int loginStreak;

  UserStats({
    required this.joinedDate,
    this.daysActive = 0,
    this.totalTransactions = 0,
    this.averageTransactionAmount = 0.0,
    this.successfulTransactions = 0,
    this.successRate = 0.0,
    this.membershipLevel = 'Bronze',
    this.loyaltyPoints = 0,
    this.lastLoginAt,
    this.loginStreak = 0,
  });

  factory UserStats.fromJson(Map<String, dynamic> json) =>
      _$UserStatsFromJson(json);
  Map<String, dynamic> toJson() => _$UserStatsToJson(this);

  int get daysSinceJoined => DateTime.now().difference(joinedDate).inDays;
  bool get isNewUser => daysSinceJoined <= 7;
  bool get isActiveUser => daysActive >= (daysSinceJoined * 0.5);
}

@HiveType(typeId: 41)
@JsonSerializable()
class Achievement extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final String description;

  @HiveField(3)
  final String icon;

  @HiveField(4)
  final DateTime unlockedAt;

  @HiveField(5)
  final int points;

  @HiveField(6)
  final String category;

  @HiveField(7)
  final bool isNew;

  Achievement({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.unlockedAt,
    this.points = 0,
    this.category = 'general',
    this.isNew = false,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) =>
      _$AchievementFromJson(json);
  Map<String, dynamic> toJson() => _$AchievementToJson(this);
}

@HiveType(typeId: 42)
@JsonSerializable()
class PortfolioPerformance extends HiveObject {
  @HiveField(0)
  final double totalInvested;

  @HiveField(1)
  final double currentValue;

  @HiveField(2)
  final double totalReturns;

  @HiveField(3)
  final double returnPercentage;

  @HiveField(4)
  final double dailyChange;

  @HiveField(5)
  final double dailyChangePercentage;

  @HiveField(6)
  final List<ChartData> performanceChart;

  PortfolioPerformance({
    this.totalInvested = 0.0,
    this.currentValue = 0.0,
    this.totalReturns = 0.0,
    this.returnPercentage = 0.0,
    this.dailyChange = 0.0,
    this.dailyChangePercentage = 0.0,
    this.performanceChart = const [],
  });

  factory PortfolioPerformance.fromJson(Map<String, dynamic> json) =>
      _$PortfolioPerformanceFromJson(json);
  Map<String, dynamic> toJson() => _$PortfolioPerformanceToJson(this);

  bool get isPositiveReturn => totalReturns > 0;
  bool get isPositiveDailyChange => dailyChange > 0;
}
