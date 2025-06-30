import 'dart:io';

/// Base class for all custom exceptions
/// These exceptions are thrown in data sources and caught in repositories
/// where they are converted to appropriate Failure objects
abstract class AppException implements Exception {
  const AppException({
    required this.message,
    this.code,
    this.details,
    this.statusCode,
  });

  final String message;
  final String? code;
  final Map<String, dynamic>? details;
  final int? statusCode;

  @override
  String toString() => 'AppException(message: $message, code: $code)';
}

// ============================================================================
// NETWORK EXCEPTIONS
// ============================================================================

/// Network related exceptions
class NetworkException extends AppException {
  const NetworkException({
    required super.message,
    super.code,
    super.details,
    super.statusCode,
  });

  factory NetworkException.connectionTimeout() {
    return const NetworkException(
      message: 'Connection timeout',
      code: 'CONNECTION_TIMEOUT',
    );
  }

  factory NetworkException.noInternetConnection() {
    return const NetworkException(
      message: 'No internet connection',
      code: 'NO_INTERNET',
    );
  }

  factory NetworkException.requestCancelled() {
    return const NetworkException(
      message: 'Request was cancelled',
      code: 'REQUEST_CANCELLED',
    );
  }

  factory NetworkException.sendTimeout() {
    return const NetworkException(
      message: 'Send timeout',
      code: 'SEND_TIMEOUT',
    );
  }

  factory NetworkException.receiveTimeout() {
    return const NetworkException(
      message: 'Receive timeout',
      code: 'RECEIVE_TIMEOUT',
    );
  }

  factory NetworkException.badCertificate() {
    return const NetworkException(
      message: 'Bad certificate',
      code: 'BAD_CERTIFICATE',
    );
  }

  factory NetworkException.badResponse() {
    return const NetworkException(
      message: 'Bad response format',
      code: 'BAD_RESPONSE',
    );
  }

  factory NetworkException.connectionError() {
    return const NetworkException(
      message: 'Connection error',
      code: 'CONNECTION_ERROR',
    );
  }

  factory NetworkException.unknown([String? message]) {
    return NetworkException(
      message: message ?? 'Unknown network error',
      code: 'UNKNOWN_NETWORK_ERROR',
    );
  }
}

/// HTTP exceptions for API responses
class HttpException extends AppException {
  const HttpException({
    required super.message,
    required super.statusCode,
    super.code,
    super.details,
  });

  factory HttpException.badRequest([
    String? message,
    Map<String, dynamic>? details,
  ]) {
    return HttpException(
      message: message ?? 'Bad request',
      statusCode: 400,
      code: 'BAD_REQUEST',
      details: details,
    );
  }

  factory HttpException.unauthorized([String? message]) {
    return HttpException(
      message: message ?? 'Unauthorized',
      statusCode: 401,
      code: 'UNAUTHORIZED',
    );
  }

  factory HttpException.forbidden([String? message]) {
    return HttpException(
      message: message ?? 'Forbidden',
      statusCode: 403,
      code: 'FORBIDDEN',
    );
  }

