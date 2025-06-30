// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class UserModelAdapter extends TypeAdapter<UserModel> {
  @override
  final int typeId = 55;

  @override
  UserModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserModel(
      id: fields[0] as String,
      name: fields[1] as String,
      email: fields[2] as String,
      phone: fields[3] as String?,
      balance: fields[4] as double,
      status: fields[5] as String,
      kycStatus: fields[6] as String,
      emailVerified: fields[7] as bool,
      phoneVerified: fields[8] as bool,
      twoFactorEnabled: fields[9] as bool,
      planId: fields[10] as String?,
      referralCode: fields[11] as String?,
      dateOfBirth: fields[12] as DateTime?,
      address: fields[13] as Address?,
      createdAt: fields[14] as DateTime,
      updatedAt: fields[15] as DateTime,
      lastLoginAt: fields[16] as DateTime?,
      avatar: fields[17] as String?,
      userType: fields[18] as String,
      preferences: fields[19] as UserPreferences?,
      limits: fields[20] as UserLimits?,
      stats: fields[21] as UserStats?,
      roles: (fields[22] as List).cast<String>(),
      metadata: (fields[23] as Map?)?.cast<String, dynamic>(),
      emailVerifiedAt: fields[24] as DateTime?,
      phoneVerifiedAt: fields[25] as DateTime?,
      timezone: fields[26] as String?,
      language: fields[27] as String?,
      currency: fields[28] as String?,
      isOnline: fields[29] as bool,
      lastSeenAt: fields[30] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, UserModel obj) {
    writer
      ..writeByte(31)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.email)
      ..writeByte(3)
      ..write(obj.phone)
      ..writeByte(4)
      ..write(obj.balance)
      ..writeByte(5)
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.kycStatus)
      ..writeByte(7)
      ..write(obj.emailVerified)
      ..writeByte(8)
      ..write(obj.phoneVerified)
      ..writeByte(9)
      ..write(obj.twoFactorEnabled)
      ..writeByte(10)
      ..write(obj.planId)
      ..writeByte(11)
      ..write(obj.referralCode)
      ..writeByte(12)
      ..write(obj.dateOfBirth)
      ..writeByte(13)
      ..write(obj.address)
      ..writeByte(14)
      ..write(obj.createdAt)
      ..writeByte(15)
      ..write(obj.updatedAt)
      ..writeByte(16)
      ..write(obj.lastLoginAt)
      ..writeByte(17)
      ..write(obj.avatar)
      ..writeByte(18)
      ..write(obj.userType)
      ..writeByte(19)
      ..write(obj.preferences)
      ..writeByte(20)
      ..write(obj.limits)
      ..writeByte(21)
      ..write(obj.stats)
      ..writeByte(22)
      ..write(obj.roles)
      ..writeByte(23)
      ..write(obj.metadata)
      ..writeByte(24)
      ..write(obj.emailVerifiedAt)
      ..writeByte(25)
      ..write(obj.phoneVerifiedAt)
      ..writeByte(26)
      ..write(obj.timezone)
      ..writeByte(27)
      ..write(obj.language)
      ..writeByte(28)
      ..write(obj.currency)
      ..writeByte(29)
      ..write(obj.isOnline)
      ..writeByte(30)
      ..write(obj.lastSeenAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserPreferencesAdapter extends TypeAdapter<UserPreferences> {
  @override
  final int typeId = 56;

  @override
  UserPreferences read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserPreferences(
      theme: fields[0] as String,
      language: fields[1] as String,
      currency: fields[2] as String,
      timezone: fields[3] as String,
      notifications: fields[4] as bool,
      emailUpdates: fields[5] as bool,
      smsUpdates: fields[6] as bool,
      pushNotifications: fields[7] as bool,
      marketingEmails: fields[8] as bool,
      twoFactorRequired: fields[9] as bool,
      dateFormat: fields[10] as String,
      timeFormat: fields[11] as String,
      numberFormat: fields[12] as String,
      showBalance: fields[13] as bool,
      biometricAuth: fields[14] as bool,
      customSettings: (fields[15] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, UserPreferences obj) {
    writer
      ..writeByte(16)
      ..writeByte(0)
      ..write(obj.theme)
      ..writeByte(1)
      ..write(obj.language)
      ..writeByte(2)
      ..write(obj.currency)
      ..writeByte(3)
      ..write(obj.timezone)
      ..writeByte(4)
      ..write(obj.notifications)
      ..writeByte(5)
      ..write(obj.emailUpdates)
      ..writeByte(6)
      ..write(obj.smsUpdates)
      ..writeByte(7)
      ..write(obj.pushNotifications)
      ..writeByte(8)
      ..write(obj.marketingEmails)
      ..writeByte(9)
      ..write(obj.twoFactorRequired)
      ..writeByte(10)
      ..write(obj.dateFormat)
      ..writeByte(11)
      ..write(obj.timeFormat)
      ..writeByte(12)
      ..write(obj.numberFormat)
      ..writeByte(13)
      ..write(obj.showBalance)
      ..writeByte(14)
      ..write(obj.biometricAuth)
      ..writeByte(15)
      ..write(obj.customSettings);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserPreferencesAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserLimitsAdapter extends TypeAdapter<UserLimits> {
  @override
  final int typeId = 57;

  @override
  UserLimits read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserLimits(
      dailyWithdrawalLimit: fields[0] as double,
      monthlyWithdrawalLimit: fields[1] as double,
      dailyDepositLimit: fields[2] as double,
      monthlyDepositLimit: fields[3] as double,
      maxTransactionAmount: fields[4] as double,
      dailyTransactionCount: fields[5] as int,
      monthlyTransactionCount: fields[6] as int,
      loanLimit: fields[7] as double,
      maxActiveLoans: fields[8] as int,
      canTrade: fields[9] as bool,
      canWithdraw: fields[10] as bool,
      canDeposit: fields[11] as bool,
      canBorrow: fields[12] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, UserLimits obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.dailyWithdrawalLimit)
      ..writeByte(1)
      ..write(obj.monthlyWithdrawalLimit)
      ..writeByte(2)
      ..write(obj.dailyDepositLimit)
      ..writeByte(3)
      ..write(obj.monthlyDepositLimit)
      ..writeByte(4)
      ..write(obj.maxTransactionAmount)
      ..writeByte(5)
      ..write(obj.dailyTransactionCount)
      ..writeByte(6)
      ..write(obj.monthlyTransactionCount)
      ..writeByte(7)
      ..write(obj.loanLimit)
      ..writeByte(8)
      ..write(obj.maxActiveLoans)
      ..writeByte(9)
      ..write(obj.canTrade)
      ..writeByte(10)
      ..write(obj.canWithdraw)
      ..writeByte(11)
      ..write(obj.canDeposit)
      ..writeByte(12)
      ..write(obj.canBorrow);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserLimitsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserStatsAdapter extends TypeAdapter<UserStats> {
  @override
  final int typeId = 58;

  @override
  UserStats read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserStats(
      totalTransactions: fields[0] as int,
      totalDeposited: fields[1] as double,
      totalWithdrawn: fields[2] as double,
      totalProfit: fields[3] as double,
      successfulTransactions: fields[4] as int,
      failedTransactions: fields[5] as int,
      averageTransactionAmount: fields[6] as double,
      loginCount: fields[7] as int,
      currentLoginStreak: fields[8] as int,
      maxLoginStreak: fields[9] as int,
      firstTransactionAt: fields[10] as DateTime?,
      lastTransactionAt: fields[11] as DateTime?,
      referralCount: fields[12] as int,
      referralEarnings: fields[13] as double,
      supportTickets: fields[14] as int,
      portfolioValue: fields[15] as double,
      portfolioROI: fields[16] as double,
    );
  }

  @override
  void write(BinaryWriter writer, UserStats obj) {
    writer
      ..writeByte(17)
      ..writeByte(0)
      ..write(obj.totalTransactions)
      ..writeByte(1)
      ..write(obj.totalDeposited)
      ..writeByte(2)
      ..write(obj.totalWithdrawn)
      ..writeByte(3)
      ..write(obj.totalProfit)
      ..writeByte(4)
      ..write(obj.successfulTransactions)
      ..writeByte(5)
      ..write(obj.failedTransactions)
      ..writeByte(6)
      ..write(obj.averageTransactionAmount)
      ..writeByte(7)
      ..write(obj.loginCount)
      ..writeByte(8)
      ..write(obj.currentLoginStreak)
      ..writeByte(9)
      ..write(obj.maxLoginStreak)
      ..writeByte(10)
      ..write(obj.firstTransactionAt)
      ..writeByte(11)
      ..write(obj.lastTransactionAt)
      ..writeByte(12)
      ..write(obj.referralCount)
      ..writeByte(13)
      ..write(obj.referralEarnings)
      ..writeByte(14)
      ..write(obj.supportTickets)
      ..writeByte(15)
      ..write(obj.portfolioValue)
      ..writeByte(16)
      ..write(obj.portfolioROI);
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

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UserModel _$UserModelFromJson(Map<String, dynamic> json) => UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'Active',
      kycStatus: json['kycStatus'] as String? ?? 'Pending',
      emailVerified: json['emailVerified'] as bool? ?? false,
      phoneVerified: json['phoneVerified'] as bool? ?? false,
      twoFactorEnabled: json['twoFactorEnabled'] as bool? ?? false,
      planId: json['planId'] as String?,
      referralCode: json['referralCode'] as String?,
      dateOfBirth: json['dateOfBirth'] == null
          ? null
          : DateTime.parse(json['dateOfBirth'] as String),
      address: json['address'] == null
          ? null
          : Address.fromJson(json['address'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastLoginAt: json['lastLoginAt'] == null
          ? null
          : DateTime.parse(json['lastLoginAt'] as String),
      avatar: json['avatar'] as String?,
      userType: json['userType'] as String? ?? 'user',
      preferences: json['preferences'] == null
          ? null
          : UserPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>),
      limits: json['limits'] == null
          ? null
          : UserLimits.fromJson(json['limits'] as Map<String, dynamic>),
      stats: json['stats'] == null
          ? null
          : UserStats.fromJson(json['stats'] as Map<String, dynamic>),
      roles:
          (json['roles'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
      metadata: json['metadata'] as Map<String, dynamic>?,
      emailVerifiedAt: json['emailVerifiedAt'] == null
          ? null
          : DateTime.parse(json['emailVerifiedAt'] as String),
      phoneVerifiedAt: json['phoneVerifiedAt'] == null
          ? null
          : DateTime.parse(json['phoneVerifiedAt'] as String),
      timezone: json['timezone'] as String?,
      language: json['language'] as String?,
      currency: json['currency'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      lastSeenAt: json['lastSeenAt'] == null
          ? null
          : DateTime.parse(json['lastSeenAt'] as String),
    );

Map<String, dynamic> _$UserModelToJson(UserModel instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'email': instance.email,
      'phone': instance.phone,
      'balance': instance.balance,
      'status': instance.status,
      'kycStatus': instance.kycStatus,
      'emailVerified': instance.emailVerified,
      'phoneVerified': instance.phoneVerified,
      'twoFactorEnabled': instance.twoFactorEnabled,
      'planId': instance.planId,
      'referralCode': instance.referralCode,
      'dateOfBirth': instance.dateOfBirth?.toIso8601String(),
      'address': instance.address,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'lastLoginAt': instance.lastLoginAt?.toIso8601String(),
      'avatar': instance.avatar,
      'userType': instance.userType,
      'preferences': instance.preferences,
      'limits': instance.limits,
      'stats': instance.stats,
      'roles': instance.roles,
      'metadata': instance.metadata,
      'emailVerifiedAt': instance.emailVerifiedAt?.toIso8601String(),
      'phoneVerifiedAt': instance.phoneVerifiedAt?.toIso8601String(),
      'timezone': instance.timezone,
      'language': instance.language,
      'currency': instance.currency,
      'isOnline': instance.isOnline,
      'lastSeenAt': instance.lastSeenAt?.toIso8601String(),
    };

UserPreferences _$UserPreferencesFromJson(Map<String, dynamic> json) =>
    UserPreferences(
      theme: json['theme'] as String? ?? 'system',
      language: json['language'] as String? ?? 'en',
      currency: json['currency'] as String? ?? 'BDT',
      timezone: json['timezone'] as String? ?? 'Asia/Dhaka',
      notifications: json['notifications'] as bool? ?? true,
      emailUpdates: json['emailUpdates'] as bool? ?? true,
      smsUpdates: json['smsUpdates'] as bool? ?? false,
      pushNotifications: json['pushNotifications'] as bool? ?? true,
      marketingEmails: json['marketingEmails'] as bool? ?? false,
      twoFactorRequired: json['twoFactorRequired'] as bool? ?? false,
      dateFormat: json['dateFormat'] as String? ?? 'MM/dd/yyyy',
      timeFormat: json['timeFormat'] as String? ?? '12h',
      numberFormat: json['numberFormat'] as String? ?? 'en_US',
      showBalance: json['showBalance'] as bool? ?? true,
      biometricAuth: json['biometricAuth'] as bool? ?? false,
      customSettings: json['customSettings'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$UserPreferencesToJson(UserPreferences instance) =>
    <String, dynamic>{
      'theme': instance.theme,
      'language': instance.language,
      'currency': instance.currency,
      'timezone': instance.timezone,
      'notifications': instance.notifications,
      'emailUpdates': instance.emailUpdates,
      'smsUpdates': instance.smsUpdates,
      'pushNotifications': instance.pushNotifications,
      'marketingEmails': instance.marketingEmails,
      'twoFactorRequired': instance.twoFactorRequired,
      'dateFormat': instance.dateFormat,
      'timeFormat': instance.timeFormat,
      'numberFormat': instance.numberFormat,
      'showBalance': instance.showBalance,
      'biometricAuth': instance.biometricAuth,
      'customSettings': instance.customSettings,
    };

UserLimits _$UserLimitsFromJson(Map<String, dynamic> json) => UserLimits(
      dailyWithdrawalLimit:
          (json['dailyWithdrawalLimit'] as num?)?.toDouble() ?? 10000.0,
      monthlyWithdrawalLimit:
          (json['monthlyWithdrawalLimit'] as num?)?.toDouble() ?? 100000.0,
      dailyDepositLimit:
          (json['dailyDepositLimit'] as num?)?.toDouble() ?? 50000.0,
      monthlyDepositLimit:
          (json['monthlyDepositLimit'] as num?)?.toDouble() ?? 500000.0,
      maxTransactionAmount:
          (json['maxTransactionAmount'] as num?)?.toDouble() ?? 100000.0,
      dailyTransactionCount:
          (json['dailyTransactionCount'] as num?)?.toInt() ?? 20,
      monthlyTransactionCount:
          (json['monthlyTransactionCount'] as num?)?.toInt() ?? 200,
      loanLimit: (json['loanLimit'] as num?)?.toDouble() ?? 100000.0,
      maxActiveLoans: (json['maxActiveLoans'] as num?)?.toInt() ?? 2,
      canTrade: json['canTrade'] as bool? ?? true,
      canWithdraw: json['canWithdraw'] as bool? ?? true,
      canDeposit: json['canDeposit'] as bool? ?? true,
      canBorrow: json['canBorrow'] as bool? ?? true,
    );

Map<String, dynamic> _$UserLimitsToJson(UserLimits instance) =>
    <String, dynamic>{
      'dailyWithdrawalLimit': instance.dailyWithdrawalLimit,
      'monthlyWithdrawalLimit': instance.monthlyWithdrawalLimit,
      'dailyDepositLimit': instance.dailyDepositLimit,
      'monthlyDepositLimit': instance.monthlyDepositLimit,
      'maxTransactionAmount': instance.maxTransactionAmount,
      'dailyTransactionCount': instance.dailyTransactionCount,
      'monthlyTransactionCount': instance.monthlyTransactionCount,
      'loanLimit': instance.loanLimit,
      'maxActiveLoans': instance.maxActiveLoans,
      'canTrade': instance.canTrade,
      'canWithdraw': instance.canWithdraw,
      'canDeposit': instance.canDeposit,
      'canBorrow': instance.canBorrow,
    };

UserStats _$UserStatsFromJson(Map<String, dynamic> json) => UserStats(
      totalTransactions: (json['totalTransactions'] as num?)?.toInt() ?? 0,
      totalDeposited: (json['totalDeposited'] as num?)?.toDouble() ?? 0.0,
      totalWithdrawn: (json['totalWithdrawn'] as num?)?.toDouble() ?? 0.0,
      totalProfit: (json['totalProfit'] as num?)?.toDouble() ?? 0.0,
      successfulTransactions:
          (json['successfulTransactions'] as num?)?.toInt() ?? 0,
      failedTransactions: (json['failedTransactions'] as num?)?.toInt() ?? 0,
      averageTransactionAmount:
          (json['averageTransactionAmount'] as num?)?.toDouble() ?? 0.0,
      loginCount: (json['loginCount'] as num?)?.toInt() ?? 0,
      currentLoginStreak: (json['currentLoginStreak'] as num?)?.toInt() ?? 0,
      maxLoginStreak: (json['maxLoginStreak'] as num?)?.toInt() ?? 0,
      firstTransactionAt: json['firstTransactionAt'] == null
          ? null
          : DateTime.parse(json['firstTransactionAt'] as String),
      lastTransactionAt: json['lastTransactionAt'] == null
          ? null
          : DateTime.parse(json['lastTransactionAt'] as String),
      referralCount: (json['referralCount'] as num?)?.toInt() ?? 0,
      referralEarnings: (json['referralEarnings'] as num?)?.toDouble() ?? 0.0,
      supportTickets: (json['supportTickets'] as num?)?.toInt() ?? 0,
      portfolioValue: (json['portfolioValue'] as num?)?.toDouble() ?? 0.0,
      portfolioROI: (json['portfolioROI'] as num?)?.toDouble() ?? 0.0,
    );

Map<String, dynamic> _$UserStatsToJson(UserStats instance) => <String, dynamic>{
      'totalTransactions': instance.totalTransactions,
      'totalDeposited': instance.totalDeposited,
      'totalWithdrawn': instance.totalWithdrawn,
      'totalProfit': instance.totalProfit,
      'successfulTransactions': instance.successfulTransactions,
      'failedTransactions': instance.failedTransactions,
      'averageTransactionAmount': instance.averageTransactionAmount,
      'loginCount': instance.loginCount,
      'currentLoginStreak': instance.currentLoginStreak,
      'maxLoginStreak': instance.maxLoginStreak,
      'firstTransactionAt': instance.firstTransactionAt?.toIso8601String(),
      'lastTransactionAt': instance.lastTransactionAt?.toIso8601String(),
      'referralCount': instance.referralCount,
      'referralEarnings': instance.referralEarnings,
      'supportTickets': instance.supportTickets,
      'portfolioValue': instance.portfolioValue,
      'portfolioROI': instance.portfolioROI,
    };
