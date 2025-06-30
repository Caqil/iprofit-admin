// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ticket_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TicketModelAdapter extends TypeAdapter<TicketModel> {
  @override
  final int typeId = 22;

  @override
  TicketModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TicketModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      ticketNumber: fields[2] as String,
      subject: fields[3] as String,
      message: fields[4] as String,
      category: fields[5] as String,
      priority: fields[6] as String,
      status: fields[7] as String,
      createdAt: fields[8] as DateTime,
      updatedAt: fields[9] as DateTime,
      closedAt: fields[10] as DateTime?,
      assignedTo: fields[11] as String?,
      adminNotes: fields[12] as String?,
      attachments: (fields[13] as List).cast<TicketAttachment>(),
      replies: (fields[14] as List).cast<TicketReply>(),
      rating: fields[15] as int,
      feedback: fields[16] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, TicketModel obj) {
    writer
      ..writeByte(17)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.ticketNumber)
      ..writeByte(3)
      ..write(obj.subject)
      ..writeByte(4)
      ..write(obj.message)
      ..writeByte(5)
      ..write(obj.category)
      ..writeByte(6)
      ..write(obj.priority)
      ..writeByte(7)
      ..write(obj.status)
      ..writeByte(8)
      ..write(obj.createdAt)
      ..writeByte(9)
      ..write(obj.updatedAt)
      ..writeByte(10)
      ..write(obj.closedAt)
      ..writeByte(11)
      ..write(obj.assignedTo)
      ..writeByte(12)
      ..write(obj.adminNotes)
      ..writeByte(13)
      ..write(obj.attachments)
      ..writeByte(14)
      ..write(obj.replies)
      ..writeByte(15)
      ..write(obj.rating)
      ..writeByte(16)
      ..write(obj.feedback);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TicketModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class TicketRequestAdapter extends TypeAdapter<TicketRequest> {
  @override
  final int typeId = 23;

  @override
  TicketRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TicketRequest(
      subject: fields[0] as String,
      message: fields[1] as String,
      category: fields[2] as String,
      priority: fields[3] as String,
      attachments: (fields[4] as List).cast<TicketAttachment>(),
      metadata: (fields[5] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, TicketRequest obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.subject)
      ..writeByte(1)
      ..write(obj.message)
      ..writeByte(2)
      ..write(obj.category)
      ..writeByte(3)
      ..write(obj.priority)
      ..writeByte(4)
      ..write(obj.attachments)
      ..writeByte(5)
      ..write(obj.metadata);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TicketRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class TicketReplyAdapter extends TypeAdapter<TicketReply> {
  @override
  final int typeId = 24;

  @override
  TicketReply read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TicketReply(
      id: fields[0] as String,
      ticketId: fields[1] as String,
      userId: fields[2] as String?,
      adminId: fields[3] as String?,
      message: fields[4] as String,
      createdAt: fields[5] as DateTime,
      attachments: (fields[6] as List).cast<TicketAttachment>(),
      isAdminReply: fields[7] as bool,
      isInternal: fields[8] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, TicketReply obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.ticketId)
      ..writeByte(2)
      ..write(obj.userId)
      ..writeByte(3)
      ..write(obj.adminId)
      ..writeByte(4)
      ..write(obj.message)
      ..writeByte(5)
      ..write(obj.createdAt)
      ..writeByte(6)
      ..write(obj.attachments)
      ..writeByte(7)
      ..write(obj.isAdminReply)
      ..writeByte(8)
      ..write(obj.isInternal);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TicketReplyAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class TicketAttachmentAdapter extends TypeAdapter<TicketAttachment> {
  @override
  final int typeId = 25;

  @override
  TicketAttachment read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TicketAttachment(
      id: fields[0] as String,
      filename: fields[1] as String,
      url: fields[2] as String,
      mimeType: fields[3] as String,
      size: fields[4] as int,
      uploadedAt: fields[5] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, TicketAttachment obj) {
    writer
      ..writeByte(6)
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
      ..write(obj.uploadedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TicketAttachmentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TicketModel _$TicketModelFromJson(Map<String, dynamic> json) => TicketModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      ticketNumber: json['ticketNumber'] as String,
      subject: json['subject'] as String,
      message: json['message'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      closedAt: json['closedAt'] == null
          ? null
          : DateTime.parse(json['closedAt'] as String),
      assignedTo: json['assignedTo'] as String?,
      adminNotes: json['adminNotes'] as String?,
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => TicketAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      replies: (json['replies'] as List<dynamic>?)
              ?.map((e) => TicketReply.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      rating: (json['rating'] as num?)?.toInt() ?? 0,
      feedback: json['feedback'] as String?,
    );

Map<String, dynamic> _$TicketModelToJson(TicketModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'ticketNumber': instance.ticketNumber,
      'subject': instance.subject,
      'message': instance.message,
      'category': instance.category,
      'priority': instance.priority,
      'status': instance.status,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'closedAt': instance.closedAt?.toIso8601String(),
      'assignedTo': instance.assignedTo,
      'adminNotes': instance.adminNotes,
      'attachments': instance.attachments,
      'replies': instance.replies,
      'rating': instance.rating,
      'feedback': instance.feedback,
    };

TicketRequest _$TicketRequestFromJson(Map<String, dynamic> json) =>
    TicketRequest(
      subject: json['subject'] as String,
      message: json['message'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => TicketAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$TicketRequestToJson(TicketRequest instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'message': instance.message,
      'category': instance.category,
      'priority': instance.priority,
      'attachments': instance.attachments,
      'metadata': instance.metadata,
    };

TicketReply _$TicketReplyFromJson(Map<String, dynamic> json) => TicketReply(
      id: json['id'] as String,
      ticketId: json['ticketId'] as String,
      userId: json['userId'] as String?,
      adminId: json['adminId'] as String?,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => TicketAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      isAdminReply: json['isAdminReply'] as bool? ?? false,
      isInternal: json['isInternal'] as bool? ?? false,
    );

Map<String, dynamic> _$TicketReplyToJson(TicketReply instance) =>
    <String, dynamic>{
      'id': instance.id,
      'ticketId': instance.ticketId,
      'userId': instance.userId,
      'adminId': instance.adminId,
      'message': instance.message,
      'createdAt': instance.createdAt.toIso8601String(),
      'attachments': instance.attachments,
      'isAdminReply': instance.isAdminReply,
      'isInternal': instance.isInternal,
    };

TicketAttachment _$TicketAttachmentFromJson(Map<String, dynamic> json) =>
    TicketAttachment(
      id: json['id'] as String,
      filename: json['filename'] as String,
      url: json['url'] as String,
      mimeType: json['mimeType'] as String,
      size: (json['size'] as num).toInt(),
      uploadedAt: DateTime.parse(json['uploadedAt'] as String),
    );

Map<String, dynamic> _$TicketAttachmentToJson(TicketAttachment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'filename': instance.filename,
      'url': instance.url,
      'mimeType': instance.mimeType,
      'size': instance.size,
      'uploadedAt': instance.uploadedAt.toIso8601String(),
    };
