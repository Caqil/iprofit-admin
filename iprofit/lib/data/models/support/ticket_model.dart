import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'ticket_model.g.dart';

@HiveType(typeId: 22)
@JsonSerializable()
class TicketModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String userId;

  @HiveField(2)
  final String ticketNumber;

  @HiveField(3)
  final String subject;

  @HiveField(4)
  final String message;

  @HiveField(5)
  final String category;

  @HiveField(6)
  final String priority;

  @HiveField(7)
  final String status;

  @HiveField(8)
  final DateTime createdAt;

  @HiveField(9)
  final DateTime updatedAt;

  @HiveField(10)
  final DateTime? closedAt;

  @HiveField(11)
  final String? assignedTo;

  @HiveField(12)
  final String? adminNotes;

  @HiveField(13)
  final List<TicketAttachment> attachments;

  @HiveField(14)
  final List<TicketReply> replies;

  @HiveField(15)
  final int rating;

  @HiveField(16)
  final String? feedback;

  TicketModel({
    required this.id,
    required this.userId,
    required this.ticketNumber,
    required this.subject,
    required this.message,
    required this.category,
    required this.priority,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.closedAt,
    this.assignedTo,
    this.adminNotes,
    this.attachments = const [],
    this.replies = const [],
    this.rating = 0,
    this.feedback,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) =>
      _$TicketModelFromJson(json);
  Map<String, dynamic> toJson() => _$TicketModelToJson(this);

  // Status helpers
  bool get isOpen => status.toLowerCase() == 'open';
  bool get isInProgress => status.toLowerCase() == 'in_progress';
  bool get isClosed => status.toLowerCase() == 'closed';
  bool get isResolved => status.toLowerCase() == 'resolved';
  bool get isPending => status.toLowerCase() == 'pending';

  // Priority helpers
  bool get isLowPriority => priority.toLowerCase() == 'low';
  bool get isMediumPriority => priority.toLowerCase() == 'medium';
  bool get isHighPriority => priority.toLowerCase() == 'high';
  bool get isUrgentPriority => priority.toLowerCase() == 'urgent';

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'closed':
        return 'Closed';
      case 'resolved':
        return 'Resolved';
      case 'pending':
        return 'Pending';
      default:
        return status;
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
      default:
        return priority;
    }
  }

  int get totalReplies => replies.length;
  bool get hasRating => rating > 0;
  bool get isAssigned => assignedTo != null;
}

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

  TicketRequest({
    required this.subject,
    required this.message,
    required this.category,
    required this.priority,
    this.attachments = const [],
    this.metadata,
  });

  factory TicketRequest.fromJson(Map<String, dynamic> json) =>
      _$TicketRequestFromJson(json);
  Map<String, dynamic> toJson() => _$TicketRequestToJson(this);

  bool get isValid => subject.trim().isNotEmpty && message.trim().isNotEmpty;
}

@HiveType(typeId: 24)
@JsonSerializable()
class TicketReply extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String ticketId;

  @HiveField(2)
  final String? userId;

  @HiveField(3)
  final String? adminId;

  @HiveField(4)
  final String message;

  @HiveField(5)
  final DateTime createdAt;

  @HiveField(6)
  final List<TicketAttachment> attachments;

  @HiveField(7)
  final bool isAdminReply;

  @HiveField(8)
  final bool isInternal;

  TicketReply({
    required this.id,
    required this.ticketId,
    this.userId,
    this.adminId,
    required this.message,
    required this.createdAt,
    this.attachments = const [],
    this.isAdminReply = false,
    this.isInternal = false,
  });

  factory TicketReply.fromJson(Map<String, dynamic> json) =>
      _$TicketReplyFromJson(json);
  Map<String, dynamic> toJson() => _$TicketReplyToJson(this);

  String get senderType => isAdminReply ? 'Admin' : 'User';
}

@HiveType(typeId: 25)
@JsonSerializable()
class TicketAttachment extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String filename;

  @HiveField(2)
  final String url;

  @HiveField(3)
  final String mimeType;

  @HiveField(4)
  final int size;

  @HiveField(5)
  final DateTime uploadedAt;

  TicketAttachment({
    required this.id,
    required this.filename,
    required this.url,
    required this.mimeType,
    required this.size,
    required this.uploadedAt,
  });

  factory TicketAttachment.fromJson(Map<String, dynamic> json) =>
      _$TicketAttachmentFromJson(json);
  Map<String, dynamic> toJson() => _$TicketAttachmentToJson(this);

  bool get isImage => mimeType.startsWith('image/');
  bool get isPdf => mimeType == 'application/pdf';
  bool get isDocument =>
      mimeType.contains('document') ||
      mimeType.contains('sheet') ||
      mimeType.contains('presentation');

  String get sizeFormatted {
    if (size < 1024) return '${size}B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)}KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}
