import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/dashboard/dashboard_metrics.dart';

part 'dashboard_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class DashboardApi {
  factory DashboardApi(Dio dio, {String baseUrl}) = _DashboardApi;

  @GET(ApiConstants.dashboard)
  Future<DashboardMetrics> getDashboardMetrics({
    @Query('dateRange') String? dateRange,
    @Query('currency') String? currency,
  });

  @GET('/api/dashboard/overview')
  Future<Map<String, dynamic>> getDashboardOverview();

  @GET('/api/dashboard/balance-history')
  Future<Map<String, dynamic>> getBalanceHistory({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('dateFrom') String? dateFrom,
    @Query('dateTo') String? dateTo,
  });

  @GET('/api/dashboard/analytics/performance')
  Future<Map<String, dynamic>> getPerformanceAnalytics({
    @Query('period') String? period,
  });

  @GET('/api/dashboard/analytics/profit-trend')
  Future<Map<String, dynamic>> getProfitTrend({
    @Query('period') String? period,
    @Query('currency') String? currency,
  });

  @GET('/api/dashboard/quick-stats')
  Future<Map<String, dynamic>> getQuickStats();

  @GET('/api/dashboard/recent-activities')
  Future<Map<String, dynamic>> getRecentActivities({
    @Query('limit') int? limit,
  });

  @GET('/api/dashboard/monthly-summary')
  Future<Map<String, dynamic>> getMonthlySummary({
    @Query('month') String? month,
    @Query('year') String? year,
  });

  @GET('/api/dashboard/profit-analytics')
  Future<Map<String, dynamic>> getProfitAnalytics({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/api/dashboard/investment-overview')
  Future<Map<String, dynamic>> getInvestmentOverview();

  @GET('/api/dashboard/referral-stats')
  Future<Map<String, dynamic>> getReferralStats();
}
