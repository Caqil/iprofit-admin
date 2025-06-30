// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transaction_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TransactionModelAdapter extends TypeAdapter<TransactionModel> {
  @override
  final int typeId = 18;

  @override
  TransactionModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TransactionModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      type: fields[2] as String,
      amount: fields[3] as double,
      currency: fields[4] as String,
      status: fields[5] as String,
      gateway: fields[6] as String?,
      paymentMethod: fields[7] as String?,
      transactionId: fields[8] as String?,
      reference: fields[9] as String?,
      description: fields[10] as String?,
      fee: fields[11] as double?,
      netAmount: fields[12] as double,
      createdAt: fields[13] as DateTime,
      updatedAt: fields[14] as DateTime,
      processedAt: fields[15] as DateTime?,
      approvedAt: fields[16] as DateTime?,
      rejectedAt: fields[17] as DateTime?,
      rejectionReason: fields[18] as String?,
      adminNotes: fields[19] as String?,
      gatewayData: (fields[20] as Map?)?.cast<String, dynamic>(),
      metadata: (fields[21] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, TransactionModel obj) {
    writer
      ..writeByte(22)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.type)
      ..writeByte(3)
      ..write(obj.amount)
      ..writeByte(4)
      ..write(obj.currency)
      ..writeByte(5)
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.gateway)
      ..writeByte(7)
      ..write(obj.paymentMethod)
      ..writeByte(8)
      ..write(obj.transactionId)
      ..writeByte(9)
      ..write(obj.reference)
      ..writeByte(10)
      ..write(obj.description)
      ..writeByte(11)
      ..write(obj.fee)
      ..writeByte(12)
      ..write(obj.netAmount)
      ..writeByte(13)
      ..write(obj.createdAt)
      ..writeByte(14)
      ..write(obj.updatedAt)
      ..writeByte(15)
      ..write(obj.processedAt)
      ..writeByte(16)
      ..write(obj.approvedAt)
      ..writeByte(17)
      ..write(obj.rejectedAt)
      ..writeByte(18)
      ..write(obj.rejectionReason)
      ..writeByte(19)
      ..write(obj.adminNotes)
      ..writeByte(20)
      ..write(obj.gatewayData)
      ..writeByte(21)
      ..write(obj.metadata);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TransactionModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class DepositRequestAdapter extends TypeAdapter<DepositRequest> {
  @override
  final int typeId = 19;

  @override
  DepositRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return DepositRequest(
      userId: fields[0] as String,
      amount: fields[1] as double,
      currency: fields[2] as String,
      gateway: fields[3] as String,
      paymentMethod: fields[4] as String?,
      gatewayData: (fields[5] as Map?)?.cast<String, dynamic>(),
      customerReference: fields[6] as String?,
      note: fields[7] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, DepositRequest obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.currency)
      ..writeByte(3)
      ..write(obj.gateway)
      ..writeByte(4)
      ..write(obj.paymentMethod)
      ..writeByte(5)
      ..write(obj.gatewayData)
      ..writeByte(6)
      ..write(obj.customerReference)
      ..writeByte(7)
      ..write(obj.note);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DepositRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

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
    );
  }

  @override
  void write(BinaryWriter writer, WithdrawalRequest obj) {
    writer
      ..writeByte(8)
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
      ..write(obj.urgentRequest);
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
    );
  }

  @override
  void write(BinaryWriter writer, AccountDetails obj) {
    writer
      ..writeByte(8)
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
      ..write(obj.accountType);
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

TransactionModel _$TransactionModelFromJson(Map<String, dynamic> json) =>
    TransactionModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String,
      status: json['status'] as String,
      gateway: json['gateway'] as String?,
      paymentMethod: json['paymentMethod'] as String?,
      transactionId: json['transactionId'] as String?,
      reference: json['reference'] as String?,
      description: json['description'] as String?,
      fee: (json['fee'] as num?)?.toDouble(),
      netAmount: (json['netAmount'] as num).toDouble(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      processedAt: json['processedAt'] == null
          ? null
          : DateTime.parse(json['processedAt'] as String),
      approvedAt: json['approvedAt'] == null
          ? null
          : DateTime.parse(json['approvedAt'] as String),
      rejectedAt: json['rejectedAt'] == null
          ? null
          : DateTime.parse(json['rejectedAt'] as String),
      rejectionReason: json['rejectionReason'] as String?,
      adminNotes: json['adminNotes'] as String?,
      gatewayData: json['gatewayData'] as Map<String, dynamic>?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$TransactionModelToJson(TransactionModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'type': instance.type,
      'amount': instance.amount,
      'currency': instance.currency,
      'status': instance.status,
      'gateway': instance.gateway,
      'paymentMethod': instance.paymentMethod,
      'transactionId': instance.transactionId,
      'reference': instance.reference,
      'description': instance.description,
      'fee': instance.fee,
      'netAmount': instance.netAmount,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'processedAt': instance.processedAt?.toIso8601String(),
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'rejectedAt': instance.rejectedAt?.toIso8601String(),
      'rejectionReason': instance.rejectionReason,
      'adminNotes': instance.adminNotes,
      'gatewayData': instance.gatewayData,
      'metadata': instance.metadata,
    };

DepositRequest _$DepositRequestFromJson(Map<String, dynamic> json) =>
    DepositRequest(
      userId: json['userId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String,
      gateway: json['gateway'] as String,
      paymentMethod: json['paymentMethod'] as String?,
      gatewayData: json['gatewayData'] as Map<String, dynamic>?,
      customerReference: json['customerReference'] as String?,
      note: json['note'] as String?,
    );

Map<String, dynamic> _$DepositRequestToJson(DepositRequest instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'amount': instance.amount,
      'currency': instance.currency,
      'gateway': instance.gateway,
      'paymentMethod': instance.paymentMethod,
      'gatewayData': instance.gatewayData,
      'customerReference': instance.customerReference,
      'note': instance.note,
    };

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
    };
