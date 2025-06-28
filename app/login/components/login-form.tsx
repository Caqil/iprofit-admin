"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  AlertCircle,
  ArrowLeft,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Simple validation schema
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  userType: z.enum(["admin", "user"]),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageClientProps {
  searchParams: {
    callbackUrl?: string;
    error?: string;
    userType?: "admin" | "user";
    message?: string;
  };
}

export function LoginPageClient({ searchParams }: LoginPageClientProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      userType: searchParams.userType || "admin",
      rememberMe: false,
    },
  });

  const userType = form.watch("userType");

  // Handle URL error messages
  React.useEffect(() => {
    if (searchParams.error) {
      const errorMessages: Record<string, string> = {
        CredentialsSignin: "Invalid email or password",
        SessionExpired: "Your session has expired. Please login again.",
        AccessDenied: "You do not have permission to access this page.",
        Configuration: "There is a problem with the server configuration.",
        Default: "An error occurred during login. Please try again.",
      };

      setError(errorMessages[searchParams.error] || errorMessages.Default);
    }

    if (searchParams.message) {
      const messageMap: Record<string, string> = {
        session_expired: "Your session has expired. Please sign in again.",
        logged_out: "You have been successfully logged out.",
        verification_required:
          "Please verify your email address before continuing.",
      };

      const message = messageMap[searchParams.message];
      if (message) {
        toast.info(message);
      }
    }
  }, [searchParams.error, searchParams.message]);

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        userType: data.userType,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : result.error
        );
        return;
      }

      if (result?.ok) {
        toast.success("Login successful!");

        // Redirect based on user type and callback URL
        const redirectTo =
          searchParams.callbackUrl ||
          (data.userType === "admin" ? "/dashboard" : "/user/dashboard");

        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserTypeChange = (newUserType: "admin" | "user") => {
    form.setValue("userType", newUserType);
    setError(null);
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    signIn(provider, {
      callbackUrl: searchParams.callbackUrl || "/user/dashboard",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your {userType} account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={userType === "admin" ? "default" : "outline"}
                onClick={() => handleUserTypeChange("admin")}
                disabled={isLoading}
                className="h-10"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant={userType === "user" ? "default" : "outline"}
                onClick={() => handleUserTypeChange("user")}
                disabled={isLoading}
                className="h-10"
              >
                User
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register("email")}
                  disabled={isLoading}
                  className={cn(
                    form.formState.errors.email && "border-destructive"
                  )}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...form.register("password")}
                    disabled={isLoading}
                    className={cn(
                      form.formState.errors.password && "border-destructive"
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={handlePasswordToggle}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={form.watch("rememberMe")}
                  onCheckedChange={(checked) =>
                    form.setValue("rememberMe", checked as boolean)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me for 30 days
                </Label>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
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

            {/* Social Login for Users */}
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
                    disabled={isLoading}
                  >
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin("facebook")}
                    disabled={isLoading}
                  >
                    Facebook
                  </Button>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Forgot your password?
            </Link>

            {userType === "user" && (
              <div className="text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-primary hover:underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/support" className="hover:text-foreground">
              Support
            </Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            © 2024 IProfit Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
