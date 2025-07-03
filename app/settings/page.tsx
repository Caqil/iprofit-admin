"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  SettingsIcon,
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
  Copy,
  Star,
  AlertTriangle,
  X,
  Settings2,
  Phone,
  FileText,
  Database,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data and types (replace with your actual implementations)
type SettingCategory =
  | "system"
  | "security"
  | "financial"
  | "email"
  | "upload"
  | "business"
  | "api"
  | "communication"
  | "maintenance";

interface Setting {
  _id: string;
  key: string;
  value: any;
  defaultValue?: any;
  description: string;
  dataType: "string" | "number" | "boolean" | "array" | "object";
  isEditable: boolean;
  isEncrypted: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    enum?: string[];
  };
  updatedAt?: string;
  updatedBy?: string;
  category: SettingCategory;
}

const categoryConfig = {
  system: {
    icon: SettingsIcon,
    label: "System",
    description: "Core application settings and configuration",
    color: "bg-blue-500",
  },
  security: {
    icon: Shield,
    label: "Security",
    description: "Authentication, authorization and security settings",
    color: "bg-red-500",
  },
  financial: {
    icon: DollarSign,
    label: "Financial",
    description: "Currency, rates, limits and financial configuration",
    color: "bg-green-500",
  },
  email: {
    icon: Mail,
    label: "Email",
    description: "SMTP settings and email configuration",
    color: "bg-purple-500",
  },
  upload: {
    icon: Upload,
    label: "Upload",
    description: "File upload limits, types and storage settings",
    color: "bg-orange-500",
  },
  business: {
    icon: Users,
    label: "Business",
    description: "Business rules, KYC, tasks and operational settings",
    color: "bg-cyan-500",
  },
  api: {
    icon: Server,
    label: "API",
    description: "API configuration and external services",
    color: "bg-indigo-500",
  },
  communication: {
    icon: Phone,
    label: "Communication",
    description: "Push Notification, SMS and other communication settings",
    color: "bg-pink-500",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    description: "System maintenance, backups and logging",
    color: "bg-yellow-500",
  },
} as const;

