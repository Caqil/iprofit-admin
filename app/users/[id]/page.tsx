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

      await fetchUserProfile();
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleKYCAction = async (
    action: "approve" | "reject",
    reason?: string
  ) => {
    try {
      const response = await fetch(`/api/users/${userId}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, rejectionReason: reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} KYC`);
      }

      await fetchUserProfile();
      toast.success(`KYC ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} KYC`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Suspended":
        return "bg-orange-100 text-orange-800";
      case "Banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight">
              {userProfile.user.name}
            </h1>
            <p className="text-muted-foreground">{userProfile.user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/users/${userId}/edit`)}
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
                onClick={() =>
                  router.push(`/dashboard/users/${userId}/transactions`)
                }
              >
                View Transactions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* User Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile.user.profilePicture} />
              <AvatarFallback className="text-lg">
                {userProfile.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold">
                  {userProfile.user.name}
                </h2>
                <Badge className={getStatusColor(userProfile.user.status)}>
                  {userProfile.user.status}
                </Badge>
                <Badge
                  className={getKYCStatusColor(userProfile.user.kycStatus)}
                >
                  KYC {userProfile.user.kycStatus}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{userProfile.user.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Balance: ${userProfile.user.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Joined{" "}
                    {new Date(userProfile.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deposits
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${userProfile.statistics.totalDeposits.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Withdrawals
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${userProfile.statistics.totalWithdrawals.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile.statistics.totalReferrals}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Age</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(userProfile.statistics.accountAge)} days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="kyc">
            KYC Verification
            {userProfile.user.kycStatus === "Pending" && (
              <Badge variant="secondary" className="ml-2">
                Pending
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <UserProfile
            userProfile={userProfile}
            onUpdate={fetchUserProfile}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="kyc">
          <KYCVerification
            user={userProfile.user}
            onKYCAction={handleKYCAction}
            canManage={canManageKYC}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistory
            userId={userId}
            recentTransactions={userProfile.recentTransactions}
          />
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referrals</CardTitle>
              <CardDescription>
                Users referred by {userProfile.user.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userProfile.referrals.length > 0 ? (
                <div className="space-y-4">
                  {userProfile.referrals.map((referral) => (
                    <div
                      key={referral.refereeId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {referral.refereeName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {referral.refereeEmail}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(referral.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${referral.bonusEarned}
                        </div>
                        <Badge
                          variant={
                            referral.status === "Active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {referral.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No referrals yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
