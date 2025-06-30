import 'package:equatable/equatable.dart';

/// Base class for all failures
/// Used in clean architecture to represent errors in a type-safe way
abstract class Failure extends Equatable {
  const Failure({
    required this.message,
    this.code,
    this.details,
    this.timestamp,
  });

  final String message;
  final String? code;
  final Map<String, dynamic>? details;
  final DateTime? timestamp;

  @override
  List<Object?> get props => [message, code, details, timestamp];

  @override
  String toString() => 'Failure(message: $message, code: $code)';
}

// ============================================================================
// NETWORK FAILURES
// ============================================================================

/// General network failure
class NetworkFailure extends Failure {
  const NetworkFailure({required super.message, super.code, super.details});

  factory NetworkFailure.connectionTimeout() {
    return const NetworkFailure(
      message: 'Connection timeout. Please check your internet connection.',
      code: 'CONNECTION_TIMEOUT',
    );
  }

  factory NetworkFailure.noInternetConnection() {
    return const NetworkFailure(
      message: 'No internet connection. Please check your network settings.',
      code: 'NO_INTERNET',
    );
  }

  factory NetworkFailure.serverError([String? message]) {
    return NetworkFailure(
      message: message ?? 'Server error occurred. Please try again later.',
      code: 'SERVER_ERROR',
    );
  }

  factory NetworkFailure.badRequest([String? message]) {
    return NetworkFailure(
      message: message ?? 'Invalid request. Please check your input.',
      code: 'BAD_REQUEST',
    );
  }
}

/// Server failure (5xx errors)
class ServerFailure extends Failure {
  const ServerFailure({required super.message, super.code, super.details});

  factory ServerFailure.internalError() {
    return const ServerFailure(
      message: 'Internal server error. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR',
    );
  }

  factory ServerFailure.maintenance() {
    return const ServerFailure(
      message: 'Server is under maintenance. Please try again later.',
      code: 'MAINTENANCE',
    );
  }

  factory ServerFailure.serviceUnavailable() {
    return const ServerFailure(
      message: 'Service temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
    );
  }
}

/// Client failure (4xx errors)
class ClientFailure extends Failure {
  const ClientFailure({required super.message, super.code, super.details});

  factory ClientFailure.unauthorized() {
    return const ClientFailure(
      message: 'Unauthorized access. Please login again.',
      code: 'UNAUTHORIZED',
    );
  }

  factory ClientFailure.forbidden() {
    return const ClientFailure(
      message: 'Access forbidden. You don\'t have permission for this action.',
      code: 'FORBIDDEN',
    );
  }

  factory ClientFailure.notFound() {
    return const ClientFailure(
      message: 'Resource not found.',
      code: 'NOT_FOUND',
    );
  }

  factory ClientFailure.tooManyRequests() {
    return const ClientFailure(
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    );
  }
}

// ============================================================================
// AUTHENTICATION FAILURES
// ============================================================================

/// Authentication related failures
class AuthFailure extends Failure {
  const AuthFailure({required super.message, super.code, super.details});

  factory AuthFailure.invalidCredentials() {
    return const AuthFailure(
      message: 'Invalid email or password. Please try again.',
      code: 'INVALID_CREDENTIALS',
    );
  }

  factory AuthFailure.userNotFound() {
    return const AuthFailure(
      message: 'User not found. Please check your email address.',
      code: 'USER_NOT_FOUND',
    );
  }

  factory AuthFailure.userDisabled() {
    return const AuthFailure(
      message: 'Your account has been disabled. Please contact support.',
      code: 'USER_DISABLED',
    );
  }

  factory AuthFailure.emailAlreadyExists() {
    return const AuthFailure(
      message: 'An account with this email already exists.',
      code: 'EMAIL_ALREADY_EXISTS',
    );
  }

  factory AuthFailure.weakPassword() {
    return const AuthFailure(
      message: 'Password is too weak. Please choose a stronger password.',
      code: 'WEAK_PASSWORD',
    );
  }

  factory AuthFailure.tokenExpired() {
    return const AuthFailure(
      message: 'Your session has expired. Please login again.',
      code: 'TOKEN_EXPIRED',
    );
  }

  factory AuthFailure.invalidToken() {
    return const AuthFailure(
      message: 'Invalid authentication token. Please login again.',
      code: 'INVALID_TOKEN',
    );
  }

  factory AuthFailure.twoFactorRequired() {
    return const AuthFailure(
      message: 'Two-factor authentication is required.',
      code: 'TWO_FACTOR_REQUIRED',
    );
  }

  factory AuthFailure.invalidOtp() {
    return const AuthFailure(
      message: 'Invalid OTP code. Please try again.',
      code: 'INVALID_OTP',
    );
  }

