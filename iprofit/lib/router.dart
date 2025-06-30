import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iprofit/presentation/widgets/common/custom_bottom_nav.dart';
import 'core/constants/route_constants.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/screens/splash/splash_screen.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/auth/signup_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';
import 'presentation/screens/profile/profile_screen.dart';
import 'presentation/screens/profile/edit_profile_screen.dart';
import 'presentation/screens/profile/kyc_screen.dart';
import 'presentation/screens/transactions/transactions_screen.dart';
import 'presentation/screens/transactions/deposit_screen.dart';
import 'presentation/screens/transactions/withdrawal_screen.dart';
import 'presentation/screens/loans/loans_screen.dart';
import 'presentation/screens/loans/apply_loan_screen.dart';
import 'presentation/screens/loans/loan_details_screen.dart';
import 'presentation/screens/loans/emi_calculator_screen.dart';
import 'presentation/screens/plans/plans_screen.dart';
import 'presentation/screens/notifications/notifications_screen.dart';
import 'presentation/screens/support/support_screen.dart';
import 'presentation/screens/support/create_ticket_screen.dart';
import 'presentation/screens/support/ticket_details_screen.dart';
import 'presentation/screens/news/news_screen.dart';
import 'presentation/screens/news/news_details_screen.dart';
import 'presentation/screens/referral/referral_screen.dart';
import 'presentation/screens/settings/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: RouteConstants.splash,
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isOnboardingCompleted = authState.isOnboardingCompleted;

      // If not onboarded, go to splash
      if (!isOnboardingCompleted) {
        return RouteConstants.splash;
      }

      // If not logged in and trying to access protected routes
      if (!isLoggedIn && !_isPublicRoute(state.fullPath!)) {
        return RouteConstants.login;
      }

      // If logged in and trying to access auth routes
      if (isLoggedIn && _isAuthRoute(state.fullPath!)) {
        return RouteConstants.dashboard;
      }

      return null;
    },
    routes: [
      // Splash
      GoRoute(
        path: RouteConstants.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Auth Routes
      GoRoute(
        path: RouteConstants.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteConstants.signup,
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),

      // Main App Routes
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: RouteConstants.dashboard,
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: RouteConstants.transactions,
            name: 'transactions',
            builder: (context, state) => const TransactionsScreen(),
            routes: [
              GoRoute(
                path: '/deposit',
                name: 'deposit',
                builder: (context, state) => const DepositScreen(),
              ),
              GoRoute(
                path: '/withdrawal',
                name: 'withdrawal',
                builder: (context, state) => const WithdrawalScreen(),
              ),
            ],
          ),
          GoRoute(
            path: RouteConstants.loans,
            name: 'loans',
            builder: (context, state) => const LoansScreen(),
            routes: [
              GoRoute(
                path: '/apply',
                name: 'apply-loan',
                builder: (context, state) => const ApplyLoanScreen(),
              ),
              GoRoute(
                path: '/details/:id',
                name: 'loan-details',
                builder: (context, state) =>
                    LoanDetailsScreen(loanId: state.pathParameters['id']!),
              ),
              GoRoute(
                path: '/calculator',
                name: 'emi-calculator',
                builder: (context, state) => const EmiCalculatorScreen(),
              ),
            ],
          ),
          GoRoute(
            path: RouteConstants.profile,
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
            routes: [
              GoRoute(
                path: '/edit',
                name: 'edit-profile',
                builder: (context, state) => const EditProfileScreen(),
              ),
              GoRoute(
                path: '/kyc',
                name: 'kyc',
                builder: (context, state) => const KycScreen(),
              ),
            ],
          ),
          GoRoute(
            path: RouteConstants.plans,
            name: 'plans',
            builder: (context, state) => const PlansScreen(),
          ),
          GoRoute(
            path: RouteConstants.notifications,
            name: 'notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: RouteConstants.support,
            name: 'support',
            builder: (context, state) => const SupportScreen(),
            routes: [
              GoRoute(
                path: '/create',
                name: 'create-ticket',
                builder: (context, state) => const CreateTicketScreen(),
              ),
              GoRoute(
                path: '/ticket/:id',
                name: 'ticket-details',
                builder: (context, state) =>
                    TicketDetailsScreen(ticketId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: RouteConstants.news,
            name: 'news',
            builder: (context, state) => const NewsScreen(),
            routes: [
              GoRoute(
                path: '/details/:id',
                name: 'news-details',
                builder: (context, state) =>
                    NewsDetailsScreen(newsId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: RouteConstants.referral,
            name: 'referral',
            builder: (context, state) => const ReferralScreen(),
          ),
          GoRoute(
            path: RouteConstants.settings,
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
  );
});

bool _isPublicRoute(String path) {
  const publicRoutes = [
    RouteConstants.splash,
    RouteConstants.login,
    RouteConstants.signup,
  ];
  return publicRoutes.contains(path);
}

bool _isAuthRoute(String path) {
  const authRoutes = [RouteConstants.login, RouteConstants.signup];
  return authRoutes.contains(path);
}

// Main Shell with Bottom Navigation
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: child, bottomNavigationBar: const CustomBottomNav());
  }
}
