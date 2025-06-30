import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'transaction_model.g.dart';

@HiveType(typeId: 18)
@JsonSerializable()
class TransactionModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final String type;

  @HiveField(3)
  final double amount;

  @HiveField(4)
  final String currency;

  @HiveField(5)
  final String status;

  @HiveField(6)
  final String? gateway;

  @HiveField(7)
  final String? paymentMethod;

  @HiveField(8)
  final String? transactionId;

  @HiveField(9)
  final String? reference;

  @HiveField(10)
  final String? description;

  @HiveField(11)
  final double? fee;

  @HiveField(12)
  final double netAmount;

  @HiveField(13)
  final DateTime createdAt;

  @HiveField(14)
  final DateTime updatedAt;

  @HiveField(15)
  final DateTime? processedAt;

  @HiveField(16)
  final DateTime? approvedAt;

  @HiveField(17)
  final DateTime? rejectedAt;

  @HiveField(18)
  final String? rejectionReason;

  @HiveField(19)
  final String? adminNotes;

  @HiveField(20)
  final Map<String, dynamic>? gatewayData;

  @HiveField(21)
  final Map<String, dynamic>? metadata;

  TransactionModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.amount,
    required this.currency,
    required this.status,
    this.gateway,
    this.paymentMethod,
    this.transactionId,
    this.reference,
    this.description,
    this.fee,
    required this.netAmount,
    required this.createdAt,
    required this.updatedAt,
    this.processedAt,
    this.approvedAt,
    this.rejectedAt,
    this.rejectionReason,
    this.adminNotes,
    this.gatewayData,
    this.metadata,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) =>
      _$TransactionModelFromJson(json);
  Map<String, dynamic> toJson() => _$TransactionModelToJson(this);

  // Status helpers
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';
  bool get isProcessing => status.toLowerCase() == 'processing';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isCancelled => status.toLowerCase() == 'cancelled';

  // Type helpers
  bool get isDeposit => type.toLowerCase() == 'deposit';
  bool get isWithdrawal => type.toLowerCase() == 'withdrawal';
  bool get isBonus => type.toLowerCase() == 'bonus';
  bool get isProfit => type.toLowerCase() == 'profit';
  bool get isPenalty => type.toLowerCase() == 'penalty';
  bool get isLoanRepayment => type.toLowerCase() == 'loan_repayment';

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  String get displayType {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'bonus':
        return 'Bonus';
      case 'profit':
        return 'Profit';
      case 'penalty':
        return 'Penalty';
      case 'loan_repayment':
        return 'Loan Repayment';
      default:
        return type;
    }
  }
}

@HiveType(typeId: 19)
@JsonSerializable()
class DepositRequest extends HiveObject {
  @HiveField(0)
  final String userId;

  @HiveField(1)
  final double amount;

  @HiveField(2)
  final String currency;

  @HiveField(3)
  final String gateway;

  @HiveField(4)
  final String? paymentMethod;

  @HiveField(5)
  final Map<String, dynamic>? gatewayData;

  @HiveField(6)
  final String? customerReference;

  @HiveField(7)
  final String? note;

  DepositRequest({
    required this.userId,
    required this.amount,
    required this.currency,
    required this.gateway,
    this.paymentMethod,
    this.gatewayData,
    this.customerReference,
    this.note,
  });

  factory DepositRequest.fromJson(Map<String, dynamic> json) =>
      _$DepositRequestFromJson(json);
  Map<String, dynamic> toJson() => _$DepositRequestToJson(this);
}

@HiveType(typeId: 20)
@JsonSerializable()
class WithdrawalRequest extends HiveObject {
  @HiveField(0)
  final String userId;

  @HiveField(1)
  final double amount;

  @HiveField(2)
  final String currency;

  @HiveField(3)
  final String withdrawalMethod;

  @HiveField(4)
  final AccountDetails accountDetails;

  @HiveField(5)
  final String? reason;

  @HiveField(6)
  final String? note;

  @HiveField(7)
  final bool urgentRequest;

  WithdrawalRequest({
    required this.userId,
    required this.amount,
    required this.currency,
    required this.withdrawalMethod,
    required this.accountDetails,
    this.reason,
    this.note,
    this.urgentRequest = false,
  });

  factory WithdrawalRequest.fromJson(Map<String, dynamic> json) =>
      _$WithdrawalRequestFromJson(json);
  Map<String, dynamic> toJson() => _$WithdrawalRequestToJson(this);
}

@HiveType(typeId: 21)
@JsonSerializable()
class AccountDetails extends HiveObject {
  @HiveField(0)
  final String accountNumber;

  @HiveField(1)
  final String accountHolderName;

  @HiveField(2)
  final String? bankName;

  @HiveField(3)
  final String? routingNumber;

  @HiveField(4)
  final String? swiftCode;

  @HiveField(5)
  final String? branchName;

  @HiveField(6)
  final String? mobileNumber;

  @HiveField(7)
  final String accountType;

  AccountDetails({
    required this.accountNumber,
    required this.accountHolderName,
    this.bankName,
    this.routingNumber,
    this.swiftCode,
    this.branchName,
    this.mobileNumber,
    this.accountType = 'bank',
  });

  factory AccountDetails.fromJson(Map<String, dynamic> json) =>
      _$AccountDetailsFromJson(json);
  Map<String, dynamic> toJson() => _$AccountDetailsToJson(this);

  bool get isBankAccount => accountType.toLowerCase() == 'bank';
  bool get isMobileAccount => accountType.toLowerCase() == 'mobile';
  bool get isCryptoWallet => accountType.toLowerCase() == 'crypto';
}