  factory AuthFailure.otpExpired() {
    return const AuthFailure(
      message: 'OTP code has expired. Please request a new one.',
      code: 'OTP_EXPIRED',
    );
  }
}

// ============================================================================
// VALIDATION FAILURES
// ============================================================================

/// Validation related failures
class ValidationFailure extends Failure {
  const ValidationFailure({required super.message, super.code, super.details});

  factory ValidationFailure.requiredField(String fieldName) {
    return ValidationFailure(
      message: '$fieldName is required.',
      code: 'REQUIRED_FIELD',
      details: {'field': fieldName},
    );
  }

  factory ValidationFailure.invalidEmail() {
    return const ValidationFailure(
      message: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL',
    );
  }

  factory ValidationFailure.invalidPhone() {
    return const ValidationFailure(
      message: 'Please enter a valid phone number.',
      code: 'INVALID_PHONE',
    );
  }

  factory ValidationFailure.invalidAmount() {
    return const ValidationFailure(
      message: 'Please enter a valid amount.',
      code: 'INVALID_AMOUNT',
    );
  }

  factory ValidationFailure.minimumAmount(double minAmount) {
    return ValidationFailure(
      message: 'Amount must be at least BDT ${minAmount.toStringAsFixed(2)}.',
      code: 'MINIMUM_AMOUNT',
      details: {'minAmount': minAmount},
    );
  }

  factory ValidationFailure.maximumAmount(double maxAmount) {
    return ValidationFailure(
      message: 'Amount cannot exceed BDT ${maxAmount.toStringAsFixed(2)}.',
      code: 'MAXIMUM_AMOUNT',
      details: {'maxAmount': maxAmount},
    );
  }

  factory ValidationFailure.insufficientBalance() {
    return const ValidationFailure(
      message: 'Insufficient balance for this transaction.',
      code: 'INSUFFICIENT_BALANCE',
    );
  }
}

// ============================================================================
// BUSINESS LOGIC FAILURES
// ============================================================================

/// Transaction related failures
class TransactionFailure extends Failure {
  const TransactionFailure({required super.message, super.code, super.details});

  factory TransactionFailure.insufficientBalance() {
    return const TransactionFailure(
      message: 'Insufficient balance to complete this transaction.',
      code: 'INSUFFICIENT_BALANCE',
    );
  }

  factory TransactionFailure.dailyLimitExceeded() {
    return const TransactionFailure(
      message: 'Daily transaction limit exceeded.',
      code: 'DAILY_LIMIT_EXCEEDED',
    );
  }

  factory TransactionFailure.monthlyLimitExceeded() {
    return const TransactionFailure(
      message: 'Monthly transaction limit exceeded.',
      code: 'MONTHLY_LIMIT_EXCEEDED',
    );
  }

  factory TransactionFailure.transactionNotFound() {
    return const TransactionFailure(
      message: 'Transaction not found.',
      code: 'TRANSACTION_NOT_FOUND',
    );
  }

  factory TransactionFailure.cannotCancelTransaction() {
    return const TransactionFailure(
      message: 'This transaction cannot be cancelled.',
      code: 'CANNOT_CANCEL_TRANSACTION',
    );
  }

  factory TransactionFailure.paymentGatewayError([String? message]) {
    return TransactionFailure(
      message: message ?? 'Payment gateway error. Please try again.',
      code: 'PAYMENT_GATEWAY_ERROR',
    );
  }

  factory TransactionFailure.transactionDeclined() {
    return const TransactionFailure(
      message: 'Transaction was declined by the payment processor.',
      code: 'TRANSACTION_DECLINED',
    );
  }
}

/// Loan related failures
class LoanFailure extends Failure {
  const LoanFailure({required super.message, super.code, super.details});

  factory LoanFailure.notEligible() {
    return const LoanFailure(
      message: 'You are not eligible for a loan at this time.',
      code: 'NOT_ELIGIBLE',
    );
  }

  factory LoanFailure.existingActiveLoan() {
    return const LoanFailure(
      message:
          'You already have an active loan. Multiple loans are not allowed.',
      code: 'EXISTING_ACTIVE_LOAN',
    );
  }

  factory LoanFailure.kycNotApproved() {
    return const LoanFailure(
      message: 'KYC verification is required before applying for a loan.',
      code: 'KYC_NOT_APPROVED',
    );
  }

  factory LoanFailure.insufficientIncome() {
    return const LoanFailure(
      message: 'Your income is insufficient for the requested loan amount.',
      code: 'INSUFFICIENT_INCOME',
    );
  }

  factory LoanFailure.loanNotFound() {
    return const LoanFailure(
      message: 'Loan not found.',
      code: 'LOAN_NOT_FOUND',
    );
  }

  factory LoanFailure.cannotRepayLoan() {
    return const LoanFailure(
      message: 'Cannot process loan repayment at this time.',
      code: 'CANNOT_REPAY_LOAN',
    );
  }
}