  factory HttpException.notFound([String? message]) {
    return HttpException(
      message: message ?? 'Not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    );
  }

  factory HttpException.methodNotAllowed([String? message]) {
    return HttpException(
      message: message ?? 'Method not allowed',
      statusCode: 405,
      code: 'METHOD_NOT_ALLOWED',
    );
  }

  factory HttpException.conflict([String? message]) {
    return HttpException(
      message: message ?? 'Conflict',
      statusCode: 409,
      code: 'CONFLICT',
    );
  }

  factory HttpException.unprocessableEntity([
    String? message,
    Map<String, dynamic>? details,
  ]) {
    return HttpException(
      message: message ?? 'Unprocessable entity',
      statusCode: 422,
      code: 'UNPROCESSABLE_ENTITY',
      details: details,
    );
  }

  factory HttpException.tooManyRequests([String? message]) {
    return HttpException(
      message: message ?? 'Too many requests',
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    );
  }

  factory HttpException.internalServerError([String? message]) {
    return HttpException(
      message: message ?? 'Internal server error',
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
    );
  }

  factory HttpException.badGateway([String? message]) {
    return HttpException(
      message: message ?? 'Bad gateway',
      statusCode: 502,
      code: 'BAD_GATEWAY',
    );
  }

  factory HttpException.serviceUnavailable([String? message]) {
    return HttpException(
      message: message ?? 'Service unavailable',
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
    );
  }

  factory HttpException.gatewayTimeout([String? message]) {
    return HttpException(
      message: message ?? 'Gateway timeout',
      statusCode: 504,
      code: 'GATEWAY_TIMEOUT',
    );
  }

  factory HttpException.fromStatusCode(int statusCode, [String? message]) {
    switch (statusCode) {
      case 400:
        return HttpException.badRequest(message);
      case 401:
        return HttpException.unauthorized(message);
      case 403:
        return HttpException.forbidden(message);
      case 404:
        return HttpException.notFound(message);
      case 405:
        return HttpException.methodNotAllowed(message);
      case 409:
        return HttpException.conflict(message);
      case 422:
        return HttpException.unprocessableEntity(message);
      case 429:
        return HttpException.tooManyRequests(message);
      case 500:
        return HttpException.internalServerError(message);
      case 502:
        return HttpException.badGateway(message);
      case 503:
        return HttpException.serviceUnavailable(message);
      case 504:
        return HttpException.gatewayTimeout(message);
      default:
        return HttpException(
          message: message ?? 'HTTP error $statusCode',
          statusCode: statusCode,
          code: 'HTTP_ERROR_$statusCode',
        );
    }
  }
}

// ============================================================================
// AUTHENTICATION EXCEPTIONS
// ============================================================================

/// Authentication related exceptions
class AuthException extends AppException {
  const AuthException({required super.message, super.code, super.details});

  factory AuthException.invalidCredentials() {
    return const AuthException(
      message: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    );
  }

  factory AuthException.userNotFound() {
    return const AuthException(
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    );
  }

  factory AuthException.userDisabled() {
    return const AuthException(
      message: 'User account is disabled',
      code: 'USER_DISABLED',
    );
  }

  factory AuthException.emailAlreadyExists() {
    return const AuthException(
      message: 'Email already exists',
      code: 'EMAIL_ALREADY_EXISTS',
    );
  }

  factory AuthException.weakPassword() {
    return const AuthException(
      message: 'Password is too weak',
      code: 'WEAK_PASSWORD',
    );
  }

  factory AuthException.tokenExpired() {
    return const AuthException(
      message: 'Authentication token has expired',
      code: 'TOKEN_EXPIRED',
    );
  }

  factory AuthException.invalidToken() {
    return const AuthException(
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
    );
  }

  factory AuthException.twoFactorRequired() {
    return const AuthException(
      message: 'Two-factor authentication is required',
      code: 'TWO_FACTOR_REQUIRED',
    );
  }

  factory AuthException.invalidOtp() {
    return const AuthException(
      message: 'Invalid OTP code',
      code: 'INVALID_OTP',
    );
  }

  factory AuthException.otpExpired() {
    return const AuthException(
      message: 'OTP code has expired',
      code: 'OTP_EXPIRED',
    );
  }

  factory AuthException.accountLocked() {
    return const AuthException(
      message: 'Account is temporarily locked',
      code: 'ACCOUNT_LOCKED',
    );
  }

  factory AuthException.sessionExpired() {
    return const AuthException(
      message: 'Session has expired',
      code: 'SESSION_EXPIRED',
    );
  }
}

// ============================================================================
// VALIDATION EXCEPTIONS
// ============================================================================

/// Validation related exceptions
class ValidationException extends AppException {
  const ValidationException({
    required super.message,
    super.code,
    super.details,
  });

  factory ValidationException.requiredField(String fieldName) {
    return ValidationException(
      message: '$fieldName is required',
      code: 'REQUIRED_FIELD',
      details: {'field': fieldName},
    );
  }

