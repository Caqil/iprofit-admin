import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/referral/referral_model.dart';

part 'referral_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class ReferralApi {
  factory ReferralApi(Dio dio, {String baseUrl}) = _ReferralApi;

  @GET(ApiConstants.referrals)
  Future<Map<String, dynamic>> getReferrals({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('type') String? type,
    @Query('status') String? status,
  });

  @GET('/api/referrals/overview')
  Future<Map<String, dynamic>> getReferralOverview();

  @GET('/api/referrals/code')
  Future<Map<String, dynamic>> getReferralCode();

  @POST('/api/referrals/generate-code')
  Future<Map<String, dynamic>> generateNewReferralCode();

  @GET('/api/referrals/link')
  Future<Map<String, dynamic>> getReferralLink();

  @GET('/api/referrals/earnings')
  Future<Map<String, dynamic>> getReferralEarnings({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
    @Query('dateFrom') String? dateFrom,
    @Query('dateTo') String? dateTo,
  });

  @GET('/api/referrals/statistics')
  Future<Map<String, dynamic>> getReferralStatistics({
    @Query('period') String? period,
  });

  @POST('/api/referrals/invite')
  Future<Map<String, dynamic>> sendReferralInvite(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/referrals/levels')
  Future<Map<String, dynamic>> getReferralLevels();

  @GET('/api/referrals/commission-structure')
  Future<Map<String, dynamic>> getCommissionStructure();

  @POST('/api/referrals/claim-bonus')
  Future<Map<String, dynamic>> claimReferralBonus(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/referrals/pending-bonuses')
  Future<Map<String, dynamic>> getPendingBonuses();

  @GET('/api/referrals/analytics')
  Future<Map<String, dynamic>> getReferralAnalytics({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/api/referrals/leaderboard')
  Future<Map<String, dynamic>> getReferralLeaderboard({
    @Query('period') String? period,
    @Query('limit') int? limit,
  });

  @POST('/api/referrals/track-click')
  Future<Map<String, dynamic>> trackReferralClick(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/referrals/performance')
  Future<Map<String, dynamic>> getReferralPerformance({
    @Query('month') String? month,
    @Query('year') String? year,
  });

  @POST('/api/referrals/social-share')
  Future<Map<String, dynamic>> shareReferralOnSocial(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/referrals/share-templates')
  Future<Map<String, dynamic>> getShareTemplates();
}
