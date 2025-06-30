import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'withdrawal_request.g.dart';

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

  @HiveField(8)
  final String? twoFactorCode;

  @HiveField(9)
  final String? withdrawalPassword;

  @HiveField(10)
  final DateTime? scheduledAt;

  @HiveField(11)
  final String? withdrawalSource;

  @HiveField(12)
  final Map<String, String>? customFields;

  WithdrawalRequest({
    required this.userId,
    required this.amount,
    required this.currency,
    required this.withdrawalMethod,
    required this.accountDetails,
    this.reason,
    this.note,
    this.urgentRequest = false,
    this.twoFactorCode,
    this.withdrawalPassword,
    this.scheduledAt,
    this.withdrawalSource,
    this.customFields,
  });

  factory WithdrawalRequest.fromJson(Map<String, dynamic> json) =>
      _$WithdrawalRequestFromJson(json);
  Map<String, dynamic> toJson() => _$WithdrawalRequestToJson(this);

  bool get isValidAmount => amount > 0 && amount <= 1000000; // Max 1M
  bool get isScheduled =>
      scheduledAt != null && scheduledAt!.isAfter(DateTime.now());
  bool get hasReason => reason != null && reason!.trim().isNotEmpty;
  bool get hasNote => note != null && note!.trim().isNotEmpty;
  bool get requiresTwoFactor =>
      twoFactorCode != null && twoFactorCode!.isNotEmpty;
  bool get requiresWithdrawalPassword =>
      withdrawalPassword != null && withdrawalPassword!.isNotEmpty;

  String get displayMethod {
    switch (withdrawalMethod.toLowerCase()) {
      case 'bank':
        return 'Bank Transfer';
      case 'mobile':
        return 'Mobile Banking';
      case 'crypto':
        return 'Cryptocurrency';
      case 'card':
        return 'Card';
      case 'check':
        return 'Bank Check';
      case 'wire':
        return 'Wire Transfer';
      default:
        return withdrawalMethod;
    }
  }

  String get displaySource {
    if (withdrawalSource == null) return 'Main Balance';

    switch (withdrawalSource!.toLowerCase()) {
      case 'main_balance':
        return 'Main Balance';
      case 'profit_balance':
        return 'Profit Balance';
      case 'bonus_balance':
        return 'Bonus Balance';
      case 'referral_balance':
        return 'Referral Balance';
      default:
        return withdrawalSource!;
    }
  }

  bool get isInstant => !urgentRequest && !isScheduled;
  bool get isPriority => urgentRequest;

  Map<String, dynamic> toApiPayload() {
    final payload = toJson();

    // Remove sensitive data from API payload if needed
    if (!requiresWithdrawalPassword) {
      payload.remove('withdrawalPassword');
    }

    // Remove null values
    payload.removeWhere((key, value) => value == null);

    return payload;
  }
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

  @HiveField(8)
  final String? walletAddress;

  @HiveField(9)
  final String? cryptoNetwork;

  @HiveField(10)
  final String? cardNumber;

  @HiveField(11)
  final String? cardHolderName;

  @HiveField(12)
  final Map<String, String>? additionalInfo;

  AccountDetails({
    required this.accountNumber,
    required this.accountHolderName,
    this.bankName,
    this.routingNumber,
    this.swiftCode,
    this.branchName,
    this.mobileNumber,
    this.accountType = 'bank',
    this.walletAddress,
    this.cryptoNetwork,
    this.cardNumber,
    this.cardHolderName,
    this.additionalInfo,
  });

  factory AccountDetails.fromJson(Map<String, dynamic> json) =>
      _$AccountDetailsFromJson(json);
  Map<String, dynamic> toJson() => _$AccountDetailsToJson(this);

  bool get isBankAccount => accountType.toLowerCase() == 'bank';
  bool get isMobileAccount => accountType.toLowerCase() == 'mobile';
  bool get isCryptoWallet => accountType.toLowerCase() == 'crypto';
  bool get isCard => accountType.toLowerCase() == 'card';

  bool get isValid {
    if (accountNumber.isEmpty || accountHolderName.isEmpty) return false;

    switch (accountType.toLowerCase()) {
      case 'bank':
        return bankName != null && bankName!.isNotEmpty;
      case 'mobile':
        return mobileNumber != null && mobileNumber!.isNotEmpty;
      case 'crypto':
        return walletAddress != null && walletAddress!.isNotEmpty;
      case 'card':
        return cardNumber != null && cardNumber!.isNotEmpty;
      default:
        return true;
    }
  }

  String get displayAccountType {
    switch (accountType.toLowerCase()) {
      case 'bank':
        return 'Bank Account';
      case 'mobile':
        return 'Mobile Banking';
      case 'crypto':
        return 'Crypto Wallet';
      case 'card':
        return 'Card';
      default:
        return accountType;
    }
  }

  String get maskedAccountNumber {
    if (accountNumber.length <= 4) return accountNumber;
    final visible = accountNumber.substring(accountNumber.length - 4);
    final masked = '*' * (accountNumber.length - 4);
    return '$masked$visible';
  }
}
