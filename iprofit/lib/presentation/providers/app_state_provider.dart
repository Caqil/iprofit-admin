import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class AppState {
  final bool isLoading;
  final bool isConnected;
  final ThemeMode themeMode;
  final String? error;

  const AppState({
    this.isLoading = false,
    this.isConnected = true,
    this.themeMode = ThemeMode.system,
    this.error,
  });

  AppState copyWith({
    bool? isLoading,
    bool? isConnected,
    ThemeMode? themeMode,
    String? error,
  }) {
    return AppState(
      isLoading: isLoading ?? this.isLoading,
      isConnected: isConnected ?? this.isConnected,
      themeMode: themeMode ?? this.themeMode,
      error: error,
    );
  }
}

class AppStateNotifier extends StateNotifier<AppState> {
  AppStateNotifier() : super(const AppState()) {
    _initializeConnectivity();
  }

  void _initializeConnectivity() {
    Connectivity().onConnectivityChanged.listen((result) {
      state = state.copyWith(isConnected: result != ConnectivityResult.none);
    });
  }

  void setLoading(bool isLoading) {
    state = state.copyWith(isLoading: isLoading);
  }

  void setError(String? error) {
    state = state.copyWith(error: error);
  }

  void setThemeMode(ThemeMode themeMode) {
    state = state.copyWith(themeMode: themeMode);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final appStateProvider = StateNotifierProvider<AppStateNotifier, AppState>((
  ref,
) {
  return AppStateNotifier();
});
