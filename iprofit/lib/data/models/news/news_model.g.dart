// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'news_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class NewsModelAdapter extends TypeAdapter<NewsModel> {
  @override
  final int typeId = 51;

  @override
  NewsModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NewsModel(
      id: fields[0] as String,
      title: fields[1] as String,
      content: fields[2] as String,
      excerpt: fields[3] as String?,
      category: fields[4] as String,
      imageUrl: fields[5] as String?,
      thumbnailUrl: fields[6] as String?,
      tags: (fields[7] as List).cast<String>(),
      featured: fields[8] as bool,
      published: fields[9] as bool,
      publishedAt: fields[10] as DateTime,
      createdAt: fields[11] as DateTime,
      updatedAt: fields[12] as DateTime,
      author: fields[13] as String,
      authorId: fields[14] as String?,
      authorAvatar: fields[15] as String?,
      viewCount: fields[16] as int,
      likeCount: fields[17] as int,
      shareCount: fields[18] as int,
      commentCount: fields[19] as int,
      status: fields[20] as String,
      priority: fields[21] as int,
      expiresAt: fields[22] as DateTime?,
      attachments: (fields[23] as List).cast<NewsAttachment>(),
      metadata: fields[24] as NewsMetadata?,
      isPinned: fields[25] as bool,
      externalUrl: fields[26] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, NewsModel obj) {
    writer
      ..writeByte(27)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.title)
      ..writeByte(2)
      ..write(obj.content)
      ..writeByte(3)
      ..write(obj.excerpt)
      ..writeByte(4)
      ..write(obj.category)
      ..writeByte(5)
      ..write(obj.imageUrl)
      ..writeByte(6)
      ..write(obj.thumbnailUrl)
      ..writeByte(7)
      ..write(obj.tags)
      ..writeByte(8)
      ..write(obj.featured)
      ..writeByte(9)
      ..write(obj.published)
      ..writeByte(10)
      ..write(obj.publishedAt)
      ..writeByte(11)
      ..write(obj.createdAt)
      ..writeByte(12)
      ..write(obj.updatedAt)
      ..writeByte(13)
      ..write(obj.author)
      ..writeByte(14)
      ..write(obj.authorId)
      ..writeByte(15)
      ..write(obj.authorAvatar)
      ..writeByte(16)
      ..write(obj.viewCount)
      ..writeByte(17)
      ..write(obj.likeCount)
      ..writeByte(18)
      ..write(obj.shareCount)
      ..writeByte(19)
      ..write(obj.commentCount)
      ..writeByte(20)
      ..write(obj.status)
      ..writeByte(21)
      ..write(obj.priority)
      ..writeByte(22)
      ..write(obj.expiresAt)
      ..writeByte(23)
      ..write(obj.attachments)
      ..writeByte(24)
      ..write(obj.metadata)
      ..writeByte(25)
      ..write(obj.isPinned)
      ..writeByte(26)
      ..write(obj.externalUrl);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NewsModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class NewsAttachmentAdapter extends TypeAdapter<NewsAttachment> {
  @override
  final int typeId = 52;

  @override
  NewsAttachment read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NewsAttachment(
      id: fields[0] as String,
      filename: fields[1] as String,
      url: fields[2] as String,
      mimeType: fields[3] as String,
      size: fields[4] as int,
      description: fields[5] as String?,
      uploadedAt: fields[6] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, NewsAttachment obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.filename)
      ..writeByte(2)
      ..write(obj.url)
      ..writeByte(3)
      ..write(obj.mimeType)
      ..writeByte(4)
      ..write(obj.size)
      ..writeByte(5)
      ..write(obj.description)
      ..writeByte(6)
      ..write(obj.uploadedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NewsAttachmentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class NewsMetadataAdapter extends TypeAdapter<NewsMetadata> {
  @override
  final int typeId = 53;

  @override
  NewsMetadata read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NewsMetadata(
      seoTitle: fields[0] as String?,
      seoDescription: fields[1] as String?,
      seoKeywords: (fields[2] as List).cast<String>(),
      socialImage: fields[3] as String?,
      socialTitle: fields[4] as String?,
      socialDescription: fields[5] as String?,
      allowComments: fields[6] as bool,
      allowSharing: fields[7] as bool,
      sendNotification: fields[8] as bool,
      targetAudience: (fields[9] as List).cast<String>(),
      customFields: (fields[10] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, NewsMetadata obj) {
    writer
      ..writeByte(11)
      ..writeByte(0)
      ..write(obj.seoTitle)
      ..writeByte(1)
      ..write(obj.seoDescription)
      ..writeByte(2)
      ..write(obj.seoKeywords)
      ..writeByte(3)
      ..write(obj.socialImage)
      ..writeByte(4)
      ..write(obj.socialTitle)
      ..writeByte(5)
      ..write(obj.socialDescription)
      ..writeByte(6)
      ..write(obj.allowComments)
      ..writeByte(7)
      ..write(obj.allowSharing)
      ..writeByte(8)
      ..write(obj.sendNotification)
      ..writeByte(9)
      ..write(obj.targetAudience)
      ..writeByte(10)
      ..write(obj.customFields);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NewsMetadataAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class NewsCommentAdapter extends TypeAdapter<NewsComment> {
  @override
  final int typeId = 54;

  @override
  NewsComment read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NewsComment(
      id: fields[0] as String,
      newsId: fields[1] as String,
      userId: fields[2] as String,
      userName: fields[3] as String,
      userAvatar: fields[4] as String?,
      content: fields[5] as String,
      createdAt: fields[6] as DateTime,
      updatedAt: fields[7] as DateTime,
      parentCommentId: fields[8] as String?,
      likeCount: fields[9] as int,
      isModerated: fields[10] as bool,
      isApproved: fields[11] as bool,
      replies: (fields[12] as List).cast<NewsComment>(),
    );
  }

  @override
  void write(BinaryWriter writer, NewsComment obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.newsId)
      ..writeByte(2)
      ..write(obj.userId)
      ..writeByte(3)
      ..write(obj.userName)
      ..writeByte(4)
      ..write(obj.userAvatar)
      ..writeByte(5)
      ..write(obj.content)
      ..writeByte(6)
      ..write(obj.createdAt)
      ..writeByte(7)
      ..write(obj.updatedAt)
      ..writeByte(8)
      ..write(obj.parentCommentId)
      ..writeByte(9)
      ..write(obj.likeCount)
      ..writeByte(10)
      ..write(obj.isModerated)
      ..writeByte(11)
      ..write(obj.isApproved)
      ..writeByte(12)
      ..write(obj.replies);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NewsCommentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NewsModel _$NewsModelFromJson(Map<String, dynamic> json) => NewsModel(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      excerpt: json['excerpt'] as String?,
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
      featured: json['featured'] as bool? ?? false,
      published: json['published'] as bool? ?? false,
      publishedAt: DateTime.parse(json['publishedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      author: json['author'] as String,
      authorId: json['authorId'] as String?,
      authorAvatar: json['authorAvatar'] as String?,
      viewCount: (json['viewCount'] as num?)?.toInt() ?? 0,
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      shareCount: (json['shareCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'draft',
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => NewsAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      metadata: json['metadata'] == null
          ? null
          : NewsMetadata.fromJson(json['metadata'] as Map<String, dynamic>),
      isPinned: json['isPinned'] as bool? ?? false,
      externalUrl: json['externalUrl'] as String?,
    );

Map<String, dynamic> _$NewsModelToJson(NewsModel instance) => <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'content': instance.content,
      'excerpt': instance.excerpt,
      'category': instance.category,
      'imageUrl': instance.imageUrl,
      'thumbnailUrl': instance.thumbnailUrl,
      'tags': instance.tags,
      'featured': instance.featured,
      'published': instance.published,
      'publishedAt': instance.publishedAt.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'author': instance.author,
      'authorId': instance.authorId,
      'authorAvatar': instance.authorAvatar,
      'viewCount': instance.viewCount,
      'likeCount': instance.likeCount,
      'shareCount': instance.shareCount,
      'commentCount': instance.commentCount,
      'status': instance.status,
      'priority': instance.priority,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'attachments': instance.attachments,
      'metadata': instance.metadata,
      'isPinned': instance.isPinned,
      'externalUrl': instance.externalUrl,
    };

NewsAttachment _$NewsAttachmentFromJson(Map<String, dynamic> json) =>
    NewsAttachment(
      id: json['id'] as String,
      filename: json['filename'] as String,
      url: json['url'] as String,
      mimeType: json['mimeType'] as String,
      size: (json['size'] as num).toInt(),
      description: json['description'] as String?,
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
    );

Map<String, dynamic> _$NewsAttachmentToJson(NewsAttachment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'filename': instance.filename,
      'url': instance.url,
      'mimeType': instance.mimeType,
      'size': instance.size,
      'description': instance.description,
      'uploadedAt': instance.uploadedAt.toIso8601String(),
    };

NewsMetadata _$NewsMetadataFromJson(Map<String, dynamic> json) => NewsMetadata(
      seoTitle: json['seoTitle'] as String?,
      seoDescription: json['seoDescription'] as String?,
      seoKeywords: (json['seoKeywords'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      socialImage: json['socialImage'] as String?,
      socialTitle: json['socialTitle'] as String?,
      socialDescription: json['socialDescription'] as String?,
      allowComments: json['allowComments'] as bool? ?? true,
      allowSharing: json['allowSharing'] as bool? ?? true,
      sendNotification: json['sendNotification'] as bool? ?? false,
      targetAudience: (json['targetAudience'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      customFields: json['customFields'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$NewsMetadataToJson(NewsMetadata instance) =>
    <String, dynamic>{
      'seoTitle': instance.seoTitle,
      'seoDescription': instance.seoDescription,
      'seoKeywords': instance.seoKeywords,
      'socialImage': instance.socialImage,
      'socialTitle': instance.socialTitle,
      'socialDescription': instance.socialDescription,
      'allowComments': instance.allowComments,
      'allowSharing': instance.allowSharing,
      'sendNotification': instance.sendNotification,
      'targetAudience': instance.targetAudience,
      'customFields': instance.customFields,
    };

NewsComment _$NewsCommentFromJson(Map<String, dynamic> json) => NewsComment(
      id: json['id'] as String,
      newsId: json['newsId'] as String,
      userId: json['userId'] as String,
      userName: json['userName'] as String,
      userAvatar: json['userAvatar'] as String?,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      parentCommentId: json['parentCommentId'] as String?,
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      isModerated: json['isModerated'] as bool? ?? false,
      isApproved: json['isApproved'] as bool? ?? true,
      replies: (json['replies'] as List<dynamic>?)
              ?.map((e) => NewsComment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$NewsCommentToJson(NewsComment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'newsId': instance.newsId,
      'userId': instance.userId,
      'userName': instance.userName,
      'userAvatar': instance.userAvatar,
      'content': instance.content,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'parentCommentId': instance.parentCommentId,
      'likeCount': instance.likeCount,
      'isModerated': instance.isModerated,
      'isApproved': instance.isApproved,
      'replies': instance.replies,
    };
