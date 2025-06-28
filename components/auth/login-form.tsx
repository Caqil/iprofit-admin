"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Chrome,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Validation schema using your existing patterns
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
  userType: z.enum(["admin", "user"]),
  twoFactorToken: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 6,
      "Two-factor code must be 6 digits"
    ),
  rememberMe: z.boolean(),
  deviceId: z.string().optional(),
  fingerprint: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  defaultUserType?: "admin" | "user";
  redirectUrl?: string;
  className?: string;
  showUserTypeSelector?: boolean;
  onSuccess?: (userType: "admin" | "user") => void;
}

interface DeviceInfo {
  deviceId: string;
  fingerprint: string;
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
}

export function LoginForm({
  defaultUserType = "admin",
  redirectUrl,
  className,
  showUserTypeSelector = true,
  onSuccess,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showTwoFactor, setShowTwoFactor] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo | null>(null);
  const [loginAttempts, setLoginAttempts] = React.useState(0);
  const [isBlocked, setIsBlocked] = React.useState(false);

  // Get error and callback URL from search params
  const authError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || redirectUrl;

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      userType: defaultUserType,
      twoFactorToken: "",
      rememberMe: false,
    },
  });

  const userType = form.watch("userType");

  // Generate device fingerprint on component mount
  React.useEffect(() => {
    const generateDeviceInfo = async () => {
      try {
        // Generate device fingerprint using browser characteristics
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx!.textBaseline = "top";
        ctx!.font = "14px Arial";
        ctx!.fillText("Device fingerprint", 2, 2);
        const canvasFingerprint = canvas.toDataURL();

        const fingerprint = btoa(
          JSON.stringify({
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            canvas: canvasFingerprint.slice(-50), // Last 50 chars
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as any).deviceMemory || 0,
          })
        );

        const deviceId =
          localStorage.getItem("deviceId") ||
          "dev_" +
            Math.random().toString(36).substring(2) +
            Date.now().toString(36);

        if (!localStorage.getItem("deviceId")) {
          localStorage.setItem("deviceId", deviceId);
        }

        const info: DeviceInfo = {
          deviceId,
          fingerprint,
          userAgent: navigator.userAgent,
          screen: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        };

        setDeviceInfo(info);
        form.setValue("deviceId", deviceId);
        form.setValue("fingerprint", fingerprint);
      } catch (error) {
        console.error("Failed to generate device info:", error);
        toast.error(
          "Device verification failed. Please refresh and try again."
        );
      }
    };

    generateDeviceInfo();
  }, [form]);

  // Handle auth errors from URL params
  React.useEffect(() => {
    if (authError) {
      const errorMessages: Record<string, string> = {
        CredentialsSignin: "Invalid email or password",
        SessionExpired: "Your session has expired. Please login again.",
        TwoFactorRequired: "Two-factor authentication required",
        InvalidTwoFactor: "Invalid two-factor authentication code",
        AccountBlocked:
          "Account temporarily blocked due to multiple failed attempts",
        DeviceNotRecognized:
          "Device not recognized. Please verify your identity.",
        Default: "An error occurred during login. Please try again.",
      };

      setError(errorMessages[authError] || errorMessages.Default);

      if (authError === "TwoFactorRequired") {
        setShowTwoFactor(true);
      }

      if (authError === "AccountBlocked") {
        setIsBlocked(true);
      }

      // Clear error from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [authError]);

  const onSubmit = async (data: LoginFormData) => {
    if (isBlocked) {
      toast.error("Account temporarily blocked. Please try again later.");
      return;
    }

    if (!deviceInfo && data.userType === "user") {
      toast.error(
        "Device verification required. Please refresh and try again."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const signInData = {
        email: data.email,
        password: data.password,
        userType: data.userType,
        twoFactorToken: data.twoFactorToken,
        deviceId: data.deviceId,
        fingerprint: data.fingerprint,
        redirect: false,
      };

      const result = await signIn("credentials", signInData);

      if (result?.error) {
        setLoginAttempts((prev) => prev + 1);

        // Handle specific errors
        if (result.error === "TwoFactorRequired") {
          setShowTwoFactor(true);
          setError("Please enter your two-factor authentication code");
          return;
        }

        if (result.error === "InvalidTwoFactor") {
          setError("Invalid two-factor authentication code. Please try again.");
          form.setValue("twoFactorToken", "");
          return;
        }

        if (result.error === "AccountBlocked") {
          setIsBlocked(true);
          setError(
            "Account temporarily blocked due to multiple failed attempts"
          );
          return;
        }

        // Block after 5 failed attempts
        if (loginAttempts >= 4) {
          setIsBlocked(true);
          setError("Too many failed attempts. Account temporarily blocked.");
          return;
        }

        setError(result.error);
        return;
      }

      if (result?.ok) {
        toast.success("Login successful!");

        // Reset attempts on successful login
        setLoginAttempts(0);

        // Call success callback
        onSuccess?.(data.userType);

        // Redirect based on user type and callback URL
        const redirectTo =
          callbackUrl ||
          (data.userType === "admin" ? "/dashboard" : "/user/dashboard");

        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserTypeChange = (newUserType: "admin" | "user") => {
    form.setValue("userType", newUserType);
    form.setValue("twoFactorToken", "");
    setShowTwoFactor(false);
    setError(null);
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    if (userType !== "user") {
      toast.error("Social login is only available for user accounts");
      return;
    }

    setIsLoading(true);
    try {
      await signIn(provider, {
        callbackUrl: callbackUrl || "/user/dashboard",
        redirect: true,
      });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      toast.error(`${provider} login failed. Please try again.`);
      setIsLoading(false);
    }
  };

  const getRemainingAttempts = () => Math.max(0, 5 - loginAttempts);
  const getBlockTimeRemaining = () => {
    // In a real app, this would come from the server
    return "15 minutes";
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your {userType === "admin" ? "admin" : "user"} account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Type Selector */}
        {showUserTypeSelector && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={userType === "admin" ? "default" : "outline"}
              onClick={() => handleUserTypeChange("admin")}
              disabled={isLoading}
              className="h-12"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Button>
            <Button
              type="button"
              variant={userType === "user" ? "default" : "outline"}
              onClick={() => handleUserTypeChange("user")}
              disabled={isLoading}
              className="h-12"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              User
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Account Blocked Warning */}
        {isBlocked && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Account temporarily blocked for {getBlockTimeRemaining()}. Please
              contact support if you need immediate assistance.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Attempts Warning */}
        {loginAttempts > 0 && !isBlocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getRemainingAttempts()} attempt
              {getRemainingAttempts() !== 1 ? "s" : ""} remaining
            </AlertDescription>
          </Alert>
        )}

        {/* Device Info Display (for user login) */}
        {userType === "user" && deviceInfo && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Fingerprint className="mr-2 h-4 w-4" />
              Device verification enabled
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {deviceInfo.screen}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {deviceInfo.language}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {deviceInfo.timezone}
              </Badge>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="admin@example.com"
                      autoComplete="email"
                      disabled={isLoading || isBlocked}
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
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={isLoading || isBlocked}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading || isBlocked}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
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
                      <InputOTP
                        maxLength={6}
                        {...field}
                        disabled={isLoading || isBlocked}
                      >
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
                      disabled={isLoading || isBlocked}
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
              disabled={isLoading || isBlocked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>

        {/* Social Login (only for users) */}
        {userType === "user" && (
          <>
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading || isBlocked}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin("facebook")}
                disabled={isLoading || isBlocked}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Facebook
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          <Link
            href="/forgot-password"
            className="hover:text-primary underline underline-offset-4"
          >
            Forgot your password?
          </Link>
        </div>

        {userType === "user" && (
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="hover:text-primary underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-xs text-center text-muted-foreground mt-4 p-2 bg-muted rounded">
          <CheckCircle className="inline-block mr-1 h-3 w-3" />
          Your connection is secured with SSL encryption
        </div>
      </CardFooter>
    </Card>
  );
}
