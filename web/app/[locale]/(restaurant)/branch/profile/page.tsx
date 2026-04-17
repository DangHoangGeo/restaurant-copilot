"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import { PasswordChangeForm } from "@/components/features/profile/PasswordChangeForm";
import { TwoFactorAuthForm } from "@/components/features/profile/TwoFactorAuthForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurant_id: string;
  two_factor_enabled: boolean;
  created_at: string;
}

interface Restaurant {
  id: string;
  name: string;
  subdomain: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export default function ProfilePage() {
  const t = useTranslations("owner.profile");
  const tCommon = useTranslations("common");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Not authenticated");
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error("Failed to fetch user profile");
      }

      // Get restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, subdomain, email, phone, address, website")
        .eq("id", profileData.restaurant_id)
        .single();

      if (restaurantError) {
        throw new Error("Failed to fetch restaurant details");
      }

      setUserProfile(profileData);
      setRestaurant(restaurantData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleProfileUpdate = (updatedProfile: Partial<UserProfile>) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, ...updatedProfile });
      toast.success(t("profileUpdated"));
    }
  };

  const handlePasswordChanged = () => {
    toast.success(t("passwordChanged"));
  };

  const handleTwoFactorChanged = (enabled: boolean) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, two_factor_enabled: enabled });
      toast.success(enabled ? t("twoFactorEnabled") : t("twoFactorDisabled"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600 dark:text-slate-400">
            {tCommon("loading")}
          </span>
        </div>
      </div>
    );
  }

  if (error || !userProfile || !restaurant) {
    return (
      <div className="container mx-auto p-6">
        <AuthCard
          title={t("title")}
          description={t("errorLoading")}
        >
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {error || t("failedToLoad")}
            </p>
          </div>
          <Button onClick={fetchUserData} className="w-full">
            {tCommon("retry")}
          </Button>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t("title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {userProfile.name || userProfile.email}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t("roleOwner")} at {restaurant.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {userProfile.email}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center text-sm">
                <Shield className="w-4 h-4 mr-2" />
                <span className={userProfile.two_factor_enabled ? "text-green-600" : "text-orange-600"}>
                  2FA {userProfile.two_factor_enabled ? t("enabled") : t("disabled")}
                </span>
                {userProfile.two_factor_enabled ? (
                  <CheckCircle className="w-4 h-4 ml-1 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 ml-1 text-orange-600" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.security")}</span>
          </TabsTrigger>
          <TabsTrigger value="authentication" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.authentication")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("profileInfo.title")}
              </CardTitle>
              <CardDescription>
                {t("profileInfo.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                userProfile={userProfile}
                restaurant={restaurant}
                onUpdate={handleProfileUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t("security.title")}
              </CardTitle>
              <CardDescription>
                {t("security.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordChangeForm onPasswordChanged={handlePasswordChanged} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Two-Factor Authentication Tab */}
        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("twoFactor.title")}
              </CardTitle>
              <CardDescription>
                {t("twoFactor.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TwoFactorAuthForm
                currentStatus={userProfile.two_factor_enabled}
                onStatusChanged={handleTwoFactorChanged}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}