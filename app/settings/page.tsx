// app/settings/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Edit,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Info,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Setting, SettingCategory } from "@/types/settings";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryConfig = {
  system: {
    icon: SettingsIcon,
    label: "System",
    description: "Core application settings and configuration",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  security: {
    icon: Shield,
    label: "Security",
    description: "Authentication, authorization and security settings",
    color: "text-red-600 bg-red-50 border-red-200",
  },
  financial: {
    icon: DollarSign,
    label: "Financial",
    description: "Currency, rates, limits and financial configuration",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  email: {
    icon: Mail,
    label: "Email",
    description: "SMTP settings and email configuration",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  upload: {
    icon: Upload,
    label: "Upload",
    description: "File upload limits, types and storage settings",
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  business: {
    icon: Users,
    label: "Business",
    description: "Business rules, KYC, tasks and operational settings",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  api: {
    icon: Server,
    label: "API",
    description: "API configuration and external services",
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    description: "System maintenance, backups and logging",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
} as const;

interface SettingFormData {
  value: any;
  reason?: string;
}

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] =
    useState<SettingCategory>("system");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [modifiedSettings, setModifiedSettings] = useState<
    Record<string, SettingFormData>
  >({});
  const [editingSettings, setEditingSettings] = useState<Set<string>>(
    new Set()
  );

  // Fetch grouped settings
  const { groupedSettings, isLoading, error, updateSetting, refreshSettings } =
    useSettings(undefined, undefined, true);

  // Get current category settings
  const currentCategorySettings = useMemo(() => {
    if (!groupedSettings?.[activeCategory]) return [];

    const settings = groupedSettings[activeCategory];

    if (searchQuery.trim()) {
      return settings.filter(
        (setting) =>
          setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          setting.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return settings;
  }, [groupedSettings, activeCategory, searchQuery]);

  // Calculate category stats
  const categoryStats = useMemo(() => {
    if (!groupedSettings) return {};

    const stats: Record<
      string,
      { total: number; editable: number; modified: number }
    > = {};

    Object.entries(groupedSettings).forEach(([category, settings]) => {
      stats[category] = {
        total: settings.length,
        editable: settings.filter((s) => s.isEditable).length,
        modified: settings.filter((s) => modifiedSettings[s._id]).length,
      };
    });

    return stats;
  }, [groupedSettings, modifiedSettings]);

  // Handle setting value change
  const handleSettingChange = (
    settingId: string,
    value: any,
    reason?: string
  ) => {
    setModifiedSettings((prev) => ({
      ...prev,
      [settingId]: { value, reason: reason || "Updated via settings panel" },
    }));
  };

  // Handle save individual setting
  const handleSaveSetting = async (setting: Setting) => {
    const modified = modifiedSettings[setting._id];
    if (!modified) return;

    try {
      await updateSetting(setting._id, {
        ...modified,
        updatedBy: "SuperAdmin",
      });
      setModifiedSettings((prev) => {
        const updated = { ...prev };
        delete updated[setting._id];
        return updated;
      });
      setEditingSettings((prev) => {
        const updated = new Set(prev);
        updated.delete(setting._id);
        return updated;
      });
      toast.success("Setting updated successfully");
    } catch (error) {
      toast.error("Failed to update setting");
      console.error("Save setting error:", error);
    }
  };

  // Handle save all modified settings
  const handleSaveAll = async () => {
    const modifiedEntries = Object.entries(modifiedSettings);
    if (modifiedEntries.length === 0) return;

    try {
      await Promise.all(
        modifiedEntries.map(([settingId, data]) =>
          updateSetting(settingId, { ...data, updatedBy: "SuperAdmin" })
        )
      );

      setModifiedSettings({});
      setEditingSettings(new Set());
      toast.success(`${modifiedEntries.length} settings updated successfully`);
    } catch (error) {
      toast.error("Failed to save settings");
      console.error("Save all error:", error);
    }
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setModifiedSettings({});
    setEditingSettings(new Set());
    toast.info("Changes discarded");
  };

  // Toggle editing mode for a setting
  const toggleEditMode = (settingId: string) => {
    setEditingSettings((prev) => {
      const updated = new Set(prev);
      if (updated.has(settingId)) {
        updated.delete(settingId);
      } else {
        updated.add(settingId);
      }
      return updated;
    });
  };

  // Render setting input based on data type
  const renderSettingInput = (setting: Setting) => {
    const isEditing = editingSettings.has(setting._id);
    const currentValue = modifiedSettings[setting._id]?.value ?? setting.value;
    const isModified = modifiedSettings[setting._id] !== undefined;
    const isSensitive =
      setting.isEncrypted ||
      setting.key.toLowerCase().includes("password") ||
      setting.key.toLowerCase().includes("secret");

    if (!isEditing) {
      // Display mode
      const displayValue =
        isSensitive && !showSensitive
          ? "••••••••"
          : typeof currentValue === "object"
          ? JSON.stringify(currentValue)
          : String(currentValue);

      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm bg-gray-50 px-2 py-1 rounded">
            {displayValue}
          </span>
          {setting.isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleEditMode(setting._id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }

    // Edit mode
    const commonProps = {
      value: currentValue,
      onChange: (newValue: any) => handleSettingChange(setting._id, newValue),
      className: cn(
        "min-w-0 flex-1",
        isModified && "border-orange-300 bg-orange-50"
      ),
    };

    switch (setting.dataType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-3">
            <Switch
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) =>
                handleSettingChange(setting._id, checked)
              }
            />
            <span className="text-sm">
              {currentValue ? "Enabled" : "Disabled"}
            </span>
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            min={setting.validation?.min}
            max={setting.validation?.max}
            {...commonProps}
            onChange={(e) =>
              handleSettingChange(setting._id, parseFloat(e.target.value) || 0)
            }
          />
        );

      case "array":
        return (
          <Textarea
            rows={3}
            placeholder="Enter array values as JSON"
            {...commonProps}
            value={JSON.stringify(currentValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(setting._id, parsed);
              } catch {
                // Allow invalid JSON while typing
                handleSettingChange(setting._id, e.target.value);
              }
            }}
          />
        );

      case "object":
        return (
          <Textarea
            rows={4}
            placeholder="Enter object as JSON"
            {...commonProps}
            value={JSON.stringify(currentValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(setting._id, parsed);
              } catch {
                // Allow invalid JSON while typing
                handleSettingChange(setting._id, e.target.value);
              }
            }}
          />
        );

      default:
        // String type
        if (setting.validation?.enum) {
          return (
            <Select
              value={String(currentValue)}
              onValueChange={(value) => handleSettingChange(setting._id, value)}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  isModified && "border-orange-300 bg-orange-50"
                )}
              >
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
          );
        }

        const inputType = isSensitive
          ? showSensitive
            ? "text"
            : "password"
          : "text";
        return (
          <div className="flex items-center gap-2">
            <Input
              type={inputType}
              {...commonProps}
              onChange={(e) => handleSettingChange(setting._id, e.target.value)}
            />
            {isSensitive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSensitive(!showSensitive)}
                className="h-8 w-8 p-0"
              >
                {showSensitive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        );
    }
  };

  // Get validation status for a setting
  const getValidationStatus = (setting: Setting) => {
    const currentValue = modifiedSettings[setting._id]?.value ?? setting.value;
    const validation = setting.validation;

    if (!validation) return { isValid: true, message: "" };

    // Required validation
    if (
      validation.required &&
      (currentValue === null ||
        currentValue === undefined ||
        currentValue === "")
    ) {
      return { isValid: false, message: "This field is required" };
    }

    // Type-specific validations
    if (setting.dataType === "number" && typeof currentValue === "number") {
      if (validation.min !== undefined && currentValue < validation.min) {
        return {
          isValid: false,
          message: `Value must be at least ${validation.min}`,
        };
      }
      if (validation.max !== undefined && currentValue > validation.max) {
        return {
          isValid: false,
          message: `Value must not exceed ${validation.max}`,
        };
      }
    }

    if (setting.dataType === "string" && typeof currentValue === "string") {
      if (
        validation.min !== undefined &&
        currentValue.length < validation.min
      ) {
        return {
          isValid: false,
          message: `Minimum ${validation.min} characters required`,
        };
      }
      if (
        validation.max !== undefined &&
        currentValue.length > validation.max
      ) {
        return {
          isValid: false,
          message: `Maximum ${validation.max} characters allowed`,
        };
      }
      if (validation.enum && !validation.enum.includes(currentValue)) {
        return {
          isValid: false,
          message: `Value must be one of: ${validation.enum.join(", ")}`,
        };
      }
    }

    return { isValid: true, message: "Valid" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">
            Failed to load settings
          </h3>
          <p className="text-gray-500 mt-1">{error}</p>
          <Button onClick={refreshSettings} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const modifiedCount = Object.keys(modifiedSettings).length;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white flex flex-col">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              const stats = categoryStats[key];
              const isActive = activeCategory === key;

              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key as SettingCategory)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors mb-1",
                    "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
                    isActive && "bg-blue-50 border border-blue-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-md", config.color)}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {config.label}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {config.description}
                      </p>
                      {stats && (
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {stats.total}
                          </Badge>
                          {stats.modified > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {stats.modified} modified
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Panel */}
        {modifiedCount > 0 && (
          <div className="border-t p-4 bg-orange-50">
            <div className="text-sm text-orange-700 mb-3">
              {modifiedCount} setting{modifiedCount !== 1 ? "s" : ""} modified
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveAll} className="flex-1">
                <Save className="h-4 w-4 mr-1" />
                Save All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDiscardChanges}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              {React.createElement(categoryConfig[activeCategory].icon, {
                className: "h-6 w-6 text-gray-600",
              })}
              <h1 className="text-2xl font-bold text-gray-900">
                {categoryConfig[activeCategory].label} Settings
              </h1>
            </div>
            <p className="text-gray-600">
              {categoryConfig[activeCategory].description}
            </p>
          </div>

          {/* Settings List */}
          <div className="space-y-4">
            {currentCategorySettings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No settings found
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "No settings match your search criteria"
                      : "No settings available in this category"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              currentCategorySettings.map((setting) => {
                const isModified = modifiedSettings[setting._id] !== undefined;
                const isEditing = editingSettings.has(setting._id);
                const validation = getValidationStatus(setting);

                return (
                  <Card
                    key={setting._id}
                    className={cn(
                      "transition-all",
                      isModified && "border-orange-300 shadow-md",
                      !validation.isValid && "border-red-300"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {setting.key}
                            {!setting.isEditable && (
                              <Badge variant="secondary" className="text-xs">
                                Read Only
                              </Badge>
                            )}
                            {setting.isEncrypted && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Encrypted
                              </Badge>
                            )}
                            {isModified && (
                              <Badge variant="destructive" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {setting.description}
                          </p>
                          {setting.validation && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Type: {setting.dataType}</span>
                              {setting.validation.required && (
                                <span className="text-red-600">Required</span>
                              )}
                              {setting.validation.min !== undefined && (
                                <span>Min: {setting.validation.min}</span>
                              )}
                              {setting.validation.max !== undefined && (
                                <span>Max: {setting.validation.max}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isModified && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveSetting(setting)}
                              disabled={!validation.isValid}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          )}
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleEditMode(setting._id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      {!validation.isValid && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          {validation.message}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {renderSettingInput(setting)}

                      {setting.defaultValue !== undefined && (
                        <div className="mt-3 text-xs text-gray-500">
                          Default: {JSON.stringify(setting.defaultValue)}
                        </div>
                      )}

                      {setting.updatedAt && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          Last updated:{" "}
                          {new Date(setting.updatedAt).toLocaleString()}
                          {setting.updatedBy && (
                            <span>by {setting.updatedBy}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
