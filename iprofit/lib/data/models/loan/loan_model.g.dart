// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'loan_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LoanModelAdapter extends TypeAdapter<LoanModel> {
  @override
  final int typeId = 12;

  @override
  LoanModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      amount: fields[2] as double,
      purpose: fields[3] as String,
      tenure: fields[4] as int,
      status: fields[5] as String,
      interestRate: fields[6] as double?,
      emiAmount: fields[7] as double?,
      totalAmount: fields[8] as double?,
      totalInterest: fields[9] as double?,
      paidAmount: fields[10] as double,
      remainingAmount: fields[11] as double,
      applicationDate: fields[12] as DateTime,
      approvedDate: fields[13] as DateTime?,
      disbursedDate: fields[14] as DateTime?,
      completedDate: fields[15] as DateTime?,
      rejectedDate: fields[16] as DateTime?,
      rejectionReason: fields[17] as String?,
      createdAt: fields[18] as DateTime,
      updatedAt: fields[19] as DateTime,
      personalDetails: fields[20] as LoanPersonalDetails?,
      employmentDetails: fields[21] as LoanEmploymentDetails?,
      financialDetails: fields[22] as LoanFinancialDetails?,
      emiSchedule: (fields[23] as List).cast<EmiSchedule>(),
    );
  }

  @override
  void write(BinaryWriter writer, LoanModel obj) {
    writer
      ..writeByte(24)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.amount)
      ..writeByte(3)
      ..write(obj.purpose)
      ..writeByte(4)
      ..write(obj.tenure)
      ..writeByte(5)
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.interestRate)
      ..writeByte(7)
      ..write(obj.emiAmount)
      ..writeByte(8)
      ..write(obj.totalAmount)
      ..writeByte(9)
      ..write(obj.totalInterest)
      ..writeByte(10)
      ..write(obj.paidAmount)
      ..writeByte(11)
      ..write(obj.remainingAmount)
      ..writeByte(12)
      ..write(obj.applicationDate)
      ..writeByte(13)
      ..write(obj.approvedDate)
      ..writeByte(14)
      ..write(obj.disbursedDate)
      ..writeByte(15)
      ..write(obj.completedDate)
      ..writeByte(16)
      ..write(obj.rejectedDate)
      ..writeByte(17)
      ..write(obj.rejectionReason)
      ..writeByte(18)
      ..write(obj.createdAt)
      ..writeByte(19)
      ..write(obj.updatedAt)
      ..writeByte(20)
      ..write(obj.personalDetails)
      ..writeByte(21)
      ..write(obj.employmentDetails)
      ..writeByte(22)
      ..write(obj.financialDetails)
      ..writeByte(23)
      ..write(obj.emiSchedule);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class LoanPersonalDetailsAdapter extends TypeAdapter<LoanPersonalDetails> {
  @override
  final int typeId = 13;

  @override
  LoanPersonalDetails read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanPersonalDetails(
      fatherName: fields[0] as String,
      motherName: fields[1] as String,
      spouseName: fields[2] as String?,
      emergencyContact: fields[3] as String,
      emergencyContactName: fields[4] as String?,
      emergencyContactRelation: fields[5] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, LoanPersonalDetails obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.fatherName)
      ..writeByte(1)
      ..write(obj.motherName)
      ..writeByte(2)
      ..write(obj.spouseName)
      ..writeByte(3)
      ..write(obj.emergencyContact)
      ..writeByte(4)
      ..write(obj.emergencyContactName)
      ..writeByte(5)
      ..write(obj.emergencyContactRelation);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanPersonalDetailsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class LoanEmploymentDetailsAdapter extends TypeAdapter<LoanEmploymentDetails> {
  @override
  final int typeId = 14;

  @override
  LoanEmploymentDetails read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanEmploymentDetails(
      companyName: fields[0] as String,
      designation: fields[1] as String,
      workExperience: fields[2] as int,
      monthlyIncome: fields[3] as double,
      employmentStatus: fields[4] as String,
      companyAddress: fields[5] as String?,
      hrContact: fields[6] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, LoanEmploymentDetails obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.companyName)
      ..writeByte(1)
      ..write(obj.designation)
      ..writeByte(2)
      ..write(obj.workExperience)
      ..writeByte(3)
      ..write(obj.monthlyIncome)
      ..writeByte(4)
      ..write(obj.employmentStatus)
      ..writeByte(5)
      ..write(obj.companyAddress)
      ..writeByte(6)
      ..write(obj.hrContact);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanEmploymentDetailsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class LoanFinancialDetailsAdapter extends TypeAdapter<LoanFinancialDetails> {
  @override
  final int typeId = 15;

  @override
  LoanFinancialDetails read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoanFinancialDetails(
      bankAccount: fields[0] as String,
      bankName: fields[1] as String,
      monthlyExpenses: fields[2] as double,
      otherLoans: fields[3] as bool,
      otherLoanAmount: fields[4] as double?,
      otherLoanDetails: fields[5] as String?,
      collateralDocuments: (fields[6] as List?)?.cast<String>(),
    );
  }

  @override
  void write(BinaryWriter writer, LoanFinancialDetails obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.bankAccount)
      ..writeByte(1)
      ..write(obj.bankName)
      ..writeByte(2)
      ..write(obj.monthlyExpenses)
      ..writeByte(3)
      ..write(obj.otherLoans)
      ..writeByte(4)
      ..write(obj.otherLoanAmount)
      ..writeByte(5)
      ..write(obj.otherLoanDetails)
      ..writeByte(6)
      ..write(obj.collateralDocuments);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoanFinancialDetailsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoanModel _$LoanModelFromJson(Map<String, dynamic> json) => LoanModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      amount: (json['amount'] as num).toDouble(),
      purpose: json['purpose'] as String,
      tenure: (json['tenure'] as num).toInt(),
      status: json['status'] as String,
      interestRate: (json['interestRate'] as num?)?.toDouble(),
      emiAmount: (json['emiAmount'] as num?)?.toDouble(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
      totalInterest: (json['totalInterest'] as num?)?.toDouble(),
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (json['remainingAmount'] as num?)?.toDouble() ?? 0.0,
      applicationDate: DateTime.parse(json['applicationDate'] as String),
      approvedDate: json['approvedDate'] == null
          ? null
          : DateTime.parse(json['approvedDate'] as String),
      disbursedDate: json['disbursedDate'] == null
          ? null
          : DateTime.parse(json['disbursedDate'] as String),
      completedDate: json['completedDate'] == null
          ? null
          : DateTime.parse(json['completedDate'] as String),
      rejectedDate: json['rejectedDate'] == null
          ? null
          : DateTime.parse(json['rejectedDate'] as String),
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      personalDetails: json['personalDetails'] == null
          ? null
          : LoanPersonalDetails.fromJson(
              json['personalDetails'] as Map<String, dynamic>),
      employmentDetails: json['employmentDetails'] == null
          ? null
          : LoanEmploymentDetails.fromJson(
              json['employmentDetails'] as Map<String, dynamic>),
      financialDetails: json['financialDetails'] == null
          ? null
          : LoanFinancialDetails.fromJson(
              json['financialDetails'] as Map<String, dynamic>),
      emiSchedule: (json['emiSchedule'] as List<dynamic>?)
              ?.map((e) => EmiSchedule.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$LoanModelToJson(LoanModel instance) => <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'amount': instance.amount,
      'purpose': instance.purpose,
      'tenure': instance.tenure,
      'status': instance.status,
      'interestRate': instance.interestRate,
      'emiAmount': instance.emiAmount,
      'totalAmount': instance.totalAmount,
      'totalInterest': instance.totalInterest,
      'paidAmount': instance.paidAmount,
      'remainingAmount': instance.remainingAmount,
      'applicationDate': instance.applicationDate.toIso8601String(),
      'approvedDate': instance.approvedDate?.toIso8601String(),
      'disbursedDate': instance.disbursedDate?.toIso8601String(),
      'completedDate': instance.completedDate?.toIso8601String(),
      'rejectedDate': instance.rejectedDate?.toIso8601String(),
      'rejectionReason': instance.rejectionReason,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'personalDetails': instance.personalDetails,
      'employmentDetails': instance.employmentDetails,
      'financialDetails': instance.financialDetails,
      'emiSchedule': instance.emiSchedule,
    };

LoanPersonalDetails _$LoanPersonalDetailsFromJson(Map<String, dynamic> json) =>
    LoanPersonalDetails(
      fatherName: json['fatherName'] as String,
      motherName: json['motherName'] as String,
      spouseName: json['spouseName'] as String?,
      emergencyContact: json['emergencyContact'] as String,
      emergencyContactName: json['emergencyContactName'] as String?,
      emergencyContactRelation: json['emergencyContactRelation'] as String?,
    );

Map<String, dynamic> _$LoanPersonalDetailsToJson(
        LoanPersonalDetails instance) =>
    <String, dynamic>{
      'fatherName': instance.fatherName,
      'motherName': instance.motherName,
      'spouseName': instance.spouseName,
      'emergencyContact': instance.emergencyContact,
      'emergencyContactName': instance.emergencyContactName,
      'emergencyContactRelation': instance.emergencyContactRelation,
    };

LoanEmploymentDetails _$LoanEmploymentDetailsFromJson(
        Map<String, dynamic> json) =>
    LoanEmploymentDetails(
      companyName: json['companyName'] as String,
      designation: json['designation'] as String,
      workExperience: (json['workExperience'] as num).toInt(),
      monthlyIncome: (json['monthlyIncome'] as num).toDouble(),
      employmentStatus: json['employmentStatus'] as String,
      companyAddress: json['companyAddress'] as String?,
      hrContact: json['hrContact'] as String?,
    );

Map<String, dynamic> _$LoanEmploymentDetailsToJson(
        LoanEmploymentDetails instance) =>
    <String, dynamic>{
      'companyName': instance.companyName,
      'designation': instance.designation,
      'workExperience': instance.workExperience,
      'monthlyIncome': instance.monthlyIncome,
      'employmentStatus': instance.employmentStatus,
      'companyAddress': instance.companyAddress,
      'hrContact': instance.hrContact,
    };

LoanFinancialDetails _$LoanFinancialDetailsFromJson(
        Map<String, dynamic> json) =>
    LoanFinancialDetails(
      bankAccount: json['bankAccount'] as String,
      bankName: json['bankName'] as String,
      monthlyExpenses: (json['monthlyExpenses'] as num).toDouble(),
      otherLoans: json['otherLoans'] as bool,
      otherLoanAmount: (json['otherLoanAmount'] as num?)?.toDouble(),
      otherLoanDetails: json['otherLoanDetails'] as String?,
      collateralDocuments: (json['collateralDocuments'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$LoanFinancialDetailsToJson(
        LoanFinancialDetails instance) =>
    <String, dynamic>{
      'bankAccount': instance.bankAccount,
      'bankName': instance.bankName,
      'monthlyExpenses': instance.monthlyExpenses,
      'otherLoans': instance.otherLoans,
      'otherLoanAmount': instance.otherLoanAmount,
      'otherLoanDetails': instance.otherLoanDetails,
      'collateralDocuments': instance.collateralDocuments,
    };
