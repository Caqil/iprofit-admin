import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/config/auth";
import { LoginPageClient } from "./components/login-form";

export const metadata: Metadata = {
  title: "Login | IProfit Admin Panel",
  description:
    "Sign in to your IProfit admin account to access the dashboard and manage your platform.",
  keywords: ["login", "admin", "authentication", "iprofit", "dashboard"],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Login | IProfit Admin Panel",
    description: "Sign in to your IProfit admin account",
    type: "website",
    url: "/login",
  },
  twitter: {
    card: "summary",
    title: "Login | IProfit Admin Panel",
    description: "Sign in to your IProfit admin account",
  },
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    userType?: "admin" | "user";
    message?: string;
  }>;
}

export default async function LoginPage(props: LoginPageProps) {
  // Await searchParams to comply with Next.js 15 requirements
  const searchParams = await props.searchParams;

  // Check if user is already authenticated
  const session = await getServerSession(authOptions);

  if (session) {
    // Redirect authenticated users to appropriate dashboard
    const userType = session.user?.userType;
    const redirectUrl =
      searchParams.callbackUrl ||
      (userType === "admin" ? "/dashboard" : "/user/dashboard");

    redirect(redirectUrl);
  }

  return <LoginPageClient searchParams={searchParams} />;
}
