import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/loan/loan_model.dart';
import '../../models/loan/loan_request.dart';
import '../../models/loan/emi_calculation.dart';

part 'loan_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class LoanApi {
  factory LoanApi(Dio dio, {String baseUrl}) = _LoanApi;

  @GET(ApiConstants.loans)
  Future<Map<String, dynamic>> getLoans({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
    @Query('userId') String? userId,
  });

  @POST(ApiConstants.loans)
  Future<LoanModel> applyForLoan(@Body() LoanRequest request);

  @GET('/api/loans/{id}')
  Future<LoanModel> getLoanDetails(@Path('id') String loanId);

  @POST(ApiConstants.emiCalculator)
  Future<EmiCalculation> calculateEmi(@Body() Map<String, dynamic> data);

  @GET('/api/loans/{id}/repayment')
  Future<Map<String, dynamic>> getRepaymentSchedule(@Path('id') String loanId);

  @POST('/api/loans/{id}/repayment')
  Future<Map<String, dynamic>> recordLoanPayment(
    @Path('id') String loanId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/loans/eligibility')
  Future<Map<String, dynamic>> getLoanEligibility();

  @GET('/api/loans/types')
  Future<Map<String, dynamic>> getLoanTypes();

  @PUT('/api/loans/{id}/status')
  Future<Map<String, dynamic>> updateLoanStatus(
    @Path('id') String loanId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/loans/{id}/documents')
  Future<Map<String, dynamic>> getLoanDocuments(@Path('id') String loanId);

  @POST('/api/loans/{id}/documents')
  Future<Map<String, dynamic>> uploadLoanDocument(
    @Path('id') String loanId,
    @Part() List<MultipartFile> files,
    @Part() Map<String, dynamic> data,
  );

  @GET('/api/loans/my-loans')
  Future<Map<String, dynamic>> getMyLoans({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
  });

  @POST('/api/loans/{id}/prepayment')
  Future<Map<String, dynamic>> calculatePrepayment(
    @Path('id') String loanId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/loans/{id}/payment-history')
  Future<Map<String, dynamic>> getPaymentHistory(
    @Path('id') String loanId,
    @Query('page') int? page,
    @Query('limit') int? limit,
  );
}
