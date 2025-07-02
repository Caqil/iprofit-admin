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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  History,
  RefreshCw,
  Filter,
  ChevronRight,
  Copy,
  ExternalLink,
  Zap,
  Star,
  AlertTriangle,
  Check,
  X,
  HelpCircle,
  Settings2,
  PhoneCallIcon,
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
  },
  security: {
    icon: Shield,
    label: "Security",
    description: "Authentication, authorization and security settings",
  },
  financial: {
    icon: DollarSign,
    label: "Financial",
    description: "Currency, rates, limits and financial configuration",
  },
  email: {
    icon: Mail,
    label: "Email",
    description: "SMTP settings and email configuration",
  },
  upload: {
    icon: Upload,
    label: "Upload",
    description: "File upload limits, types and storage settings",
  },
  business: {
    icon: Users,
    label: "Business",
    description: "Business rules, KYC, tasks and operational settings",
  },
  api: {
    icon: Server,
    label: "API",
    description: "API configuration and external services",
  },
  communication: {
    icon: PhoneCallIcon,
    label: "Communication",
    description: "Push Notification, SMS and other communication settings",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    description: "System maintenance, backups and logging",
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
  const [showAdvancedOnly, setShowAdvancedOnly] = useState(false);

  const { groupedSettings, isLoading, error, updateSetting, refreshSettings } =
    useSettings(undefined, undefined, true);

  const currentCategorySettings = useMemo(() => {
    if (!groupedSettings?.[activeCategory]) return [];

    let settings = groupedSettings[activeCategory];

    // Apply search filter
    if (searchQuery.trim()) {
      settings = settings.filter(
        (setting) =>
          setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          setting.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply advanced filter
    if (showAdvancedOnly) {
      settings = settings.filter(
        (setting) =>
          setting.isEditable &&
          (setting.validation?.required === false || setting.isEncrypted)
      );
    }

    return settings;
  }, [groupedSettings, activeCategory, searchQuery, showAdvancedOnly]);

  const categoryStats = useMemo(() => {
    if (!groupedSettings) return {};

    const stats: Record<
      string,
      { total: number; editable: number; modified: number; critical: number }
    > = {};

    Object.entries(groupedSettings).forEach(([category, settings]) => {
      stats[category] = {
        total: settings.length,
        editable: settings.filter((s) => s.isEditable).length,
        modified: settings.filter((s) => modifiedSettings[s._id]).length,
        critical: settings.filter(
          (s) => s.validation?.required || s.isEncrypted
        ).length,
      };
    });

    return stats;
  }, [groupedSettings, modifiedSettings]);

  const hasUnsavedChanges = Object.keys(modifiedSettings).length > 0;

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

  const handleDiscardChanges = () => {
    setModifiedSettings({});
    setEditingSettings(new Set());
    toast.info("Changes discarded");
  };

  const toggleEditMode = (settingId: string) => {
    setEditingSettings((prev) => {
      const updated = new Set(prev);
      if (updated.has(settingId)) {
        updated.delete(settingId);
        // Also clear any modifications for this setting when exiting edit mode
        setModifiedSettings((modPrev) => {
          const { [settingId]: removed, ...rest } = modPrev;
          return rest;
        });
      } else {
        updated.add(settingId);
      }
      return updated;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  const renderSettingInput = (setting: Setting) => {
    const isEditing = editingSettings.has(setting._id);
    const currentValue = modifiedSettings[setting._id]?.value ?? setting.value;
    const isModified = modifiedSettings[setting._id] !== undefined;
    const isSensitive =
      setting.isEncrypted ||
      setting.key.toLowerCase().includes("password") ||
      setting.key.toLowerCase().includes("secret") ||
      setting.key.toLowerCase().includes("key");

    if (!isEditing) {
      const displayValue =
        isSensitive && !showSensitive
          ? "••••••••"
          : typeof currentValue === "object"
          ? JSON.stringify(currentValue, null, 2)
          : String(currentValue);

      return (
        <div className="flex items-center gap-3 group">
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "font-mono text-sm px-4 py-3 rounded-lg border transition-colors",
                "bg-gray-50/50 border-gray-200",
                isModified && "bg-amber-50 border-amber-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{displayValue}</span>
                <div className="flex items-center gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(String(currentValue))}
                          className="h-6 w-6"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy value</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {setting.isEditable && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleEditMode(setting._id)}
                            className="h-6 w-6"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit setting</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const commonProps = {
      value: currentValue,
      onChange: (newValue: any) => handleSettingChange(setting._id, newValue),
      className: cn(
        "min-w-0 flex-1 transition-colors",
        isModified && "border-amber-300 bg-amber-50/50 focus:ring-amber-500"
      ),
    };

    switch (setting.dataType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-4">
            <Switch
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) =>
                handleSettingChange(setting._id, checked)
              }
              className="data-[state=checked]:bg-blue-600"
            />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  currentValue ? "text-green-700" : "text-muted-foreground"
                )}
              >
                {currentValue ? "Enabled" : "Disabled"}
              </span>
              {currentValue ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        );

      case "number":
        return (
          <div className="space-y-2">
            <Input
              type="number"
              min={setting.validation?.min}
              max={setting.validation?.max}
              {...commonProps}
              onChange={(e) =>
                handleSettingChange(
                  setting._id,
                  parseFloat(e.target.value) || 0
                )
              }
              className={cn(commonProps.className, "max-w-xs")}
            />
            {setting.validation && (
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                {setting.validation.min !== undefined && (
                  <span>Min: {setting.validation.min}</span>
                )}
                {setting.validation.max !== undefined && (
                  <span>Max: {setting.validation.max}</span>
                )}
              </div>
            )}
          </div>
        );

      case "array":
      case "object":
        return (
          <div className="space-y-2">
            <Textarea
              rows={setting.dataType === "object" ? 6 : 4}
              placeholder={`Enter ${setting.dataType} as JSON`}
              {...commonProps}
              value={JSON.stringify(currentValue, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleSettingChange(setting._id, parsed);
                } catch {
                  handleSettingChange(setting._id, e.target.value);
                }
              }}
              className={cn(commonProps.className, "font-mono text-sm")}
            />
            <div className="text-xs text-gray-500">
              Format: Valid JSON {setting.dataType}
            </div>
          </div>
        );

      default:
        if (setting.validation?.enum) {
          return (
            <Select
              value={String(currentValue)}
              onValueChange={(value) => handleSettingChange(setting._id, value)}
            >
              <SelectTrigger
                className={cn(
                  "w-full max-w-sm",
                  isModified && "border-amber-300 bg-amber-50/50"
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
          <div className="flex items-center gap-3">
            <Input
              type={inputType}
              {...commonProps}
              onChange={(e) => handleSettingChange(setting._id, e.target.value)}
              className={cn(commonProps.className, "max-w-md")}
            />
            {isSensitive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowSensitive(!showSensitive)}
                      className="h-8 w-8"
                    >
                      {showSensitive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showSensitive ? "Hide" : "Show"} sensitive values
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
    }
  };

  const getValidationStatus = (setting: Setting) => {
    const currentValue = modifiedSettings[setting._id]?.value ?? setting.value;
    const validation = setting.validation;

    if (!validation)
      return { isValid: true, message: "Valid", type: "success" };

    if (
      validation.required &&
      (currentValue === null ||
        currentValue === undefined ||
        currentValue === "")
    ) {
      return {
        isValid: false,
        message: "This field is required",
        type: "error",
      };
    }

    if (setting.dataType === "number" && typeof currentValue === "number") {
      if (validation.min !== undefined && currentValue < validation.min) {
        return {
          isValid: false,
          message: `Value must be at least ${validation.min}`,
          type: "error",
        };
      }
      if (validation.max !== undefined && currentValue > validation.max) {
        return {
          isValid: false,
          message: `Value must not exceed ${validation.max}`,
          type: "error",
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
          type: "error",
        };
      }
      if (
        validation.max !== undefined &&
        currentValue.length > validation.max
      ) {
        return {
          isValid: false,
          message: `Maximum ${validation.max} characters allowed`,
          type: "error",
        };
      }
      if (validation.enum && !validation.enum.includes(currentValue)) {
        return {
          isValid: false,
          message: `Value must be one of: ${validation.enum.join(", ")}`,
          type: "error",
        };
      }
    }

    return { isValid: true, message: "Valid", type: "success" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground mt-4">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load settings
            </h3>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <Button onClick={refreshSettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modifiedCount = Object.keys(modifiedSettings).length;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Enhanced Sidebar */}
        <div className="w-80 border-r bg-background">
          <div className="flex flex-col h-full">
            {/* Search & Filters */}
            <div className="p-6 border-b space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="advanced-filter"
                  className="text-sm font-medium"
                >
                  Advanced settings only
                </Label>
                <Switch
                  id="advanced-filter"
                  checked={showAdvancedOnly}
                  onCheckedChange={setShowAdvancedOnly}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const IconComponent = config.icon;
                  const stats = categoryStats[key];
                  const isActive = activeCategory === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key as SettingCategory)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg transition-all duration-200",
                        "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                        isActive && "bg-accent border shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "p-2.5 rounded-lg transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted"
                          )}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              "font-semibold truncate",
                              isActive ? "text-foreground" : "text-foreground"
                            )}
                          >
                            {config.label}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {config.description}
                          </p>
                          {stats && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-0.5"
                              >
                                {stats.total} total
                              </Badge>
                              {stats.modified > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs px-2 py-0.5"
                                >
                                  {stats.modified} modified
                                </Badge>
                              )}
                              {stats.critical > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5"
                                >
                                  {stats.critical} critical
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Save Panel */}
            {hasUnsavedChanges && (
              <div className="border-t p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold">
                    {modifiedCount} unsaved change
                    {modifiedCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveAll} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save All
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDiscardChanges}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Discard all changes</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                    {React.createElement(categoryConfig[activeCategory].icon, {
                      className: "h-7 w-7",
                    })}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {categoryConfig[activeCategory].label} Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      {categoryConfig[activeCategory].description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshSettings}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh settings</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </div>
              </div>

              {/* Category Stats */}
              {categoryStats[activeCategory] && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Settings2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">
                            {categoryStats[activeCategory].total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Settings
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Edit className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {categoryStats[activeCategory].editable}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Editable
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-2xl font-bold text-orange-600">
                            {categoryStats[activeCategory].modified}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Modified
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="text-2xl font-bold text-destructive">
                            {categoryStats[activeCategory].critical}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Critical
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Enhanced Settings List */}
            <div className="space-y-4">
              {currentCategorySettings.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No settings found
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {searchQuery
                        ? "No settings match your search criteria. Try adjusting your search terms or filters."
                        : "No settings available in this category."}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery("")}
                        className="mt-4"
                      >
                        Clear search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                currentCategorySettings.map((setting) => {
                  const isModified =
                    modifiedSettings[setting._id] !== undefined;
                  const isEditing = editingSettings.has(setting._id);
                  const validation = getValidationStatus(setting);

                  return (
                    <Card
                      key={setting._id}
                      className={cn(
                        "transition-all hover:shadow-md",
                        isModified &&
                          "border-orange-300 shadow-orange-100 bg-orange-50/20",
                        !validation.isValid &&
                          "border-destructive shadow-red-100",
                        isEditing && "ring-2 ring-ring"
                      )}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold flex items-center gap-3 mb-2">
                              <span className="truncate">{setting.key}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!setting.isEditable && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Read Only
                                  </Badge>
                                )}
                                {setting.isEncrypted && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-destructive text-destructive"
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Encrypted
                                  </Badge>
                                )}
                                {setting.validation?.required && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-orange-200 text-orange-700 bg-orange-50"
                                  >
                                    Required
                                  </Badge>
                                )}
                                {isModified && (
                                  <Badge className="text-xs">
                                    <Edit className="h-3 w-3 mr-1" />
                                    Modified
                                  </Badge>
                                )}
                              </div>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {setting.description}
                            </p>

                            {/* Setting Metadata */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Type: {setting.dataType}
                              </span>
                              {setting.validation && (
                                <>
                                  {setting.validation.min !== undefined && (
                                    <span>Min: {setting.validation.min}</span>
                                  )}
                                  {setting.validation.max !== undefined && (
                                    <span>Max: {setting.validation.max}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-4">
                            {isModified && (
                              <Button
                                size="sm"
                                onClick={() => handleSaveSetting(setting)}
                                disabled={!validation.isValid}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                            )}
                            {isEditing && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEditMode(setting._id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Validation Status */}
                        {(!validation.isValid || isModified) && (
                          <div
                            className={cn(
                              "flex items-center gap-2 mt-3 text-sm",
                              validation.isValid
                                ? "text-green-700"
                                : "text-destructive"
                            )}
                          >
                            {validation.isValid ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            {validation.message}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="pt-0">
                        {renderSettingInput(setting)}

                        {/* Default Value & Last Updated */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {setting.defaultValue !== undefined && (
                                <span>
                                  Default:{" "}
                                  {JSON.stringify(setting.defaultValue)}
                                </span>
                              )}
                            </div>
                            {setting.updatedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Updated{" "}
                                {new Date(
                                  setting.updatedAt
                                ).toLocaleDateString()}{" "}
                                by {setting.updatedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