  factory ValidationException.invalidFormat(String fieldName) {
    return ValidationException(
      message: 'Invalid $fieldName format',
      code: 'INVALID_FORMAT',
      details: {'field': fieldName},
    );
  }

  factory ValidationException.invalidEmail() {
    return const ValidationException(
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    );
  }

  factory ValidationException.invalidPhone() {
    return const ValidationException(
      message: 'Invalid phone number format',
      code: 'INVALID_PHONE',
    );
  }

  factory ValidationException.invalidAmount() {
    return const ValidationException(
      message: 'Invalid amount format',
      code: 'INVALID_AMOUNT',
    );
  }

  factory ValidationException.minimumLength(String fieldName, int minLength) {
    return ValidationException(
      message: '$fieldName must be at least $minLength characters',
      code: 'MINIMUM_LENGTH',
      details: {'field': fieldName, 'minLength': minLength},
    );
  }

  factory ValidationException.maximumLength(String fieldName, int maxLength) {
    return ValidationException(
      message: '$fieldName cannot exceed $maxLength characters',
      code: 'MAXIMUM_LENGTH',
      details: {'field': fieldName, 'maxLength': maxLength},
    );
  }

  factory ValidationException.minimumValue(String fieldName, num minValue) {
    return ValidationException(
      message: '$fieldName must be at least $minValue',
      code: 'MINIMUM_VALUE',
      details: {'field': fieldName, 'minValue': minValue},
    );
  }

  factory ValidationException.maximumValue(String fieldName, num maxValue) {
    return ValidationException(
      message: '$fieldName cannot exceed $maxValue',
      code: 'MAXIMUM_VALUE',
      details: {'field': fieldName, 'maxValue': maxValue},
    );
  }
}

// ============================================================================
// BUSINESS LOGIC EXCEPTIONS
// ============================================================================

/// Transaction related exceptions
class TransactionException extends AppException {
  const TransactionException({
    required super.message,
    super.code,
    super.details,
  });

  factory TransactionException.insufficientBalance() {
    return const TransactionException(
      message: 'Insufficient account balance',
      code: 'INSUFFICIENT_BALANCE',
    );
  }

  factory TransactionException.dailyLimitExceeded() {
    return const TransactionException(
      message: 'Daily transaction limit exceeded',
      code: 'DAILY_LIMIT_EXCEEDED',
    );
  }

  factory TransactionException.monthlyLimitExceeded() {
    return const TransactionException(
      message: 'Monthly transaction limit exceeded',
      code: 'MONTHLY_LIMIT_EXCEEDED',
    );
  }

  factory TransactionException.transactionNotFound() {
    return const TransactionException(
      message: 'Transaction not found',
      code: 'TRANSACTION_NOT_FOUND',
    );
  }

  factory TransactionException.cannotCancelTransaction() {
    return const TransactionException(
      message: 'Transaction cannot be cancelled',
      code: 'CANNOT_CANCEL_TRANSACTION',
    );
  }

  factory TransactionException.duplicateTransaction() {
    return const TransactionException(
      message: 'Duplicate transaction detected',
      code: 'DUPLICATE_TRANSACTION',
    );
  }

  factory TransactionException.paymentGatewayError([String? message]) {
    return TransactionException(
      message: message ?? 'Payment gateway error',
      code: 'PAYMENT_GATEWAY_ERROR',
    );
  }

  factory TransactionException.transactionDeclined() {
    return const TransactionException(
      message: 'Transaction declined by payment processor',
      code: 'TRANSACTION_DECLINED',
    );
  }

  factory TransactionException.invalidPaymentMethod() {
    return const TransactionException(
      message: 'Invalid payment method',
      code: 'INVALID_PAYMENT_METHOD',
    );
  }
}

/// Loan related exceptions
class LoanException extends AppException {
  const LoanException({required super.message, super.code, super.details});

  factory LoanException.notEligible() {
    return const LoanException(
      message: 'Not eligible for loan',
      code: 'NOT_ELIGIBLE',
    );
  }

  factory LoanException.existingActiveLoan() {
    return const LoanException(
      message: 'Existing active loan found',
      code: 'EXISTING_ACTIVE_LOAN',
    );
  }

