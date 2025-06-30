// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deposit_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

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
      promotionCode: fields[8] as String?,
      autoInvest: fields[9] as bool,
      investmentPlanId: fields[10] as String?,
      returnUrl: fields[11] as String?,
      cancelUrl: fields[12] as String?,
      customFields: (fields[13] as Map?)?.cast<String, String>(),
    );
  }

  @override
  void write(BinaryWriter writer, DepositRequest obj) {
    writer
      ..writeByte(14)
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
      ..write(obj.note)
      ..writeByte(8)
      ..write(obj.promotionCode)
      ..writeByte(9)
      ..write(obj.autoInvest)
      ..writeByte(10)
      ..write(obj.investmentPlanId)
      ..writeByte(11)
      ..write(obj.returnUrl)
      ..writeByte(12)
      ..write(obj.cancelUrl)
      ..writeByte(13)
      ..write(obj.customFields);
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

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

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
      promotionCode: json['promotionCode'] as String?,
      autoInvest: json['autoInvest'] as bool? ?? false,
      investmentPlanId: json['investmentPlanId'] as String?,
      returnUrl: json['returnUrl'] as String?,
      cancelUrl: json['cancelUrl'] as String?,
      customFields: (json['customFields'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
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
      'promotionCode': instance.promotionCode,
      'autoInvest': instance.autoInvest,
      'investmentPlanId': instance.investmentPlanId,
      'returnUrl': instance.returnUrl,
      'cancelUrl': instance.cancelUrl,
      'customFields': instance.customFields,
    };
