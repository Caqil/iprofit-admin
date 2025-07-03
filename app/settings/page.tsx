"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  Eye,
  EyeOff,
  PhoneCallIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Setting, SettingCategory } from "@/types/settings";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const categoryConfig = {
  system: { icon: SettingsIcon, label: "System" },
  security: { icon: Shield, label: "Security" },
  financial: { icon: DollarSign, label: "Financial" },
  email: { icon: Mail, label: "Email" },
  upload: { icon: Upload, label: "Upload" },
  business: { icon: Users, label: "Business" },
  api: { icon: Server, label: "API" },
  communication: { icon: PhoneCallIcon, label: "Communication" },
  maintenance: { icon: Wrench, label: "Maintenance" },
} as const;

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] =
    useState<SettingCategory>("system");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [editingSettings, setEditingSettings] = useState<Set<string>>(
    new Set()
  );
  const [settingValues, setSettingValues] = useState<Record<string, any>>({});

  const { groupedSettings, isLoading, error, updateSetting, refreshSettings } =
    useSettings(undefined, undefined, true);

  const currentCategorySettings = useMemo(() => {
    if (!groupedSettings?.[activeCategory]) return [];

    let settings = groupedSettings[activeCategory];

    if (searchQuery.trim()) {
      settings = settings.filter(
        (setting) =>
          setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          setting.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return settings;
  }, [groupedSettings, activeCategory, searchQuery]);

  const handleEditToggle = (settingId: string, setting: Setting) => {
    setEditingSettings((prev) => {
      const updated = new Set(prev);
      if (updated.has(settingId)) {
        updated.delete(settingId);
        // Remove any unsaved changes
        setSettingValues((prevValues) => {
          const { [settingId]: removed, ...rest } = prevValues;
          return rest;
        });
      } else {
        updated.add(settingId);
        // Initialize with current value
        setSettingValues((prev) => ({
          ...prev,
          [settingId]: setting.value,
        }));
      }
      return updated;
    });
  };

  const handleValueChange = (settingId: string, value: any) => {
    setSettingValues((prev) => ({
      ...prev,
      [settingId]: value,
    }));
  };

  const handleSave = async (setting: Setting) => {
    const newValue = settingValues[setting._id];
    if (newValue === undefined) return;

    try {
      await updateSetting(setting._id, {
        value: newValue,
        updatedBy: "SuperAdmin",
      });

      setEditingSettings((prev) => {
        const updated = new Set(prev);
        updated.delete(setting._id);
        return updated;
      });

      setSettingValues((prev) => {
        const { [setting._id]: removed, ...rest } = prev;
        return rest;
      });

      toast.success("Setting updated successfully");
    } catch (error) {
      toast.error("Failed to update setting");
      console.error("Save setting error:", error);
    }
  };

  const renderSettingInput = (setting: Setting) => {
    const isEditing = editingSettings.has(setting._id);
    const currentValue = settingValues[setting._id] ?? setting.value;
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
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 bg-gray-50 rounded border font-mono text-sm">
            {displayValue}
          </div>
          {setting.isEditable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditToggle(setting._id, setting)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      );
    }

    const inputProps = {
      value: currentValue,
      onChange: (newValue: any) => handleValueChange(setting._id, newValue),
      className: "flex-1",
    };

    let inputElement;

    switch (setting.dataType) {
      case "boolean":
        inputElement = (
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) =>
                handleValueChange(setting._id, checked)
              }
            />
            <span className="text-sm">
              {currentValue ? "Enabled" : "Disabled"}
            </span>
          </div>
        );
        break;

      case "number":
        inputElement = (
          <Input
            type="number"
            min={setting.validation?.min}
            max={setting.validation?.max}
            value={currentValue}
            onChange={(e) =>
              handleValueChange(setting._id, parseFloat(e.target.value) || 0)
            }
            className="max-w-xs"
          />
        );
        break;

      case "array":
      case "object":
        inputElement = (
          <Textarea
            rows={4}
            value={JSON.stringify(currentValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleValueChange(setting._id, parsed);
              } catch {
                // Keep invalid JSON in state for editing
                handleValueChange(setting._id, e.target.value);
              }
            }}
            className="font-mono text-sm"
          />
        );
        break;

      default:
        if (setting.validation?.enum) {
          inputElement = (
            <Select
              value={String(currentValue)}
              onValueChange={(value) => handleValueChange(setting._id, value)}
            >
              <SelectTrigger className="max-w-sm">
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
        } else {
          const inputType = isSensitive
            ? showSensitive
              ? "text"
              : "password"
            : "text";
          inputElement = (
            <div className="flex items-center gap-2">
              <Input
                type={inputType}
                value={currentValue}
                onChange={(e) => handleValueChange(setting._id, e.target.value)}
                className="max-w-md"
              />
              {isSensitive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSensitive(!showSensitive)}
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
    }

    return (
      <div className="flex items-center gap-3">
        {inputElement}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleSave(setting)}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditToggle(setting._id, setting)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application configuration
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories as Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(value) => setActiveCategory(value as SettingCategory)}
      >
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 mb-8">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const IconComponent = config.icon;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(categoryConfig).map(([key]) => (
          <TabsContent key={key} value={key}>
            <div className="space-y-4">
              {currentCategorySettings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      No settings found
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No settings match your search."
                        : "No settings in this category."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                currentCategorySettings.map((setting) => {
                  const isEditing = editingSettings.has(setting._id);
                  const hasChanges = settingValues[setting._id] !== undefined;

                  return (
                    <Card
                      key={setting._id}
                      className={cn(isEditing && "border-primary")}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {setting.key}
                              <div className="flex gap-1">
                                {!setting.isEditable && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Read Only
                                  </Badge>
                                )}
                                {setting.isEncrypted && (
                                  <Badge variant="outline" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Encrypted
                                  </Badge>
                                )}
                                {setting.validation?.required && (
                                  <Badge variant="outline" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                                {hasChanges && (
                                  <Badge className="text-xs">Modified</Badge>
                                )}
                              </div>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {setting.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Type: {setting.dataType}</span>
                              {setting.validation?.min !== undefined && (
                                <span>Min: {setting.validation.min}</span>
                              )}
                              {setting.validation?.max !== undefined && (
                                <span>Max: {setting.validation.max}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>{renderSettingInput(setting)}</CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
