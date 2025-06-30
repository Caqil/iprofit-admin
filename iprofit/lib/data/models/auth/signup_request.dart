import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';
part 'signup_request.g.dart';

@HiveType(typeId: 48)
@JsonSerializable()
class SignupRequest extends HiveObject {
  @HiveField(0)
  final String name;

  @HiveField(1)
  final String email;

  @HiveField(2)
  final String phone;

  @HiveField(3)
  final String password;

  @HiveField(4)
  final String confirmPassword;

  @HiveField(5)
  final String deviceId;

  @HiveField(6)
  final String fingerprint;

  @HiveField(7)
  final String? planId;

  @HiveField(8)
  final String? referralCode;

  @HiveField(9)
  final DateTime? dateOfBirth;

  @HiveField(10)
  final Address? address;

  @HiveField(11)
  final bool agreeToTerms;

  @HiveField(12)
  final bool subscribeToNewsletter;

  @HiveField(13)
  final Map<String, dynamic>? additionalInfo;

  SignupRequest({
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
    required this.confirmPassword,
    required this.deviceId,
    required this.fingerprint,
    this.planId,
    this.referralCode,
    this.dateOfBirth,
    this.address,
    this.agreeToTerms = false,
    this.subscribeToNewsletter = false,
    this.additionalInfo,
  });

  factory SignupRequest.fromJson(Map<String, dynamic> json) =>
      _$SignupRequestFromJson(json);
  Map<String, dynamic> toJson() => _$SignupRequestToJson(this);

  bool get isValidEmail => email.contains('@') && email.contains('.');
  bool get isValidPassword => password.length >= 8;
  bool get passwordsMatch => password == confirmPassword;
  bool get isValidPhone => phone.length >= 10;
  bool get isValid =>
      isValidEmail &&
      isValidPassword &&
      passwordsMatch &&
      isValidPhone &&
      agreeToTerms &&
      name.trim().isNotEmpty;
  bool get hasReferral => referralCode != null && referralCode!.isNotEmpty;
}

@HiveType(typeId: 49)
@JsonSerializable()
class Address extends HiveObject {
  @HiveField(0)
  final String street;

  @HiveField(1)
  final String city;

  @HiveField(2)
  final String state;

  @HiveField(3)
  final String country;

  @HiveField(4)
  final String zipCode;

  @HiveField(5)
  final String? apartment;

  @HiveField(6)
  final String? landmark;

  Address({
    required this.street,
    required this.city,
    required this.state,
    required this.country,
    required this.zipCode,
    this.apartment,
    this.landmark,
  });

  factory Address.fromJson(Map<String, dynamic> json) =>
      _$AddressFromJson(json);
  Map<String, dynamic> toJson() => _$AddressToJson(this);

  String get fullAddress {
    List<String> parts = [street];
    if (apartment != null) parts.add(apartment!);
    parts.addAll([city, state, country, zipCode]);
    return parts.join(', ');
  }
}
