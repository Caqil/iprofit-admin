// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class PlanModelAdapter extends TypeAdapter<PlanModel> {
  @override
  final int typeId = 30;

  @override
  PlanModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PlanModel(
      id: fields[0] as String,
      name: fields[1] as String,
      description: fields[2] as String,
      price: fields[3] as double,
      currency: fields[4] as String,
      depositLimit: fields[5] as double,
      withdrawalLimit: fields[6] as double,
      profitLimit: fields[7] as double,
      minimumDeposit: fields[8] as double,
      minimumWithdrawal: fields[9] as double,
      dailyWithdrawalLimit: fields[10] as double,
      monthlyWithdrawalLimit: fields[11] as double,
      features: (fields[12] as List).cast<String>(),
      color: fields[13] as String,
      isActive: fields[14] as bool,
      priority: fields[15] as int,
      createdAt: fields[16] as DateTime,
      updatedAt: fields[17] as DateTime,
      limits: fields[18] as PlanLimits?,
      benefits: fields[19] as PlanBenefits?,
      icon: fields[20] as String?,
      badge: fields[21] as String?,
      isPopular: fields[22] as bool,
      discountPrice: fields[23] as double?,
      discountValidUntil: fields[24] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, PlanModel obj) {
    writer
      ..writeByte(25)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.description)
      ..writeByte(3)
      ..write(obj.price)
      ..writeByte(4)
      ..write(obj.currency)
      ..writeByte(5)
      ..write(obj.depositLimit)
      ..writeByte(6)
      ..write(obj.withdrawalLimit)
      ..writeByte(7)
      ..write(obj.profitLimit)
      ..writeByte(8)
      ..write(obj.minimumDeposit)
      ..writeByte(9)
      ..write(obj.minimumWithdrawal)
      ..writeByte(10)
      ..write(obj.dailyWithdrawalLimit)
      ..writeByte(11)
      ..write(obj.monthlyWithdrawalLimit)
      ..writeByte(12)
      ..write(obj.features)
      ..writeByte(13)
      ..write(obj.color)
      ..writeByte(14)
      ..write(obj.isActive)
      ..writeByte(15)
      ..write(obj.priority)
      ..writeByte(16)
      ..write(obj.createdAt)
      ..writeByte(17)
      ..write(obj.updatedAt)
      ..writeByte(18)
      ..write(obj.limits)
      ..writeByte(19)
      ..write(obj.benefits)
      ..writeByte(20)
      ..write(obj.icon)
      ..writeByte(21)
      ..write(obj.badge)
      ..writeByte(22)
      ..write(obj.isPopular)
      ..writeByte(23)
      ..write(obj.discountPrice)
      ..writeByte(24)
      ..write(obj.discountValidUntil);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PlanLimitsAdapter extends TypeAdapter<PlanLimits> {
  @override
  final int typeId = 31;

  @override
  PlanLimits read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PlanLimits(
      maxTransactionsPerDay: fields[0] as int,
      maxTransactionsPerMonth: fields[1] as int,
      maxTransactionAmount: fields[2] as double,
      maxActiveLoans: fields[3] as int,
      maxLoanAmount: fields[4] as double,
      apiCallsPerMonth: fields[5] as int,
      supportTicketsPerMonth: fields[6] as int,
      canReferEarn: fields[7] as bool,
      maxReferralLevels: fields[8] as int,
    );
  }

  @override
  void write(BinaryWriter writer, PlanLimits obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.maxTransactionsPerDay)
      ..writeByte(1)
      ..write(obj.maxTransactionsPerMonth)
      ..writeByte(2)
      ..write(obj.maxTransactionAmount)
      ..writeByte(3)
      ..write(obj.maxActiveLoans)
      ..writeByte(4)
      ..write(obj.maxLoanAmount)
      ..writeByte(5)
      ..write(obj.apiCallsPerMonth)
      ..writeByte(6)
      ..write(obj.supportTicketsPerMonth)
      ..writeByte(7)
      ..write(obj.canReferEarn)
      ..writeByte(8)
      ..write(obj.maxReferralLevels);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanLimitsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PlanBenefitsAdapter extends TypeAdapter<PlanBenefits> {
  @override
  final int typeId = 32;

  @override
  PlanBenefits read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PlanBenefits(
      bonusPercentage: fields[0] as double,
      referralCommission: fields[1] as double,
      prioritySupport: fields[2] as bool,
      advancedAnalytics: fields[3] as bool,
      customReports: fields[4] as bool,
      apiAccess: fields[5] as bool,
      whiteLabel: fields[6] as bool,
      reducedFees: fields[7] as double,
      exclusiveFeatures: (fields[8] as List).cast<String>(),
      supportLevel: fields[9] as String,
    );
  }

  @override
  void write(BinaryWriter writer, PlanBenefits obj) {
    writer
      ..writeByte(10)
      ..writeByte(0)
      ..write(obj.bonusPercentage)
      ..writeByte(1)
      ..write(obj.referralCommission)
      ..writeByte(2)
      ..write(obj.prioritySupport)
      ..writeByte(3)
      ..write(obj.advancedAnalytics)
      ..writeByte(4)
      ..write(obj.customReports)
      ..writeByte(5)
      ..write(obj.apiAccess)
      ..writeByte(6)
      ..write(obj.whiteLabel)
      ..writeByte(7)
      ..write(obj.reducedFees)
      ..writeByte(8)
      ..write(obj.exclusiveFeatures)
      ..writeByte(9)
      ..write(obj.supportLevel);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanBenefitsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PlanModel _$PlanModelFromJson(Map<String, dynamic> json) => PlanModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      price: (json['price'] as num).toDouble(),
      currency: json['currency'] as String,
      depositLimit: (json['depositLimit'] as num).toDouble(),
      withdrawalLimit: (json['withdrawalLimit'] as num).toDouble(),
      profitLimit: (json['profitLimit'] as num).toDouble(),
      minimumDeposit: (json['minimumDeposit'] as num).toDouble(),
      minimumWithdrawal: (json['minimumWithdrawal'] as num).toDouble(),
      dailyWithdrawalLimit: (json['dailyWithdrawalLimit'] as num).toDouble(),
      monthlyWithdrawalLimit:
          (json['monthlyWithdrawalLimit'] as num).toDouble(),
      features:
          (json['features'] as List<dynamic>).map((e) => e as String).toList(),
      color: json['color'] as String,
      isActive: json['isActive'] as bool,
      priority: (json['priority'] as num).toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      limits: json['limits'] == null
          ? null
          : PlanLimits.fromJson(json['limits'] as Map<String, dynamic>),
      benefits: json['benefits'] == null
          ? null
          : PlanBenefits.fromJson(json['benefits'] as Map<String, dynamic>),
      icon: json['icon'] as String?,
      badge: json['badge'] as String?,
      isPopular: json['isPopular'] as bool? ?? false,
      discountPrice: (json['discountPrice'] as num?)?.toDouble(),
      discountValidUntil: json['discountValidUntil'] == null
          ? null
          : DateTime.parse(json['discountValidUntil'] as String),
    );

