class AppConstants {
  static const String appName = 'IProfit';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;

  // Cache Configuration
  static const int cacheValidityHours = 24;
  static const int maxCacheSize = 50; // MB

  // UI Configuration
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 12.0;
  static const double cardElevation = 2.0;

  // Validation
  static const int minPasswordLength = 8;
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB

  // Supported currencies
  static const List<String> supportedCurrencies = ['BDT', 'USD'];

  // Transaction types
  static const List<String> transactionTypes = [
    'deposit',
    'withdrawal',
    'bonus',
    'profit',
    'penalty',
    'loan_repayment',
  ];

  // KYC document types
  static const List<String> kycDocumentTypes = [
    'national_id',
    'passport',
    'driving_license',
    'utility_bill',
    'bank_statement',
  ];
}
