import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'deposit_request.g.dart';

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

  @HiveField(8)
  final String? promotionCode;

  @HiveField(9)
  final bool autoInvest;

  @HiveField(10)
  final String? investmentPlanId;

  @HiveField(11)
  final String? returnUrl;

  @HiveField(12)
  final String? cancelUrl;

  @HiveField(13)
  final Map<String, String>? customFields;

  DepositRequest({
    required this.userId,
    required this.amount,
    required this.currency,
    required this.gateway,
    this.paymentMethod,
    this.gatewayData,
    this.customerReference,
    this.note,
    this.promotionCode,
    this.autoInvest = false,
    this.investmentPlanId,
    this.returnUrl,
    this.cancelUrl,
    this.customFields,
  });

  factory DepositRequest.fromJson(Map<String, dynamic> json) =>
      _$DepositRequestFromJson(json);
  Map<String, dynamic> toJson() => _$DepositRequestToJson(this);

  bool get isValidAmount => amount > 0 && amount <= 10000000; // Max 10M
  bool get hasPromotionCode =>
      promotionCode != null && promotionCode!.isNotEmpty;
  bool get willAutoInvest => autoInvest && investmentPlanId != null;
  bool get hasCustomerReference =>
      customerReference != null && customerReference!.isNotEmpty;
  bool get hasNote => note != null && note!.trim().isNotEmpty;

  String get displayGateway {
    switch (gateway.toLowerCase()) {
      case 'uddoktapay':
        return 'UddoktaPay';
      case 'coingate':
        return 'CoinGate';
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'manual':
        return 'Manual';
      default:
        return gateway;
    }
  }

  String get displayPaymentMethod {
    if (paymentMethod == null) return 'Default';

    switch (paymentMethod!.toLowerCase()) {
      case 'bkash':
        return 'bKash';
      case 'nagad':
        return 'Nagad';
      case 'rocket':
        return 'Rocket';
      case 'bitcoin':
        return 'Bitcoin';
      case 'ethereum':
        return 'Ethereum';
      case 'card':
        return 'Credit/Debit Card';
      case 'bank':
        return 'Bank Transfer';
      default:
        return paymentMethod!;
    }
  }

  Map<String, dynamic> toApiPayload() {
    final payload = toJson();

    // Add gateway-specific data
    if (gatewayData != null) {
      payload.addAll(gatewayData!);
    }

    // Remove null values
    payload.removeWhere((key, value) => value == null);

    return payload;
  }
}
