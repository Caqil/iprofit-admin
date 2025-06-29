"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield, AlertCircle, CheckCircle } from "lucide-react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Login schema based on your validation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  userType: z.enum(["admin", "user"]),
  twoFactorToken: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
  deviceId: z.string().optional(),
  fingerprint: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    deviceId: string;
    fingerprint: string;
  } | null>(null);

  const callbackUrl = searchParams.get("callbackUrl");
  const error = searchParams.get("error");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      userType: "admin",
      twoFactorToken: "",
      rememberMe: false,
    },
  });

  // Initialize device fingerprinting
  useEffect(() => {
    const initDeviceFingerprinting = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        const deviceInfo = {
          deviceId: result.visitorId,
          fingerprint: result.visitorId,
        };

        setDeviceInfo(deviceInfo);

        // Update form with device info
        form.setValue("deviceId", deviceInfo.deviceId);
        form.setValue("fingerprint", deviceInfo.fingerprint);
      } catch (error) {
        console.error("Failed to initialize device fingerprinting:", error);
        toast.error("Device verification failed. Please refresh the page.");
      }
    };

    initDeviceFingerprinting();
  }, [form]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const userType = session.user.userType;
          const redirectUrl =
            callbackUrl ||
            (userType === "admin" ? "/dashboard" : "/user/dashboard");

          // Use window.location for immediate redirect
          window.location.href = redirectUrl;
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    // Only check session if not already loading
    if (!isLoading) {
      checkSession();
    }
  }, [callbackUrl]);

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      switch (error) {
        case "CredentialsSignin":
          toast.error("Invalid email or password");
          break;
        case "SessionExpired":
          toast.error("Your session has expired. Please login again.");
          break;
        case "AccessDenied":
          toast.error("Access denied. Please check your permissions.");
          break;
        case "TwoFactorRequired":
          setShowTwoFactor(true);
          toast.info("Please enter your two-factor authentication code");
          break;
        default:
          toast.error("An error occurred during login");
      }
    }
  }, [error]);

  const onSubmit = async (data: LoginFormData) => {
    if (!deviceInfo && data.userType === "user") {
      toast.error("Device verification required. Please refresh the page.");
      return;
    }

    setIsLoading(true);

    try {
      // For user login, ensure device info is included
      const loginData = {
        email: data.email,
        password: data.password,
        userType: data.userType,
        twoFactorToken: data.twoFactorToken,
        rememberMe: data.rememberMe,
        ...(data.userType === "user" && deviceInfo ? deviceInfo : {}),
      };

      const result = await signIn("credentials", {
        ...loginData,
        redirect: false,
        callbackUrl:
          callbackUrl ||
          (data.userType === "admin" ? "/dashboard" : "/user/dashboard"),
      });

      if (result?.error) {
        switch (result.error) {
          case "TwoFactorRequired":
            setShowTwoFactor(true);
            toast.info("Please enter your two-factor authentication code");
            break;
          case "CredentialsSignin":
            toast.error("Invalid email or password");
            break;
          case "DeviceLimitExceeded":
            toast.error("Multiple accounts detected. Please contact support.");
            break;
          case "AccountLocked":
            toast.error("Account is locked due to multiple failed attempts");
            break;
          case "AccountSuspended":
            toast.error("Account is suspended. Please contact support.");
            break;
          default:
            toast.error(result.error || "Login failed");
        }
        return;
      }

      if (result?.ok) {
        toast.success("Login successful!");

        // Wait a moment for session to be established
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force refresh the session
        const session = await getSession();
        if (session?.user) {
          // Determine redirect URL based on user type
          const redirectUrl =
            callbackUrl ||
            (session.user.userType === "admin"
              ? "/dashboard"
              : "/user/dashboard");

          // Use router.push instead of replace for better navigation
          window.location.href = redirectUrl;
        } else {
          // Fallback redirect
          const redirectUrl =
            callbackUrl ||
            (data.userType === "admin" ? "/dashboard" : "/user/dashboard");

          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserTypeChange = (userType: "admin" | "user") => {
    form.setValue("userType", userType);
    // Reset form when switching user types
    form.setValue("email", "");
    form.setValue("password", "");
    form.setValue("twoFactorToken", "");
    setShowTwoFactor(false);
  };

  const currentUserType = form.watch("userType");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              IProfit Platform
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        {/* User Type Toggle */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => handleUserTypeChange("admin")}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
              currentUserType === "admin"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            Admin Login
          </button>
          <button
            type="button"
            onClick={() => handleUserTypeChange("user")}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
              currentUserType === "user"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            User Login
          </button>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {currentUserType === "admin" ? "Admin" : "User"} Login
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your {currentUserType} account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Device Info Alert for Users */}
            {currentUserType === "user" && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {deviceInfo ? (
                    <span className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Device verified</span>
                    </span>
                  ) : (
                    "Verifying device security..."
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            disabled={isLoading}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Two-Factor Authentication */}
                {showTwoFactor && (
                  <FormField
                    control={form.control}
                    name="twoFactorToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Two-Factor Authentication Code</FormLabel>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Remember Me */}
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Remember me for 30 days
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading || (currentUserType === "user" && !deviceInfo)
                  }
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* OAuth Providers for Users */}
                {currentUserType === "user" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() =>
                          signIn("google", {
                            callbackUrl: callbackUrl || "/user/dashboard",
                            userType: "user",
                          })
                        }
                      >
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() =>
                          signIn("facebook", {
                            callbackUrl: callbackUrl || "/user/dashboard",
                            userType: "user",
                          })
                        }
                      >
                        Facebook
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>

            {/* Additional Links */}
            <div className="mt-6 text-center space-y-2">
              {currentUserType === "user" && (
                <p className="text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/signup")}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              )}
              <p className="text-sm">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot your password?
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            By signing in, you agree to our{" "}
            <button
              type="button"
              onClick={() => router.push("/terms")}
              className="text-blue-600 hover:text-blue-500"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => router.push("/privacy")}
              className="text-blue-600 hover:text-blue-500"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
