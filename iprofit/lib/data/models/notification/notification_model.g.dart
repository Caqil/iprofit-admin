// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class NotificationModelAdapter extends TypeAdapter<NotificationModel> {
  @override
  final int typeId = 33;

  @override
  NotificationModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NotificationModel(
      id: fields[0] as String,
      userId: fields[1] as String,
      title: fields[2] as String,
      message: fields[3] as String,
      type: fields[4] as String,
      read: fields[5] as bool,
      createdAt: fields[6] as DateTime,
      readAt: fields[7] as DateTime?,
      data: (fields[8] as Map?)?.cast<String, dynamic>(),
      actionUrl: fields[9] as String?,
      actionLabel: fields[10] as String?,
      priority: fields[11] as String,
      icon: fields[12] as String?,
      imageUrl: fields[13] as String?,
      expiresAt: fields[14] as DateTime?,
      persistent: fields[15] as bool,
      tags: (fields[16] as List).cast<String>(),
      category: fields[17] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, NotificationModel obj) {
    writer
      ..writeByte(18)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.title)
      ..writeByte(3)
      ..write(obj.message)
      ..writeByte(4)
      ..write(obj.type)
      ..writeByte(5)
      ..write(obj.read)
      ..writeByte(6)
      ..write(obj.createdAt)
      ..writeByte(7)
      ..write(obj.readAt)
      ..writeByte(8)
      ..write(obj.data)
      ..writeByte(9)
      ..write(obj.actionUrl)
      ..writeByte(10)
      ..write(obj.actionLabel)
      ..writeByte(11)
      ..write(obj.priority)
      ..writeByte(12)
      ..write(obj.icon)
      ..writeByte(13)
      ..write(obj.imageUrl)
      ..writeByte(14)
      ..write(obj.expiresAt)
      ..writeByte(15)
      ..write(obj.persistent)
      ..writeByte(16)
      ..write(obj.tags)
      ..writeByte(17)
      ..write(obj.category);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class NotificationSettingsAdapter extends TypeAdapter<NotificationSettings> {
  @override
  final int typeId = 34;

  @override
  NotificationSettings read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return NotificationSettings(
      pushNotifications: fields[0] as bool,
      emailNotifications: fields[1] as bool,
      smsNotifications: fields[2] as bool,
      transactionNotifications: fields[3] as bool,
      loanNotifications: fields[4] as bool,
      promotionNotifications: fields[5] as bool,
      securityNotifications: fields[6] as bool,
      referralNotifications: fields[7] as bool,
      supportNotifications: fields[8] as bool,
      quietHoursStart: fields[9] as String,
      quietHoursEnd: fields[10] as String,
      weekendNotifications: fields[11] as bool,
      mutedCategories: (fields[12] as List).cast<String>(),
    );
  }

  @override
  void write(BinaryWriter writer, NotificationSettings obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.pushNotifications)
      ..writeByte(1)
      ..write(obj.emailNotifications)
      ..writeByte(2)
      ..write(obj.smsNotifications)
      ..writeByte(3)
      ..write(obj.transactionNotifications)
      ..writeByte(4)
      ..write(obj.loanNotifications)
      ..writeByte(5)
      ..write(obj.promotionNotifications)
      ..writeByte(6)
      ..write(obj.securityNotifications)
      ..writeByte(7)
      ..write(obj.referralNotifications)
      ..writeByte(8)
      ..write(obj.supportNotifications)
      ..writeByte(9)
      ..write(obj.quietHoursStart)
      ..writeByte(10)
      ..write(obj.quietHoursEnd)
      ..writeByte(11)
      ..write(obj.weekendNotifications)
      ..writeByte(12)
      ..write(obj.mutedCategories);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationSettingsAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NotificationModel _$NotificationModelFromJson(Map<String, dynamic> json) =>
    NotificationModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      type: json['type'] as String,
      read: json['read'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] == null
          ? null
          : DateTime.parse(json['readAt'] as String),
      data: json['data'] as Map<String, dynamic>?,
      actionUrl: json['actionUrl'] as String?,
      actionLabel: json['actionLabel'] as String?,
      priority: json['priority'] as String? ?? 'normal',
      icon: json['icon'] as String?,
      imageUrl: json['imageUrl'] as String?,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      persistent: json['persistent'] as bool? ?? false,
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
      category: json['category'] as String?,
    );

Map<String, dynamic> _$NotificationModelToJson(NotificationModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'title': instance.title,
      'message': instance.message,
      'type': instance.type,
      'read': instance.read,
      'createdAt': instance.createdAt.toIso8601String(),
      'readAt': instance.readAt?.toIso8601String(),
      'data': instance.data,
      'actionUrl': instance.actionUrl,
      'actionLabel': instance.actionLabel,
      'priority': instance.priority,
      'icon': instance.icon,
      'imageUrl': instance.imageUrl,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'persistent': instance.persistent,
      'tags': instance.tags,
      'category': instance.category,
    };

NotificationSettings _$NotificationSettingsFromJson(
        Map<String, dynamic> json) =>
    NotificationSettings(
      pushNotifications: json['pushNotifications'] as bool? ?? true,
      emailNotifications: json['emailNotifications'] as bool? ?? true,
      smsNotifications: json['smsNotifications'] as bool? ?? false,
      transactionNotifications:
          json['transactionNotifications'] as bool? ?? true,
      loanNotifications: json['loanNotifications'] as bool? ?? true,
      promotionNotifications: json['promotionNotifications'] as bool? ?? true,
      securityNotifications: json['securityNotifications'] as bool? ?? true,
      referralNotifications: json['referralNotifications'] as bool? ?? true,
      supportNotifications: json['supportNotifications'] as bool? ?? true,
      quietHoursStart: json['quietHoursStart'] as String? ?? '22:00',
      quietHoursEnd: json['quietHoursEnd'] as String? ?? '08:00',
      weekendNotifications: json['weekendNotifications'] as bool? ?? true,
      mutedCategories: (json['mutedCategories'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$NotificationSettingsToJson(
        NotificationSettings instance) =>
    <String, dynamic>{
      'pushNotifications': instance.pushNotifications,
      'emailNotifications': instance.emailNotifications,
      'smsNotifications': instance.smsNotifications,
      'transactionNotifications': instance.transactionNotifications,
      'loanNotifications': instance.loanNotifications,
      'promotionNotifications': instance.promotionNotifications,
      'securityNotifications': instance.securityNotifications,
      'referralNotifications': instance.referralNotifications,
      'supportNotifications': instance.supportNotifications,
      'quietHoursStart': instance.quietHoursStart,
      'quietHoursEnd': instance.quietHoursEnd,
      'weekendNotifications': instance.weekendNotifications,
      'mutedCategories': instance.mutedCategories,
    };
