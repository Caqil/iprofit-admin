class ApiConstants {
  static const String baseUrl = 'http://localhost:3000';

  // Auth endpoints
  static const String login = '/api/auth/login';
  static const String signup = '/api/auth/signup';
  static const String refresh = '/api/auth/refresh';
  static const String logout = '/api/auth/logout';

  // User endpoints
  static const String profile = '/api/users';
  static const String kyc = '/api/users/{id}/kyc';
  static const String userTransactions = '/api/users/{id}/transactions';

  // Transaction endpoints
  static const String transactions = '/api/transactions';
  static const String deposits = '/api/transactions/deposits';
  static const String withdrawals = '/api/transactions/withdrawals';
  static const String gateways = '/api/transactions/gateways';

  // Loan endpoints
  static const String loans = '/api/loans';
  static const String emiCalculator = '/api/loans/emi-calculator';
  static const String repayment = '/api/loans/{id}/repayment';

  // Other endpoints
  static const String plans = '/api/plans';
  static const String notifications = '/api/notifications';
  static const String support = '/api/support/tickets';
  static const String news = '/api/news';
  static const String referrals = '/api/referrals';
  static const String dashboard = '/api/dashboard/metrics';
  static const String upload = '/api/upload';
}
