import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/news/news_model.dart';

part 'news_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class NewsApi {
  factory NewsApi(Dio dio, {String baseUrl}) = _NewsApi;

  @GET(ApiConstants.news)
  Future<Map<String, dynamic>> getNews({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('category') String? category,
    @Query('featured') bool? featured,
    @Query('published') bool? published,
  });

  @GET('/api/news/{id}')
  Future<NewsModel> getNewsDetails(@Path('id') String newsId);

  @GET('/api/news/categories')
  Future<Map<String, dynamic>> getNewsCategories();

  @GET('/api/news/featured')
  Future<Map<String, dynamic>> getFeaturedNews({@Query('limit') int? limit});

  @GET('/api/news/latest')
  Future<Map<String, dynamic>> getLatestNews({
    @Query('limit') int? limit,
    @Query('category') String? category,
  });

  @GET('/api/news/trending')
  Future<Map<String, dynamic>> getTrendingNews({@Query('limit') int? limit});

  @GET('/api/news/search')
  Future<Map<String, dynamic>> searchNews({
    @Query('q') required String query,
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('category') String? category,
  });

  @POST('/api/news/{id}/view')
  Future<Map<String, dynamic>> markNewsAsViewed(@Path('id') String newsId);

  @GET('/api/news/{id}/related')
  Future<Map<String, dynamic>> getRelatedNews(
    @Path('id') String newsId,
    @Query('limit') int? limit,
  );

  @POST('/api/news/{id}/bookmark')
  Future<Map<String, dynamic>> bookmarkNews(@Path('id') String newsId);

  @DELETE('/api/news/{id}/bookmark')
  Future<Map<String, dynamic>> removeBookmark(@Path('id') String newsId);

  @GET('/api/news/bookmarks')
  Future<Map<String, dynamic>> getBookmarkedNews({
    @Query('page') int? page,
    @Query('limit') int? limit,
  });

  @POST('/api/news/{id}/share')
  Future<Map<String, dynamic>> shareNews(
    @Path('id') String newsId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/news/analytics')
  Future<Map<String, dynamic>> getNewsAnalytics({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });
}
