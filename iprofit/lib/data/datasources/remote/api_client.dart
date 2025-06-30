import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../../services/storage_service.dart';
import '../../../services/device_service.dart';

part 'api_client.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  static ApiClient create() {
    final dio = Dio();

    // Configure timeouts
    dio.options.connectTimeout = const Duration(seconds: 30);
    dio.options.receiveTimeout = const Duration(seconds: 30);
    dio.options.sendTimeout = const Duration(seconds: 30);

    // Add interceptors
    dio.interceptors.addAll([
      _AuthInterceptor(),
      _DeviceInterceptor(),
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
      ),
    ]);

    return ApiClient(dio);
  }
}

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = StorageService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired, try to refresh
      final refreshToken = StorageService.getRefreshToken();
      if (refreshToken != null) {
        try {
          // TODO: Implement token refresh logic
          // For now, just clear tokens and redirect to login
          await StorageService.clearAuthTokens();
        } catch (e) {
          await StorageService.clearAuthTokens();
        }
      }
    }
    handler.next(err);
  }
}

class _DeviceInterceptor extends Interceptor {
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final deviceId = await DeviceService.getDeviceId();
    final fingerprint = await DeviceService.generateFingerprint();

    options.headers['x-device-id'] = deviceId;
    options.headers['x-fingerprint'] = fingerprint;

    handler.next(options);
  }
}
