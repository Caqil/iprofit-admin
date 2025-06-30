class Validators {
  // Common validation messages
  static const String requiredMessage = 'This field is required';
  static const String invalidEmailMessage = 'Please enter a valid email address';
  static const String invalidPhoneMessage = 'Please enter a valid phone number';
  static const String passwordTooShortMessage = 'Password must be at least 8 characters';
  static const String passwordMismatchMessage = 'Passwords do not match';
  static const String invalidAmountMessage = 'Please enter a valid amount';
  static const String minimumAmountMessage = 'Amount must be at least';
  static const String maximumAmountMessage = 'Amount cannot exceed';

  /// Validate required field
  static String? required(String? value, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return message ?? requiredMessage;
    }
    return null;
  }

  /// Validate email format
  static String? email(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    
    if (!emailRegex.hasMatch(value)) {
      return message ?? invalidEmailMessage;
    }
    return null;
  }

  /// Validate required email
  static String? requiredEmail(String? value) {
    return required(value) ?? email(value);
  }

  /// Validate phone number
  static String? phone(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    // Remove all non-digit characters
    final cleanPhone = value.replaceAll(RegExp(r'[^\d+]'), '');
    
    // Check for valid phone patterns
    final phoneRegex = RegExp(r'^\+?[\d]{10,15}$');
    
    if (!phoneRegex.hasMatch(cleanPhone)) {
      return message ?? invalidPhoneMessage;
    }
    return null;
  }

  /// Validate required phone
  static String? requiredPhone(String? value) {
    return required(value) ?? phone(value);
  }

  /// Validate Bangladeshi phone number
  static String? bangladeshiPhone(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cleanPhone = value.replaceAll(RegExp(r'[^\d+]'), '');
    
    // Bangladesh phone patterns: +8801XXXXXXXXX or 01XXXXXXXXX
    final bdPhoneRegex = RegExp(r'^(\+880|880|0)?1[3-9]\d{8}$');
    
    if (!bdPhoneRegex.hasMatch(cleanPhone)) {
      return message ?? 'Please enter a valid Bangladeshi phone number';
    }
    return null;
  }

  /// Validate password strength
  static String? password(String? value, [int minLength = 8, String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (value.length < minLength) {
      return message ?? 'Password must be at least $minLength characters';
    }
    
    // Check for at least one uppercase letter
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    // Check for at least one lowercase letter
    if (!RegExp(r'[a-z]').hasMatch(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    // Check for at least one digit
    if (!RegExp(r'\d').hasMatch(value)) {
      return 'Password must contain at least one number';
    }
    
    // Check for at least one special character
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
      return 'Password must contain at least one special character';
    }
    
    return null;
  }

  /// Validate required strong password
  static String? requiredPassword(String? value, [int minLength = 8]) {
    return required(value) ?? password(value, minLength);
  }

  /// Validate password confirmation
  static String? confirmPassword(String? value, String? password, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (value != password) {
      return message ?? passwordMismatchMessage;
    }
    return null;
  }

  /// Validate minimum length
  static String? minLength(String? value, int min, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (value.length < min) {
      return message ?? 'Must be at least $min characters';
    }
    return null;
  }

  /// Validate maximum length
  static String? maxLength(String? value, int max, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (value.length > max) {
      return message ?? 'Must be at most $max characters';
    }
    return null;
  }

  /// Validate numeric input
  static String? numeric(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (double.tryParse(value) == null) {
      return message ?? 'Please enter a valid number';
    }
    return null;
  }

  /// Validate integer input
  static String? integer(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    if (int.tryParse(value) == null) {
      return message ?? 'Please enter a valid integer';
    }
    return null;
  }

  /// Validate amount (positive number with up to 2 decimal places)
  static String? amount(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final amount = double.tryParse(value);
    if (amount == null) {
      return message ?? invalidAmountMessage;
    }
    
    if (amount < 0) {
      return 'Amount cannot be negative';
    }
    
    // Check for more than 2 decimal places
    if (value.contains('.') && value.split('.')[1].length > 2) {
      return 'Amount can have at most 2 decimal places';
    }
    
    return null;
  }

  /// Validate required amount
  static String? requiredAmount(String? value) {
    return required(value) ?? amount(value);
  }

  /// Validate minimum amount
  static String? minAmount(String? value, double min, [String? message]) {
    final amountError = amount(value);
    if (amountError != null) return amountError;
    
    if (value == null || value.isEmpty) return null;
    
    final parsedAmount = double.parse(value);
    if (parsedAmount < min) {
      return message ?? '$minimumAmountMessage BDT ${min.toStringAsFixed(2)}';
    }
    return null;
  }

  /// Validate maximum amount
  static String? maxAmount(String? value, double max, [String? message]) {
    final amountError = amount(value);
    if (amountError != null) return amountError;
    
    if (value == null || value.isEmpty) return null;
    
    final parsedAmount = double.parse(value);
    if (parsedAmount > max) {
      return message ?? '$maximumAmountMessage BDT ${max.toStringAsFixed(2)}';
    }
    return null;
  }

  /// Validate amount range
  static String? amountRange(String? value, double min, double max, [String? message]) {
    final amountError = amount(value);
    if (amountError != null) return amountError;
    
    if (value == null || value.isEmpty) return null;
    
    final parsedAmount = double.parse(value);
    if (parsedAmount < min || parsedAmount > max) {
      return message ?? 'Amount must be between BDT ${min.toStringAsFixed(2)} and BDT ${max.toStringAsFixed(2)}';
    }
    return null;
  }

  /// Validate National ID (Bangladesh)
  static String? nationalId(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cleanId = value.replaceAll(RegExp(r'[^\d]'), '');
    
    // Bangladesh National ID: 10, 13, or 17 digits
    final nidRegex = RegExp(r'^\d{10}$|^\d{13}$|^\d{17}$');
    
    if (!nidRegex.hasMatch(cleanId)) {
      return message ?? 'Please enter a valid National ID';
    }
    return null;
  }

  /// Validate passport number
  static String? passport(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    // Basic passport validation (alphanumeric, 6-9 characters)
    final passportRegex = RegExp(r'^[A-Z0-9]{6,9}$');
    
    if (!passportRegex.hasMatch(value.toUpperCase())) {
      return message ?? 'Please enter a valid passport number';
    }
    return null;
  }

  /// Validate bank account number
  static String? bankAccount(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cleanAccount = value.replaceAll(RegExp(r'[^\d]'), '');
    
    // Bank account number: 10-20 digits
    if (cleanAccount.length < 10 || cleanAccount.length > 20) {
      return message ?? 'Please enter a valid bank account number (10-20 digits)';
    }
    return null;
  }

  /// Validate routing number
  static String? routingNumber(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cleanRouting = value.replaceAll(RegExp(r'[^\d]'), '');
    
    // Routing number: typically 9 digits
    if (cleanRouting.length != 9) {
      return message ?? 'Please enter a valid routing number (9 digits)';
    }
    return null;
  }

  /// Validate date of birth
  static String? dateOfBirth(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final date = DateTime.tryParse(value);
    if (date == null) {
      return message ?? 'Please enter a valid date';
    }
    
    final now = DateTime.now();
    final age = now.year - date.year;
    
    // Check if person is at least 18 years old
    if (age < 18 || (age == 18 && now.month < date.month) || 
        (age == 18 && now.month == date.month && now.day < date.day)) {
      return 'You must be at least 18 years old';
    }
    
    // Check if date is not in the future
    if (date.isAfter(now)) {
      return 'Date of birth cannot be in the future';
    }
    
    // Check if person is not older than 120 years
    if (age > 120) {
      return 'Please enter a valid date of birth';
    }
    
    return null;
  }

  /// Validate PIN (4-6 digits)
  static String? pin(String? value, [int length = 4, String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final pinRegex = RegExp(r'^\d{' '$length' r'}$');
    
    if (!pinRegex.hasMatch(value)) {
      return message ?? 'Please enter a valid $length-digit PIN';
    }
    return null;
  }

  /// Validate OTP (4-6 digits)
  static String? otp(String? value, [int length = 6, String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final otpRegex = RegExp(r'^\d{' '$length' r'}$');
    
    if (!otpRegex.hasMatch(value)) {
      return message ?? 'Please enter a valid $length-digit OTP';
    }
    return null;
  }

  /// Validate URL
  static String? url(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final urlRegex = RegExp(
      r'^https?:\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$',
    );
    
    if (!urlRegex.hasMatch(value)) {
      return message ?? 'Please enter a valid URL';
    }
    return null;
  }

  /// Validate alphabetic input (letters only)
  static String? alphabetic(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final alphaRegex = RegExp(r'^[a-zA-Z\s]+$');
    
    if (!alphaRegex.hasMatch(value)) {
      return message ?? 'Please enter letters only';
    }
    return null;
  }

  /// Validate alphanumeric input
  static String? alphanumeric(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final alphanumericRegex = RegExp(r'^[a-zA-Z0-9\s]+$');
    
    if (!alphanumericRegex.hasMatch(value)) {
      return message ?? 'Please enter letters and numbers only';
    }
    return null;
  }

  /// Validate credit card number (Luhn algorithm)
  static String? creditCard(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cleanCard = value.replaceAll(RegExp(r'[^\d]'), '');
    
    // Check length (13-19 digits for most cards)
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      return message ?? 'Please enter a valid credit card number';
    }
    
    // Luhn algorithm
    int sum = 0;
    bool alternate = false;
    
    for (int i = cleanCard.length - 1; i >= 0; i--) {
      int digit = int.parse(cleanCard[i]);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    if (sum % 10 != 0) {
      return message ?? 'Please enter a valid credit card number';
    }
    
    return null;
  }

  /// Validate CVV
  static String? cvv(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final cvvRegex = RegExp(r'^\d{3,4}$');
    
    if (!cvvRegex.hasMatch(value)) {
      return message ?? 'Please enter a valid CVV (3-4 digits)';
    }
    return null;
  }

  /// Validate name (no numbers or special characters except spaces, hyphens, apostrophes)
  static String? name(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final nameRegex = RegExp(r"^[a-zA-Z\s\-'\.]+$");
    
    if (!nameRegex.hasMatch(value)) {
      return message ?? 'Please enter a valid name';
    }
    
    // Check for minimum length
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    
    return null;
  }

  /// Validate required name
  static String? requiredName(String? value) {
    return required(value) ?? name(value);
  }

  /// Custom validator combiner
  static String? Function(String?) combine(List<String? Function(String?)> validators) {
    return (String? value) {
      for (final validator in validators) {
        final result = validator(value);
        if (result != null) return result;
      }
      return null;
    };
  }

  /// Conditional validator
  static String? Function(String?) when(
    bool condition,
    String? Function(String?) validator,
  ) {
    return (String? value) {
      if (condition) {
        return validator(value);
      }
      return null;
    };
  }

  /// Validate loan amount based on monthly income
  static String? loanAmount(String? value, double? monthlyIncome, [String? message]) {
    final amountError = requiredAmount(value);
    if (amountError != null) return amountError;
    
    if (monthlyIncome == null || monthlyIncome <= 0) {
      return 'Monthly income is required to validate loan amount';
    }
    
    final amount = double.parse(value!);
    final maxLoanAmount = monthlyIncome * 60; // 5 years max
    
    if (amount > maxLoanAmount) {
      return message ?? 'Loan amount cannot exceed 60 times your monthly income';
    }
    
    return null;
  }

  /// Validate EMI based on income
  static String? emiAffordability(double emiAmount, double monthlyIncome, [String? message]) {
    final maxEmi = monthlyIncome * 0.5; // 50% of income max
    
    if (emiAmount > maxEmi) {
      return message ?? 'EMI cannot exceed 50% of your monthly income';
    }
    
    return null;
  }

  /// Validate file size
  static String? fileSize(int? fileSizeInBytes, int maxSizeInMB, [String? message]) {
    if (fileSizeInBytes == null) return null;
    
    final maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (fileSizeInBytes > maxSizeInBytes) {
      return message ?? 'File size cannot exceed ${maxSizeInMB}MB';
    }
    
    return null;
  }

  /// Validate file type
  static String? fileType(String? fileName, List<String> allowedExtensions, [String? message]) {
    if (fileName == null || fileName.isEmpty) return null;
    
    final extension = fileName.split('.').last.toLowerCase();
    
    if (!allowedExtensions.contains(extension)) {
      return message ?? 'Only ${allowedExtensions.join(', ')} files are allowed';
    }
    
    return null;
  }

  /// Validate referral code format
  static String? referralCode(String? value, [String? message]) {
    if (value == null || value.isEmpty) return null;
    
    final referralRegex = RegExp(r'^[A-Z0-9]{6,10}$');
    
    if (!referralRegex.hasMatch(value.toUpperCase())) {
      return message ?? 'Please enter a valid referral code';
    }
    
    return null;
  }

  /// Validate withdrawal amount against balance
  static String? withdrawalAmount(String? value, double balance, double minAmount, [String? message]) {
    final amountError = requiredAmount(value);
    if (amountError != null) return amountError;
    
    final amount = double.parse(value!);
    
    if (amount < minAmount) {
      return 'Minimum withdrawal amount is BDT ${minAmount.toStringAsFixed(2)}';
    }
    
    if (amount > balance) {
      return message ?? 'Insufficient balance';
    }
    
    return null;
  }
}