// app/users/[id]/page.tsx - FIXED VERSION
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Shield,
  DollarSign,
  Calendar,
  Activity,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfile as UserProfileType } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { UserProfile } from "../components/user-profile";
import { KYCVerification } from "../components/kyc-verification";
import { TransactionHistory } from "../components/transaction-history";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;

  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setUserProfile(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch user profile");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`User status updated to ${newStatus}`);
        fetchUserProfile(); // Refresh data
      } else {
        throw new Error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update user status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Error Loading User</h3>
          <p className="text-muted-foreground mt-2">
            {error || "User not found"}
          </p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = hasPermission(
    currentUser?.role || "Moderator",
    "users.update"
  );

  const canManageKYC = hasPermission(
    currentUser?.role || "Moderator",
    "users.kyc.approve"
  );

  const canViewTransactions = hasPermission(
    currentUser?.role || "Moderator",
    "transactions.view"
  );

  const user = userProfile.user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => {
                // FIXED: Remove /dashboard from the route
                router.push(`/users/${userId}/edit`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("Active")}
                  >
                    Activate User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("Suspended")}
                  >
                    Suspend User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("Banned")}
                  >
                    Ban User
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => {
                  // FIXED: Remove /dashboard from the route
                  router.push(`/users/${userId}/transactions`);
                }}
              >
                View Transactions
              </DropdownMenuItem>
              {canManageKYC && (
                <DropdownMenuItem
                  onClick={() => {
                    // FIXED: Remove /dashboard from the route
                    router.push(`/users/${userId}/kyc`);
                  }}
                >
                  Manage KYC
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* User Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Account Status
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  user.status === "Active"
                    ? "default"
                    : user.status === "Suspended"
                    ? "secondary"
                    : "destructive"
                }
              >
                {user.status}
              </Badge>
              <Badge
                variant={
                  user.kycStatus === "Approved"
                    ? "default"
                    : user.kycStatus === "Pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                KYC: {user.kycStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${user.balance?.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.plan?.name || "No Plan"}
            </div>
            <p className="text-xs text-muted-foreground">
              {user.plan?.price ? `$${user.plan.price}/month` : "Free"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Registration date</p>
          </CardContent>
        </Card>
      </div>

      {/* User Details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* User Information */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.profilePicture} alt={user.name} />
                  <AvatarFallback className="text-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {user._id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Referral Code: {user.referralCode}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.emailVerified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{user.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.phoneVerified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {user.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-xs text-muted-foreground">
                      {user.address.street && `${user.address.street}, `}
                      {user.address.city && `${user.address.city}, `}
                      {user.address.state && `${user.address.state}, `}
                      {user.address.country}
                      {user.address.zipCode && ` ${user.address.zipCode}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Other Details */}
              <div className="grid gap-4 md:grid-cols-2">
                {user.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium">Date of Birth</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-xs text-muted-foreground">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>

              {/* Security Settings */}
              <div>
                <p className="text-sm font-medium mb-2">Security Settings</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    Email {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge variant={user.phoneVerified ? "default" : "secondary"}>
                    Phone {user.phoneVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge
                    variant={user.twoFactorEnabled ? "default" : "secondary"}
                  >
                    2FA {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>User activity overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userProfile.statistics && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Deposits:
                    </span>
                    <span className="text-sm font-medium">
                      $
                      {userProfile.statistics.totalDeposits?.toLocaleString() ||
                        "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Withdrawals:
                    </span>
                    <span className="text-sm font-medium">
                      $
                      {userProfile.statistics.totalWithdrawals?.toLocaleString() ||
                        "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Profit:
                    </span>
                    <span className="text-sm font-medium">
                      $
                      {userProfile.statistics.totalProfit?.toLocaleString() ||
                        "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Referrals:
                    </span>
                    <span className="text-sm font-medium">
                      {userProfile.statistics.totalReferrals || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Referral Earnings:
                    </span>
                    <span className="text-sm font-medium">
                      $
                      {userProfile.statistics.referralEarnings?.toLocaleString() ||
                        "0.00"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Additional Information */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest user activities and system updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Account Created</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last Login</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.lastLogin).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              {userProfile.recentTransactions &&
              userProfile.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {userProfile.recentTransactions
                    .slice(0, 5)
                    .map((transaction) => (
                      <div
                        key={transaction._id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {transaction.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            ${transaction.amount.toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              transaction.status === "Approved"
                                ? "default"
                                : transaction.status === "Pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // FIXED: Remove /dashboard from the route
                      router.push(`/users/${userId}/transactions`);
                    }}
                  >
                    View All Transactions
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transactions found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referrals</CardTitle>
              <CardDescription>Users referred by this user</CardDescription>
            </CardHeader>
            <CardContent>
              {userProfile.referrals && userProfile.referrals.length > 0 ? (
                <div className="space-y-4">
                  {userProfile.referrals.map((referral) => (
                    <div
                      key={referral.refereeId}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {referral.refereeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {referral.refereeEmail}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${referral.bonusEarned.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No referrals found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
