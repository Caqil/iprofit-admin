import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/user/user_model.dart';
import '../../models/user/profile_model.dart';
import '../../models/user/kyc_model.dart';

part 'user_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class UserApi {
  factory UserApi(Dio dio, {String baseUrl}) = _UserApi;

  @GET('/api/users/{id}')
  Future<UserModel> getUserProfile(@Path('id') String userId);

  @PUT('/api/users/{id}')
  Future<UserModel> updateUserProfile(
    @Path('id') String userId,
    @Body() ProfileModel profile,
  );

  @GET('/api/users/{id}/transactions')
  Future<Map<String, dynamic>> getUserTransactions(
    @Path('id') String userId, {
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('type') String? type,
    @Query('status') String? status,
  });

  @GET('/api/users/me')
  Future<UserModel> getMyProfile();

  @PUT('/api/users/me')
  Future<UserModel> updateMyProfile(@Body() ProfileModel profile);

  @POST('/api/users/me/avatar')
  Future<Map<String, dynamic>> uploadAvatar(@Part() MultipartFile file);

  @DELETE('/api/users/me/avatar')
  Future<Map<String, dynamic>> deleteAvatar();

  @PUT('/api/users/me/password')
  Future<Map<String, dynamic>> changePassword(@Body() Map<String, dynamic> data);

  @GET('/api/users/{id}/kyc')
  Future<KycModel> getKycStatus(@Path('id') String userId);

  @POST('/api/users/{id}/kyc')
  Future<KycModel> submitKyc(
    @Path('id') String userId,
    @Body() Map<String, dynamic> data,
  );

  @PUT('/api/users/{id}/kyc')
  Future<KycModel> updateKyc(
    @Path('id') String userId,
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/users/kyc/upload')
  Future<Map<String, dynamic>> uploadKycDocument(
    @Part() MultipartFile file,
    @Part() String documentType,
  );

  @GET('/api/users/me/dashboard')
  Future<Map<String, dynamic>> getUserDashboard({
    @Query('dateRange') String? dateRange,
    @Query('currency') String? currency,
  });

  @GET('/api/users/me/balance')
  Future<Map<String, dynamic>> getUserBalance();

  @GET('/api/users/me/statistics')
  Future<Map<String, dynamic>> getUserStatistics({
    @Query('period') String? period,
  });

  @POST('/api/users/me/verify-email')
  Future<Map<String, dynamic>> verifyEmail(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/verify-phone')
  Future<Map<String, dynamic>> verifyPhone(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/resend-verification')
  Future<Map<String, dynamic>> resendVerification(@Body() Map<String, dynamic> data);

  @GET('/api/users/me/security')
  Future<Map<String, dynamic>> getSecuritySettings();

  @PUT('/api/users/me/security')
  Future<Map<String, dynamic>> updateSecuritySettings(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/2fa/enable')
  Future<Map<String, dynamic>> enableTwoFactor(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/2fa/disable')
  Future<Map<String, dynamic>> disableTwoFactor(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/2fa/verify')
  Future<Map<String, dynamic>> verifyTwoFactor(@Body() Map<String, dynamic> data);

  @GET('/api/users/me/activity-log')
  Future<Map<String, dynamic>> getActivityLog({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('type') String? type,
  });

  @GET('/api/users/me/devices')
  Future<Map<String, dynamic>> getUserDevices();

  @DELETE('/api/users/me/devices/{deviceId}')
  Future<Map<String, dynamic>> removeDevice(@Path('deviceId') String deviceId);

  @POST('/api/users/me/preferences')
  Future<Map<String, dynamic>> updatePreferences(@Body() Map<String, dynamic> preferences);

  @GET('/api/users/me/preferences')
  Future<Map<String, dynamic>> getPreferences();

  @POST('/api/users/me/deactivate')
  Future<Map<String, dynamic>> deactivateAccount(@Body() Map<String, dynamic> data);

  @POST('/api/users/me/delete')
  Future<Map<String, dynamic>> deleteAccount(@Body() Map<String, dynamic> data);

  @GET('/api/users/me/export-data')
  Future<Map<String, dynamic>> exportUserData({
    @Query('format') String? format,
  });

  @POST('/api/users/me/feedback')
  Future<Map<String, dynamic>> submitFeedback(@Body() Map<String, dynamic> feedback);

  @GET('/api/users/search')
  Future<Map<String, dynamic>> searchUsers({
    @Query('query') String? query,
    @Query('page') int? page,
    @Query('limit') int? limit,
  });
}