// Mock settings data
const mockSettings: Setting[] = [
  {
    _id: "1",
    key: "app_name",
    value: "My Application",
    defaultValue: "Default App",
    description: "The display name of your application",
    dataType: "string",
    isEditable: true,
    isEncrypted: false,
    category: "system",
    validation: { required: true, min: 3, max: 50 },
    updatedAt: "2024-01-15T10:30:00Z",
    updatedBy: "admin",
  },
  {
    _id: "2",
    key: "maintenance_mode",
    value: false,
    defaultValue: false,
    description: "Enable maintenance mode to prevent user access",
    dataType: "boolean",
    isEditable: true,
    isEncrypted: false,
    category: "system",
    validation: { required: false },
  },
  {
    _id: "3",
    key: "max_login_attempts",
    value: 5,
    defaultValue: 3,
    description:
      "Maximum number of failed login attempts before account lockout",
    dataType: "number",
    isEditable: true,
    isEncrypted: false,
    category: "security",
    validation: { required: true, min: 1, max: 10 },
  },
  {
    _id: "4",
    key: "jwt_secret",
    value: "super-secret-key-123",
    defaultValue: "",
    description: "Secret key used for JWT token signing",
    dataType: "string",
    isEditable: true,
    isEncrypted: true,
    category: "security",
    validation: { required: true, min: 32 },
  },
  {
    _id: "5",
    key: "currency",
    value: "USD",
    defaultValue: "USD",
    description: "Default currency for financial transactions",
    dataType: "string",
    isEditable: true,
    isEncrypted: false,
    category: "financial",
    validation: { required: true, enum: ["USD", "EUR", "GBP", "JPY"] },
  },
];

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
  const [isLoading, setIsLoading] = useState(false);

  // Group settings by category
  const groupedSettings = useMemo(() => {
    const grouped: Record<SettingCategory, Setting[]> = {
      system: [],
      security: [],
      financial: [],
      email: [],
      upload: [],
      business: [],
      api: [],
      communication: [],
      maintenance: [],
    };

    mockSettings.forEach((setting) => {
      grouped[setting.category].push(setting);
    });

    return grouped;
  }, []);

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

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
    } catch (error) {
      console.error("Save setting error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    const modifiedEntries = Object.entries(modifiedSettings);
    if (modifiedEntries.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setModifiedSettings({});
      setEditingSettings(new Set());
    } catch (error) {
      console.error("Save all error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    setModifiedSettings({});
    setEditingSettings(new Set());
  };

  const toggleEditMode = (settingId: string) => {
    setEditingSettings((prev) => {
      const updated = new Set(prev);
      if (updated.has(settingId)) {
        updated.delete(settingId);
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
    navigator.clipboard.writeText(text);
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
        <div className="group relative">
          <div
            className={cn(
              "font-mono text-sm px-4 py-3 rounded-lg border transition-all duration-200",
              "bg-muted/30 border-border hover:bg-muted/50",
              isModified &&
                "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="truncate flex-1">{displayValue}</span>
              <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(String(currentValue))}
                        className="h-7 w-7"
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
                          className="h-7 w-7"
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
      );
    }

    const commonProps = {
      value: currentValue,
      onChange: (newValue: any) => handleSettingChange(setting._id, newValue),
      className: cn(
        "transition-all duration-200",
        isModified &&
          "border-amber-300 bg-amber-50/50 focus:ring-amber-500 dark:bg-amber-950/20 dark:border-amber-800"
      ),
    };

    switch (setting.dataType) {
      case "boolean":
        return (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Switch
                checked={Boolean(currentValue)}
                onCheckedChange={(checked) =>
                  handleSettingChange(setting._id, checked)
                }
                className="data-[state=checked]:bg-primary"
              />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    currentValue
                      ? "text-green-700 dark:text-green-400"
                      : "text-muted-foreground"
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
          </div>
        );

      case "number":
        return (
          <div className="space-y-3">
            <Input
              type="number"
              min={setting.validation?.min}
              max={setting.validation?.max}
              {...commonProps}
              onChange={(e) =>
                handleSettingChange(
                  setting._id,
                  Number.parseFloat(e.target.value) || 0
                )
              }
              className={cn(commonProps.className, "max-w-xs")}
            />
            {setting.validation && (
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                {setting.validation.min !== undefined && (
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Min: {setting.validation.min}
                  </span>
                )}
                {setting.validation.max !== undefined && (
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Max: {setting.validation.max}
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "array":
      case "object":
        return (
          <div className="space-y-3">
            <Textarea
              rows={setting.dataType === "object" ? 8 : 5}
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
              className={cn(
                commonProps.className,
                "font-mono text-sm resize-none"
              )}
            />
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
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
                  isModified &&
                    "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
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
              className={cn(commonProps.className, "flex-1 max-w-md")}
            />
            {isSensitive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowSensitive(!showSensitive)}
                      className="h-10 w-10 shrink-0"
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

  const modifiedCount = Object.keys(modifiedSettings).length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                  <Settings2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Application Settings</h1>
                  <p className="text-muted-foreground">
                    Manage your application configuration
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {modifiedCount} unsaved change
                      {modifiedCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={isLoading}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDiscardChanges}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>

                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="advanced-filter"
                  checked={showAdvancedOnly}
                  onCheckedChange={setShowAdvancedOnly}
                />
                <Label htmlFor="advanced-filter" className="text-sm">
                  Advanced only
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="show-sensitive"
                  checked={showSensitive}
                  onCheckedChange={setShowSensitive}
                />
                <Label htmlFor="show-sensitive" className="text-sm">
                  Show sensitive
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <Tabs
            value={activeCategory}
            onValueChange={(value) =>
              setActiveCategory(value as SettingCategory)
            }
          >
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-9 mb-8 h-auto p-1">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const IconComponent = config.icon;
                const stats = categoryStats[key];
                const hasModified = stats?.modified > 0;

                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-background data-[state=active]:shadow-sm relative"
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        config.color,
                        "text-white"
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-xs">{config.label}</div>
                      {stats && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {stats.total} settings
                        </div>
                      )}
                    </div>
                    {hasModified && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {stats.modified}
                        </span>
                      </div>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab Content */}
            {Object.entries(categoryConfig).map(([key, config]) => (
              <TabsContent key={key} value={key} className="space-y-6">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn("p-3 rounded-xl text-white", config.color)}
                    >
                      <config.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {config.label} Settings
                      </h2>
                      <p className="text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {categoryStats[key] && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Settings2 className="h-4 w-4" />
                        {categoryStats[key].total} total
                      </div>
                      <div className="flex items-center gap-1">
                        <Edit className="h-4 w-4" />
                        {categoryStats[key].editable} editable
                      </div>
                      {categoryStats[key].modified > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          {categoryStats[key].modified} modified
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Settings Grid */}
                <div className="grid gap-6">
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
                            "transition-all duration-200 hover:shadow-md",
                            isModified &&
                              "border-amber-300 shadow-amber-100 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-800",
                            !validation.isValid &&
                              "border-destructive shadow-red-100",
                            isEditing && "ring-2 ring-ring shadow-lg"
                          )}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold flex items-center gap-3 mb-3">
                                  <span className="truncate">
                                    {setting.key}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {!setting.isEditable && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        <Lock className="h-3 w-3 mr-1" />
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
                                        className="text-xs border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-950/20"
                                      >
                                        Required
                                      </Badge>
                                    )}
                                    {isModified && (
                                      <Badge className="text-xs bg-amber-500">
                                        <Edit className="h-3 w-3 mr-1" />
                                        Modified
                                      </Badge>
                                    )}
                                  </div>
                                </CardTitle>

                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                  {setting.description}
                                </p>

                                {/* Setting Metadata */}
                                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Database className="h-3 w-3" />
                                    Type: {setting.dataType}
                                  </span>
                                  {setting.defaultValue !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      Default:{" "}
                                      {JSON.stringify(setting.defaultValue)}
                                    </span>
                                  )}
                                  {setting.updatedAt && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Updated{" "}
                                      {new Date(
                                        setting.updatedAt
                                      ).toLocaleDateString()}{" "}
                                      by {setting.updatedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 ml-4">
                                {isModified && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveSetting(setting)}
                                    disabled={!validation.isValid || isLoading}
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
                                  "flex items-center gap-2 mt-3 text-sm p-3 rounded-lg",
                                  validation.isValid
                                    ? "text-green-700 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400"
                                    : "text-destructive bg-destructive/10 border border-destructive/20"
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
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
