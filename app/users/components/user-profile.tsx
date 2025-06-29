"use client";

import React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  CreditCard,
  User,
} from "lucide-react";
import { UserProfile as UserProfileType } from "@/types";

interface UserProfileProps {
  userProfile: UserProfileType;
  onUpdate: () => void;
  canEdit: boolean;
}

export function UserProfile({
  userProfile,
  onUpdate,
  canEdit,
}: UserProfileProps) {
  const { user, plan, statistics } = userProfile;

  const getVerificationIcon = (verified: boolean) => {
    return verified ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Personal Information</span>
          </CardTitle>
          <CardDescription>
            User's personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Full Name
                </label>
                <div className="mt-1 text-sm">{user.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email Address
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                  {getVerificationIcon(user.emailVerified)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.phone}</span>
                  {getVerificationIcon(user.phoneVerified)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Date of Birth
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString()
                      : "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Referral Code
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="font-mono">
                    {user.referralCode}
                  </Badge>
                </div>
              </div>
              {user.referredBy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Referred By
                  </label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="font-mono">
                      {user.referredBy}
                    </Badge>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Device ID
                </label>
                <div className="mt-1 text-sm font-mono text-muted-foreground">
                  {user.deviceId}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Two-Factor Authentication
                </label>
                <div className="mt-1">
                  <Badge
                    variant={user.twoFactorEnabled ? "default" : "secondary"}
                  >
                    {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {user.address && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">
                Address
              </label>
              <div className="mt-1 flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  {user.address.street}
                  <br />
                  {user.address.city}, {user.address.state}
                  <br />
                  {user.address.country} {user.address.zipCode}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>
            Account status, plan details, and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Account Status
                </label>
                <div className="mt-1">
                  <Badge
                    className={
                      user.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : user.status === "Suspended"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  KYC Status
                </label>
                <div className="mt-1">
                  <Badge
                    className={
                      user.kycStatus === "Approved"
                        ? "bg-green-100 text-green-800"
                        : user.kycStatus === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {user.kycStatus}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Balance
                </label>
                <div className="mt-1 text-2xl font-semibold text-green-600">
                  ${user.balance.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Plan
                </label>
                <div className="mt-1">
                  {plan ? (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">{plan.name}</Badge>
                      {plan.price && (
                        <span className="text-sm text-muted-foreground">
                          ${plan.price}/{plan.duration ? `${plan.duration} days` : 'month'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No plan assigned
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Login
                </label>
                <div className="mt-1 text-sm">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "Never"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Account Created
                </label>
                <div className="mt-1 text-sm">
                  {new Date(user.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {user.kycRejectionReason && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">
                KYC Rejection Reason
              </label>
              <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  {user.kycRejectionReason}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>
            Overview of user activity and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${statistics.totalDeposits.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Deposits
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                ${statistics.totalWithdrawals.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Withdrawals
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ${statistics.totalProfit.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {statistics.totalReferrals}
              </div>
              <div className="text-xs text-muted-foreground">Referrals</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