/// KYC related failures
class KycFailure extends Failure {
  const KycFailure({required super.message, super.code, super.details});

  factory KycFailure.documentsRequired() {
    return const KycFailure(
      message: 'Required documents are missing for KYC verification.',
      code: 'DOCUMENTS_REQUIRED',
    );
  }

  factory KycFailure.documentUploadFailed() {
    return const KycFailure(
      message: 'Failed to upload document. Please try again.',
      code: 'DOCUMENT_UPLOAD_FAILED',
    );
  }

  factory KycFailure.invalidDocumentType() {
    return const KycFailure(
      message: 'Invalid document type. Please upload a valid document.',
      code: 'INVALID_DOCUMENT_TYPE',
    );
  }

  factory KycFailure.documentTooLarge() {
    return const KycFailure(
      message: 'Document file size is too large. Maximum 10MB allowed.',
      code: 'DOCUMENT_TOO_LARGE',
    );
  }

  factory KycFailure.alreadyVerified() {
    return const KycFailure(
      message: 'KYC is already verified for this account.',
      code: 'ALREADY_VERIFIED',
    );
  }

  factory KycFailure.verificationPending() {
    return const KycFailure(
      message: 'KYC verification is already pending review.',
      code: 'VERIFICATION_PENDING',
    );
  }
}

// ============================================================================
// STORAGE FAILURES
// ============================================================================

/// Local storage related failures
class StorageFailure extends Failure {
  const StorageFailure({required super.message, super.code, super.details});

  factory StorageFailure.notFound() {
    return const StorageFailure(
      message: 'Data not found in local storage.',
      code: 'STORAGE_NOT_FOUND',
    );
  }

  factory StorageFailure.saveFailed() {
    return const StorageFailure(
      message: 'Failed to save data to local storage.',
      code: 'STORAGE_SAVE_FAILED',
    );
  }

  factory StorageFailure.loadFailed() {
    return const StorageFailure(
      message: 'Failed to load data from local storage.',
      code: 'STORAGE_LOAD_FAILED',
    );
  }

  factory StorageFailure.corruptedData() {
    return const StorageFailure(
      message: 'Local storage data is corrupted.',
      code: 'STORAGE_CORRUPTED',
    );
  }

  factory StorageFailure.insufficientSpace() {
    return const StorageFailure(
      message: 'Insufficient storage space available.',
      code: 'INSUFFICIENT_SPACE',
    );
  }
}

/// Cache related failures
class CacheFailure extends Failure {
  const CacheFailure({required super.message, super.code, super.details});

  factory CacheFailure.notFound() {
    return const CacheFailure(
      message: 'Data not found in cache.',
      code: 'CACHE_NOT_FOUND',
    );
  }

  factory CacheFailure.expired() {
    return const CacheFailure(
      message: 'Cached data has expired.',
      code: 'CACHE_EXPIRED',
    );
  }

  factory CacheFailure.saveFailed() {
    return const CacheFailure(
      message: 'Failed to save data to cache.',
      code: 'CACHE_SAVE_FAILED',
    );
  }

  factory CacheFailure.clearFailed() {
    return const CacheFailure(
      message: 'Failed to clear cache.',
      code: 'CACHE_CLEAR_FAILED',
    );
  }
}

// ============================================================================
// DEVICE/PLATFORM FAILURES
// ============================================================================

/// Device related failures
class DeviceFailure extends Failure {
  const DeviceFailure({required super.message, super.code, super.details});

  factory DeviceFailure.biometricNotAvailable() {
    return const DeviceFailure(
      message: 'Biometric authentication is not available on this device.',
      code: 'BIOMETRIC_NOT_AVAILABLE',
    );
  }

  factory DeviceFailure.biometricNotEnrolled() {
    return const DeviceFailure(
      message: 'No biometric credentials are enrolled on this device.',
      code: 'BIOMETRIC_NOT_ENROLLED',
    );
  }

  factory DeviceFailure.cameraPermissionDenied() {
    return const DeviceFailure(
      message: 'Camera permission is required for this feature.',
      code: 'CAMERA_PERMISSION_DENIED',
    );
  }

  factory DeviceFailure.storagePermissionDenied() {
    return const DeviceFailure(
      message: 'Storage permission is required for this feature.',
      code: 'STORAGE_PERMISSION_DENIED',
    );
  }

  factory DeviceFailure.locationPermissionDenied() {
    return const DeviceFailure(
      message: 'Location permission is required for this feature.',
      code: 'LOCATION_PERMISSION_DENIED',
    );
  }

  factory DeviceFailure.deviceNotSupported() {
    return const DeviceFailure(
      message: 'This feature is not supported on your device.',
      code: 'DEVICE_NOT_SUPPORTED',
    );
  }
}