  factory LoanException.kycNotApproved() {
    return const LoanException(
      message: 'KYC verification required',
      code: 'KYC_NOT_APPROVED',
    );
  }

  factory LoanException.insufficientIncome() {
    return const LoanException(
      message: 'Insufficient income for requested loan amount',
      code: 'INSUFFICIENT_INCOME',
    );
  }

  factory LoanException.loanNotFound() {
    return const LoanException(
      message: 'Loan not found',
      code: 'LOAN_NOT_FOUND',
    );
  }

  factory LoanException.cannotRepayLoan() {
    return const LoanException(
      message: 'Cannot process loan repayment',
      code: 'CANNOT_REPAY_LOAN',
    );
  }

  factory LoanException.loanAlreadyPaid() {
    return const LoanException(
      message: 'Loan has already been paid',
      code: 'LOAN_ALREADY_PAID',
    );
  }

  factory LoanException.invalidLoanAmount() {
    return const LoanException(
      message: 'Invalid loan amount',
      code: 'INVALID_LOAN_AMOUNT',
    );
  }
}

/// KYC related exceptions
class KycException extends AppException {
  const KycException({required super.message, super.code, super.details});

  factory KycException.documentsRequired() {
    return const KycException(
      message: 'Required documents are missing',
      code: 'DOCUMENTS_REQUIRED',
    );
  }

  factory KycException.documentUploadFailed() {
    return const KycException(
      message: 'Document upload failed',
      code: 'DOCUMENT_UPLOAD_FAILED',
    );
  }

  factory KycException.invalidDocumentType() {
    return const KycException(
      message: 'Invalid document type',
      code: 'INVALID_DOCUMENT_TYPE',
    );
  }

  factory KycException.documentTooLarge() {
    return const KycException(
      message: 'Document file size too large',
      code: 'DOCUMENT_TOO_LARGE',
    );
  }

  factory KycException.alreadyVerified() {
    return const KycException(
      message: 'KYC already verified',
      code: 'ALREADY_VERIFIED',
    );
  }

  factory KycException.verificationPending() {
    return const KycException(
      message: 'KYC verification pending',
      code: 'VERIFICATION_PENDING',
    );
  }

  factory KycException.verificationRejected() {
    return const KycException(
      message: 'KYC verification rejected',
      code: 'VERIFICATION_REJECTED',
    );
  }

  factory KycException.documentExpired() {
    return const KycException(
      message: 'Document has expired',
      code: 'DOCUMENT_EXPIRED',
    );
  }
}

// ============================================================================
// STORAGE EXCEPTIONS
// ============================================================================

/// Local storage related exceptions
class StorageException extends AppException {
  const StorageException({required super.message, super.code, super.details});

  factory StorageException.notFound() {
    return const StorageException(
      message: 'Data not found in storage',
      code: 'STORAGE_NOT_FOUND',
    );
  }

  factory StorageException.saveFailed() {
    return const StorageException(
      message: 'Failed to save data to storage',
      code: 'STORAGE_SAVE_FAILED',
    );
  }

  factory StorageException.loadFailed() {
    return const StorageException(
      message: 'Failed to load data from storage',
      code: 'STORAGE_LOAD_FAILED',
    );
  }

  factory StorageException.deleteFailed() {
    return const StorageException(
      message: 'Failed to delete data from storage',
      code: 'STORAGE_DELETE_FAILED',
    );
  }

  factory StorageException.corruptedData() {
    return const StorageException(
      message: 'Storage data is corrupted',
      code: 'STORAGE_CORRUPTED',
    );
  }

  factory StorageException.insufficientSpace() {
    return const StorageException(
      message: 'Insufficient storage space',
      code: 'INSUFFICIENT_SPACE',
    );
  }

  factory StorageException.accessDenied() {
    return const StorageException(
      message: 'Storage access denied',
      code: 'STORAGE_ACCESS_DENIED',
    );
  }

