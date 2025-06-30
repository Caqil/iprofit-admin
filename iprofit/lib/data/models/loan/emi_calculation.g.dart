// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'emi_calculation.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class EmiCalculationAdapter extends TypeAdapter<EmiCalculation> {
  @override
  final int typeId = 10;

  @override
  EmiCalculation read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return EmiCalculation(
      loanAmount: fields[0] as double,
      interestRate: fields[1] as double,
      tenure: fields[2] as int,
      emiAmount: fields[3] as double,
      totalAmount: fields[4] as double,
      totalInterest: fields[5] as double,
      schedule: (fields[6] as List).cast<EmiSchedule>(),
    );
  }

  @override
  void write(BinaryWriter writer, EmiCalculation obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.loanAmount)
      ..writeByte(1)
      ..write(obj.interestRate)
      ..writeByte(2)
      ..write(obj.tenure)
      ..writeByte(3)
      ..write(obj.emiAmount)
      ..writeByte(4)
      ..write(obj.totalAmount)
      ..writeByte(5)
      ..write(obj.totalInterest)
      ..writeByte(6)
      ..write(obj.schedule);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmiCalculationAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class EmiScheduleAdapter extends TypeAdapter<EmiSchedule> {
  @override
  final int typeId = 11;

  @override
  EmiSchedule read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return EmiSchedule(
      month: fields[0] as int,
      emi: fields[1] as double,
      principal: fields[2] as double,
      interest: fields[3] as double,
      balance: fields[4] as double,
      dueDate: fields[5] as DateTime?,
      status: fields[6] as String,
      paidDate: fields[7] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, EmiSchedule obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.month)
      ..writeByte(1)
      ..write(obj.emi)
      ..writeByte(2)
      ..write(obj.principal)
      ..writeByte(3)
      ..write(obj.interest)
      ..writeByte(4)
      ..write(obj.balance)
      ..writeByte(5)
      ..write(obj.dueDate)
      ..writeByte(6)
      ..write(obj.status)
      ..writeByte(7)
      ..write(obj.paidDate);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmiScheduleAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EmiCalculation _$EmiCalculationFromJson(Map<String, dynamic> json) =>
    EmiCalculation(
      loanAmount: (json['loanAmount'] as num).toDouble(),
      interestRate: (json['interestRate'] as num).toDouble(),
      tenure: (json['tenure'] as num).toInt(),
      emiAmount: (json['emiAmount'] as num).toDouble(),
      totalAmount: (json['totalAmount'] as num).toDouble(),
      totalInterest: (json['totalInterest'] as num).toDouble(),
      schedule: (json['schedule'] as List<dynamic>)
          .map((e) => EmiSchedule.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$EmiCalculationToJson(EmiCalculation instance) =>
    <String, dynamic>{
      'loanAmount': instance.loanAmount,
      'interestRate': instance.interestRate,
      'tenure': instance.tenure,
      'emiAmount': instance.emiAmount,
      'totalAmount': instance.totalAmount,
      'totalInterest': instance.totalInterest,
      'schedule': instance.schedule,
    };

EmiSchedule _$EmiScheduleFromJson(Map<String, dynamic> json) => EmiSchedule(
      month: (json['month'] as num).toInt(),
      emi: (json['emi'] as num).toDouble(),
      principal: (json['principal'] as num).toDouble(),
      interest: (json['interest'] as num).toDouble(),
      balance: (json['balance'] as num).toDouble(),
      dueDate: json['dueDate'] == null
          ? null
          : DateTime.parse(json['dueDate'] as String),
      status: json['status'] as String? ?? 'pending',
      paidDate: json['paidDate'] == null
          ? null
          : DateTime.parse(json['paidDate'] as String),
    );

Map<String, dynamic> _$EmiScheduleToJson(EmiSchedule instance) =>
    <String, dynamic>{
      'month': instance.month,
      'emi': instance.emi,
      'principal': instance.principal,
      'interest': instance.interest,
      'balance': instance.balance,
      'dueDate': instance.dueDate?.toIso8601String(),
      'status': instance.status,
      'paidDate': instance.paidDate?.toIso8601String(),
    };
