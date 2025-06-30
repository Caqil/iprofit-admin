import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
import 'ticket_model.dart'; // For TicketAttachment

part 'ticket_request.g.dart';

@HiveType(typeId: 23)
@JsonSerializable()
class TicketRequest extends HiveObject {
  @HiveField(0)
  final String subject;

  @HiveField(1)
  final String message;

  @HiveField(2)
  final String category;

  @HiveField(3)
  final String priority;

  @HiveField(4)
  final List<TicketAttachment> attachments;

  @HiveField(5)
  final Map<String, dynamic>? metadata;

  @HiveField(6)
  final String? relatedTransactionId;

  @HiveField(7)
  final String? relatedLoanId;

  @HiveField(8)
  final bool isUrgent;

  @HiveField(9)
  final String? preferredContactMethod;

  @HiveField(10)
  final DateTime? followUpDate;

  TicketRequest({
    required this.subject,
    required this.message,
    required this.category,
    required this.priority,
    this.attachments = const [],
    this.metadata,
    this.relatedTransactionId,
    this.relatedLoanId,
    this.isUrgent = false,
    this.preferredContactMethod,
    this.followUpDate,
  });

  factory TicketRequest.fromJson(Map<String, dynamic> json) =>
      _$TicketRequestFromJson(json);
  Map<String, dynamic> toJson() => _$TicketRequestToJson(this);

  bool get isValid => subject.trim().isNotEmpty && message.trim().isNotEmpty;
  bool get hasAttachments => attachments.isNotEmpty;
  bool get isRelatedToTransaction => relatedTransactionId != null;
  bool get isRelatedToLoan => relatedLoanId != null;
  bool get needsFollowUp => followUpDate != null;

  String get displayCategory {
    switch (category.toLowerCase()) {
      case 'account_issues':
        return 'Account Issues';
      case 'transaction_issues':
        return 'Transaction Issues';
      case 'loan_issues':
        return 'Loan Issues';
      case 'technical_support':
        return 'Technical Support';
      case 'billing_issues':
        return 'Billing Issues';
      case 'feature_request':
        return 'Feature Request';
      case 'bug_report':
        return 'Bug Report';
      case 'general_inquiry':
        return 'General Inquiry';
      default:
        return category;
    }
  }

  String get displayPriority {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'Low';
      case 'medium':
        return 'Medium';
      case 'high':
        return 'High';
      case 'urgent':
        return 'Urgent';
      case 'critical':
        return 'Critical';
      default:
        return priority;
    }
  }
}
