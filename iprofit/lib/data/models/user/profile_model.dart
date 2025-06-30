import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import '../auth/signup_request.dart'; // For Address class

part 'profile_model.g.dart';

@HiveType(typeId: 59)
@JsonSerializable()
class ProfileModel extends HiveObject {
  @HiveField(0)
  final String userId;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final String email;

  @HiveField(3)
  final String? phone;

  @HiveField(4)
  final String? avatar;

  @HiveField(5)
  final DateTime? dateOfBirth;

  @HiveField(6)
  final String? gender;

  @HiveField(7)
  final String? nationality;

  @HiveField(8)
  final String? occupation;

  @HiveField(9)
  final Address? address;

  @HiveField(10)
  final PersonalInfo? personalInfo;

  @HiveField(11)
  final ContactInfo? contactInfo;

  @HiveField(12)
  final EmergencyContact? emergencyContact;

  @HiveField(13)
  final SocialLinks? socialLinks;

  @HiveField(14)
  final DateTime createdAt;

  @HiveField(15)
  final DateTime updatedAt;

  @HiveField(16)
  final bool isComplete;

  @HiveField(17)
  final double completionPercentage;

  @HiveField(18)
  final List<String> missingFields;

  @HiveField(19)
  final Map<String, dynamic>? customFields;

  @HiveField(20)
  final PrivacySettings? privacySettings;

  ProfileModel({
    required this.userId,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.dateOfBirth,
    this.gender,
    this.nationality,
    this.occupation,
    this.address,
    this.personalInfo,
    this.contactInfo,
    this.emergencyContact,
    this.socialLinks,
    required this.createdAt,
    required this.updatedAt,
    this.isComplete = false,
    this.completionPercentage = 0.0,
    this.missingFields = const [],
    this.customFields,
    this.privacySettings,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) =>
      _$ProfileModelFromJson(json);
  Map<String, dynamic> toJson() => _$ProfileModelToJson(this);

  // Validation helpers
  bool get hasBasicInfo => name.isNotEmpty && email.isNotEmpty;
  bool get hasContactInfo => phone != null && phone!.isNotEmpty;
  bool get hasAddress => address != null;
  bool get hasPersonalInfo => dateOfBirth != null && gender != null;
  bool get hasEmergencyContact => emergencyContact != null;

  // Completion calculation
  double calculateCompletion() {
    int totalFields = 10;
    int completedFields = 0;

    if (name.isNotEmpty) completedFields++;
    if (email.isNotEmpty) completedFields++;
    if (phone != null && phone!.isNotEmpty) completedFields++;
    if (avatar != null) completedFields++;
    if (dateOfBirth != null) completedFields++;
    if (gender != null) completedFields++;
    if (nationality != null) completedFields++;
    if (occupation != null) completedFields++;
    if (address != null) completedFields++;
    if (emergencyContact != null) completedFields++;

    return (completedFields / totalFields) * 100;
  }

  List<String> getMissingFields() {
    List<String> missing = [];

    if (name.isEmpty) missing.add('name');
    if (email.isEmpty) missing.add('email');
    if (phone == null || phone!.isEmpty) missing.add('phone');
    if (avatar == null) missing.add('avatar');
    if (dateOfBirth == null) missing.add('dateOfBirth');
    if (gender == null) missing.add('gender');
    if (nationality == null) missing.add('nationality');
    if (occupation == null) missing.add('occupation');
    if (address == null) missing.add('address');
    if (emergencyContact == null) missing.add('emergencyContact');

    return missing;
  }

  // Age calculation
  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    final age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      return age - 1;
    }
    return age;
  }

  // Display helpers
  String get displayName => name.isNotEmpty ? name : email.split('@')[0];
  String get initials => name.isNotEmpty
      ? name.split(' ').map((n) => n[0]).take(2).join().toUpperCase()
      : email[0].toUpperCase();

  String get displayGender {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'Male';
      case 'female':
        return 'Female';
      case 'other':
        return 'Other';
      case 'prefer_not_to_say':
        return 'Prefer not to say';
      default:
        return gender ?? 'Not specified';
    }
  }

  // Copy with method
  ProfileModel copyWith({
    String? name,
    String? email,
    String? phone,
    String? avatar,
    DateTime? dateOfBirth,
    String? gender,
    String? nationality,
    String? occupation,
    Address? address,
    PersonalInfo? personalInfo,
    ContactInfo? contactInfo,
    EmergencyContact? emergencyContact,
    SocialLinks? socialLinks,
    DateTime? updatedAt,
    Map<String, dynamic>? customFields,
    PrivacySettings? privacySettings,
  }) {
    final updated = ProfileModel(
      userId: userId,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      avatar: avatar ?? this.avatar,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      nationality: nationality ?? this.nationality,
      occupation: occupation ?? this.occupation,
      address: address ?? this.address,
      personalInfo: personalInfo ?? this.personalInfo,
      contactInfo: contactInfo ?? this.contactInfo,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      socialLinks: socialLinks ?? this.socialLinks,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
      customFields: customFields ?? this.customFields,
      privacySettings: privacySettings ?? this.privacySettings,
    );

    // Recalculate completion
    final completion = updated.calculateCompletion();
    final missing = updated.getMissingFields();

    return ProfileModel(
      userId: updated.userId,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatar: updated.avatar,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      nationality: updated.nationality,
      occupation: updated.occupation,
      address: updated.address,
      personalInfo: updated.personalInfo,
      contactInfo: updated.contactInfo,
      emergencyContact: updated.emergencyContact,
      socialLinks: updated.socialLinks,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      isComplete: completion >= 80.0,
      completionPercentage: completion,
      missingFields: missing,
      customFields: updated.customFields,
      privacySettings: updated.privacySettings,
    );
  }
}

