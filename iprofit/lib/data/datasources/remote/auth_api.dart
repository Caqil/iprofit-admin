import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/auth/login_request.dart';
import '../../models/auth/login_response.dart';
import '../../models/auth/signup_request.dart';
import '../../models/auth/signup_response.dart';

part 'auth_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class AuthApi {
  factory AuthApi(Dio dio, {String baseUrl}) = _AuthApi;

  @POST(ApiConstants.login)
  Future<LoginResponse> login(@Body() LoginRequest request);

  @POST(ApiConstants.signup)
  Future<SignupResponse> signup(@Body() SignupRequest request);

  @POST(ApiConstants.refresh)
  Future<Map<String, dynamic>> refreshToken(@Body() Map<String, dynamic> data);

  @POST(ApiConstants.logout)
  Future<Map<String, dynamic>> logout();

  @POST('/api/auth/reset-password')
  Future<Map<String, dynamic>> resetPassword(@Body() Map<String, dynamic> data);

  @POST('/api/auth/verify-email')
  Future<Map<String, dynamic>> verifyEmail(@Body() Map<String, dynamic> data);

  @POST('/api/auth/verify-phone')
  Future<Map<String, dynamic>> verifyPhone(@Body() Map<String, dynamic> data);

  @GET('/api/auth/session')
  Future<Map<String, dynamic>> checkSession();

  @POST('/api/auth/resend-verification')
  Future<Map<String, dynamic>> resendVerification(
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/auth/change-password')
  Future<Map<String, dynamic>> changePassword(
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/auth/enable-2fa')
  Future<Map<String, dynamic>> enableTwoFactor(
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/auth/disable-2fa')
  Future<Map<String, dynamic>> disableTwoFactor(
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/auth/verify-2fa')
  Future<Map<String, dynamic>> verifyTwoFactor(
    @Body() Map<String, dynamic> data,
  );
}
