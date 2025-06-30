import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'kyc_model.g.dart';

@HiveType(typeId: 55)
@JsonSerializable()
class KycModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final String status;

  @HiveField(3)
  final List<KycDocument> documents;

  @HiveField(4)
  final DateTime submittedAt;

  @HiveField(5)
  final DateTime? reviewedAt;

  @HiveField(6)
  final DateTime? approvedAt;

  @HiveField(7)
  final DateTime? rejectedAt;

  @HiveField(8)
  final String? rejectionReason;

  @HiveField(9)
  final String? adminNotes;

  @HiveField(10)
  final String? reviewedBy;

  @HiveField(11)
  final bool isVerified;

  @HiveField(12)
  final double verificationLevel;

  @HiveField(13)
  final KycPersonalInfo? personalInfo;

  @HiveField(14)
  final DateTime createdAt;

  @HiveField(15)
  final DateTime updatedAt;

  @HiveField(16)
  final List<KycVerificationStep> verificationSteps;

  @HiveField(17)
  final Map<String, dynamic>? metadata;

  @HiveField(18)
  final DateTime? expiresAt;

  KycModel({
    required this.id,
    required this.userId,
    required this.status,
    this.documents = const [],
    required this.submittedAt,
    this.reviewedAt,
    this.approvedAt,
    this.rejectedAt,
    this.rejectionReason,
    this.adminNotes,
    this.reviewedBy,
    this.isVerified = false,
    this.verificationLevel = 0.0,
    this.personalInfo,
    required this.createdAt,
    required this.updatedAt,
    this.verificationSteps = const [],
    this.metadata,
    this.expiresAt,
  });

  factory KycModel.fromJson(Map<String, dynamic> json) =>
      _$KycModelFromJson(json);
  Map<String, dynamic> toJson() => _$KycModelToJson(this);

  // Status helpers
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isUnderReview => status.toLowerCase() == 'under_review';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';
  bool get isIncomplete => status.toLowerCase() == 'incomplete';
  bool get isExpired => status.toLowerCase() == 'expired';

  // Document helpers
  bool get hasRequiredDocuments => documents.length >= 2;
  bool get hasIdentityDocument =>
      documents.any((doc) => doc.isIdentityDocument);
  bool get hasAddressProof => documents.any((doc) => doc.isAddressProof);
  bool get allDocumentsVerified => documents.every((doc) => doc.isVerified);

  // Progress helpers
  double get completionPercentage {
    if (verificationSteps.isEmpty) return 0.0;
    final completedSteps = verificationSteps
        .where((step) => step.isCompleted)
        .length;
    return (completedSteps / verificationSteps.length) * 100;
  }

  List<KycDocument> get identityDocuments =>
      documents.where((doc) => doc.isIdentityDocument).toList();

  List<KycDocument> get addressDocuments =>
      documents.where((doc) => doc.isAddressProof).toList();

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'incomplete':
        return 'Incomplete';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  }

  bool get canResubmit => isRejected || isIncomplete || isExpired;
  bool get isExpiring =>
      expiresAt != null && expiresAt!.difference(DateTime.now()).inDays <= 30;
}