@HiveType(typeId: 60)
@JsonSerializable()
class KycModel extends HiveObject {
  @HiveField(0)
  final String userId;

  @HiveField(1)
  final String status;

  @HiveField(2)
  final List<KycDocument> documents;

  @HiveField(3)
  final String? rejectionReason;

  @HiveField(4)
  final DateTime? submittedAt;

  @HiveField(5)
  final DateTime? approvedAt;

  @HiveField(6)
  final DateTime? rejectedAt;

  @HiveField(7)
  final String? reviewedBy;

  @HiveField(8)
  final String? adminNotes;

  @HiveField(9)
  final bool isVerified;

  @HiveField(10)
  final DateTime createdAt;

  @HiveField(11)
  final DateTime updatedAt;

  @HiveField(12)
  final KycPersonalInfo? personalInfo;

  @HiveField(13)
  final double completionPercentage;

  @HiveField(14)
  final List<String> requiredDocuments;

  @HiveField(15)
  final List<String> submittedDocuments;

  @HiveField(16)
  final int attemptCount;

  @HiveField(17)
  final DateTime? expiresAt;

  KycModel({
    required this.userId,
    this.status = 'not_started',
    this.documents = const [],
    this.rejectionReason,
    this.submittedAt,
    this.approvedAt,
    this.rejectedAt,
    this.reviewedBy,
    this.adminNotes,
    this.isVerified = false,
    required this.createdAt,
    required this.updatedAt,
    this.personalInfo,
    this.completionPercentage = 0.0,
    this.requiredDocuments = const [],
    this.submittedDocuments = const [],
    this.attemptCount = 0,
    this.expiresAt,
  });

  factory KycModel.fromJson(Map<String, dynamic> json) =>
      _$KycModelFromJson(json);
  Map<String, dynamic> toJson() => _$KycModelToJson(this);

  // Status helpers
  bool get isNotStarted => status.toLowerCase() == 'not_started';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isUnderReview => status.toLowerCase() == 'under_review';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';
  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'not_started':
        return 'Not Started';
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  // Document helpers
  bool get hasRequiredDocuments {
    return requiredDocuments.every((doc) => submittedDocuments.contains(doc));
  }

  List<String> get missingDocuments {
    return requiredDocuments
        .where((doc) => !submittedDocuments.contains(doc))
        .toList();
  }