// ============================================================================
// GENERIC FAILURES
// ============================================================================

/// Generic failure for unexpected errors
class UnexpectedFailure extends Failure {
  const UnexpectedFailure({
    super.message = 'An unexpected error occurred. Please try again.',
    super.code = 'UNEXPECTED_ERROR',
    super.details,
  });

  factory UnexpectedFailure.fromException(Exception exception) {
    return UnexpectedFailure(
      message: exception.toString(),
      details: {'exception': exception.toString()},
    );
  }
}

/// Parse/Serialization failure
class ParseFailure extends Failure {
  const ParseFailure({required super.message, super.code, super.details});

  factory ParseFailure.jsonParsing() {
    return const ParseFailure(
      message: 'Failed to parse response data.',
      code: 'JSON_PARSING_ERROR',
    );
  }

  factory ParseFailure.invalidFormat() {
    return const ParseFailure(
      message: 'Invalid data format received.',
      code: 'INVALID_FORMAT',
    );
  }
}

/// Feature not available failure
class FeatureFailure extends Failure {
  const FeatureFailure({required super.message, super.code, super.details});

  factory FeatureFailure.notImplemented() {
    return const FeatureFailure(
      message: 'This feature is not yet implemented.',
      code: 'NOT_IMPLEMENTED',
    );
  }

  factory FeatureFailure.comingSoon() {
    return const FeatureFailure(
      message: 'This feature is coming soon.',
      code: 'COMING_SOON',
    );
  }

  factory FeatureFailure.planUpgradeRequired() {
    return const FeatureFailure(
      message: 'Please upgrade your plan to access this feature.',
      code: 'PLAN_UPGRADE_REQUIRED',
    );
  }

  factory FeatureFailure.maintenanceMode() {
    return const FeatureFailure(
      message: 'This feature is temporarily unavailable due to maintenance.',
      code: 'MAINTENANCE_MODE',
    );
  }
}

// ============================================================================
// UTILITY METHODS
// ============================================================================

/// Extension to get user-friendly error messages
extension FailureExtensions on Failure {
  /// Get user-friendly title for the error
  String get title {
    switch (runtimeType) {
      case NetworkFailure:
        return 'Network Error';
      case ServerFailure:
        return 'Server Error';
      case ClientFailure:
        return 'Request Error';
      case AuthFailure:
        return 'Authentication Error';
      case ValidationFailure:
        return 'Validation Error';
      case TransactionFailure:
        return 'Transaction Error';
      case LoanFailure:
        return 'Loan Error';
      case KycFailure:
        return 'KYC Error';
      case StorageFailure:
        return 'Storage Error';
      case CacheFailure:
        return 'Cache Error';
      case DeviceFailure:
        return 'Device Error';
      case FeatureFailure:
        return 'Feature Unavailable';
      case ParseFailure:
        return 'Data Error';
      default:
        return 'Error';
    }
  }

  /// Check if failure is retryable
  bool get isRetryable {
    switch (code) {
      case 'CONNECTION_TIMEOUT':
      case 'NO_INTERNET':
      case 'SERVER_ERROR':
      case 'INTERNAL_SERVER_ERROR':
      case 'SERVICE_UNAVAILABLE':
      case 'PAYMENT_GATEWAY_ERROR':
        return true;
      default:
        return false;
    }
  }

  /// Check if failure requires user action
  bool get requiresUserAction {
    switch (code) {
      case 'UNAUTHORIZED':
      case 'TOKEN_EXPIRED':
      case 'INVALID_TOKEN':
      case 'TWO_FACTOR_REQUIRED':
      case 'KYC_NOT_APPROVED':
      case 'PLAN_UPGRADE_REQUIRED':
      case 'CAMERA_PERMISSION_DENIED':
      case 'STORAGE_PERMISSION_DENIED':
      case 'LOCATION_PERMISSION_DENIED':
        return true;
      default:
        return false;
    }
  }

  /// Get suggested action for the user
  String? get suggestedAction {
    switch (code) {
      case 'NO_INTERNET':
        return 'Check your internet connection and try again.';
      case 'UNAUTHORIZED':
      case 'TOKEN_EXPIRED':
        return 'Please login again to continue.';
      case 'INSUFFICIENT_BALANCE':
        return 'Please add funds to your account.';
      case 'KYC_NOT_APPROVED':
        return 'Complete your KYC verification to proceed.';
      case 'PLAN_UPGRADE_REQUIRED':
        return 'Upgrade your plan to access this feature.';
      case 'CAMERA_PERMISSION_DENIED':
        return 'Grant camera permission in your device settings.';
      case 'STORAGE_PERMISSION_DENIED':
        return 'Grant storage permission in your device settings.';
      default:
        return null;
    }
  }
}
