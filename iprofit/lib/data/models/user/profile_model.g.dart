// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ProfileModelAdapter extends TypeAdapter<ProfileModel> {
  @override
  final int typeId = 59;

  @override
  ProfileModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ProfileModel(
      userId: fields[0] as String,
      name: fields[1] as String,
      email: fields[2] as String,
      phone: fields[3] as String?,
      avatar: fields[4] as String?,
      dateOfBirth: fields[5] as DateTime?,
      gender: fields[6] as String?,
      nationality: fields[7] as String?,
      occupation: fields[8] as String?,
      address: fields[9] as Address?,
      personalInfo: fields[10] as PersonalInfo?,
      contactInfo: fields[11] as ContactInfo?,
      emergencyContact: fields[12] as EmergencyContact?,
      socialLinks: fields[13] as SocialLinks?,
      createdAt: fields[14] as DateTime,
      updatedAt: fields[15] as DateTime,
      isComplete: fields[16] as bool,
      completionPercentage: fields[17] as double,
      missingFields: (fields[18] as List).cast<String>(),
      customFields: (fields[19] as Map?)?.cast<String, dynamic>(),
      privacySettings: fields[20] as PrivacySettings?,
    );
  }

  @override
  void write(BinaryWriter writer, ProfileModel obj) {
    writer
      ..writeByte(21)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.name)
      ..writeByte(2)
      ..write(obj.email)
      ..writeByte(3)
      ..write(obj.phone)
      ..writeByte(4)
      ..write(obj.avatar)
      ..writeByte(5)
      ..write(obj.dateOfBirth)
      ..writeByte(6)
      ..write(obj.gender)
      ..writeByte(7)
      ..write(obj.nationality)
      ..writeByte(8)
      ..write(obj.occupation)
      ..writeByte(9)
      ..write(obj.address)
      ..writeByte(10)
      ..write(obj.personalInfo)
      ..writeByte(11)
      ..write(obj.contactInfo)
      ..writeByte(12)
      ..write(obj.emergencyContact)
      ..writeByte(13)
      ..write(obj.socialLinks)
      ..writeByte(14)
      ..write(obj.createdAt)
      ..writeByte(15)
      ..write(obj.updatedAt)
      ..writeByte(16)
      ..write(obj.isComplete)
      ..writeByte(17)
      ..write(obj.completionPercentage)
      ..writeByte(18)
      ..write(obj.missingFields)
      ..writeByte(19)
      ..write(obj.customFields)
      ..writeByte(20)
      ..write(obj.privacySettings);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProfileModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class KycModelAdapter extends TypeAdapter<KycModel> {
  @override
  final int typeId = 60;

  @override
  KycModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycModel(
      userId: fields[0] as String,
      status: fields[1] as String,
      documents: (fields[2] as List).cast<KycDocument>(),
      rejectionReason: fields[3] as String?,
      submittedAt: fields[4] as DateTime?,
      approvedAt: fields[5] as DateTime?,
      rejectedAt: fields[6] as DateTime?,
      reviewedBy: fields[7] as String?,
      adminNotes: fields[8] as String?,
      isVerified: fields[9] as bool,
      createdAt: fields[10] as DateTime,
      updatedAt: fields[11] as DateTime,
      personalInfo: fields[12] as KycPersonalInfo?,
      completionPercentage: fields[13] as double,
      requiredDocuments: (fields[14] as List).cast<String>(),
      submittedDocuments: (fields[15] as List).cast<String>(),
      attemptCount: fields[16] as int,
      expiresAt: fields[17] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, KycModel obj) {
    writer
      ..writeByte(18)
      ..writeByte(0)
      ..write(obj.userId)
      ..writeByte(1)
      ..write(obj.status)
      ..writeByte(2)
      ..write(obj.documents)
      ..writeByte(3)
      ..write(obj.rejectionReason)
      ..writeByte(4)
      ..write(obj.submittedAt)
      ..writeByte(5)
      ..write(obj.approvedAt)
      ..writeByte(6)
      ..write(obj.rejectedAt)
      ..writeByte(7)
      ..write(obj.reviewedBy)
      ..writeByte(8)
      ..write(obj.adminNotes)
      ..writeByte(9)
      ..write(obj.isVerified)
      ..writeByte(10)
      ..write(obj.createdAt)
      ..writeByte(11)
      ..write(obj.updatedAt)
      ..writeByte(12)
      ..write(obj.personalInfo)
      ..writeByte(13)
      ..write(obj.completionPercentage)
      ..writeByte(14)
      ..write(obj.requiredDocuments)
      ..writeByte(15)
      ..write(obj.submittedDocuments)
      ..writeByte(16)
      ..write(obj.attemptCount)
      ..writeByte(17)
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
  final int typeId = 61;

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
      status: fields[5] as String,
      rejectionReason: fields[6] as String?,
      isVerified: fields[7] as bool,
      verifiedAt: fields[8] as DateTime?,
      verifiedBy: fields[9] as String?,
      metadata: (fields[10] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, KycDocument obj) {
    writer
      ..writeByte(11)
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
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.rejectionReason)
      ..writeByte(7)
      ..write(obj.isVerified)
      ..writeByte(8)
      ..write(obj.verifiedAt)
      ..writeByte(9)
      ..write(obj.verifiedBy)
      ..writeByte(10)
      ..write(obj.metadata);
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

class PersonalInfoAdapter extends TypeAdapter<PersonalInfo> {
  @override
  final int typeId = 62;

  @override
  PersonalInfo read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PersonalInfo(
      middleName: fields[0] as String?,
      preferredName: fields[1] as String?,
      bio: fields[2] as String?,
      website: fields[3] as String?,
      languages: (fields[4] as List).cast<String>(),
      interests: (fields[5] as List).cast<String>(),
      maritalStatus: fields[6] as String?,
      dependents: fields[7] as int?,
    );
  }

  @override
  void write(BinaryWriter writer, PersonalInfo obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.middleName)
      ..writeByte(1)
      ..write(obj.preferredName)
      ..writeByte(2)
      ..write(obj.bio)
      ..writeByte(3)
      ..write(obj.website)
      ..writeByte(4)
      ..write(obj.languages)
      ..writeByte(5)
      ..write(obj.interests)
      ..writeByte(6)
      ..write(obj.maritalStatus)
      ..writeByte(7)
      ..write(obj.dependents);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PersonalInfoAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class ContactInfoAdapter extends TypeAdapter<ContactInfo> {
  @override
  final int typeId = 63;

  @override
  ContactInfo read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ContactInfo(
      alternatePhone: fields[0] as String?,
      workPhone: fields[1] as String?,
      workEmail: fields[2] as String?,
      workAddress: fields[3] as Address?,
      preferredContactMethod: fields[4] as String?,
      availableHours: (fields[5] as List).cast<String>(),
    );
  }

  @override
  void write(BinaryWriter writer, ContactInfo obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.alternatePhone)
      ..writeByte(1)
      ..write(obj.workPhone)
      ..writeByte(2)
      ..write(obj.workEmail)
      ..writeByte(3)
      ..write(obj.workAddress)
      ..writeByte(4)
      ..write(obj.preferredContactMethod)
      ..writeByte(5)
      ..write(obj.availableHours);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContactInfoAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class EmergencyContactAdapter extends TypeAdapter<EmergencyContact> {
  @override
  final int typeId = 64;

  @override
  EmergencyContact read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return EmergencyContact(
      name: fields[0] as String,
      phone: fields[1] as String,
      relationship: fields[2] as String,
      email: fields[3] as String?,
      address: fields[4] as Address?,
      isPrimary: fields[5] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, EmergencyContact obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.name)
      ..writeByte(1)
      ..write(obj.phone)
      ..writeByte(2)
      ..write(obj.relationship)
      ..writeByte(3)
      ..write(obj.email)
      ..writeByte(4)
      ..write(obj.address)
      ..writeByte(5)
      ..write(obj.isPrimary);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmergencyContactAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class SocialLinksAdapter extends TypeAdapter<SocialLinks> {
  @override
  final int typeId = 65;

  @override
  SocialLinks read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SocialLinks(
      facebook: fields[0] as String?,
      twitter: fields[1] as String?,
      linkedin: fields[2] as String?,
      instagram: fields[3] as String?,
      youtube: fields[4] as String?,
      tiktok: fields[5] as String?,
      customLinks: (fields[6] as Map?)?.cast<String, String>(),
    );
  }

  @override
  void write(BinaryWriter writer, SocialLinks obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.facebook)
      ..writeByte(1)
      ..write(obj.twitter)
      ..writeByte(2)
      ..write(obj.linkedin)
      ..writeByte(3)
      ..write(obj.instagram)
      ..writeByte(4)
      ..write(obj.youtube)
      ..writeByte(5)
      ..write(obj.tiktok)
      ..writeByte(6)
      ..write(obj.customLinks);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SocialLinksAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PrivacySettingsAdapter extends TypeAdapter<PrivacySettings> {
  @override
  final int typeId = 66;

  @override
  PrivacySettings read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return PrivacySettings(
      showEmail: fields[0] as bool,
      showPhone: fields[1] as bool,
      showAddress: fields[2] as bool,
      showDateOfBirth: fields[3] as bool,
      showSocialLinks: fields[4] as bool,
      allowMessages: fields[5] as bool,
      showOnlineStatus: fields[6] as bool,
      indexProfile: fields[7] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, PrivacySettings obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.showEmail)
      ..writeByte(1)
      ..write(obj.showPhone)
      ..writeByte(2)
      ..write(obj.showAddress)
      ..writeByte(3)
      ..write(obj.showDateOfBirth)
      ..writeByte(4)
      ..write(obj.showSocialLinks)
      ..writeByte(5)
      ..write(obj.allowMessages)
      ..writeByte(6)
      ..write(obj.showOnlineStatus)
      ..writeByte(7)
      ..write(obj.indexProfile);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PrivacySettingsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class KycPersonalInfoAdapter extends TypeAdapter<KycPersonalInfo> {
  @override
  final int typeId = 67;

  @override
  KycPersonalInfo read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return KycPersonalInfo(
      dateOfBirth: fields[0] as DateTime,
      nationality: fields[1] as String,
      occupation: fields[2] as String,
      employerName: fields[3] as String?,
      annualIncome: fields[4] as double?,
      sourceOfIncome: fields[5] as String?,
      isPoliticallyExposed: fields[6] as bool,
      politicalExposureDetails: fields[7] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, KycPersonalInfo obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.dateOfBirth)
      ..writeByte(1)
      ..write(obj.nationality)
      ..writeByte(2)
      ..write(obj.occupation)
      ..writeByte(3)
      ..write(obj.employerName)
      ..writeByte(4)
      ..write(obj.annualIncome)
      ..writeByte(5)
      ..write(obj.sourceOfIncome)
      ..writeByte(6)
      ..write(obj.isPoliticallyExposed)
      ..writeByte(7)
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

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ProfileModel _$ProfileModelFromJson(Map<String, dynamic> json) => ProfileModel(
      userId: json['userId'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      dateOfBirth: json['dateOfBirth'] == null
          ? null
          : DateTime.parse(json['dateOfBirth'] as String),
      gender: json['gender'] as String?,
      nationality: json['nationality'] as String?,
      occupation: json['occupation'] as String?,
      address: json['address'] == null
          ? null
          : Address.fromJson(json['address'] as Map<String, dynamic>),
      personalInfo: json['personalInfo'] == null
          ? null
          : PersonalInfo.fromJson(json['personalInfo'] as Map<String, dynamic>),
      contactInfo: json['contactInfo'] == null
          ? null
          : ContactInfo.fromJson(json['contactInfo'] as Map<String, dynamic>),
      emergencyContact: json['emergencyContact'] == null
          ? null
          : EmergencyContact.fromJson(
              json['emergencyContact'] as Map<String, dynamic>),
      socialLinks: json['socialLinks'] == null
          ? null
          : SocialLinks.fromJson(json['socialLinks'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      isComplete: json['isComplete'] as bool? ?? false,
      completionPercentage:
          (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
      missingFields: (json['missingFields'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      customFields: json['customFields'] as Map<String, dynamic>?,
      privacySettings: json['privacySettings'] == null
          ? null
          : PrivacySettings.fromJson(
              json['privacySettings'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ProfileModelToJson(ProfileModel instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'name': instance.name,
      'email': instance.email,
      'phone': instance.phone,
      'avatar': instance.avatar,
      'dateOfBirth': instance.dateOfBirth?.toIso8601String(),
      'gender': instance.gender,
      'nationality': instance.nationality,
      'occupation': instance.occupation,
      'address': instance.address,
      'personalInfo': instance.personalInfo,
      'contactInfo': instance.contactInfo,
      'emergencyContact': instance.emergencyContact,
      'socialLinks': instance.socialLinks,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'isComplete': instance.isComplete,
      'completionPercentage': instance.completionPercentage,
      'missingFields': instance.missingFields,
      'customFields': instance.customFields,
      'privacySettings': instance.privacySettings,
    };

KycModel _$KycModelFromJson(Map<String, dynamic> json) => KycModel(
      userId: json['userId'] as String,
      status: json['status'] as String? ?? 'not_started',
      documents: (json['documents'] as List<dynamic>?)
              ?.map((e) => KycDocument.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      rejectionReason: json['rejectionReason'] as String?,
      submittedAt: json['submittedAt'] == null
          ? null
          : DateTime.parse(json['submittedAt'] as String),
      approvedAt: json['approvedAt'] == null
          ? null
          : DateTime.parse(json['approvedAt'] as String),
      rejectedAt: json['rejectedAt'] == null
          ? null
          : DateTime.parse(json['rejectedAt'] as String),
      reviewedBy: json['reviewedBy'] as String?,
      adminNotes: json['adminNotes'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      personalInfo: json['personalInfo'] == null
          ? null
          : KycPersonalInfo.fromJson(
              json['personalInfo'] as Map<String, dynamic>),
      completionPercentage:
          (json['completionPercentage'] as num?)?.toDouble() ?? 0.0,
      requiredDocuments: (json['requiredDocuments'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      submittedDocuments: (json['submittedDocuments'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      attemptCount: (json['attemptCount'] as num?)?.toInt() ?? 0,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
    );

Map<String, dynamic> _$KycModelToJson(KycModel instance) => <String, dynamic>{
      'userId': instance.userId,
      'status': instance.status,
      'documents': instance.documents,
      'rejectionReason': instance.rejectionReason,
      'submittedAt': instance.submittedAt?.toIso8601String(),
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'rejectedAt': instance.rejectedAt?.toIso8601String(),
      'reviewedBy': instance.reviewedBy,
      'adminNotes': instance.adminNotes,
      'isVerified': instance.isVerified,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'personalInfo': instance.personalInfo,
      'completionPercentage': instance.completionPercentage,
      'requiredDocuments': instance.requiredDocuments,
      'submittedDocuments': instance.submittedDocuments,
      'attemptCount': instance.attemptCount,
      'expiresAt': instance.expiresAt?.toIso8601String(),
    };

KycDocument _$KycDocumentFromJson(Map<String, dynamic> json) => KycDocument(
      id: json['id'] as String,
      type: json['type'] as String,
      url: json['url'] as String,
      filename: json['filename'] as String,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
      status: json['status'] as String? ?? 'pending',
      rejectionReason: json['rejectionReason'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      verifiedAt: json['verifiedAt'] == null
          ? null
          : DateTime.parse(json['verifiedAt'] as String),
      verifiedBy: json['verifiedBy'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$KycDocumentToJson(KycDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'url': instance.url,
      'filename': instance.filename,
      'uploadedAt': instance.uploadedAt.toIso8601String(),
      'status': instance.status,
      'rejectionReason': instance.rejectionReason,
      'isVerified': instance.isVerified,
      'verifiedAt': instance.verifiedAt?.toIso8601String(),
      'verifiedBy': instance.verifiedBy,
      'metadata': instance.metadata,
    };

PersonalInfo _$PersonalInfoFromJson(Map<String, dynamic> json) => PersonalInfo(
      middleName: json['middleName'] as String?,
      preferredName: json['preferredName'] as String?,
      bio: json['bio'] as String?,
      website: json['website'] as String?,
      languages: (json['languages'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      interests: (json['interests'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      maritalStatus: json['maritalStatus'] as String?,
      dependents: (json['dependents'] as num?)?.toInt(),
    );

Map<String, dynamic> _$PersonalInfoToJson(PersonalInfo instance) =>
    <String, dynamic>{
      'middleName': instance.middleName,
      'preferredName': instance.preferredName,
      'bio': instance.bio,
      'website': instance.website,
      'languages': instance.languages,
      'interests': instance.interests,
      'maritalStatus': instance.maritalStatus,
      'dependents': instance.dependents,
    };

ContactInfo _$ContactInfoFromJson(Map<String, dynamic> json) => ContactInfo(
      alternatePhone: json['alternatePhone'] as String?,
      workPhone: json['workPhone'] as String?,
      workEmail: json['workEmail'] as String?,
      workAddress: json['workAddress'] == null
          ? null
          : Address.fromJson(json['workAddress'] as Map<String, dynamic>),
      preferredContactMethod: json['preferredContactMethod'] as String?,
      availableHours: (json['availableHours'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$ContactInfoToJson(ContactInfo instance) =>
    <String, dynamic>{
      'alternatePhone': instance.alternatePhone,
      'workPhone': instance.workPhone,
      'workEmail': instance.workEmail,
      'workAddress': instance.workAddress,
      'preferredContactMethod': instance.preferredContactMethod,
      'availableHours': instance.availableHours,
    };

EmergencyContact _$EmergencyContactFromJson(Map<String, dynamic> json) =>
    EmergencyContact(
      name: json['name'] as String,
      phone: json['phone'] as String,
      relationship: json['relationship'] as String,
      email: json['email'] as String?,
      address: json['address'] == null
          ? null
          : Address.fromJson(json['address'] as Map<String, dynamic>),
      isPrimary: json['isPrimary'] as bool? ?? true,
    );

Map<String, dynamic> _$EmergencyContactToJson(EmergencyContact instance) =>
    <String, dynamic>{
      'name': instance.name,
      'phone': instance.phone,
      'relationship': instance.relationship,
      'email': instance.email,
      'address': instance.address,
      'isPrimary': instance.isPrimary,
    };

SocialLinks _$SocialLinksFromJson(Map<String, dynamic> json) => SocialLinks(
      facebook: json['facebook'] as String?,
      twitter: json['twitter'] as String?,
      linkedin: json['linkedin'] as String?,
      instagram: json['instagram'] as String?,
      youtube: json['youtube'] as String?,
      tiktok: json['tiktok'] as String?,
      customLinks: (json['customLinks'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
    );

Map<String, dynamic> _$SocialLinksToJson(SocialLinks instance) =>
    <String, dynamic>{
      'facebook': instance.facebook,
      'twitter': instance.twitter,
      'linkedin': instance.linkedin,
      'instagram': instance.instagram,
      'youtube': instance.youtube,
      'tiktok': instance.tiktok,
      'customLinks': instance.customLinks,
    };

PrivacySettings _$PrivacySettingsFromJson(Map<String, dynamic> json) =>
    PrivacySettings(
      showEmail: json['showEmail'] as bool? ?? false,
      showPhone: json['showPhone'] as bool? ?? false,
      showAddress: json['showAddress'] as bool? ?? false,
      showDateOfBirth: json['showDateOfBirth'] as bool? ?? false,
      showSocialLinks: json['showSocialLinks'] as bool? ?? true,
      allowMessages: json['allowMessages'] as bool? ?? true,
      showOnlineStatus: json['showOnlineStatus'] as bool? ?? true,
      indexProfile: json['indexProfile'] as bool? ?? true,
    );

Map<String, dynamic> _$PrivacySettingsToJson(PrivacySettings instance) =>
    <String, dynamic>{
      'showEmail': instance.showEmail,
      'showPhone': instance.showPhone,
      'showAddress': instance.showAddress,
      'showDateOfBirth': instance.showDateOfBirth,
      'showSocialLinks': instance.showSocialLinks,
      'allowMessages': instance.allowMessages,
      'showOnlineStatus': instance.showOnlineStatus,
      'indexProfile': instance.indexProfile,
    };

KycPersonalInfo _$KycPersonalInfoFromJson(Map<String, dynamic> json) =>
    KycPersonalInfo(
      dateOfBirth: DateTime.parse(json['dateOfBirth'] as String),
      nationality: json['nationality'] as String,
      occupation: json['occupation'] as String,
      employerName: json['employerName'] as String?,
      annualIncome: (json['annualIncome'] as num?)?.toDouble(),
      sourceOfIncome: json['sourceOfIncome'] as String?,
      isPoliticallyExposed: json['isPoliticallyExposed'] as bool? ?? false,
      politicalExposureDetails: json['politicalExposureDetails'] as String?,
    );

Map<String, dynamic> _$KycPersonalInfoToJson(KycPersonalInfo instance) =>
    <String, dynamic>{
      'dateOfBirth': instance.dateOfBirth.toIso8601String(),
      'nationality': instance.nationality,
      'occupation': instance.occupation,
      'employerName': instance.employerName,
      'annualIncome': instance.annualIncome,
      'sourceOfIncome': instance.sourceOfIncome,
      'isPoliticallyExposed': instance.isPoliticallyExposed,
      'politicalExposureDetails': instance.politicalExposureDetails,
    };