  bool hasDocumentType(String type) {
    return documents.any((doc) => doc.type == type);
  }

  List<KycDocument> getDocumentsByType(String type) {
    return documents.where((doc) => doc.type == type).toList();
  }

  // Timeline helpers
  String? get timeInReview {
    if (submittedAt == null) return null;

    final endTime = approvedAt ?? rejectedAt ?? DateTime.now();
    final difference = endTime.difference(submittedAt!);

    if (difference.inDays > 0) {
      return '${difference.inDays} days';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours';
    } else {
      return '${difference.inMinutes} minutes';
    }
  }

  bool get canResubmit => isRejected && attemptCount < 3;
  bool get needsDocuments => isNotStarted || (isRejected && canResubmit);
}

@HiveType(typeId: 61)
@JsonSerializable()
class KycDocument extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String type;

  @HiveField(2)
  final String url;

  @HiveField(3)
  final String filename;

  @HiveField(4)
  final DateTime uploadedAt;

  @HiveField(5)
  final String status;

  @HiveField(6)
  final String? rejectionReason;

  @HiveField(7)
  final bool isVerified;

  @HiveField(8)
  final DateTime? verifiedAt;

  @HiveField(9)
  final String? verifiedBy;

  @HiveField(10)
  final Map<String, dynamic>? metadata;

  KycDocument({
    required this.id,
    required this.type,
    required this.url,
    required this.filename,
    required this.uploadedAt,
    this.status = 'pending',
    this.rejectionReason,
    this.isVerified = false,
    this.verifiedAt,
    this.verifiedBy,
    this.metadata,
  });

  factory KycDocument.fromJson(Map<String, dynamic> json) =>
      _$KycDocumentFromJson(json);
  Map<String, dynamic> toJson() => _$KycDocumentToJson(this);

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';

  String get displayType {
    switch (type.toLowerCase()) {
      case 'national_id':
        return 'National ID';
      case 'passport':
        return 'Passport';
      case 'driving_license':
        return 'Driving License';
      case 'utility_bill':
        return 'Utility Bill';
      case 'bank_statement':
        return 'Bank Statement';
      case 'selfie':
        return 'Selfie';
      case 'address_proof':
        return 'Address Proof';
      default:
        return type;
    }
  }
}

@HiveType(typeId: 62)
@JsonSerializable()
class PersonalInfo extends HiveObject {
  @HiveField(0)
  final String? middleName;

  @HiveField(1)
  final String? preferredName;

  @HiveField(2)
  final String? bio;

  @HiveField(3)
  final String? website;

  @HiveField(4)
  final List<String> languages;

  @HiveField(5)
  final List<String> interests;

  @HiveField(6)
  final String? maritalStatus;

  @HiveField(7)
  final int? dependents;

  PersonalInfo({
    this.middleName,
    this.preferredName,
    this.bio,
    this.website,
    this.languages = const [],
    this.interests = const [],
    this.maritalStatus,
    this.dependents,
  });

  factory PersonalInfo.fromJson(Map<String, dynamic> json) =>
      _$PersonalInfoFromJson(json);
  Map<String, dynamic> toJson() => _$PersonalInfoToJson(this);
}

@HiveType(typeId: 63)
@JsonSerializable()
class ContactInfo extends HiveObject {
  @HiveField(0)
  final String? alternatePhone;

  @HiveField(1)
  final String? workPhone;

  @HiveField(2)
  final String? workEmail;

  @HiveField(3)
  final Address? workAddress;

  @HiveField(4)
  final String? preferredContactMethod;

  @HiveField(5)
  final List<String> availableHours;

  ContactInfo({
    this.alternatePhone,
    this.workPhone,
    this.workEmail,
    this.workAddress,
    this.preferredContactMethod,
    this.availableHours = const [],
  });

  factory ContactInfo.fromJson(Map<String, dynamic> json) =>
      _$ContactInfoFromJson(json);
  Map<String, dynamic> toJson() => _$ContactInfoToJson(this);
}

@HiveType(typeId: 64)
@JsonSerializable()
class EmergencyContact extends HiveObject {
  @HiveField(0)
  final String name;

