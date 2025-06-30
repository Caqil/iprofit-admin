import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'storage_service.dart';

class DeviceService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  static Future<String> getDeviceId() async {
    String? stored = StorageService.getDeviceId();
    if (stored != null) return stored;

    String deviceId;
    if (defaultTargetPlatform == TargetPlatform.android) {
      final androidInfo = await _deviceInfo.androidInfo;
      deviceId = 'android_${androidInfo.id}';
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      deviceId = 'ios_${iosInfo.identifierForVendor}';
    } else {
      deviceId = 'device_${_generateRandomId()}';
    }

    await StorageService.saveDeviceInfo(
      deviceId: deviceId,
      fingerprint: await generateFingerprint(),
    );

    return deviceId;
  }

  static Future<String> generateFingerprint() async {
    String? stored = StorageService.getFingerprint();
    if (stored != null) return stored;

    Map<String, dynamic> deviceData = {};

    if (defaultTargetPlatform == TargetPlatform.android) {
      final androidInfo = await _deviceInfo.androidInfo;
      deviceData = {
        'platform': 'android',
        'model': androidInfo.model,
        'brand': androidInfo.brand,
        'manufacturer': androidInfo.manufacturer,
        'product': androidInfo.product,
        'device': androidInfo.device,
        'board': androidInfo.board,
        'hardware': androidInfo.hardware,
        'fingerprint': androidInfo.fingerprint,
      };
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      deviceData = {
        'platform': 'ios',
        'model': iosInfo.model,
        'name': iosInfo.name,
        'systemName': iosInfo.systemName,
        'systemVersion': iosInfo.systemVersion,
        'localizedModel': iosInfo.localizedModel,
        'identifierForVendor': iosInfo.identifierForVendor,
      };
    }

    final jsonString = jsonEncode(deviceData);
    final bytes = utf8.encode(jsonString);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  static String _generateRandomId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random();
    return List.generate(
      16,
      (index) => chars[random.nextInt(chars.length)],
    ).join();
  }
}
