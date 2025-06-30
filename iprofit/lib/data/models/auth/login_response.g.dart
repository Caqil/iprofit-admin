// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_response.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LoginResponseAdapter extends TypeAdapter<LoginResponse> {
  @override
  final int typeId = 44;

  @override
  LoginResponse read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LoginResponse(
      success: fields[0] as bool,
      user: fields[1] as UserInfo,
      tokens: fields[2] as AuthTokens?,
      message: fields[3] as String?,
      permissions: (fields[4] as Map?)?.cast<String, dynamic>(),
      preferences: fields[5] as UserPreferences?,
    );
  }

  @override
  void write(BinaryWriter writer, LoginResponse obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.success)
      ..writeByte(1)
      ..write(obj.user)
      ..writeByte(2)
      ..write(obj.tokens)
      ..writeByte(3)
      ..write(obj.message)
      ..writeByte(4)
      ..write(obj.permissions)
      ..writeByte(5)
      ..write(obj.preferences);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoginResponseAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserInfoAdapter extends TypeAdapter<UserInfo> {
  @override
  final int typeId = 45;

  @override
  UserInfo read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserInfo(
      id: fields[0] as String,
      email: fields[1] as String,
      name: fields[2] as String,
      userType: fields[3] as String,
      phone: fields[4] as String?,
      avatar: fields[5] as String?,
      emailVerified: fields[6] as bool,
      phoneVerified: fields[7] as bool,
      twoFactorEnabled: fields[8] as bool,
      status: fields[9] as String,
      lastLoginAt: fields[10] as DateTime?,
      planId: fields[11] as String?,
      referralCode: fields[12] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, UserInfo obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.email)
      ..writeByte(2)
      ..write(obj.name)
      ..writeByte(3)
      ..write(obj.userType)
      ..writeByte(4)
      ..write(obj.phone)
      ..writeByte(5)
      ..write(obj.avatar)
      ..writeByte(6)
      ..write(obj.emailVerified)
      ..writeByte(7)
      ..write(obj.phoneVerified)
      ..writeByte(8)
      ..write(obj.twoFactorEnabled)
      ..writeByte(9)
      ..write(obj.status)
      ..writeByte(10)
      ..write(obj.lastLoginAt)
      ..writeByte(11)
      ..write(obj.planId)
      ..writeByte(12)
      ..write(obj.referralCode);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserInfoAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class AuthTokensAdapter extends TypeAdapter<AuthTokens> {
  @override
  final int typeId = 46;

  @override
  AuthTokens read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return AuthTokens(
      accessToken: fields[0] as String,
      refreshToken: fields[1] as String?,
      expiresIn: fields[2] as int,
      tokenType: fields[3] as String,
      issuedAt: fields[4] as DateTime,
      expiresAt: fields[5] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, AuthTokens obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.accessToken)
      ..writeByte(1)
      ..write(obj.refreshToken)
      ..writeByte(2)
      ..write(obj.expiresIn)
      ..writeByte(3)
      ..write(obj.tokenType)
      ..writeByte(4)
      ..write(obj.issuedAt)
      ..writeByte(5)
      ..write(obj.expiresAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AuthTokensAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class UserPreferencesAdapter extends TypeAdapter<UserPreferences> {
  @override
  final int typeId = 47;

  @override
  UserPreferences read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return UserPreferences(
      language: fields[0] as String,
      currency: fields[1] as String,
      timezone: fields[2] as String,
      theme: fields[3] as String,
      notifications: fields[4] as bool,
      emailUpdates: fields[5] as bool,
      smsUpdates: fields[6] as bool,
      customSettings: (fields[7] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, UserPreferences obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.language)
      ..writeByte(1)
      ..write(obj.currency)
      ..writeByte(2)
      ..write(obj.timezone)
      ..writeByte(3)
      ..write(obj.theme)
      ..writeByte(4)
      ..write(obj.notifications)
      ..writeByte(5)
      ..write(obj.emailUpdates)
      ..writeByte(6)
      ..write(obj.smsUpdates)
      ..writeByte(7)
      ..write(obj.customSettings);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserPreferencesAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginResponse _$LoginResponseFromJson(Map<String, dynamic> json) =>
    LoginResponse(
      success: json['success'] as bool,
      user: UserInfo.fromJson(json['user'] as Map<String, dynamic>),
      tokens: json['tokens'] == null
          ? null
          : AuthTokens.fromJson(json['tokens'] as Map<String, dynamic>),
      message: json['message'] as String?,
      permissions: json['permissions'] as Map<String, dynamic>?,
      preferences: json['preferences'] == null
          ? null
          : UserPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LoginResponseToJson(LoginResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'user': instance.user,
      'tokens': instance.tokens,
      'message': instance.message,
      'permissions': instance.permissions,
      'preferences': instance.preferences,
    };

UserInfo _$UserInfoFromJson(Map<String, dynamic> json) => UserInfo(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      userType: json['userType'] as String,
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      emailVerified: json['emailVerified'] as bool? ?? false,
      phoneVerified: json['phoneVerified'] as bool? ?? false,
      twoFactorEnabled: json['twoFactorEnabled'] as bool? ?? false,
      status: json['status'] as String? ?? 'active',
      lastLoginAt: json['lastLoginAt'] == null
          ? null
          : DateTime.parse(json['lastLoginAt'] as String),
      planId: json['planId'] as String?,
      referralCode: json['referralCode'] as String?,
    );

Map<String, dynamic> _$UserInfoToJson(UserInfo instance) => <String, dynamic>{
      'id': instance.id,
      'email': instance.email,
      'name': instance.name,
      'userType': instance.userType,
      'phone': instance.phone,
      'avatar': instance.avatar,
      'emailVerified': instance.emailVerified,
      'phoneVerified': instance.phoneVerified,
      'twoFactorEnabled': instance.twoFactorEnabled,
      'status': instance.status,
      'lastLoginAt': instance.lastLoginAt?.toIso8601String(),
      'planId': instance.planId,
      'referralCode': instance.referralCode,
    };

AuthTokens _$AuthTokensFromJson(Map<String, dynamic> json) => AuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
      expiresIn: (json['expiresIn'] as num).toInt(),
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      issuedAt: DateTime.parse(json['issuedAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );

Map<String, dynamic> _$AuthTokensToJson(AuthTokens instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'expiresIn': instance.expiresIn,
      'tokenType': instance.tokenType,
      'issuedAt': instance.issuedAt.toIso8601String(),
      'expiresAt': instance.expiresAt.toIso8601String(),
    };

UserPreferences _$UserPreferencesFromJson(Map<String, dynamic> json) =>
    UserPreferences(
      language: json['language'] as String? ?? 'en',
      currency: json['currency'] as String? ?? 'BDT',
      timezone: json['timezone'] as String? ?? 'Asia/Dhaka',
      theme: json['theme'] as String? ?? 'system',
      notifications: json['notifications'] as bool? ?? true,
      emailUpdates: json['emailUpdates'] as bool? ?? true,
      smsUpdates: json['smsUpdates'] as bool? ?? false,
      customSettings: json['customSettings'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$UserPreferencesToJson(UserPreferences instance) =>
    <String, dynamic>{
      'language': instance.language,
      'currency': instance.currency,
      'timezone': instance.timezone,
      'theme': instance.theme,
      'notifications': instance.notifications,
      'emailUpdates': instance.emailUpdates,
      'smsUpdates': instance.smsUpdates,
      'customSettings': instance.customSettings,
    };
