// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_request.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class SignupRequestAdapter extends TypeAdapter<SignupRequest> {
  @override
  final int typeId = 48;

  @override
  SignupRequest read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SignupRequest(
      name: fields[0] as String,
      email: fields[1] as String,
      phone: fields[2] as String,
      password: fields[3] as String,
      confirmPassword: fields[4] as String,
      deviceId: fields[5] as String,
      fingerprint: fields[6] as String,
      planId: fields[7] as String?,
      referralCode: fields[8] as String?,
      dateOfBirth: fields[9] as DateTime?,
      address: fields[10] as Address?,
      agreeToTerms: fields[11] as bool,
      subscribeToNewsletter: fields[12] as bool,
      additionalInfo: (fields[13] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, SignupRequest obj) {
    writer
      ..writeByte(14)
      ..writeByte(0)
      ..write(obj.name)
      ..writeByte(1)
      ..write(obj.email)
      ..writeByte(2)
      ..write(obj.phone)
      ..writeByte(3)
      ..write(obj.password)
      ..writeByte(4)
      ..write(obj.confirmPassword)
      ..writeByte(5)
      ..write(obj.deviceId)
      ..writeByte(6)
      ..write(obj.fingerprint)
      ..writeByte(7)
      ..write(obj.planId)
      ..writeByte(8)
      ..write(obj.referralCode)
      ..writeByte(9)
      ..write(obj.dateOfBirth)
      ..writeByte(10)
      ..write(obj.address)
      ..writeByte(11)
      ..write(obj.agreeToTerms)
      ..writeByte(12)
      ..write(obj.subscribeToNewsletter)
      ..writeByte(13)
      ..write(obj.additionalInfo);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignupRequestAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class AddressAdapter extends TypeAdapter<Address> {
  @override
  final int typeId = 49;

  @override
  Address read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Address(
      street: fields[0] as String,
      city: fields[1] as String,
      state: fields[2] as String,
      country: fields[3] as String,
      zipCode: fields[4] as String,
      apartment: fields[5] as String?,
      landmark: fields[6] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, Address obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.street)
      ..writeByte(1)
      ..write(obj.city)
      ..writeByte(2)
      ..write(obj.state)
      ..writeByte(3)
      ..write(obj.country)
      ..writeByte(4)
      ..write(obj.zipCode)
      ..writeByte(5)
      ..write(obj.apartment)
      ..writeByte(6)
      ..write(obj.landmark);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AddressAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SignupRequest _$SignupRequestFromJson(Map<String, dynamic> json) =>
    SignupRequest(
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
      password: json['password'] as String,
      confirmPassword: json['confirmPassword'] as String,
      deviceId: json['deviceId'] as String,
      fingerprint: json['fingerprint'] as String,
      planId: json['planId'] as String?,
      referralCode: json['referralCode'] as String?,
      dateOfBirth: json['dateOfBirth'] == null
          ? null
          : DateTime.parse(json['dateOfBirth'] as String),
      address: json['address'] == null
          ? null
          : Address.fromJson(json['address'] as Map<String, dynamic>),
      agreeToTerms: json['agreeToTerms'] as bool? ?? false,
      subscribeToNewsletter: json['subscribeToNewsletter'] as bool? ?? false,
      additionalInfo: json['additionalInfo'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$SignupRequestToJson(SignupRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'email': instance.email,
      'phone': instance.phone,
      'password': instance.password,
      'confirmPassword': instance.confirmPassword,
      'deviceId': instance.deviceId,
      'fingerprint': instance.fingerprint,
      'planId': instance.planId,
      'referralCode': instance.referralCode,
      'dateOfBirth': instance.dateOfBirth?.toIso8601String(),
      'address': instance.address,
      'agreeToTerms': instance.agreeToTerms,
      'subscribeToNewsletter': instance.subscribeToNewsletter,
      'additionalInfo': instance.additionalInfo,
    };

Address _$AddressFromJson(Map<String, dynamic> json) => Address(
      street: json['street'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      country: json['country'] as String,
      zipCode: json['zipCode'] as String,
      apartment: json['apartment'] as String?,
      landmark: json['landmark'] as String?,
    );

Map<String, dynamic> _$AddressToJson(Address instance) => <String, dynamic>{
      'street': instance.street,
      'city': instance.city,
      'state': instance.state,
      'country': instance.country,
      'zipCode': instance.zipCode,
      'apartment': instance.apartment,
      'landmark': instance.landmark,
    };
