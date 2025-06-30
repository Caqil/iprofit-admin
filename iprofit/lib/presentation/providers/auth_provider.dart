import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/auth/login_request.dart';
import '../../data/models/auth/login_response.dart';
import '../../data/models/auth/signup_request.dart';
import '../../data/repositories/auth_repository.dart';
import '../../services/storage_service.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final bool isOnboardingCompleted;
  final String? error;
  final LoginResponse? user;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.isOnboardingCompleted = false,
    this.error,
    this.user,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    bool? isOnboardingCompleted,
    String? error,
    LoginResponse? user,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      isOnboardingCompleted:
          isOnboardingCompleted ?? this.isOnboardingCompleted,
      error: error,
      user: user ?? this.user,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;

  AuthNotifier(this._authRepository) : super(const AuthState()) {
    _initializeAuth();
  }

  void _initializeAuth() {
    final isOnboarded = StorageService.isOnboardingCompleted();
    final token = StorageService.getAccessToken();
    final userProfile = StorageService.getUserProfile();

    state = state.copyWith(
      isOnboardingCompleted: isOnboarded,
      isAuthenticated: token != null,
      user: userProfile != null ? LoginResponse.fromJson(userProfile) : null,
    );
  }

  Future<void> login(LoginRequest request) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _authRepository.login(request);

      await StorageService.saveAuthTokens(
        accessToken: response.tokens!.accessToken,
        refreshToken: response.tokens?.refreshToken,
      );

      await StorageService.saveUserProfile(response.toJson());

      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        user: response,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> signup(SignupRequest request) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _authRepository.signup(request);

      // After successful signup, automatically login
      await login(
        LoginRequest(
          email: request.email,
          password: request.password,
          userType: 'user',
          deviceId: request.deviceId,
          fingerprint: request.fingerprint,
        ),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await _authRepository.logout();
    } catch (e) {
      // Continue with logout even if API call fails
    }

    await StorageService.clearAuthTokens();
    await StorageService.clearUserData();

    state = state.copyWith(isAuthenticated: false, user: null);
  }

  Future<void> completeOnboarding() async {
    await StorageService.setOnboardingCompleted();
    state = state.copyWith(isOnboardingCompleted: true);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});
