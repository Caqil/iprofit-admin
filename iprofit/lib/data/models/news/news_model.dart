import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'news_model.g.dart';

@HiveType(typeId: 51)
@JsonSerializable()
class NewsModel extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String title;

  @HiveField(2)
  final String content;

  @HiveField(3)
  final String? excerpt;

  @HiveField(4)
  final String category;

  @HiveField(5)
  final String? imageUrl;

  @HiveField(6)
  final String? thumbnailUrl;

  @HiveField(7)
  final List<String> tags;

  @HiveField(8)
  final bool featured;

  @HiveField(9)
  final bool published;

  @HiveField(10)
  final DateTime publishedAt;

  @HiveField(11)
  final DateTime createdAt;

  @HiveField(12)
  final DateTime updatedAt;

  @HiveField(13)
  final String author;

  @HiveField(14)
  final String? authorId;

  @HiveField(15)
  final String? authorAvatar;

  @HiveField(16)
  final int viewCount;

  @HiveField(17)
  final int likeCount;

  @HiveField(18)
  final int shareCount;

  @HiveField(19)
  final int commentCount;

  @HiveField(20)
  final String status;

  @HiveField(21)
  final int priority;

  @HiveField(22)
  final DateTime? expiresAt;

  @HiveField(23)
  final List<NewsAttachment> attachments;

  @HiveField(24)
  final NewsMetadata? metadata;

  @HiveField(25)
  final bool isPinned;

  @HiveField(26)
  final String? externalUrl;

  NewsModel({
    required this.id,
    required this.title,
    required this.content,
    this.excerpt,
    required this.category,
    this.imageUrl,
    this.thumbnailUrl,
    this.tags = const [],
    this.featured = false,
    this.published = false,
    required this.publishedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.author,
    this.authorId,
    this.authorAvatar,
    this.viewCount = 0,
    this.likeCount = 0,
    this.shareCount = 0,
    this.commentCount = 0,
    this.status = 'draft',
    this.priority = 0,
    this.expiresAt,
    this.attachments = const [],
    this.metadata,
    this.isPinned = false,
    this.externalUrl,
  });

  factory NewsModel.fromJson(Map<String, dynamic> json) =>
      _$NewsModelFromJson(json);
  Map<String, dynamic> toJson() => _$NewsModelToJson(this);

  // Status helpers
  bool get isDraft => status.toLowerCase() == 'draft';
  bool get isPublished => status.toLowerCase() == 'published';
  bool get isArchived => status.toLowerCase() == 'archived';
  bool get isScheduled => status.toLowerCase() == 'scheduled';

  // Visibility helpers
  bool get isVisible => published && isPublished && !isExpired;
  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());
  bool get hasImage => imageUrl != null && imageUrl!.isNotEmpty;
  bool get hasAttachments => attachments.isNotEmpty;
  bool get isExternal => externalUrl != null && externalUrl!.isNotEmpty;

  // Engagement helpers
  bool get hasEngagement => viewCount > 0 || likeCount > 0 || shareCount > 0;
  double get engagementRate => viewCount > 0
      ? ((likeCount + shareCount + commentCount) / viewCount) * 100
      : 0.0;

  // Time helpers
  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(publishedAt);

    if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  bool get isRecent => DateTime.now().difference(publishedAt).inDays <= 7;
  bool get isNew => DateTime.now().difference(publishedAt).inHours <= 24;

  // Display helpers
  String get displayCategory {
    switch (category.toLowerCase()) {
      case 'updates':
        return 'Updates';
      case 'announcements':
        return 'Announcements';
      case 'features':
        return 'Features';
      case 'maintenance':
        return 'Maintenance';
      case 'promotion':
        return 'Promotion';
      case 'education':
        return 'Education';
      case 'market':
        return 'Market News';
      default:
        return category;
    }
  }

  String get readingTime {
    final wordCount = content.split(' ').length;
    final minutes = (wordCount / 200)
        .ceil(); // Average reading speed: 200 words/min
    return '${minutes}min read';
  }

  String get summaryText =>
      excerpt ??
      content.substring(0, content.length > 150 ? 150 : content.length) + '...';
}

@HiveType(typeId: 52)
@JsonSerializable()
class NewsAttachment extends HiveObject {
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
  final String? description;

  @HiveField(6)
  final DateTime uploadedAt;

  NewsAttachment({
    required this.id,
    required this.filename,
    required this.url,
    required this.mimeType,
    required this.size,
    this.description,
    required this.uploadedAt,
  });

  factory NewsAttachment.fromJson(Map<String, dynamic> json) =>
      _$NewsAttachmentFromJson(json);
  Map<String, dynamic> toJson() => _$NewsAttachmentToJson(this);

  bool get isImage => mimeType.startsWith('image/');
  bool get isVideo => mimeType.startsWith('video/');
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

@HiveType(typeId: 53)
@JsonSerializable()
class NewsMetadata extends HiveObject {
  @HiveField(0)
  final String? seoTitle;

  @HiveField(1)
  final String? seoDescription;

  @HiveField(2)
  final List<String> seoKeywords;

  @HiveField(3)
  final String? socialImage;

  @HiveField(4)
  final String? socialTitle;

  @HiveField(5)
  final String? socialDescription;

  @HiveField(6)
  final bool allowComments;

  @HiveField(7)
  final bool allowSharing;

  @HiveField(8)
  final bool sendNotification;

  @HiveField(9)
  final List<String> targetAudience;

  @HiveField(10)
  final Map<String, dynamic>? customFields;

  NewsMetadata({
    this.seoTitle,
    this.seoDescription,
    this.seoKeywords = const [],
    this.socialImage,
    this.socialTitle,
    this.socialDescription,
    this.allowComments = true,
    this.allowSharing = true,
    this.sendNotification = false,
    this.targetAudience = const [],
    this.customFields,
  });

  factory NewsMetadata.fromJson(Map<String, dynamic> json) =>
      _$NewsMetadataFromJson(json);
  Map<String, dynamic> toJson() => _$NewsMetadataToJson(this);

  bool get hasTargeting => targetAudience.isNotEmpty;
  bool get hasCustomFields => customFields != null && customFields!.isNotEmpty;
}

@HiveType(typeId: 54)
@JsonSerializable()
class NewsComment extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String newsId;

  @HiveField(2)
  final String userId;

  @HiveField(3)
  final String userName;

  @HiveField(4)
  final String? userAvatar;

  @HiveField(5)
  final String content;

  @HiveField(6)
  final DateTime createdAt;

  @HiveField(7)
  final DateTime updatedAt;

  @HiveField(8)
  final String? parentCommentId;

  @HiveField(9)
  final int likeCount;

  @HiveField(10)
  final bool isModerated;

  @HiveField(11)
  final bool isApproved;

  @HiveField(12)
  final List<NewsComment> replies;

  NewsComment({
    required this.id,
    required this.newsId,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
    this.parentCommentId,
    this.likeCount = 0,
    this.isModerated = false,
    this.isApproved = true,
    this.replies = const [],
  });

  factory NewsComment.fromJson(Map<String, dynamic> json) =>
      _$NewsCommentFromJson(json);
  Map<String, dynamic> toJson() => _$NewsCommentToJson(this);

  bool get isReply => parentCommentId != null;
  bool get hasReplies => replies.isNotEmpty;
  bool get isVisible => isApproved && (!isModerated || isApproved);
  int get totalReplies => replies.length;

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
