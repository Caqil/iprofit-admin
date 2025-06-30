// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'withdrawal_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class WithdrawalRequestAdapter extends TypeAdapter<WithdrawalRequest> {
  @override
  final int typeId = 20;

  @override
  WithdrawalRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return WithdrawalRequest(
      userId: fields[0] as String,
      amount: fields[1] as double,
      currency: fields[2] as String,
      withdrawalMethod: fields[3] as String,
      accountDetails: fields[4] as AccountDetails,
      reason: fields[5] as String?,
      note: fields[6] as String?,
      urgentRequest: fields[7] as bool,
      twoFactorCode: fields[8] as String?,
      withdrawalPassword: fields[9] as String?,
      scheduledAt: fields[10] as DateTime?,
      withdrawalSource: fields[11] as String?,
      customFields: (fields[12] as Map?)?.cast<String, String>(),
    );
  }

  @override
  void write(BinaryWriter writer, WithdrawalRequest obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.currency)
      ..writeByte(3)
      ..write(obj.withdrawalMethod)
      ..writeByte(4)
      ..write(obj.accountDetails)
      ..writeByte(5)
      ..write(obj.reason)
      ..writeByte(6)
      ..write(obj.note)
      ..writeByte(7)
      ..write(obj.urgentRequest)
      ..writeByte(8)
      ..write(obj.twoFactorCode)
      ..writeByte(9)
      ..write(obj.withdrawalPassword)
      ..writeByte(10)
      ..write(obj.scheduledAt)
      ..writeByte(11)
      ..write(obj.withdrawalSource)
      ..writeByte(12)
      ..write(obj.customFields);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WithdrawalRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class AccountDetailsAdapter extends TypeAdapter<AccountDetails> {
  @override
  final int typeId = 21;

  @override
  AccountDetails read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return AccountDetails(
      accountNumber: fields[0] as String,
      accountHolderName: fields[1] as String,
      bankName: fields[2] as String?,
      routingNumber: fields[3] as String?,
      swiftCode: fields[4] as String?,
      branchName: fields[5] as String?,
      mobileNumber: fields[6] as String?,
      accountType: fields[7] as String,
      walletAddress: fields[8] as String?,
      cryptoNetwork: fields[9] as String?,
      cardNumber: fields[10] as String?,
      cardHolderName: fields[11] as String?,
      additionalInfo: (fields[12] as Map?)?.cast<String, String>(),
    );
  }

  @override
  void write(BinaryWriter writer, AccountDetails obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.accountNumber)
      ..writeByte(1)
      ..write(obj.accountHolderName)
      ..writeByte(2)
      ..write(obj.bankName)
      ..writeByte(3)
      ..write(obj.routingNumber)
      ..writeByte(4)
      ..write(obj.swiftCode)
      ..writeByte(5)
      ..write(obj.branchName)
      ..writeByte(6)
      ..write(obj.mobileNumber)
      ..writeByte(7)
      ..write(obj.accountType)
      ..writeByte(8)
      ..write(obj.walletAddress)
      ..writeByte(9)
      ..write(obj.cryptoNetwork)
      ..writeByte(10)
      ..write(obj.cardNumber)
      ..writeByte(11)
      ..write(obj.cardHolderName)
      ..writeByte(12)
      ..write(obj.additionalInfo);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AccountDetailsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

WithdrawalRequest _$WithdrawalRequestFromJson(Map<String, dynamic> json) =>
    WithdrawalRequest(
      userId: json['userId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String,
      withdrawalMethod: json['withdrawalMethod'] as String,
      accountDetails: AccountDetails.fromJson(
          json['accountDetails'] as Map<String, dynamic>),
      reason: json['reason'] as String?,
      note: json['note'] as String?,
      urgentRequest: json['urgentRequest'] as bool? ?? false,
      twoFactorCode: json['twoFactorCode'] as String?,
      withdrawalPassword: json['withdrawalPassword'] as String?,
      scheduledAt: json['scheduledAt'] == null
          ? null
          : DateTime.parse(json['scheduledAt'] as String),
      withdrawalSource: json['withdrawalSource'] as String?,
      customFields: (json['customFields'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
    );

Map<String, dynamic> _$WithdrawalRequestToJson(WithdrawalRequest instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'amount': instance.amount,
      'currency': instance.currency,
      'withdrawalMethod': instance.withdrawalMethod,
      'accountDetails': instance.accountDetails,
      'reason': instance.reason,
      'note': instance.note,
      'urgentRequest': instance.urgentRequest,
      'twoFactorCode': instance.twoFactorCode,
      'withdrawalPassword': instance.withdrawalPassword,
      'scheduledAt': instance.scheduledAt?.toIso8601String(),
      'withdrawalSource': instance.withdrawalSource,
      'customFields': instance.customFields,
    };

AccountDetails _$AccountDetailsFromJson(Map<String, dynamic> json) =>
    AccountDetails(
      accountNumber: json['accountNumber'] as String,
      accountHolderName: json['accountHolderName'] as String,
      bankName: json['bankName'] as String?,
      routingNumber: json['routingNumber'] as String?,
      swiftCode: json['swiftCode'] as String?,
      branchName: json['branchName'] as String?,
      mobileNumber: json['mobileNumber'] as String?,
      accountType: json['accountType'] as String? ?? 'bank',
      walletAddress: json['walletAddress'] as String?,
      cryptoNetwork: json['cryptoNetwork'] as String?,
      cardNumber: json['cardNumber'] as String?,
      cardHolderName: json['cardHolderName'] as String?,
      additionalInfo: (json['additionalInfo'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
    );

Map<String, dynamic> _$AccountDetailsToJson(AccountDetails instance) =>
    <String, dynamic>{
      'accountNumber': instance.accountNumber,
      'accountHolderName': instance.accountHolderName,
      'bankName': instance.bankName,
      'routingNumber': instance.routingNumber,
      'swiftCode': instance.swiftCode,
      'branchName': instance.branchName,
      'mobileNumber': instance.mobileNumber,
      'accountType': instance.accountType,
      'walletAddress': instance.walletAddress,
      'cryptoNetwork': instance.cryptoNetwork,
      'cardNumber': instance.cardNumber,
      'cardHolderName': instance.cardHolderName,
      'additionalInfo': instance.additionalInfo,
    };