@HiveType(typeId: 56)
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
  final String? description;

  @HiveField(6)
  final bool isVerified;

  @HiveField(7)
  final DateTime? verifiedAt;

  @HiveField(8)
  final String? verificationNotes;

  @HiveField(9)
  final String status;

  @HiveField(10)
  final int fileSize;

  @HiveField(11)
  final String mimeType;

  @HiveField(12)
  final Map<String, dynamic>? extractedData;

  KycDocument({
    required this.id,
    required this.type,
    required this.url,
    required this.filename,
    required this.uploadedAt,
    this.description,
    this.isVerified = false,
    this.verifiedAt,
    this.verificationNotes,
    this.status = 'pending',
    required this.fileSize,
    required this.mimeType,
    this.extractedData,
  });

  factory KycDocument.fromJson(Map<String, dynamic> json) =>
      _$KycDocumentFromJson(json);
  Map<String, dynamic> toJson() => _$KycDocumentToJson(this);

  bool get isIdentityDocument => [
    'national_id',
    'passport',
    'driving_license',
    'voter_id',
  ].contains(type.toLowerCase());

  bool get isAddressProof => [
    'utility_bill',
    'bank_statement',
    'rental_agreement',
    'tax_document',
  ].contains(type.toLowerCase());

  bool get isImage => mimeType.startsWith('image/');
  bool get isPdf => mimeType == 'application/pdf';

  String get displayType {
    switch (type.toLowerCase()) {
      case 'national_id':
        return 'National ID';
      case 'passport':
        return 'Passport';
      case 'driving_license':
        return 'Driving License';
      case 'voter_id':
        return 'Voter ID';
      case 'utility_bill':
        return 'Utility Bill';
      case 'bank_statement':
        return 'Bank Statement';
      case 'rental_agreement':
        return 'Rental Agreement';
      case 'tax_document':
        return 'Tax Document';
      default:
        return type;
    }
  }

  String get sizeFormatted {
    if (fileSize < 1024) return '${fileSize}B';
    if (fileSize < 1024 * 1024)
      return '${(fileSize / 1024).toStringAsFixed(1)}KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}

@HiveType(typeId: 57)
@JsonSerializable()
class KycPersonalInfo extends HiveObject {
  @HiveField(0)
  final String firstName;

  @HiveField(1)
  final String lastName;

  @HiveField(2)
  final DateTime dateOfBirth;

  @HiveField(3)
  final String nationality;

  @HiveField(4)
  final String occupation;

  @HiveField(5)
  final String? employerName;

  @HiveField(6)
  final double? annualIncome;

  @HiveField(7)
  final String address;

  @HiveField(8)
  final String city;

  @HiveField(9)
  final String state;

  @HiveField(10)
  final String country;

  @HiveField(11)
  final String zipCode;

  @HiveField(12)
  final String? sourceOfFunds;

  @HiveField(13)
  final bool isPoliticallyExposed;

  @HiveField(14)
  final String? politicalExposureDetails;

  KycPersonalInfo({
    required this.firstName,
    required this.lastName,
    required this.dateOfBirth,
    required this.nationality,
    required this.occupation,
    this.employerName,
    this.annualIncome,
    required this.address,
    required this.city,
    required this.state,
    required this.country,
    required this.zipCode,
    this.sourceOfFunds,
    this.isPoliticallyExposed = false,
    this.politicalExposureDetails,
  });

  factory KycPersonalInfo.fromJson(Map<String, dynamic> json) =>
      _$KycPersonalInfoFromJson(json);
  Map<String, dynamic> toJson() => _$KycPersonalInfoToJson(this);

  String get fullName => '$firstName $lastName';
  int get age => DateTime.now().difference(dateOfBirth).inDays ~/ 365;
  bool get isAdult => age >= 18;

  String get fullAddress => '$address, $city, $state, $country $zipCode';
}

@HiveType(typeId: 58)
@JsonSerializable()
class KycVerificationStep extends HiveObject {
  @HiveField(0)
  final String name;

  @HiveField(1)
  final String description;

  @HiveField(2)
  final bool isCompleted;

  @HiveField(3)
  final bool isRequired;

  @HiveField(4)
  final int order;

  @HiveField(5)
  final DateTime? completedAt;

  @HiveField(6)
  final Map<String, dynamic>? data;

  KycVerificationStep({
    required this.name,
    required this.description,
    this.isCompleted = false,
    this.isRequired = true,
    required this.order,
    this.completedAt,
    this.data,
  });

  factory KycVerificationStep.fromJson(Map<String, dynamic> json) =>
      _$KycVerificationStepFromJson(json);
  Map<String, dynamic> toJson() => _$KycVerificationStepToJson(this);
}