  @HiveField(1)
  final String phone;

  @HiveField(2)
  final String relationship;

  @HiveField(3)
  final String? email;

  @HiveField(4)
  final Address? address;

  @HiveField(5)
  final bool isPrimary;

  EmergencyContact({
    required this.name,
    required this.phone,
    required this.relationship,
    this.email,
    this.address,
    this.isPrimary = true,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) =>
      _$EmergencyContactFromJson(json);
  Map<String, dynamic> toJson() => _$EmergencyContactToJson(this);
}

@HiveType(typeId: 65)
@JsonSerializable()
class SocialLinks extends HiveObject {
  @HiveField(0)
  final String? facebook;

  @HiveField(1)
  final String? twitter;

  @HiveField(2)
  final String? linkedin;

  @HiveField(3)
  final String? instagram;

  @HiveField(4)
  final String? youtube;

  @HiveField(5)
  final String? tiktok;

  @HiveField(6)
  final Map<String, String>? customLinks;

  SocialLinks({
    this.facebook,
    this.twitter,
    this.linkedin,
    this.instagram,
    this.youtube,
    this.tiktok,
    this.customLinks,
  });

  factory SocialLinks.fromJson(Map<String, dynamic> json) =>
      _$SocialLinksFromJson(json);
  Map<String, dynamic> toJson() => _$SocialLinksToJson(this);

  bool get hasAnyLinks =>
      facebook != null ||
      twitter != null ||
      linkedin != null ||
      instagram != null ||
      youtube != null ||
      tiktok != null ||
      (customLinks != null && customLinks!.isNotEmpty);
}

@HiveType(typeId: 66)
@JsonSerializable()
class PrivacySettings extends HiveObject {
  @HiveField(0)
  final bool showEmail;

  @HiveField(1)
  final bool showPhone;

  @HiveField(2)
  final bool showAddress;

  @HiveField(3)
  final bool showDateOfBirth;

  @HiveField(4)
  final bool showSocialLinks;

  @HiveField(5)
  final bool allowMessages;

  @HiveField(6)
  final bool showOnlineStatus;

  @HiveField(7)
  final bool indexProfile;

  PrivacySettings({
    this.showEmail = false,
    this.showPhone = false,
    this.showAddress = false,
    this.showDateOfBirth = false,
    this.showSocialLinks = true,
    this.allowMessages = true,
    this.showOnlineStatus = true,
    this.indexProfile = true,
  });

  factory PrivacySettings.fromJson(Map<String, dynamic> json) =>
      _$PrivacySettingsFromJson(json);
  Map<String, dynamic> toJson() => _$PrivacySettingsToJson(this);
}

@HiveType(typeId: 67)
@JsonSerializable()
class KycPersonalInfo extends HiveObject {
  @HiveField(0)
  final DateTime dateOfBirth;

  @HiveField(1)
  final String nationality;

  @HiveField(2)
  final String occupation;

  @HiveField(3)
  final String? employerName;

  @HiveField(4)
  final double? annualIncome;

  @HiveField(5)
  final String? sourceOfIncome;

  @HiveField(6)
  final bool isPoliticallyExposed;

  @HiveField(7)
  final String? politicalExposureDetails;

  KycPersonalInfo({
    required this.dateOfBirth,
    required this.nationality,
    required this.occupation,
    this.employerName,
    this.annualIncome,
    this.sourceOfIncome,
    this.isPoliticallyExposed = false,
    this.politicalExposureDetails,
  });

  factory KycPersonalInfo.fromJson(Map<String, dynamic> json) =>
      _$KycPersonalInfoFromJson(json);
  Map<String, dynamic> toJson() => _$KycPersonalInfoToJson(this);

  int get age {
    final now = DateTime.now();
    final age = now.year - dateOfBirth.year;
    if (now.month < dateOfBirth.month ||
        (now.month == dateOfBirth.month && now.day < dateOfBirth.day)) {
      return age - 1;
    }
    return age;
  }

  bool get isMinor => age < 18;
  bool get isAdult => age >= 18;
}
