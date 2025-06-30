// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LoginRequestAdapter extends TypeAdapter<LoginRequest> {
  @override
  final int typeId = 43;

  @override
  LoginRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoginRequest(
      email: fields[0] as String,
      password: fields[1] as String,
      userType: fields[2] as String,
      deviceId: fields[3] as String,
      fingerprint: fields[4] as String,
      twoFactorToken: fields[5] as String?,
      rememberMe: fields[6] as bool,
      deviceInfo: (fields[7] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, LoginRequest obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.email)
      ..writeByte(1)
      ..write(obj.password)
      ..writeByte(2)
      ..write(obj.userType)
      ..writeByte(3)
      ..write(obj.deviceId)
      ..writeByte(4)
      ..write(obj.fingerprint)
      ..writeByte(5)
      ..write(obj.twoFactorToken)
      ..writeByte(6)
      ..write(obj.rememberMe)
      ..writeByte(7)
      ..write(obj.deviceInfo);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoginRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) => LoginRequest(
      email: json['email'] as String,
      password: json['password'] as String,
      userType: json['userType'] as String? ?? 'user',
      deviceId: json['deviceId'] as String,
      fingerprint: json['fingerprint'] as String,
      twoFactorToken: json['twoFactorToken'] as String?,
      rememberMe: json['rememberMe'] as bool? ?? false,
      deviceInfo: json['deviceInfo'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) =>
    <String, dynamic>{
      'email': instance.email,
      'password': instance.password,
      'userType': instance.userType,
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
      'twoFactorToken': instance.twoFactorToken,
      'rememberMe': instance.rememberMe,
      'deviceInfo': instance.deviceInfo,
    };
