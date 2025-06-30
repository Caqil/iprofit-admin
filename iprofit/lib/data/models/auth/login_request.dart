import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'login_request.g.dart';

@HiveType(typeId: 43)
@JsonSerializable()
class LoginRequest extends HiveObject {
  @HiveField(0)
  final String email;

  @HiveField(1)
  final String password;

  @HiveField(2)
  final String userType;

  @HiveField(3)
  final String deviceId;

  @HiveField(4)
  final String fingerprint;

  @HiveField(5)
  final String? twoFactorToken;

  @HiveField(6)
  final bool rememberMe;

  @HiveField(7)
  final Map<String, dynamic>? deviceInfo;

  LoginRequest({
    required this.email,
    required this.password,
    this.userType = 'user',
    required this.deviceId,
    required this.fingerprint,
    this.twoFactorToken,
    this.rememberMe = false,
    this.deviceInfo,
  });

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);

  bool get isValidEmail => email.contains('@') && email.contains('.');
  bool get isValidPassword => password.length >= 6;
  bool get hasTwoFactor => twoFactorToken != null && twoFactorToken!.isNotEmpty;
  bool get isUserLogin => userType.toLowerCase() == 'user';
  bool get isAdminLogin => userType.toLowerCase() == 'admin';
}

