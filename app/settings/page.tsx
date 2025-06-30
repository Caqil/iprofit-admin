// app/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Shield,
  DollarSign,
  Mail,
  Upload,
  Users,
  Server,
  Wrench,
  Search,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Setting, SettingCategory } from "@/types/settings";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";

const categoryIcons: Record<SettingCategory, React.ReactNode> = {
  system: <SettingsIcon className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  business: <Users className="h-4 w-4" />,
  api: <Server className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
};

const categoryLabels: Record<SettingCategory, string> = {
  system: "System",
  security: "Security",
  financial: "Financial",
  email: "Email",
  upload: "Upload",
  business: "Business",
  api: "API",
  maintenance: "Maintenance",
};

const categoryDescriptions: Record<SettingCategory, string> = {
  system: "Core application settings and configuration",
  security: "Authentication, authorization and security settings",
  financial: "Currency, rates, limits and financial configuration",
  email: "SMTP settings, templates and email configuration",
  upload: "File upload limits, types and storage settings",
  business: "Business rules, KYC, tasks and operational settings",
  api: "API configuration, rate limits and external services",
  maintenance: "System maintenance, backups and logging",
};

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] =
    useState<SettingCategory>("system");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [modifiedSettings, setModifiedSettings] = useState<Record<string, any>>(
    {}
  );

  const { groupedSettings, isLoading, error, updateSetting } = useSettings(
    { search: searchQuery },
    undefined,
    true
  );

  const handleSettingChange = (settingId: string, newValue: any) => {
    setModifiedSettings((prev) => ({
      ...prev,
      [settingId]: newValue,
    }));
  };

  const handleSaveSetting = async (setting: Setting) => {
    const newValue = modifiedSettings[setting._id];
    if (newValue === undefined) return;

    try {
      await updateSetting(setting._id, {
        value: newValue,
        updatedBy: "current-admin-id", // This should come from auth context
      });

      // Remove from modified settings after successful save
      setModifiedSettings((prev) => {
        const updated = { ...prev };
        delete updated[setting._id];
        return updated;
      });
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  };

  const handleResetSetting = (settingId: string) => {
    setModifiedSettings((prev) => {
      const updated = { ...prev };
      delete updated[settingId];
      return updated;
    });
  };

  const getDisplayValue = (setting: Setting) => {
    return modifiedSettings[setting._id] !== undefined
      ? modifiedSettings[setting._id]
      : setting.value;
  };

  const isModified = (settingId: string) => {
    return modifiedSettings[settingId] !== undefined;
  };

  const renderSettingInput = (setting: Setting) => {
    const currentValue = getDisplayValue(setting);
    const isPassword =
      setting.isEncrypted ||
      setting.key.toLowerCase().includes("password") ||
      setting.key.toLowerCase().includes("secret");

    if (!setting.isEditable) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            value={currentValue?.toString() || ""}
            disabled
            className="flex-1"
          />
          <Badge variant="secondary">Read Only</Badge>
        </div>
      );
    }

    switch (setting.dataType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={currentValue === true}
              onCheckedChange={(checked) =>
                handleSettingChange(setting._id, checked)
              }
            />
            <Label>{currentValue ? "Enabled" : "Disabled"}</Label>
            {isModified(setting._id) && (
              <Badge variant="outline">Modified</Badge>
            )}
          </div>
        );

      case "number":
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={currentValue?.toString() || ""}
              onChange={(e) =>
                handleSettingChange(
                  setting._id,
                  parseFloat(e.target.value) || 0
                )
              }
              className="flex-1"
              min={setting.validation?.min}
              max={setting.validation?.max}
            />
            {isModified(setting._id) && (
              <Badge variant="outline">Modified</Badge>
            )}
          </div>
        );

      case "array":
        return (
          <div className="space-y-2">
            <Textarea
              value={Array.isArray(currentValue) ? currentValue.join("\n") : ""}
              onChange={(e) =>
                handleSettingChange(
                  setting._id,
                  e.target.value.split("\n").filter(Boolean)
                )
              }
              placeholder="One item per line"
              rows={4}
            />
            {isModified(setting._id) && (
              <Badge variant="outline">Modified</Badge>
            )}
          </div>
        );

      case "object":
        return (
          <div className="space-y-2">
            <Textarea
              value={
                typeof currentValue === "object"
                  ? JSON.stringify(currentValue, null, 2)
                  : "{}"
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleSettingChange(setting._id, parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="JSON object"
              rows={6}
              className="font-mono text-sm"
            />
            {isModified(setting._id) && (
              <Badge variant="outline">Modified</Badge>
            )}
          </div>
        );

      default: // string
        if (setting.validation?.enum && setting.validation.enum.length > 0) {
          return (
            <div className="flex items-center space-x-2">
              <Select
                value={currentValue?.toString() || ""}
                onValueChange={(value) =>
                  handleSettingChange(setting._id, value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {setting.validation.enum.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isModified(setting._id) && (
                <Badge variant="outline">Modified</Badge>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                type={isPassword && !showPasswords ? "password" : "text"}
                value={currentValue?.toString() || ""}
                onChange={(e) =>
                  handleSettingChange(setting._id, e.target.value)
                }
                pattern={setting.validation?.pattern}
                className="pr-10"
              />
              {isPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {isModified(setting._id) && (
              <Badge variant="outline">Modified</Badge>
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading settings: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = groupedSettings
    ? (Object.keys(groupedSettings) as SettingCategory[])
    : [];
  const currentCategorySettings = groupedSettings?.[activeCategory] || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage system configuration and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showPasswords ? "Hide" : "Show"} Passwords
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(value) => setActiveCategory(value as SettingCategory)}
      >
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="flex items-center space-x-1"
            >
              {categoryIcons[category]}
              <span className="hidden sm:inline">
                {categoryLabels[category]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {categoryIcons[category]}
                  <span>{categoryLabels[category]} Settings</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {categoryDescriptions[category]}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentCategorySettings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No settings found in this category
                  </div>
                ) : (
                  currentCategorySettings.map((setting) => (
                    <div
                      key={setting._id}
                      className="space-y-2 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">
                            {setting.key}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isModified(setting._id) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetSetting(setting._id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveSetting(setting)}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="pt-2">{renderSettingInput(setting)}</div>
                      {setting.validation && (
                        <div className="text-xs text-muted-foreground">
                          {setting.validation.required && (
                            <span>• Required </span>
                          )}
                          {setting.validation.min !== undefined && (
                            <span>• Min: {setting.validation.min} </span>
                          )}
                          {setting.validation.max !== undefined && (
                            <span>• Max: {setting.validation.max} </span>
                          )}
                          {setting.validation.pattern && (
                            <span>
                              • Pattern: {setting.validation.pattern}{" "}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
