// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class KycModelAdapter extends TypeAdapter<KycModel> {
  @override
  final int typeId = 55;

  @override
  KycModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      status: fields[2] as String,
      documents: (fields[3] as List).cast<KycDocument>(),
      submittedAt: fields[4] as DateTime,
      reviewedAt: fields[5] as DateTime?,
      approvedAt: fields[6] as DateTime?,
      rejectedAt: fields[7] as DateTime?,
      rejectionReason: fields[8] as String?,
      adminNotes: fields[9] as String?,
      reviewedBy: fields[10] as String?,
      isVerified: fields[11] as bool,
      verificationLevel: fields[12] as double,
      personalInfo: fields[13] as KycPersonalInfo?,
      createdAt: fields[14] as DateTime,
      updatedAt: fields[15] as DateTime,
      verificationSteps: (fields[16] as List).cast<KycVerificationStep>(),
      metadata: (fields[17] as Map?)?.cast<String, dynamic>(),
      expiresAt: fields[18] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, KycModel obj) {
    writer
      ..writeByte(19)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.status)
      ..writeByte(3)
      ..write(obj.documents)
      ..writeByte(4)
      ..write(obj.submittedAt)
      ..writeByte(5)
      ..write(obj.reviewedAt)
      ..writeByte(6)
      ..write(obj.approvedAt)
      ..writeByte(7)
      ..write(obj.rejectedAt)
      ..writeByte(8)
      ..write(obj.rejectionReason)
      ..writeByte(9)
      ..write(obj.adminNotes)
      ..writeByte(10)
      ..write(obj.reviewedBy)
      ..writeByte(11)
      ..write(obj.isVerified)
      ..writeByte(12)
      ..write(obj.verificationLevel)
      ..writeByte(13)
      ..write(obj.personalInfo)
      ..writeByte(14)
      ..write(obj.createdAt)
      ..writeByte(15)
      ..write(obj.updatedAt)
      ..writeByte(16)
      ..write(obj.verificationSteps)
      ..writeByte(17)
      ..write(obj.metadata)
      ..writeByte(18)
      ..write(obj.expiresAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is KycModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class KycDocumentAdapter extends TypeAdapter<KycDocument> {
  @override
  final int typeId = 56;

  @override
  KycDocument read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycDocument(
      id: fields[0] as String,
      type: fields[1] as String,
      url: fields[2] as String,
      filename: fields[3] as String,
      uploadedAt: fields[4] as DateTime,
      description: fields[5] as String?,
      isVerified: fields[6] as bool,
      verifiedAt: fields[7] as DateTime?,
      verificationNotes: fields[8] as String?,
      status: fields[9] as String,
      fileSize: fields[10] as int,
      mimeType: fields[11] as String,
      extractedData: (fields[12] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, KycDocument obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.type)
      ..writeByte(2)
      ..write(obj.url)
      ..writeByte(3)
      ..write(obj.filename)
      ..writeByte(4)
      ..write(obj.uploadedAt)
      ..writeByte(5)
      ..write(obj.description)
      ..writeByte(6)
      ..write(obj.isVerified)
      ..writeByte(7)
      ..write(obj.verifiedAt)
      ..writeByte(8)
      ..write(obj.verificationNotes)
      ..writeByte(9)
      ..write(obj.status)
      ..writeByte(10)
      ..write(obj.fileSize)
      ..writeByte(11)
      ..write(obj.mimeType)
      ..writeByte(12)
      ..write(obj.extractedData);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is KycDocumentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class KycPersonalInfoAdapter extends TypeAdapter<KycPersonalInfo> {
  @override
  final int typeId = 57;

  @override
  KycPersonalInfo read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycPersonalInfo(
      firstName: fields[0] as String,
      lastName: fields[1] as String,
      dateOfBirth: fields[2] as DateTime,
      nationality: fields[3] as String,
      occupation: fields[4] as String,
      employerName: fields[5] as String?,
      annualIncome: fields[6] as double?,
      address: fields[7] as String,
      city: fields[8] as String,
      state: fields[9] as String,
      country: fields[10] as String,
      zipCode: fields[11] as String,
      sourceOfFunds: fields[12] as String?,
      isPoliticallyExposed: fields[13] as bool,
      politicalExposureDetails: fields[14] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, KycPersonalInfo obj) {
    writer
      ..writeByte(15)
      ..writeByte(0)
      ..write(obj.firstName)
      ..writeByte(1)
      ..write(obj.lastName)
      ..writeByte(2)
      ..write(obj.dateOfBirth)
      ..writeByte(3)
      ..write(obj.nationality)
      ..writeByte(4)
      ..write(obj.occupation)
      ..writeByte(5)
      ..write(obj.employerName)
      ..writeByte(6)
      ..write(obj.annualIncome)
      ..writeByte(7)
      ..write(obj.address)
      ..writeByte(8)
      ..write(obj.city)
      ..writeByte(9)
      ..write(obj.state)
      ..writeByte(10)
      ..write(obj.country)
      ..writeByte(11)
      ..write(obj.zipCode)
      ..writeByte(12)
      ..write(obj.sourceOfFunds)
      ..writeByte(13)
      ..write(obj.isPoliticallyExposed)
      ..writeByte(14)
      ..write(obj.politicalExposureDetails);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is KycPersonalInfoAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class KycVerificationStepAdapter extends TypeAdapter<KycVerificationStep> {
  @override
  final int typeId = 58;

  @override
  KycVerificationStep read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycVerificationStep(
      name: fields[0] as String,
      description: fields[1] as String,
      isCompleted: fields[2] as bool,
      isRequired: fields[3] as bool,
      order: fields[4] as int,
      completedAt: fields[5] as DateTime?,
      data: (fields[6] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, KycVerificationStep obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.name)
      ..writeByte(1)
      ..write(obj.description)
      ..writeByte(2)
      ..write(obj.isCompleted)
      ..writeByte(3)
      ..write(obj.isRequired)
      ..writeByte(4)
      ..write(obj.order)
      ..writeByte(5)
      ..write(obj.completedAt)
      ..writeByte(6)
      ..write(obj.data);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is KycVerificationStepAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

KycModel _$KycModelFromJson(Map<String, dynamic> json) => KycModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      status: json['status'] as String,
      documents: (json['documents'] as List<dynamic>?)
              ?.map((e) => KycDocument.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      reviewedAt: json['reviewedAt'] == null
          ? null
          : DateTime.parse(json['reviewedAt'] as String),
      approvedAt: json['approvedAt'] == null
          ? null
          : DateTime.parse(json['approvedAt'] as String),
      rejectedAt: json['rejectedAt'] == null
          ? null
          : DateTime.parse(json['rejectedAt'] as String),
      rejectionReason: json['rejectionReason'] as String?,
      adminNotes: json['adminNotes'] as String?,
      reviewedBy: json['reviewedBy'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      verificationLevel: (json['verificationLevel'] as num?)?.toDouble() ?? 0.0,
      personalInfo: json['personalInfo'] == null
          ? null
          : KycPersonalInfo.fromJson(
              json['personalInfo'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      verificationSteps: (json['verificationSteps'] as List<dynamic>?)
              ?.map((e) =>
                  KycVerificationStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      metadata: json['metadata'] as Map<String, dynamic>?,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
    );

Map<String, dynamic> _$KycModelToJson(KycModel instance) => <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'status': instance.status,
      'documents': instance.documents,
      'submittedAt': instance.submittedAt.toIso8601String(),
      'reviewedAt': instance.reviewedAt?.toIso8601String(),
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'rejectedAt': instance.rejectedAt?.toIso8601String(),
      'rejectionReason': instance.rejectionReason,
      'adminNotes': instance.adminNotes,
      'reviewedBy': instance.reviewedBy,
      'isVerified': instance.isVerified,
      'verificationLevel': instance.verificationLevel,
      'personalInfo': instance.personalInfo,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'verificationSteps': instance.verificationSteps,
      'metadata': instance.metadata,
      'expiresAt': instance.expiresAt?.toIso8601String(),
    };

KycDocument _$KycDocumentFromJson(Map<String, dynamic> json) => KycDocument(
      id: json['id'] as String,
      type: json['type'] as String,
      url: json['url'] as String,
      filename: json['filename'] as String,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
      description: json['description'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      verifiedAt: json['verifiedAt'] == null
          ? null
          : DateTime.parse(json['verifiedAt'] as String),
      verificationNotes: json['verificationNotes'] as String?,
      status: json['status'] as String? ?? 'pending',
      fileSize: (json['fileSize'] as num).toInt(),
      mimeType: json['mimeType'] as String,
      extractedData: json['extractedData'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$KycDocumentToJson(KycDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'url': instance.url,
      'filename': instance.filename,
      'uploadedAt': instance.uploadedAt.toIso8601String(),
      'description': instance.description,
      'isVerified': instance.isVerified,
      'verifiedAt': instance.verifiedAt?.toIso8601String(),
      'verificationNotes': instance.verificationNotes,
      'status': instance.status,
      'fileSize': instance.fileSize,
      'mimeType': instance.mimeType,
      'extractedData': instance.extractedData,
    };

KycPersonalInfo _$KycPersonalInfoFromJson(Map<String, dynamic> json) =>
    KycPersonalInfo(
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      dateOfBirth: DateTime.parse(json['dateOfBirth'] as String),
      nationality: json['nationality'] as String,
      occupation: json['occupation'] as String,
      employerName: json['employerName'] as String?,
      annualIncome: (json['annualIncome'] as num?)?.toDouble(),
      address: json['address'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      country: json['country'] as String,
      zipCode: json['zipCode'] as String,
      sourceOfFunds: json['sourceOfFunds'] as String?,
      isPoliticallyExposed: json['isPoliticallyExposed'] as bool? ?? false,
      politicalExposureDetails: json['politicalExposureDetails'] as String?,
    );

Map<String, dynamic> _$KycPersonalInfoToJson(KycPersonalInfo instance) =>
    <String, dynamic>{
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'dateOfBirth': instance.dateOfBirth.toIso8601String(),
      'nationality': instance.nationality,
      'occupation': instance.occupation,
      'employerName': instance.employerName,
      'annualIncome': instance.annualIncome,
      'address': instance.address,
      'city': instance.city,
      'state': instance.state,
      'country': instance.country,
      'zipCode': instance.zipCode,
      'sourceOfFunds': instance.sourceOfFunds,
      'isPoliticallyExposed': instance.isPoliticallyExposed,
      'politicalExposureDetails': instance.politicalExposureDetails,
    };

KycVerificationStep _$KycVerificationStepFromJson(Map<String, dynamic> json) =>
    KycVerificationStep(
      name: json['name'] as String,
      description: json['description'] as String,
      isCompleted: json['isCompleted'] as bool? ?? false,
      isRequired: json['isRequired'] as bool? ?? true,
      order: (json['order'] as num).toInt(),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
      data: json['data'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$KycVerificationStepToJson(
        KycVerificationStep instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'isCompleted': instance.isCompleted,
      'isRequired': instance.isRequired,
      'order': instance.order,
      'completedAt': instance.completedAt?.toIso8601String(),
      'data': instance.data,
    };
