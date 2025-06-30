import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:iprofit/data/models/auth/login_request.dart';
import 'package:iprofit/data/models/auth/login_response.dart';
import 'package:iprofit/data/models/auth/signup_request.dart';
import 'package:iprofit/data/models/auth/signup_response.dart';
import 'package:iprofit/data/models/dashboard/dashboard_metrics.dart';
import 'package:iprofit/data/models/loan/emi_calculation.dart';
import 'package:iprofit/data/models/loan/loan_model.dart';
import 'package:iprofit/data/models/loan/loan_request.dart';
import 'package:iprofit/data/models/news/news_model.dart';
import 'package:iprofit/data/models/notification/notification_model.dart';
import 'package:iprofit/data/models/plan/plan_model.dart';
import 'package:iprofit/data/models/referral/referral_model.dart';
import 'package:iprofit/data/models/support/ticket_model.dart';
import 'package:iprofit/data/models/transaction/transaction_model.dart';
import 'package:iprofit/data/models/user/profile_model.dart';
import 'package:iprofit/data/models/user/user_model.dart'
    show UserLimitsAdapter, UserModelAdapter;
import 'package:logger/logger.dart';
import 'app.dart';
import 'core/constants/storage_keys.dart';
import 'data/datasources/local/hive_adapters.dart';
import 'services/storage_service.dart';

final logger = Logger();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  try {
    // Initialize Hive
    await Hive.initFlutter();
    await registerHiveAdapters();
    await initializeHiveBoxes();

    logger.i('App initialized successfully');
  } catch (e, stackTrace) {
    logger.e('Failed to initialize app', error: e, stackTrace: stackTrace);
  }

  runApp(const ProviderScope(child: IProfitApp()));
}

Future<void> registerHiveAdapters() async {
  // EMI and Loan Models (TypeIds: 10-17)
  Hive.registerAdapter(EmiCalculationAdapter()); // TypeId: 10
  Hive.registerAdapter(EmiScheduleAdapter()); // TypeId: 11
  Hive.registerAdapter(LoanModelAdapter()); // TypeId: 12
  Hive.registerAdapter(LoanPersonalDetailsAdapter()); // TypeId: 13
  Hive.registerAdapter(LoanEmploymentDetailsAdapter()); // TypeId: 14
  Hive.registerAdapter(LoanFinancialDetailsAdapter()); // TypeId: 15
  Hive.registerAdapter(LoanRequestAdapter()); // TypeId: 16
  Hive.registerAdapter(LoanDocumentAdapter()); // TypeId: 17

  // Transaction Models (TypeIds: 18-21)
  Hive.registerAdapter(TransactionModelAdapter()); // TypeId: 18
  Hive.registerAdapter(DepositRequestAdapter()); // TypeId: 19
  Hive.registerAdapter(WithdrawalRequestAdapter()); // TypeId: 20
  Hive.registerAdapter(AccountDetailsAdapter()); // TypeId: 21

  // Support Models (TypeIds: 22-25)
  Hive.registerAdapter(TicketModelAdapter()); // TypeId: 22
  Hive.registerAdapter(TicketRequestAdapter()); // TypeId: 23
  Hive.registerAdapter(TicketReplyAdapter()); // TypeId: 24
  Hive.registerAdapter(TicketAttachmentAdapter()); // TypeId: 25

  // Referral Models (TypeIds: 26-29)
  Hive.registerAdapter(ReferralModelAdapter()); // TypeId: 26
  Hive.registerAdapter(ReferralUserAdapter()); // TypeId: 27
  Hive.registerAdapter(ReferralEarningAdapter()); // TypeId: 28
  Hive.registerAdapter(ReferralSettingsAdapter()); // TypeId: 29

  // Plan Models (TypeIds: 30-32)
  Hive.registerAdapter(PlanModelAdapter()); // TypeId: 30
  Hive.registerAdapter(PlanLimitsAdapter()); // TypeId: 31
  Hive.registerAdapter(PlanBenefitsAdapter()); // TypeId: 32

  // Notification Models (TypeIds: 33-34)
  Hive.registerAdapter(NotificationModelAdapter()); // TypeId: 33
  Hive.registerAdapter(NotificationSettingsAdapter()); // TypeId: 34

  // Dashboard Models (TypeIds: 35-42)
  Hive.registerAdapter(DashboardMetricsAdapter()); // TypeId: 35
  Hive.registerAdapter(QuickActionAdapter()); // TypeId: 36
  Hive.registerAdapter(BalanceBreakdownAdapter()); // TypeId: 37
  Hive.registerAdapter(BalanceItemAdapter()); // TypeId: 38
  Hive.registerAdapter(ChartDataAdapter()); // TypeId: 39
  Hive.registerAdapter(UserStatsAdapter()); // TypeId: 40
  Hive.registerAdapter(AchievementAdapter()); // TypeId: 41
  Hive.registerAdapter(PortfolioPerformanceAdapter()); // TypeId: 42

  // Authentication Models (TypeIds: 43-50)
  Hive.registerAdapter(LoginRequestAdapter()); // TypeId: 43
  Hive.registerAdapter(LoginResponseAdapter()); // TypeId: 44
  Hive.registerAdapter(UserInfoAdapter()); // TypeId: 45
  Hive.registerAdapter(AuthTokensAdapter()); // TypeId: 46
  Hive.registerAdapter(UserPreferencesAdapter()); // TypeId: 47
  Hive.registerAdapter(SignupRequestAdapter()); // TypeId: 48
  Hive.registerAdapter(AddressAdapter()); // TypeId: 49
  Hive.registerAdapter(SignupResponseAdapter()); // TypeId: 50

  // News Models (TypeIds: 51-54)
  Hive.registerAdapter(NewsModelAdapter()); // TypeId: 51
  Hive.registerAdapter(NewsAttachmentAdapter()); // TypeId: 52
  Hive.registerAdapter(NewsMetadataAdapter()); // TypeId: 53
  Hive.registerAdapter(NewsCommentAdapter()); // TypeId: 54

  // User & Profile Models (TypeIds: 55-67)
  Hive.registerAdapter(UserModelAdapter()); // TypeId: 55
  Hive.registerAdapter(UserPreferencesAdapter()); // TypeId: 56
  Hive.registerAdapter(UserLimitsAdapter()); // TypeId: 57
  Hive.registerAdapter(UserStatsAdapter()); // TypeId: 58
  Hive.registerAdapter(ProfileModelAdapter()); // TypeId: 59
  Hive.registerAdapter(KycModelAdapter()); // TypeId: 60
  Hive.registerAdapter(KycDocumentAdapter()); // TypeId: 61
  Hive.registerAdapter(PersonalInfoAdapter()); // TypeId: 62
  Hive.registerAdapter(ContactInfoAdapter()); // TypeId: 63
  Hive.registerAdapter(EmergencyContactAdapter()); // TypeId: 64
  Hive.registerAdapter(SocialLinksAdapter()); // TypeId: 65
  Hive.registerAdapter(PrivacySettingsAdapter()); // TypeId: 66
  Hive.registerAdapter(KycPersonalInfoAdapter()); // TypeId: 67

  print('✅ All Hive adapters registered successfully');
}

Future<void> initializeHiveBoxes() async {
  await Future.wait([
    Hive.openBox(StorageKeys.userBox),
    Hive.openBox(StorageKeys.authBox),
    Hive.openBox(StorageKeys.appDataBox),
    Hive.openBox(StorageKeys.cacheBox),
  ]);
}
