import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/plan/plan_model.dart';

part 'plan_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class PlanApi {
  factory PlanApi(Dio dio, {String baseUrl}) = _PlanApi;

  @GET(ApiConstants.plans)
  Future<Map<String, dynamic>> getPlans({
    @Query('isActive') bool? isActive,
    @Query('page') int? page,
    @Query('limit') int? limit,
  });

  @GET('/api/plans/{id}')
  Future<PlanModel> getPlanDetails(@Path('id') String planId);

  @GET('/api/plans/featured')
  Future<Map<String, dynamic>> getFeaturedPlans({@Query('limit') int? limit});

  @GET('/api/plans/recommended')
  Future<Map<String, dynamic>> getRecommendedPlans({
    @Query('userType') String? userType,
    @Query('balance') double? balance,
  });

  @POST('/api/plans/{id}/subscribe')
  Future<Map<String, dynamic>> subscribeToPlan(
    @Path('id') String planId,
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/plans/upgrade')
  Future<Map<String, dynamic>> upgradePlan(@Body() Map<String, dynamic> data);

  @POST('/api/plans/downgrade')
  Future<Map<String, dynamic>> downgradePlan(@Body() Map<String, dynamic> data);

  @GET('/api/plans/my-plan')
  Future<Map<String, dynamic>> getMyCurrentPlan();

  @GET('/api/plans/history')
  Future<Map<String, dynamic>> getPlanHistory({
    @Query('page') int? page,
    @Query('limit') int? limit,
  });

  @GET('/api/plans/comparison')
  Future<Map<String, dynamic>> getPlansComparison({
    @Query('planIds') List<String>? planIds,
  });

  @POST('/api/plans/{id}/calculate-upgrade')
  Future<Map<String, dynamic>> calculateUpgradeCost(
    @Path('id') String planId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/plans/benefits')
  Future<Map<String, dynamic>> getPlanBenefits({
    @Query('planId') String? planId,
  });

  @GET('/api/plans/eligibility')
  Future<Map<String, dynamic>> getPlanEligibility({
    @Query('planId') String? planId,
  });

  @POST('/api/plans/{id}/preview')
  Future<Map<String, dynamic>> previewPlanBenefits(
    @Path('id') String planId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/plans/analytics')
  Future<Map<String, dynamic>> getPlanAnalytics({
    @Query('planId') String? planId,
    @Query('period') String? period,
  });

  @POST('/api/plans/feedback')
  Future<Map<String, dynamic>> submitPlanFeedback(
    @Body() Map<String, dynamic> feedback,
  );
}
