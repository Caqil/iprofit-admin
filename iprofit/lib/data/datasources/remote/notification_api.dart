import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/notification/notification_model.dart';

part 'notification_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class NotificationApi {
  factory NotificationApi(Dio dio, {String baseUrl}) = _NotificationApi;

  @GET(ApiConstants.notifications)
  Future<Map<String, dynamic>> getNotifications({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('isRead') bool? isRead,
    @Query('type') String? type,
    @Query('priority') String? priority,
  });

  @GET('/api/notifications/{id}')
  Future<NotificationModel> getNotificationDetails(
    @Path('id') String notificationId,
  );

  @PUT('/api/notifications/{id}/read')
  Future<Map<String, dynamic>> markAsRead(@Path('id') String notificationId);

  @PUT('/api/notifications/mark-all-read')
  Future<Map<String, dynamic>> markAllAsRead();

  @DELETE('/api/notifications/{id}')
  Future<Map<String, dynamic>> deleteNotification(
    @Path('id') String notificationId,
  );

  @DELETE('/api/notifications/clear-all')
  Future<Map<String, dynamic>> clearAllNotifications();

  @GET('/api/notifications/unread-count')
  Future<Map<String, dynamic>> getUnreadCount();

  @GET('/api/notifications/types')
  Future<Map<String, dynamic>> getNotificationTypes();

  @POST('/api/notifications/preferences')
  Future<Map<String, dynamic>> updateNotificationPreferences(
    @Body() Map<String, dynamic> preferences,
  );

  @GET('/api/notifications/preferences')
  Future<Map<String, dynamic>> getNotificationPreferences();

  @POST('/api/notifications/device-token')
  Future<Map<String, dynamic>> updateDeviceToken(
    @Body() Map<String, dynamic> data,
  );

  @DELETE('/api/notifications/device-token')
  Future<Map<String, dynamic>> removeDeviceToken();

  @POST('/api/notifications/test')
  Future<Map<String, dynamic>> sendTestNotification(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/notifications/analytics')
  Future<Map<String, dynamic>> getNotificationAnalytics({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @POST('/api/notifications/{id}/action')
  Future<Map<String, dynamic>> handleNotificationAction(
    @Path('id') String notificationId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/notifications/scheduled')
  Future<Map<String, dynamic>> getScheduledNotifications({
    @Query('page') int? page,
    @Query('limit') int? limit,
  });
}