  factory StorageException.encryptionFailed() {
    return const StorageException(
      message: 'Data encryption failed',
      code: 'ENCRYPTION_FAILED',
    );
  }

  factory StorageException.decryptionFailed() {
    return const StorageException(
      message: 'Data decryption failed',
      code: 'DECRYPTION_FAILED',
    );
  }
}

/// Cache related exceptions
class CacheException extends AppException {
  const CacheException({required super.message, super.code, super.details});

  factory CacheException.notFound() {
    return const CacheException(
      message: 'Data not found in cache',
      code: 'CACHE_NOT_FOUND',
    );
  }

  factory CacheException.expired() {
    return const CacheException(
      message: 'Cached data has expired',
      code: 'CACHE_EXPIRED',
    );
  }

  factory CacheException.saveFailed() {
    return const CacheException(
      message: 'Failed to save data to cache',
      code: 'CACHE_SAVE_FAILED',
    );
  }

  factory CacheException.clearFailed() {
    return const CacheException(
      message: 'Failed to clear cache',
      code: 'CACHE_CLEAR_FAILED',
    );
  }

  factory CacheException.invalidData() {
    return const CacheException(
      message: 'Invalid cached data format',
      code: 'CACHE_INVALID_DATA',
    );
  }
}

// ============================================================================
// DEVICE/PLATFORM EXCEPTIONS
// ============================================================================

/// Device related exceptions
class DeviceException extends AppException {
  const DeviceException({required super.message, super.code, super.details});

  factory DeviceException.biometricNotAvailable() {
    return const DeviceException(
      message: 'Biometric authentication not available',
      code: 'BIOMETRIC_NOT_AVAILABLE',
    );
  }

  factory DeviceException.biometricNotEnrolled() {
    return const DeviceException(
      message: 'No biometric credentials enrolled',
      code: 'BIOMETRIC_NOT_ENROLLED',
    );
  }

  factory DeviceException.biometricAuthFailed() {
    return const DeviceException(
      message: 'Biometric authentication failed',
      code: 'BIOMETRIC_AUTH_FAILED',
    );
  }

  factory DeviceException.cameraNotAvailable() {
    return const DeviceException(
      message: 'Camera not available',
      code: 'CAMERA_NOT_AVAILABLE',
    );
  }

  factory DeviceException.permissionDenied(String permission) {
    return DeviceException(
      message: '$permission permission denied',
      code: 'PERMISSION_DENIED',
      details: {'permission': permission},
    );
  }

  factory DeviceException.locationServiceDisabled() {
    return const DeviceException(
      message: 'Location service is disabled',
      code: 'LOCATION_SERVICE_DISABLED',
    );
  }

  factory DeviceException.deviceNotSupported() {
    return const DeviceException(
      message: 'Device not supported',
      code: 'DEVICE_NOT_SUPPORTED',
    );
  }

  factory DeviceException.platformNotSupported() {
    return const DeviceException(
      message: 'Platform not supported',
      code: 'PLATFORM_NOT_SUPPORTED',
    );
  }
}

// ============================================================================
// PARSING EXCEPTIONS
// ============================================================================

/// Parsing/Serialization related exceptions
class ParseException extends AppException {
  const ParseException({required super.message, super.code, super.details});

  factory ParseException.jsonParsing([String? details]) {
    return ParseException(
      message: 'JSON parsing failed',
      code: 'JSON_PARSING_ERROR',
      details: details != null ? {'details': details} : null,
    );
  }

  factory ParseException.invalidFormat(String expectedFormat) {
    return ParseException(
      message: 'Invalid data format, expected $expectedFormat',
      code: 'INVALID_FORMAT',
      details: {'expectedFormat': expectedFormat},
    );
  }

  factory ParseException.missingField(String fieldName) {
    return ParseException(
      message: 'Missing required field: $fieldName',
      code: 'MISSING_FIELD',
      details: {'field': fieldName},
    );
  }

