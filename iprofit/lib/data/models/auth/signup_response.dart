import 'package:hive/hive.dart';
import 'package:iprofit/data/models/auth/login_response.dart';
import 'package:json_annotation/json_annotation.dart';
part 'signup_response.g.dart';

@HiveType(typeId: 50)
@JsonSerializable()
class SignupResponse extends HiveObject {
  @HiveField(0)
  final bool success;

  @HiveField(1)
  final UserInfo user;

  @HiveField(2)
  final String message;

  @HiveField(3)
  final String? verificationToken;

  @HiveField(4)
  final bool requiresVerification;

  @HiveField(5)
  final List<String>? nextSteps;

  SignupResponse({
    required this.success,
    required this.user,
    required this.message,
    this.verificationToken,
    this.requiresVerification = true,
    this.nextSteps,
  });

  factory SignupResponse.fromJson(Map<String, dynamic> json) =>
      _$SignupResponseFromJson(json);
  Map<String, dynamic> toJson() => _$SignupResponseToJson(this);

  bool get needsEmailVerification =>
      requiresVerification && !user.emailVerified;
  bool get needsPhoneVerification =>
      requiresVerification && !user.phoneVerified;
}
