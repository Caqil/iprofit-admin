// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'loan_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LoanRequestAdapter extends TypeAdapter<LoanRequest> {
  @override
  final int typeId = 16;

  @override
  LoanRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanRequest(
      userId: fields[0] as String,
      amount: fields[1] as double,
      purpose: fields[2] as String,
      tenure: fields[3] as int,
      monthlyIncome: fields[4] as double,
      employmentStatus: fields[5] as String,
      employmentDetails: fields[6] as LoanEmploymentDetails,
      personalDetails: fields[7] as LoanPersonalDetails,
      financialDetails: fields[8] as LoanFinancialDetails,
      documents: (fields[9] as List?)?.cast<LoanDocument>(),
      additionalInfo: (fields[10] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, LoanRequest obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.purpose)
      ..writeByte(3)
      ..write(obj.tenure)
      ..writeByte(4)
      ..write(obj.monthlyIncome)
      ..writeByte(5)
      ..write(obj.employmentStatus)
      ..writeByte(6)
      ..write(obj.employmentDetails)
      ..writeByte(7)
      ..write(obj.personalDetails)
      ..writeByte(8)
      ..write(obj.financialDetails)
      ..writeByte(9)
      ..write(obj.documents)
      ..writeByte(10)
      ..write(obj.additionalInfo);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class LoanDocumentAdapter extends TypeAdapter<LoanDocument> {
  @override
  final int typeId = 17;

  @override
  LoanDocument read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanDocument(
      type: fields[0] as String,
      url: fields[1] as String,
      filename: fields[2] as String,
      uploadedAt: fields[3] as DateTime,
      description: fields[4] as String?,
      isVerified: fields[5] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, LoanDocument obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.type)
      ..writeByte(1)
      ..write(obj.url)
      ..writeByte(2)
      ..write(obj.filename)
      ..writeByte(3)
      ..write(obj.uploadedAt)
      ..writeByte(4)
      ..write(obj.description)
      ..writeByte(5)
      ..write(obj.isVerified);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanDocumentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoanRequest _$LoanRequestFromJson(Map<String, dynamic> json) => LoanRequest(
      userId: json['userId'] as String,
      amount: (json['amount'] as num).toDouble(),
      purpose: json['purpose'] as String,
      tenure: (json['tenure'] as num).toInt(),
      monthlyIncome: (json['monthlyIncome'] as num).toDouble(),
      employmentStatus: json['employmentStatus'] as String,
      employmentDetails: LoanEmploymentDetails.fromJson(
          json['employmentDetails'] as Map<String, dynamic>),
      personalDetails: LoanPersonalDetails.fromJson(
          json['personalDetails'] as Map<String, dynamic>),
      financialDetails: LoanFinancialDetails.fromJson(
          json['financialDetails'] as Map<String, dynamic>),
      documents: (json['documents'] as List<dynamic>?)
          ?.map((e) => LoanDocument.fromJson(e as Map<String, dynamic>))
          .toList(),
      additionalInfo: json['additionalInfo'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$LoanRequestToJson(LoanRequest instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'amount': instance.amount,
      'purpose': instance.purpose,
      'tenure': instance.tenure,
      'monthlyIncome': instance.monthlyIncome,
      'employmentStatus': instance.employmentStatus,
      'employmentDetails': instance.employmentDetails,
      'personalDetails': instance.personalDetails,
      'financialDetails': instance.financialDetails,
      'documents': instance.documents,
      'additionalInfo': instance.additionalInfo,
    };

LoanDocument _$LoanDocumentFromJson(Map<String, dynamic> json) => LoanDocument(
      type: json['type'] as String,
      url: json['url'] as String,
      filename: json['filename'] as String,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
      description: json['description'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
    );

Map<String, dynamic> _$LoanDocumentToJson(LoanDocument instance) =>
    <String, dynamic>{
      'type': instance.type,
      'url': instance.url,
      'filename': instance.filename,
      'uploadedAt': instance.uploadedAt.toIso8601String(),
      'description': instance.description,
      'isVerified': instance.isVerified,
    };