  factory ParseException.typeConversion(String fieldName, String expectedType) {
    return ParseException(
      message: 'Type conversion failed for $fieldName, expected $expectedType',
      code: 'TYPE_CONVERSION_ERROR',
      details: {'field': fieldName, 'expectedType': expectedType},
    );
  }
}

// ============================================================================
// FILE EXCEPTIONS
// ============================================================================

/// File related exceptions
class FileException extends AppException {
  const FileException({required super.message, super.code, super.details});

  factory FileException.notFound(String filePath) {
    return FileException(
      message: 'File not found: $filePath',
      code: 'FILE_NOT_FOUND',
      details: {'filePath': filePath},
    );
  }

  factory FileException.accessDenied(String filePath) {
    return FileException(
      message: 'Access denied to file: $filePath',
      code: 'FILE_ACCESS_DENIED',
      details: {'filePath': filePath},
    );
  }

  factory FileException.readFailed(String filePath) {
    return FileException(
      message: 'Failed to read file: $filePath',
      code: 'FILE_READ_FAILED',
      details: {'filePath': filePath},
    );
  }

  factory FileException.writeFailed(String filePath) {
    return FileException(
      message: 'Failed to write file: $filePath',
      code: 'FILE_WRITE_FAILED',
      details: {'filePath': filePath},
    );
  }

  factory FileException.tooLarge(String fileName, int maxSizeInMB) {
    return FileException(
      message: 'File too large: $fileName (max ${maxSizeInMB}MB)',
      code: 'FILE_TOO_LARGE',
      details: {'fileName': fileName, 'maxSizeInMB': maxSizeInMB},
    );
  }

  factory FileException.invalidType(
    String fileName,
    List<String> allowedTypes,
  ) {
    return FileException(
      message:
          'Invalid file type: $fileName (allowed: ${allowedTypes.join(', ')})',
      code: 'INVALID_FILE_TYPE',
      details: {'fileName': fileName, 'allowedTypes': allowedTypes},
    );
  }

  factory FileException.corrupted(String fileName) {
    return FileException(
      message: 'File is corrupted: $fileName',
      code: 'FILE_CORRUPTED',
      details: {'fileName': fileName},
    );
  }
}

// ============================================================================
// UTILITY METHODS
// ============================================================================

/// Utility methods for exception handling
class ExceptionUtils {
  /// Convert platform exceptions to custom exceptions
  static AppException fromPlatformException(Exception exception) {
    if (exception is SocketException) {
      return NetworkException.noInternetConnection();
    } else if (exception is HttpException) {
      return NetworkException.connectionError();
    } else if (exception is FileSystemException) {
      return StorageException.accessDenied();
    } else if (exception is FormatException) {
      return ParseException.jsonParsing(exception.message);
    }

    // Default to unknown exception
    return NetworkException.unknown(exception.toString());
  }

  /// Check if exception is retryable
  static bool isRetryable(AppException exception) {
    const retryableCodes = [
      'CONNECTION_TIMEOUT',
      'NO_INTERNET',
      'SEND_TIMEOUT',
      'RECEIVE_TIMEOUT',
      'CONNECTION_ERROR',
      'INTERNAL_SERVER_ERROR',
      'BAD_GATEWAY',
      'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT',
      'PAYMENT_GATEWAY_ERROR',
    ];

    return retryableCodes.contains(exception.code);
  }

  /// Check if exception requires authentication
  static bool requiresAuth(AppException exception) {
    const authCodes = [
      'UNAUTHORIZED',
      'TOKEN_EXPIRED',
      'INVALID_TOKEN',
      'SESSION_EXPIRED',
    ];

    return authCodes.contains(exception.code);
  }

  /// Extract validation errors from exception details
  static Map<String, String> getValidationErrors(AppException exception) {
    final errors = <String, String>{};

    if (exception.details != null) {
      final details = exception.details!;

      // Handle single field validation error
      if (details.containsKey('field')) {
        errors[details['field']] = exception.message;
      }

      // Handle multiple validation errors
      if (details.containsKey('errors') && details['errors'] is Map) {
        final Map<String, dynamic> validationErrors = details['errors'];
        validationErrors.forEach((field, message) {
          errors[field] = message.toString();
        });
      }
    }

    return errors;
  }
}
