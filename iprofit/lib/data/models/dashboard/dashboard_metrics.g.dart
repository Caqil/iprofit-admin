// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_metrics.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class DashboardMetricsAdapter extends TypeAdapter<DashboardMetrics> {
  @override
  final int typeId = 35;

  @override
  DashboardMetrics read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return DashboardMetrics(
      totalBalance: fields[0] as double,
      totalDeposits: fields[1] as double,
      totalWithdrawals: fields[2] as double,
      totalProfit: fields[3] as double,
      pendingTransactions: fields[4] as int,
      activeLoans: fields[5] as int,
      totalReferrals: fields[6] as int,
      referralEarnings: fields[7] as double,
      recentTransactions: (fields[8] as List).cast<TransactionModel>(),
      quickActions: (fields[9] as List).cast<QuickAction>(),
      balanceBreakdown: fields[10] as BalanceBreakdown,
      profitChart: (fields[11] as List).cast<ChartData>(),
      transactionChart: (fields[12] as List).cast<ChartData>(),
      lastUpdated: fields[13] as DateTime,
      userStats: fields[14] as UserStats,
      achievements: (fields[15] as List).cast<Achievement>(),
      portfolioPerformance: fields[16] as PortfolioPerformance?,
    );
  }

  @override
  void write(BinaryWriter writer, DashboardMetrics obj) {
    writer
      ..writeByte(17)
      ..writeByte(0)
      ..write(obj.totalBalance)
      ..writeByte(1)
      ..write(obj.totalDeposits)
      ..writeByte(2)
      ..write(obj.totalWithdrawals)
      ..writeByte(3)
      ..write(obj.totalProfit)
      ..writeByte(4)
      ..write(obj.pendingTransactions)
      ..writeByte(5)
      ..write(obj.activeLoans)
      ..writeByte(6)
      ..write(obj.totalReferrals)
      ..writeByte(7)
      ..write(obj.referralEarnings)
      ..writeByte(8)
      ..write(obj.recentTransactions)
      ..writeByte(9)
      ..write(obj.quickActions)
      ..writeByte(10)
      ..write(obj.balanceBreakdown)
      ..writeByte(11)
      ..write(obj.profitChart)
      ..writeByte(12)
      ..write(obj.transactionChart)
      ..writeByte(13)
      ..write(obj.lastUpdated)
      ..writeByte(14)
      ..write(obj.userStats)
      ..writeByte(15)
      ..write(obj.achievements)
      ..writeByte(16)
      ..write(obj.portfolioPerformance);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DashboardMetricsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class QuickActionAdapter extends TypeAdapter<QuickAction> {
  @override
  final int typeId = 36;

  @override
  QuickAction read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return QuickAction(
      title: fields[0] as String,
      icon: fields[1] as String,
      route: fields[2] as String,
      description: fields[3] as String?,
      color: fields[4] as String,
      enabled: fields[5] as bool,
      priority: fields[6] as int,
    );
  }

  @override
  void write(BinaryWriter writer, QuickAction obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.title)
      ..writeByte(1)
      ..write(obj.icon)
      ..writeByte(2)
      ..write(obj.route)
      ..writeByte(3)
      ..write(obj.description)
      ..writeByte(4)
      ..write(obj.color)
      ..writeByte(5)
      ..write(obj.enabled)
      ..writeByte(6)
      ..write(obj.priority);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuickActionAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class BalanceBreakdownAdapter extends TypeAdapter<BalanceBreakdown> {
  @override
  final int typeId = 37;

  @override
  BalanceBreakdown read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return BalanceBreakdown(
      availableBalance: fields[0] as double,
      lockedBalance: fields[1] as double,
      profitBalance: fields[2] as double,
      bonusBalance: fields[3] as double,
      referralBalance: fields[4] as double,
      loanBalance: fields[5] as double,
      pendingBalance: fields[6] as double,
    );
  }

  @override
  void write(BinaryWriter writer, BalanceBreakdown obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.availableBalance)
      ..writeByte(1)
      ..write(obj.lockedBalance)
      ..writeByte(2)
      ..write(obj.profitBalance)
      ..writeByte(3)
      ..write(obj.bonusBalance)
      ..writeByte(4)
      ..write(obj.referralBalance)
      ..writeByte(5)
      ..write(obj.loanBalance)
      ..writeByte(6)
      ..write(obj.pendingBalance);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BalanceBreakdownAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class BalanceItemAdapter extends TypeAdapter<BalanceItem> {
  @override
  final int typeId = 38;

  @override
  BalanceItem read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return BalanceItem(
      fields[0] as String,
      fields[1] as double,
      fields[2] as String,
    );
  }

  @override
  void write(BinaryWriter writer, BalanceItem obj) {
    writer
      ..writeByte(3)
      ..writeByte(0)
      ..write(obj.label)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.color);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BalanceItemAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ChartDataAdapter extends TypeAdapter<ChartData> {
  @override
  final int typeId = 39;

  @override
  ChartData read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ChartData(
      label: fields[0] as String,
      value: fields[1] as double,
      date: fields[2] as DateTime,
      category: fields[3] as String?,
      metadata: (fields[4] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, ChartData obj) {
    writer
      ..writeByte(5)
      ..writeByte(0)
      ..write(obj.label)
      ..writeByte(1)
      ..write(obj.value)
      ..writeByte(2)
      ..write(obj.date)
      ..writeByte(3)
      ..write(obj.category)
      ..writeByte(4)
      ..write(obj.metadata);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChartDataAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserStatsAdapter extends TypeAdapter<UserStats> {
  @override
  final int typeId = 40;

  @override
  UserStats read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserStats(
      joinedDate: fields[0] as DateTime,
      daysActive: fields[1] as int,
      totalTransactions: fields[2] as int,
      averageTransactionAmount: fields[3] as double,
      successfulTransactions: fields[4] as int,
      successRate: fields[5] as double,
      membershipLevel: fields[6] as String,
      loyaltyPoints: fields[7] as int,
      lastLoginAt: fields[8] as DateTime?,
      loginStreak: fields[9] as int,
    );
  }

  @override
  void write(BinaryWriter writer, UserStats obj) {
    writer
      ..writeByte(10)
      ..writeByte(0)
      ..write(obj.joinedDate)
      ..writeByte(1)
      ..write(obj.daysActive)
      ..writeByte(2)
      ..write(obj.totalTransactions)
      ..writeByte(3)
      ..write(obj.averageTransactionAmount)
      ..writeByte(4)
      ..write(obj.successfulTransactions)
      ..writeByte(5)
      ..write(obj.successRate)
      ..writeByte(6)
      ..write(obj.membershipLevel)
      ..writeByte(7)
      ..write(obj.loyaltyPoints)
      ..writeByte(8)
      ..write(obj.lastLoginAt)
      ..writeByte(9)
      ..write(obj.loginStreak);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserStatsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class AchievementAdapter extends TypeAdapter<Achievement> {
  @override
  final int typeId = 41;

  @override
  Achievement read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Achievement(
      id: fields[0] as String,
      name: fields[1] as String,
      description: fields[2] as String,
      icon: fields[3] as String,
      unlockedAt: fields[4] as DateTime,
      points: fields[5] as int,
      category: fields[6] as String,
      isNew: fields[7] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, Achievement obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.description)
      ..writeByte(3)
      ..write(obj.icon)
      ..writeByte(4)
      ..write(obj.unlockedAt)
      ..writeByte(5)
      ..write(obj.points)
      ..writeByte(6)
      ..write(obj.category)
      ..writeByte(7)
      ..write(obj.isNew);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AchievementAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PortfolioPerformanceAdapter extends TypeAdapter<PortfolioPerformance> {
  @override
  final int typeId = 42;

  @override
  PortfolioPerformance read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PortfolioPerformance(
      totalInvested: fields[0] as double,
      currentValue: fields[1] as double,
      totalReturns: fields[2] as double,
      returnPercentage: fields[3] as double,
      dailyChange: fields[4] as double,
      dailyChangePercentage: fields[5] as double,
      performanceChart: (fields[6] as List).cast<ChartData>(),
    );
  }

  @override
  void write(BinaryWriter writer, PortfolioPerformance obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.totalInvested)
      ..writeByte(1)
      ..write(obj.currentValue)
      ..writeByte(2)
      ..write(obj.totalReturns)
      ..writeByte(3)
      ..write(obj.returnPercentage)
      ..writeByte(4)
      ..write(obj.dailyChange)
      ..writeByte(5)
      ..write(obj.dailyChangePercentage)
      ..writeByte(6)
      ..write(obj.performanceChart);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PortfolioPerformanceAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DashboardMetrics _$DashboardMetricsFromJson(Map<String, dynamic> json) =>
    DashboardMetrics(
      totalBalance: (json['totalBalance'] as num?)?.toDouble() ?? 0.0,
      totalDeposits: (json['totalDeposits'] as num?)?.toDouble() ?? 0.0,
      totalWithdrawals: (json['totalWithdrawals'] as num?)?.toDouble() ?? 0.0,
      totalProfit: (json['totalProfit'] as num?)?.toDouble() ?? 0.0,
      pendingTransactions: (json['pendingTransactions'] as num?)?.toInt() ?? 0,
      activeLoans: (json['activeLoans'] as num?)?.toInt() ?? 0,
      totalReferrals: (json['totalReferrals'] as num?)?.toInt() ?? 0,
      referralEarnings: (json['referralEarnings'] as num?)?.toDouble() ?? 0.0,
      recentTransactions: (json['recentTransactions'] as List<dynamic>?)
              ?.map((e) => TransactionModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      quickActions: (json['quickActions'] as List<dynamic>?)
              ?.map((e) => QuickAction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      balanceBreakdown: BalanceBreakdown.fromJson(
          json['balanceBreakdown'] as Map<String, dynamic>),
      profitChart: (json['profitChart'] as List<dynamic>?)
              ?.map((e) => ChartData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      transactionChart: (json['transactionChart'] as List<dynamic>?)
              ?.map((e) => ChartData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
      userStats: UserStats.fromJson(json['userStats'] as Map<String, dynamic>),
      achievements: (json['achievements'] as List<dynamic>?)
              ?.map((e) => Achievement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      portfolioPerformance: json['portfolioPerformance'] == null
          ? null
          : PortfolioPerformance.fromJson(
              json['portfolioPerformance'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$DashboardMetricsToJson(DashboardMetrics instance) =>
    <String, dynamic>{
      'totalBalance': instance.totalBalance,
      'totalDeposits': instance.totalDeposits,
      'totalWithdrawals': instance.totalWithdrawals,
      'totalProfit': instance.totalProfit,
      'pendingTransactions': instance.pendingTransactions,
      'activeLoans': instance.activeLoans,
      'totalReferrals': instance.totalReferrals,
      'referralEarnings': instance.referralEarnings,
      'recentTransactions': instance.recentTransactions,
      'quickActions': instance.quickActions,
      'balanceBreakdown': instance.balanceBreakdown,
      'profitChart': instance.profitChart,
      'transactionChart': instance.transactionChart,
      'lastUpdated': instance.lastUpdated.toIso8601String(),
      'userStats': instance.userStats,
      'achievements': instance.achievements,
      'portfolioPerformance': instance.portfolioPerformance,
    };

QuickAction _$QuickActionFromJson(Map<String, dynamic> json) => QuickAction(
      title: json['title'] as String,
      icon: json['icon'] as String,
      route: json['route'] as String,
      description: json['description'] as String?,
      color: json['color'] as String? ?? '#6B7280',
      enabled: json['enabled'] as bool? ?? true,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$QuickActionToJson(QuickAction instance) =>
    <String, dynamic>{
      'title': instance.title,
      'icon': instance.icon,
      'route': instance.route,
      'description': instance.description,
      'color': instance.color,
      'enabled': instance.enabled,
      'priority': instance.priority,
    };

BalanceBreakdown _$BalanceBreakdownFromJson(Map<String, dynamic> json) =>
    BalanceBreakdown(
      availableBalance: (json['availableBalance'] as num?)?.toDouble() ?? 0.0,
      lockedBalance: (json['lockedBalance'] as num?)?.toDouble() ?? 0.0,
      profitBalance: (json['profitBalance'] as num?)?.toDouble() ?? 0.0,
      bonusBalance: (json['bonusBalance'] as num?)?.toDouble() ?? 0.0,
      referralBalance: (json['referralBalance'] as num?)?.toDouble() ?? 0.0,
      loanBalance: (json['loanBalance'] as num?)?.toDouble() ?? 0.0,
      pendingBalance: (json['pendingBalance'] as num?)?.toDouble() ?? 0.0,
    );

Map<String, dynamic> _$BalanceBreakdownToJson(BalanceBreakdown instance) =>
    <String, dynamic>{
      'availableBalance': instance.availableBalance,
      'lockedBalance': instance.lockedBalance,
      'profitBalance': instance.profitBalance,
      'bonusBalance': instance.bonusBalance,
      'referralBalance': instance.referralBalance,
      'loanBalance': instance.loanBalance,
      'pendingBalance': instance.pendingBalance,
    };

BalanceItem _$BalanceItemFromJson(Map<String, dynamic> json) => BalanceItem(
      json['label'] as String,
      (json['amount'] as num).toDouble(),
      json['color'] as String,
    );

Map<String, dynamic> _$BalanceItemToJson(BalanceItem instance) =>
    <String, dynamic>{
      'label': instance.label,
      'amount': instance.amount,
      'color': instance.color,
    };

ChartData _$ChartDataFromJson(Map<String, dynamic> json) => ChartData(
      label: json['label'] as String,
      value: (json['value'] as num).toDouble(),
      date: DateTime.parse(json['date'] as String),
      category: json['category'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$ChartDataToJson(ChartData instance) => <String, dynamic>{
      'label': instance.label,
      'value': instance.value,
      'date': instance.date.toIso8601String(),
      'category': instance.category,
      'metadata': instance.metadata,
    };

UserStats _$UserStatsFromJson(Map<String, dynamic> json) => UserStats(
      joinedDate: DateTime.parse(json['joinedDate'] as String),
      daysActive: (json['daysActive'] as num?)?.toInt() ?? 0,
      totalTransactions: (json['totalTransactions'] as num?)?.toInt() ?? 0,
      averageTransactionAmount:
          (json['averageTransactionAmount'] as num?)?.toDouble() ?? 0.0,
      successfulTransactions:
          (json['successfulTransactions'] as num?)?.toInt() ?? 0,
      successRate: (json['successRate'] as num?)?.toDouble() ?? 0.0,
      membershipLevel: json['membershipLevel'] as String? ?? 'Bronze',
      loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
      lastLoginAt: json['lastLoginAt'] == null
          ? null
          : DateTime.parse(json['lastLoginAt'] as String),
      loginStreak: (json['loginStreak'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$UserStatsToJson(UserStats instance) => <String, dynamic>{
      'joinedDate': instance.joinedDate.toIso8601String(),
      'daysActive': instance.daysActive,
      'totalTransactions': instance.totalTransactions,
      'averageTransactionAmount': instance.averageTransactionAmount,
      'successfulTransactions': instance.successfulTransactions,
      'successRate': instance.successRate,
      'membershipLevel': instance.membershipLevel,
      'loyaltyPoints': instance.loyaltyPoints,
      'lastLoginAt': instance.lastLoginAt?.toIso8601String(),
      'loginStreak': instance.loginStreak,
    };

Achievement _$AchievementFromJson(Map<String, dynamic> json) => Achievement(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      icon: json['icon'] as String,
      unlockedAt: DateTime.parse(json['unlockedAt'] as String),
      points: (json['points'] as num?)?.toInt() ?? 0,
      category: json['category'] as String? ?? 'general',
      isNew: json['isNew'] as bool? ?? false,
    );

Map<String, dynamic> _$AchievementToJson(Achievement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'icon': instance.icon,
      'unlockedAt': instance.unlockedAt.toIso8601String(),
      'points': instance.points,
      'category': instance.category,
      'isNew': instance.isNew,
    };

PortfolioPerformance _$PortfolioPerformanceFromJson(
        Map<String, dynamic> json) =>
    PortfolioPerformance(
      totalInvested: (json['totalInvested'] as num?)?.toDouble() ?? 0.0,
      currentValue: (json['currentValue'] as num?)?.toDouble() ?? 0.0,
      totalReturns: (json['totalReturns'] as num?)?.toDouble() ?? 0.0,
      returnPercentage: (json['returnPercentage'] as num?)?.toDouble() ?? 0.0,
      dailyChange: (json['dailyChange'] as num?)?.toDouble() ?? 0.0,
      dailyChangePercentage:
          (json['dailyChangePercentage'] as num?)?.toDouble() ?? 0.0,
      performanceChart: (json['performanceChart'] as List<dynamic>?)
              ?.map((e) => ChartData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$PortfolioPerformanceToJson(
        PortfolioPerformance instance) =>
    <String, dynamic>{
      'totalInvested': instance.totalInvested,
      'currentValue': instance.currentValue,
      'totalReturns': instance.totalReturns,
      'returnPercentage': instance.returnPercentage,
      'dailyChange': instance.dailyChange,
      'dailyChangePercentage': instance.dailyChangePercentage,
      'performanceChart': instance.performanceChart,
    };