Map<String, dynamic> _$PlanModelToJson(PlanModel instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'price': instance.price,
      'currency': instance.currency,
      'depositLimit': instance.depositLimit,
      'withdrawalLimit': instance.withdrawalLimit,
      'profitLimit': instance.profitLimit,
      'minimumDeposit': instance.minimumDeposit,
      'minimumWithdrawal': instance.minimumWithdrawal,
      'dailyWithdrawalLimit': instance.dailyWithdrawalLimit,
      'monthlyWithdrawalLimit': instance.monthlyWithdrawalLimit,
      'features': instance.features,
      'color': instance.color,
      'isActive': instance.isActive,
      'priority': instance.priority,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'limits': instance.limits,
      'benefits': instance.benefits,
      'icon': instance.icon,
      'badge': instance.badge,
      'isPopular': instance.isPopular,
      'discountPrice': instance.discountPrice,
      'discountValidUntil': instance.discountValidUntil?.toIso8601String(),
    };

PlanLimits _$PlanLimitsFromJson(Map<String, dynamic> json) => PlanLimits(
      maxTransactionsPerDay:
          (json['maxTransactionsPerDay'] as num?)?.toInt() ?? 10,
      maxTransactionsPerMonth:
          (json['maxTransactionsPerMonth'] as num?)?.toInt() ?? 100,
      maxTransactionAmount:
          (json['maxTransactionAmount'] as num?)?.toDouble() ?? 10000,
      maxActiveLoans: (json['maxActiveLoans'] as num?)?.toInt() ?? 1,
      maxLoanAmount: (json['maxLoanAmount'] as num?)?.toDouble() ?? 50000,
      apiCallsPerMonth: (json['apiCallsPerMonth'] as num?)?.toInt() ?? 1000,
      supportTicketsPerMonth:
          (json['supportTicketsPerMonth'] as num?)?.toInt() ?? 5,
      canReferEarn: json['canReferEarn'] as bool? ?? true,
      maxReferralLevels: (json['maxReferralLevels'] as num?)?.toInt() ?? 3,
    );

Map<String, dynamic> _$PlanLimitsToJson(PlanLimits instance) =>
    <String, dynamic>{
      'maxTransactionsPerDay': instance.maxTransactionsPerDay,
      'maxTransactionsPerMonth': instance.maxTransactionsPerMonth,
      'maxTransactionAmount': instance.maxTransactionAmount,
      'maxActiveLoans': instance.maxActiveLoans,
      'maxLoanAmount': instance.maxLoanAmount,
      'apiCallsPerMonth': instance.apiCallsPerMonth,
      'supportTicketsPerMonth': instance.supportTicketsPerMonth,
      'canReferEarn': instance.canReferEarn,
      'maxReferralLevels': instance.maxReferralLevels,
    };

PlanBenefits _$PlanBenefitsFromJson(Map<String, dynamic> json) => PlanBenefits(
      bonusPercentage: (json['bonusPercentage'] as num?)?.toDouble() ?? 0.0,
      referralCommission:
          (json['referralCommission'] as num?)?.toDouble() ?? 5.0,
      prioritySupport: json['prioritySupport'] as bool? ?? false,
      advancedAnalytics: json['advancedAnalytics'] as bool? ?? false,
      customReports: json['customReports'] as bool? ?? false,
      apiAccess: json['apiAccess'] as bool? ?? false,
      whiteLabel: json['whiteLabel'] as bool? ?? false,
      reducedFees: (json['reducedFees'] as num?)?.toDouble() ?? 0.0,
      exclusiveFeatures: (json['exclusiveFeatures'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      supportLevel: json['supportLevel'] as String? ?? 'standard',
    );

Map<String, dynamic> _$PlanBenefitsToJson(PlanBenefits instance) =>
    <String, dynamic>{
      'bonusPercentage': instance.bonusPercentage,
      'referralCommission': instance.referralCommission,
      'prioritySupport': instance.prioritySupport,
      'advancedAnalytics': instance.advancedAnalytics,
      'customReports': instance.customReports,
      'apiAccess': instance.apiAccess,
      'whiteLabel': instance.whiteLabel,
      'reducedFees': instance.reducedFees,
      'exclusiveFeatures': instance.exclusiveFeatures,
      'supportLevel': instance.supportLevel,
    };
