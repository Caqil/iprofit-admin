// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ReferralModelAdapter extends TypeAdapter<ReferralModel> {
  @override
  final int typeId = 26;

  @override
  ReferralModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ReferralModel(
      id: fields[0] as String,
      referrerId: fields[1] as String,
      referralCode: fields[2] as String,
      referralLink: fields[3] as String,
      totalReferrals: fields[4] as int,
      totalEarnings: fields[5] as double,
      pendingEarnings: fields[6] as double,
      paidEarnings: fields[7] as double,
      referrals: (fields[8] as List).cast<ReferralUser>(),
      earnings: (fields[9] as List).cast<ReferralEarning>(),
      createdAt: fields[10] as DateTime,
      updatedAt: fields[11] as DateTime,
      settings: fields[12] as ReferralSettings?,
    );
  }

  @override
  void write(BinaryWriter writer, ReferralModel obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.referrerId)
      ..writeByte(2)
      ..write(obj.referralCode)
      ..writeByte(3)
      ..write(obj.referralLink)
      ..writeByte(4)
      ..write(obj.totalReferrals)
      ..writeByte(5)
      ..write(obj.totalEarnings)
      ..writeByte(6)
      ..write(obj.pendingEarnings)
      ..writeByte(7)
      ..write(obj.paidEarnings)
      ..writeByte(8)
      ..write(obj.referrals)
      ..writeByte(9)
      ..write(obj.earnings)
      ..writeByte(10)
      ..write(obj.createdAt)
      ..writeByte(11)
      ..write(obj.updatedAt)
      ..writeByte(12)
      ..write(obj.settings);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ReferralUserAdapter extends TypeAdapter<ReferralUser> {
  @override
  final int typeId = 27;

  @override
  ReferralUser read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ReferralUser(
      id: fields[0] as String,
      refereeId: fields[1] as String,
      refereeName: fields[2] as String,
      refereeEmail: fields[3] as String,
      joinedAt: fields[4] as DateTime,
      status: fields[5] as String,
      bonusEarned: fields[6] as double,
      bonusStatus: fields[7] as String,
      bonusPaidAt: fields[8] as DateTime?,
      refereeDeposits: fields[9] as double,
      firstDepositAt: fields[10] as DateTime?,
      level: fields[11] as int,
    );
  }

  @override
  void write(BinaryWriter writer, ReferralUser obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.refereeId)
      ..writeByte(2)
      ..write(obj.refereeName)
      ..writeByte(3)
      ..write(obj.refereeEmail)
      ..writeByte(4)
      ..write(obj.joinedAt)
      ..writeByte(5)
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.bonusEarned)
      ..writeByte(7)
      ..write(obj.bonusStatus)
      ..writeByte(8)
      ..write(obj.bonusPaidAt)
      ..writeByte(9)
      ..write(obj.refereeDeposits)
      ..writeByte(10)
      ..write(obj.firstDepositAt)
      ..writeByte(11)
      ..write(obj.level);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralUserAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ReferralEarningAdapter extends TypeAdapter<ReferralEarning> {
  @override
  final int typeId = 28;

  @override
  ReferralEarning read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ReferralEarning(
      id: fields[0] as String,
      refereeId: fields[1] as String,
      type: fields[2] as String,
      amount: fields[3] as double,
      status: fields[4] as String,
      earnedAt: fields[5] as DateTime,
      paidAt: fields[6] as DateTime?,
      transactionId: fields[7] as String?,
      description: fields[8] as String,
      level: fields[9] as int,
      baseAmount: fields[10] as double?,
      commissionRate: fields[11] as double?,
    );
  }

  @override
  void write(BinaryWriter writer, ReferralEarning obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.refereeId)
      ..writeByte(2)
      ..write(obj.type)
      ..writeByte(3)
      ..write(obj.amount)
      ..writeByte(4)
      ..write(obj.status)
      ..writeByte(5)
      ..write(obj.earnedAt)
      ..writeByte(6)
      ..write(obj.paidAt)
      ..writeByte(7)
      ..write(obj.transactionId)
      ..writeByte(8)
      ..write(obj.description)
      ..writeByte(9)
      ..write(obj.level)
      ..writeByte(10)
      ..write(obj.baseAmount)
      ..writeByte(11)
      ..write(obj.commissionRate);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralEarningAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ReferralSettingsAdapter extends TypeAdapter<ReferralSettings> {
  @override
  final int typeId = 29;

  @override
  ReferralSettings read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ReferralSettings(
      signupBonus: fields[0] as double,
      depositCommissionRate: fields[1] as double,
      profitCommissionRate: fields[2] as double,
      maxLevels: fields[3] as int,
      levelCommissions: (fields[4] as List).cast<double>(),
      minimumWithdrawal: fields[5] as double,
      autoPayment: fields[6] as bool,
      paymentFrequencyDays: fields[7] as int,
    );
  }

  @override
  void write(BinaryWriter writer, ReferralSettings obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.signupBonus)
      ..writeByte(1)
      ..write(obj.depositCommissionRate)
      ..writeByte(2)
      ..write(obj.profitCommissionRate)
      ..writeByte(3)
      ..write(obj.maxLevels)
      ..writeByte(4)
      ..write(obj.levelCommissions)
      ..writeByte(5)
      ..write(obj.minimumWithdrawal)
      ..writeByte(6)
      ..write(obj.autoPayment)
      ..writeByte(7)
      ..write(obj.paymentFrequencyDays);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReferralSettingsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ReferralModel _$ReferralModelFromJson(Map<String, dynamic> json) =>
    ReferralModel(
      id: json['id'] as String,
      referrerId: json['referrerId'] as String,
      referralCode: json['referralCode'] as String,
      referralLink: json['referralLink'] as String,
      totalReferrals: (json['totalReferrals'] as num?)?.toInt() ?? 0,
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      pendingEarnings: (json['pendingEarnings'] as num?)?.toDouble() ?? 0.0,
      paidEarnings: (json['paidEarnings'] as num?)?.toDouble() ?? 0.0,
      referrals: (json['referrals'] as List<dynamic>?)
              ?.map((e) => ReferralUser.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      earnings: (json['earnings'] as List<dynamic>?)
              ?.map((e) => ReferralEarning.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      settings: json['settings'] == null
          ? null
          : ReferralSettings.fromJson(json['settings'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ReferralModelToJson(ReferralModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'referrerId': instance.referrerId,
      'referralCode': instance.referralCode,
      'referralLink': instance.referralLink,
      'totalReferrals': instance.totalReferrals,
      'totalEarnings': instance.totalEarnings,
      'pendingEarnings': instance.pendingEarnings,
      'paidEarnings': instance.paidEarnings,
      'referrals': instance.referrals,
      'earnings': instance.earnings,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'settings': instance.settings,
    };

ReferralUser _$ReferralUserFromJson(Map<String, dynamic> json) => ReferralUser(
      id: json['id'] as String,
      refereeId: json['refereeId'] as String,
      refereeName: json['refereeName'] as String,
      refereeEmail: json['refereeEmail'] as String,
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      status: json['status'] as String,
      bonusEarned: (json['bonusEarned'] as num?)?.toDouble() ?? 0.0,
      bonusStatus: json['bonusStatus'] as String? ?? 'pending',
      bonusPaidAt: json['bonusPaidAt'] == null
          ? null
          : DateTime.parse(json['bonusPaidAt'] as String),
      refereeDeposits: (json['refereeDeposits'] as num?)?.toDouble() ?? 0.0,
      firstDepositAt: json['firstDepositAt'] == null
          ? null
          : DateTime.parse(json['firstDepositAt'] as String),
      level: (json['level'] as num?)?.toInt() ?? 1,
    );

Map<String, dynamic> _$ReferralUserToJson(ReferralUser instance) =>
    <String, dynamic>{
      'id': instance.id,
      'refereeId': instance.refereeId,
      'refereeName': instance.refereeName,
      'refereeEmail': instance.refereeEmail,
      'joinedAt': instance.joinedAt.toIso8601String(),
      'status': instance.status,
      'bonusEarned': instance.bonusEarned,
      'bonusStatus': instance.bonusStatus,
      'bonusPaidAt': instance.bonusPaidAt?.toIso8601String(),
      'refereeDeposits': instance.refereeDeposits,
      'firstDepositAt': instance.firstDepositAt?.toIso8601String(),
      'level': instance.level,
    };

ReferralEarning _$ReferralEarningFromJson(Map<String, dynamic> json) =>
    ReferralEarning(
      id: json['id'] as String,
      refereeId: json['refereeId'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      status: json['status'] as String,
      earnedAt: DateTime.parse(json['earnedAt'] as String),
      paidAt: json['paidAt'] == null
          ? null
          : DateTime.parse(json['paidAt'] as String),
      transactionId: json['transactionId'] as String?,
      description: json['description'] as String,
      level: (json['level'] as num?)?.toInt() ?? 1,
      baseAmount: (json['baseAmount'] as num?)?.toDouble(),
      commissionRate: (json['commissionRate'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$ReferralEarningToJson(ReferralEarning instance) =>
    <String, dynamic>{
      'id': instance.id,
      'refereeId': instance.refereeId,
      'type': instance.type,
      'amount': instance.amount,
      'status': instance.status,
      'earnedAt': instance.earnedAt.toIso8601String(),
      'paidAt': instance.paidAt?.toIso8601String(),
      'transactionId': instance.transactionId,
      'description': instance.description,
      'level': instance.level,
      'baseAmount': instance.baseAmount,
      'commissionRate': instance.commissionRate,
    };

ReferralSettings _$ReferralSettingsFromJson(Map<String, dynamic> json) =>
    ReferralSettings(
      signupBonus: (json['signupBonus'] as num?)?.toDouble() ?? 10.0,
      depositCommissionRate:
          (json['depositCommissionRate'] as num?)?.toDouble() ?? 5.0,
      profitCommissionRate:
          (json['profitCommissionRate'] as num?)?.toDouble() ?? 2.0,
      maxLevels: (json['maxLevels'] as num?)?.toInt() ?? 3,
      levelCommissions: (json['levelCommissions'] as List<dynamic>?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          const [5.0, 3.0, 1.0],
      minimumWithdrawal:
          (json['minimumWithdrawal'] as num?)?.toDouble() ?? 50.0,
      autoPayment: json['autoPayment'] as bool? ?? false,
      paymentFrequencyDays:
          (json['paymentFrequencyDays'] as num?)?.toInt() ?? 7,
    );

Map<String, dynamic> _$ReferralSettingsToJson(ReferralSettings instance) =>
    <String, dynamic>{
      'signupBonus': instance.signupBonus,
      'depositCommissionRate': instance.depositCommissionRate,
      'profitCommissionRate': instance.profitCommissionRate,
      'maxLevels': instance.maxLevels,
      'levelCommissions': instance.levelCommissions,
      'minimumWithdrawal': instance.minimumWithdrawal,
      'autoPayment': instance.autoPayment,
      'paymentFrequencyDays': instance.paymentFrequencyDays,
    };
