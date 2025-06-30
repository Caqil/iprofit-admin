import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import 'loan_model.dart';

part 'loan_request.g.dart';

@HiveType(typeId: 16)
@JsonSerializable()
class LoanRequest extends HiveObject {
  @HiveField(0)
  final String userId;

  @HiveField(1)
  final double amount;

  @HiveField(2)
  final String purpose;

  @HiveField(3)
  final int tenure;

  @HiveField(4)
  final double monthlyIncome;

  @HiveField(5)
  final String employmentStatus;

  @HiveField(6)
  final LoanEmploymentDetails employmentDetails;

  @HiveField(7)
  final LoanPersonalDetails personalDetails;

  @HiveField(8)
  final LoanFinancialDetails financialDetails;

  @HiveField(9)
  final List<LoanDocument>? documents;

  @HiveField(10)
  final Map<String, dynamic>? additionalInfo;

  LoanRequest({
    required this.userId,
    required this.amount,
    required this.purpose,
    required this.tenure,
    required this.monthlyIncome,
    required this.employmentStatus,
    required this.employmentDetails,
    required this.personalDetails,
    required this.financialDetails,
    this.documents,
    this.additionalInfo,
  });

  factory LoanRequest.fromJson(Map<String, dynamic> json) =>
      _$LoanRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoanRequestToJson(this);

  // Validation helpers
  bool get isValidAmount => amount >= 1000 && amount <= 10000000;
  bool get isValidTenure => tenure >= 1 && tenure <= 60;
  bool get hasRequiredDocuments => documents != null && documents!.isNotEmpty;

  double get monthlyIncomeToAmountRatio =>
      monthlyIncome > 0 ? amount / monthlyIncome : 0;
  bool get isEligibleByIncome =>
      monthlyIncomeToAmountRatio <= 60; // 5 years max
}

@HiveType(typeId: 17)
@JsonSerializable()
class LoanDocument extends HiveObject {
  @HiveField(0)
  final String type;

  @HiveField(1)
  final String url;

  @HiveField(2)
  final String filename;

  @HiveField(3)
  final DateTime uploadedAt;

  @HiveField(4)
  final String? description;

  @HiveField(5)
  final bool isVerified;

  LoanDocument({
    required this.type,
    required this.url,
    required this.filename,
    required this.uploadedAt,
    this.description,
    this.isVerified = false,
  });

  factory LoanDocument.fromJson(Map<String, dynamic> json) =>
      _$LoanDocumentFromJson(json);
  Map<String, dynamic> toJson() => _$LoanDocumentToJson(this);
}
