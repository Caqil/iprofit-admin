import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
part 'login_response.g.dart';

@HiveType(typeId: 44)
@JsonSerializable()
class LoginResponse extends HiveObject {
  @HiveField(0)
  final bool success;

  @HiveField(1)
  final UserInfo user;

  @HiveField(2)
  final AuthTokens? tokens;

  @HiveField(3)
  final String? message;

  @HiveField(4)
  final Map<String, dynamic>? permissions;

  @HiveField(5)
  final UserPreferences? preferences;

  LoginResponse({
    required this.success,
    required this.user,
    this.tokens,
    this.message,
    this.permissions,
    this.preferences,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);
  Map<String, dynamic> toJson() => _$LoginResponseToJson(this);

  bool get hasValidTokens => tokens != null && tokens!.accessToken.isNotEmpty;
  bool get isAdmin => user.userType.toLowerCase() == 'admin';
  bool get isUser => user.userType.toLowerCase() == 'user';
}

@HiveType(typeId: 45)
@JsonSerializable()
class UserInfo extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String email;

  @HiveField(2)
  final String name;

  @HiveField(3)
  final String userType;

  @HiveField(4)
  final String? phone;

  @HiveField(5)
  final String? avatar;

  @HiveField(6)
  final bool emailVerified;

  @HiveField(7)
  final bool phoneVerified;

  @HiveField(8)
  final bool twoFactorEnabled;

  @HiveField(9)
  final String status;

  @HiveField(10)
  final DateTime? lastLoginAt;

  @HiveField(11)
  final String? planId;

  @HiveField(12)
  final String? referralCode;

  UserInfo({
    required this.id,
    required this.email,
    required this.name,
    required this.userType,
    this.phone,
    this.avatar,
    this.emailVerified = false,
    this.phoneVerified = false,
    this.twoFactorEnabled = false,
    this.status = 'active',
    this.lastLoginAt,
    this.planId,
    this.referralCode,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) =>
      _$UserInfoFromJson(json);
  Map<String, dynamic> toJson() => _$UserInfoToJson(this);

  bool get isActive => status.toLowerCase() == 'active';
  bool get isVerified => emailVerified && phoneVerified;
  String get displayName => name.isNotEmpty ? name : email.split('@')[0];
}

@HiveType(typeId: 46)
@JsonSerializable()
class AuthTokens extends HiveObject {
  @HiveField(0)
  final String accessToken;

  @HiveField(1)
  final String? refreshToken;

  @HiveField(2)
  final int expiresIn;

  @HiveField(3)
  final String tokenType;

  @HiveField(4)
  final DateTime issuedAt;

  @HiveField(5)
  final DateTime expiresAt;

  AuthTokens({
    required this.accessToken,
    this.refreshToken,
    required this.expiresIn,
    this.tokenType = 'Bearer',
    required this.issuedAt,
    required this.expiresAt,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) =>
      _$AuthTokensFromJson(json);
  Map<String, dynamic> toJson() => _$AuthTokensToJson(this);

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get willExpireSoon =>
      DateTime.now().add(Duration(minutes: 5)).isAfter(expiresAt);
  Duration get timeUntilExpiry => expiresAt.difference(DateTime.now());
}

@HiveType(typeId: 47)
@JsonSerializable()
class UserPreferences extends HiveObject {
  @HiveField(0)
  final String language;

  @HiveField(1)
  final String currency;

  @HiveField(2)
  final String timezone;

  @HiveField(3)
  final String theme;

  @HiveField(4)
  final bool notifications;

  @HiveField(5)
  final bool emailUpdates;

  @HiveField(6)
  final bool smsUpdates;

  @HiveField(7)
  final Map<String, dynamic>? customSettings;

  UserPreferences({
    this.language = 'en',
    this.currency = 'BDT',
    this.timezone = 'Asia/Dhaka',
    this.theme = 'system',
    this.notifications = true,
    this.emailUpdates = true,
    this.smsUpdates = false,
    this.customSettings,
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) =>
      _$UserPreferencesFromJson(json);
  Map<String, dynamic> toJson() => _$UserPreferencesToJson(this);
}
