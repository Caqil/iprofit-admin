import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import 'emi_calculation.dart';

part 'loan_model.g.dart';

@HiveType(typeId: 12)
@JsonSerializable()
class LoanModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final double amount;

  @HiveField(3)
  final String purpose;

  @HiveField(4)
  final int tenure;

  @HiveField(5)
  final String status;

  @HiveField(6)
  final double? interestRate;

  @HiveField(7)
  final double? emiAmount;

  @HiveField(8)
  final double? totalAmount;

  @HiveField(9)
  final double? totalInterest;

  @HiveField(10)
  final double paidAmount;

  @HiveField(11)
  final double remainingAmount;

  @HiveField(12)
  final DateTime applicationDate;

  @HiveField(13)
  final DateTime? approvedDate;

  @HiveField(14)
  final DateTime? disbursedDate;

  @HiveField(15)
  final DateTime? completedDate;

  @HiveField(16)
  final DateTime? rejectedDate;

  @HiveField(17)
  final String? rejectionReason;

  @HiveField(18)
  final DateTime createdAt;

  @HiveField(19)
  final DateTime updatedAt;

  @HiveField(20)
  final LoanPersonalDetails? personalDetails;

  @HiveField(21)
  final LoanEmploymentDetails? employmentDetails;

  @HiveField(22)
  final LoanFinancialDetails? financialDetails;

  @HiveField(23)
  final List<EmiSchedule> emiSchedule;

  LoanModel({
    required this.id,
    required this.userId,
    required this.amount,
    required this.purpose,
    required this.tenure,
    required this.status,
    this.interestRate,
    this.emiAmount,
    this.totalAmount,
    this.totalInterest,
    this.paidAmount = 0.0,
    this.remainingAmount = 0.0,
    required this.applicationDate,
    this.approvedDate,
    this.disbursedDate,
    this.completedDate,
    this.rejectedDate,
    this.rejectionReason,
    required this.createdAt,
    required this.updatedAt,
    this.personalDetails,
    this.employmentDetails,
    this.financialDetails,
    this.emiSchedule = const [],
  });

  factory LoanModel.fromJson(Map<String, dynamic> json) =>
      _$LoanModelFromJson(json);
  Map<String, dynamic> toJson() => _$LoanModelToJson(this);

  // Status helpers
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isRejected => status.toLowerCase() == 'rejected';
  bool get isDisbursed => status.toLowerCase() == 'disbursed';
  bool get isActive => status.toLowerCase() == 'active';
  bool get isCompleted => status.toLowerCase() == 'completed';

  double get progressPercentage {
    if (totalAmount == null || totalAmount! <= 0) return 0.0;
    return (paidAmount / totalAmount!) * 100;
  }

  int get remainingEmis {
    return emiSchedule.where((emi) => emi.status != 'paid').length;
  }
}

@HiveType(typeId: 13)
@JsonSerializable()
class LoanPersonalDetails extends HiveObject {
  @HiveField(0)
  final String fatherName;

  @HiveField(1)
  final String motherName;

  @HiveField(2)
  final String? spouseName;

  @HiveField(3)
  final String emergencyContact;

  @HiveField(4)
  final String? emergencyContactName;

  @HiveField(5)
  final String? emergencyContactRelation;

  LoanPersonalDetails({
    required this.fatherName,
    required this.motherName,
    this.spouseName,
    required this.emergencyContact,
    this.emergencyContactName,
    this.emergencyContactRelation,
  });

  factory LoanPersonalDetails.fromJson(Map<String, dynamic> json) =>
      _$LoanPersonalDetailsFromJson(json);
  Map<String, dynamic> toJson() => _$LoanPersonalDetailsToJson(this);
}

@HiveType(typeId: 14)
@JsonSerializable()
class LoanEmploymentDetails extends HiveObject {
  @HiveField(0)
  final String companyName;

  @HiveField(1)
  final String designation;

  @HiveField(2)
  final int workExperience;

  @HiveField(3)
  final double monthlyIncome;

  @HiveField(4)
  final String employmentStatus;

  @HiveField(5)
  final String? companyAddress;

  @HiveField(6)
  final String? hrContact;

  LoanEmploymentDetails({
    required this.companyName,
    required this.designation,
    required this.workExperience,
    required this.monthlyIncome,
    required this.employmentStatus,
    this.companyAddress,
    this.hrContact,
  });

  factory LoanEmploymentDetails.fromJson(Map<String, dynamic> json) =>
      _$LoanEmploymentDetailsFromJson(json);
  Map<String, dynamic> toJson() => _$LoanEmploymentDetailsToJson(this);
}

@HiveType(typeId: 15)
@JsonSerializable()
class LoanFinancialDetails extends HiveObject {
  @HiveField(0)
  final String bankAccount;

  @HiveField(1)
  final String bankName;

  @HiveField(2)
  final double monthlyExpenses;

  @HiveField(3)
  final bool otherLoans;

  @HiveField(4)
  final double? otherLoanAmount;

  @HiveField(5)
  final String? otherLoanDetails;

  @HiveField(6)
  final List<String>? collateralDocuments;

  LoanFinancialDetails({
    required this.bankAccount,
    required this.bankName,
    required this.monthlyExpenses,
    required this.otherLoans,
    this.otherLoanAmount,
    this.otherLoanDetails,
    this.collateralDocuments,
  });

  factory LoanFinancialDetails.fromJson(Map<String, dynamic> json) =>
      _$LoanFinancialDetailsFromJson(json);
  Map<String, dynamic> toJson() => _$LoanFinancialDetailsToJson(this);
}
