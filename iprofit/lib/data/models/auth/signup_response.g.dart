// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_response.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class SignupResponseAdapter extends TypeAdapter<SignupResponse> {
  @override
  final int typeId = 50;

  @override
  SignupResponse read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SignupResponse(
      success: fields[0] as bool,
      user: fields[1] as UserInfo,
      message: fields[2] as String,
      verificationToken: fields[3] as String?,
      requiresVerification: fields[4] as bool,
      nextSteps: (fields[5] as List?)?.cast<String>(),
    );
  }

  @override
  void write(BinaryWriter writer, SignupResponse obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.success)
      ..writeByte(1)
      ..write(obj.user)
      ..writeByte(2)
      ..write(obj.message)
      ..writeByte(3)
      ..write(obj.verificationToken)
      ..writeByte(4)
      ..write(obj.requiresVerification)
      ..writeByte(5)
      ..write(obj.nextSteps);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignupResponseAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignupResponse _$SignupResponseFromJson(Map<String, dynamic> json) =>
    SignupResponse(
      success: json['success'] as bool,
      user: UserInfo.fromJson(json['user'] as Map<String, dynamic>),
      message: json['message'] as String,
      verificationToken: json['verificationToken'] as String?,
      requiresVerification: json['requiresVerification'] as bool? ?? true,
      nextSteps: (json['nextSteps'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$SignupResponseToJson(SignupResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'user': instance.user,
      'message': instance.message,
      'verificationToken': instance.verificationToken,
      'requiresVerification': instance.requiresVerification,
      'nextSteps': instance.nextSteps,
    };
