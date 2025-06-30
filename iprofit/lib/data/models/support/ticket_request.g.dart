// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ticket_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

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
      relatedTransactionId: fields[6] as String?,
      relatedLoanId: fields[7] as String?,
      isUrgent: fields[8] as bool,
      preferredContactMethod: fields[9] as String?,
      followUpDate: fields[10] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, TicketRequest obj) {
    writer
      ..writeByte(11)
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
      ..write(obj.metadata)
      ..writeByte(6)
      ..write(obj.relatedTransactionId)
      ..writeByte(7)
      ..write(obj.relatedLoanId)
      ..writeByte(8)
      ..write(obj.isUrgent)
      ..writeByte(9)
      ..write(obj.preferredContactMethod)
      ..writeByte(10)
      ..write(obj.followUpDate);
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

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

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
      relatedTransactionId: json['relatedTransactionId'] as String?,
      relatedLoanId: json['relatedLoanId'] as String?,
      isUrgent: json['isUrgent'] as bool? ?? false,
      preferredContactMethod: json['preferredContactMethod'] as String?,
      followUpDate: json['followUpDate'] == null
          ? null
          : DateTime.parse(json['followUpDate'] as String),
    );

Map<String, dynamic> _$TicketRequestToJson(TicketRequest instance) =>
    <String, dynamic>{
      'subject': instance.subject,
      'message': instance.message,
      'category': instance.category,
      'priority': instance.priority,
      'attachments': instance.attachments,
      'metadata': instance.metadata,
      'relatedTransactionId': instance.relatedTransactionId,
      'relatedLoanId': instance.relatedLoanId,
      'isUrgent': instance.isUrgent,
      'preferredContactMethod': instance.preferredContactMethod,
      'followUpDate': instance.followUpDate?.toIso8601String(),
    };
