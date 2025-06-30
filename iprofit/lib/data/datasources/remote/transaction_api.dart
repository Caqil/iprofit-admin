import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/transaction/transaction_model.dart';
import '../../models/transaction/deposit_request.dart';
import '../../models/transaction/withdrawal_request.dart';

part 'transaction_api.g.dart';

@RestApi(baseUrl: ApiConstants.baseUrl)
abstract class TransactionApi {
  factory TransactionApi(Dio dio, {String baseUrl}) = _TransactionApi;

  @GET(ApiConstants.transactions)
  Future<Map<String, dynamic>> getTransactions({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('type') String? type,
    @Query('status') String? status,
    @Query('userId') String? userId,
    @Query('dateFrom') String? dateFrom,
    @Query('dateTo') String? dateTo,
  });

  @GET('/api/transactions/{id}')
  Future<TransactionModel> getTransactionDetails(
    @Path('id') String transactionId,
  );

  @POST(ApiConstants.deposits)
  Future<Map<String, dynamic>> createDeposit(@Body() DepositRequest request);

  @POST(ApiConstants.withdrawals)
  Future<Map<String, dynamic>> createWithdrawal(
    @Body() WithdrawalRequest request,
  );

  @GET('/api/transactions/deposits')
  Future<Map<String, dynamic>> getDeposits({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
    @Query('gateway') String? gateway,
  });

  @GET('/api/transactions/withdrawals')
  Future<Map<String, dynamic>> getWithdrawals({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('status') String? status,
    @Query('method') String? method,
  });

  @GET(ApiConstants.gateways)
  Future<Map<String, dynamic>> getPaymentGateways({
    @Query('type') String? type,
    @Query('isActive') bool? isActive,
  });

  @POST('/api/transactions/verify-payment')
  Future<Map<String, dynamic>> verifyPayment(@Body() Map<String, dynamic> data);

  @POST('/api/transactions/{id}/cancel')
  Future<Map<String, dynamic>> cancelTransaction(
    @Path('id') String transactionId,
  );

  @GET('/api/transactions/summary')
  Future<Map<String, dynamic>> getTransactionSummary({
    @Query('period') String? period,
    @Query('currency') String? currency,
  });

  @GET('/api/transactions/analytics')
  Future<Map<String, dynamic>> getTransactionAnalytics({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
    @Query('type') String? type,
  });

  @POST('/api/transactions/approve')
  Future<Map<String, dynamic>> approveTransaction(
    @Body() Map<String, dynamic> data,
  );

  @POST('/api/transactions/reject')
  Future<Map<String, dynamic>> rejectTransaction(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/transactions/limits')
  Future<Map<String, dynamic>> getTransactionLimits();

  @GET('/api/transactions/fees')
  Future<Map<String, dynamic>> getTransactionFees({
    @Query('type') String? type,
    @Query('gateway') String? gateway,
    @Query('amount') double? amount,
  });

  @POST('/api/transactions/calculate-fee')
  Future<Map<String, dynamic>> calculateTransactionFee(
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/transactions/export')
  Future<Map<String, dynamic>> exportTransactions({
    @Query('format') String? format,
    @Query('dateFrom') String? dateFrom,
    @Query('dateTo') String? dateTo,
    @Query('type') String? type,
  });

  @POST('/api/transactions/webhook')
  Future<Map<String, dynamic>> handleWebhook(@Body() Map<String, dynamic> data);

  @GET('/api/transactions/receipt/{id}')
  Future<Map<String, dynamic>> getTransactionReceipt(
    @Path('id') String transactionId,
  );

  @POST('/api/transactions/{id}/dispute')
  Future<Map<String, dynamic>> createDispute(
    @Path('id') String transactionId,
    @Body() Map<String, dynamic> data,
  );

  @GET('/api/transactions/pending-review')
  Future<Map<String, dynamic>> getPendingReviewTransactions({
    @Query('page') int? page,
    @Query('limit') int? limit,
  });
}
