import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/support/ticket_model.dart';
import '../../models/support/ticket_request.dart';

part 'support_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class SupportApi {
  factory SupportApi(Dio dio, {String baseUrl}) = _SupportApi;

  @GET(ApiConstants.support)
  Future<Map<String, dynamic>> getTickets({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
    @Query('category') String? category,
    @Query('priority') String? priority,
  });

  @POST(ApiConstants.support)
  Future<TicketModel> createTicket(@Body() TicketRequest request);

  @GET('/api/support/tickets/{id}')
  Future<TicketModel> getTicketDetails(@Path('id') String ticketId);

  @POST('/api/support/tickets/{id}/reply')
  Future<Map<String, dynamic>> replyToTicket(
    @Path('id') String ticketId,
    @Body() Map<String, dynamic> data,
  );

  @PUT('/api/support/tickets/{id}/close')
  Future<Map<String, dynamic>> closeTicket(@Path('id') String ticketId);

  @PUT('/api/support/tickets/{id}/reopen')
  Future<Map<String, dynamic>> reopenTicket(@Path('id') String ticketId);

  @POST('/api/support/tickets/{id}/rate')
  Future<Map<String, dynamic>> rateTicket(
    @Path('id') String ticketId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/support/categories')
  Future<Map<String, dynamic>> getSupportCategories();

  @GET('/api/support/faq')
  Future<Map<String, dynamic>> getFAQ({
    @Query('category') String? category,
    @Query('limit') int? limit,
    @Query('search') String? search,
  });

  @GET('/api/support/faq/{id}')
  Future<Map<String, dynamic>> getFAQDetails(@Path('id') String faqId);

  @POST('/api/support/faq/{id}/helpful')
  Future<Map<String, dynamic>> markFAQHelpful(@Path('id') String faqId);

  @GET('/api/support/contact-info')
  Future<Map<String, dynamic>> getContactInfo();

  @POST('/api/support/feedback')
  Future<Map<String, dynamic>> submitFeedback(
    @Body() Map<String, dynamic> feedback,
  );

  @POST('/api/support/tickets/{id}/escalate')
  Future<Map<String, dynamic>> escalateTicket(
    @Path('id') String ticketId,
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/support/tickets/{id}/attachment')
  Future<Map<String, dynamic>> uploadAttachment(
    @Path('id') String ticketId,
    @Part() List<MultipartFile> files,
  );

  @GET('/api/support/tickets/{id}/history')
  Future<Map<String, dynamic>> getTicketHistory(@Path('id') String ticketId);

  @GET('/api/support/my-tickets')
  Future<Map<String, dynamic>> getMyTickets({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
  });

  @GET('/api/support/priority-levels')
  Future<Map<String, dynamic>> getPriorityLevels();

  @POST('/api/support/live-chat')
  Future<Map<String, dynamic>> startLiveChat(@Body() Map<String, dynamic> data);

  @GET('/api/support/knowledge-base')
  Future<Map<String, dynamic>> getKnowledgeBase({
    @Query('category') String? category,
    @Query('search') String? search,
    @Query('page') int? page,
    @Query('limit') int? limit,
  });

  @GET('/api/support/status')
  Future<Map<String, dynamic>> getSupportStatus();
}
