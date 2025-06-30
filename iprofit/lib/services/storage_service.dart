import 'package:hive_flutter/hive_flutter.dart';
import '../core/constants/storage_keys.dart';

class StorageService {
  static Box get _authBox => Hive.box(StorageKeys.authBox);
  static Box get _userBox => Hive.box(StorageKeys.userBox);
  static Box get _appDataBox => Hive.box(StorageKeys.appDataBox);
  static Box get _cacheBox => Hive.box(StorageKeys.cacheBox);

  // Auth methods
  static Future<void> saveAuthTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _authBox.put(StorageKeys.accessToken, accessToken);
    if (refreshToken != null) {
      await _authBox.put(StorageKeys.refreshToken, refreshToken);
    }
  }

  static String? getAccessToken() {
    return _authBox.get(StorageKeys.accessToken);
  }

  static String? getRefreshToken() {
    return _authBox.get(StorageKeys.refreshToken);
  }

  static Future<void> clearAuthTokens() async {
    await _authBox.delete(StorageKeys.accessToken);
    await _authBox.delete(StorageKeys.refreshToken);
  }

  static Future<void> saveDeviceInfo({
    required String deviceId,
    required String fingerprint,
  }) async {
    await _authBox.put(StorageKeys.deviceId, deviceId);
    await _authBox.put(StorageKeys.fingerprint, fingerprint);
  }

  static String? getDeviceId() {
    return _authBox.get(StorageKeys.deviceId);
  }

  static String? getFingerprint() {
    return _authBox.get(StorageKeys.fingerprint);
  }

  // User methods
  static Future<void> saveUserProfile(Map<String, dynamic> profile) async {
    await _userBox.put(StorageKeys.userProfile, profile);
  }

  static Map<String, dynamic>? getUserProfile() {
    return _userBox.get(StorageKeys.userProfile);
  }

  static Future<void> clearUserData() async {
    await _userBox.clear();
  }

  // App data methods
  static Future<void> saveAppData(String key, dynamic data) async {
    await _appDataBox.put(key, data);
  }

  static T? getAppData<T>(String key) {
    return _appDataBox.get(key);
  }

  static Future<void> clearAppData() async {
    await _appDataBox.clear();
  }

  // Cache methods
  static Future<void> saveToCache(String key, dynamic data) async {
    await _cacheBox.put(key, {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  static T? getFromCache<T>(String key, {int validityHours = 24}) {
    final cached = _cacheBox.get(key);
    if (cached == null) return null;

    final timestamp = cached['timestamp'] as int;
    final now = DateTime.now().millisecondsSinceEpoch;
    final validityMs = validityHours * 60 * 60 * 1000;

    if (now - timestamp > validityMs) {
      _cacheBox.delete(key);
      return null;
    }

    return cached['data'] as T;
  }

  static Future<void> clearCache() async {
    await _cacheBox.clear();
  }

  static Future<void> clearAll() async {
    await Future.wait([
      _authBox.clear(),
      _userBox.clear(),
      _appDataBox.clear(),
      _cacheBox.clear(),
    ]);
  }

  // Onboarding
  static Future<void> setOnboardingCompleted() async {
    await _authBox.put(StorageKeys.isOnboardingCompleted, true);
  }

  static bool isOnboardingCompleted() {
    return _authBox.get(StorageKeys.isOnboardingCompleted, defaultValue: false);
  }
}
