// app/admin/notifications/templates/page.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  NotificationTemplate,
  NotificationType,
  NotificationChannel,
} from "@/types/notification";
import { toast } from "sonner";
import { TemplateForm } from "../components/templases-form";
import { TemplateList } from "../components/template-list";
import { useTemplates } from "@/hooks/use-templates";

export default function TemplatesPage() {
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refreshTemplates,
  } = useTemplates();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterChannel, setFilterChannel] = useState<
    NotificationChannel | "all"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "active" | "inactive" | "all"
  >("all");

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || template.type === filterType;
    const matchesChannel =
      filterChannel === "all" || template.channel === filterChannel;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && template.isActive) ||
      (filterStatus === "inactive" && !template.isActive);

    return matchesSearch && matchesType && matchesChannel && matchesStatus;
  });

  const handleCreateTemplate = async (
    templateData: Partial<NotificationTemplate>
  ) => {
    try {
      await createTemplate(templateData);
      setShowForm(false);
    } catch (error) {
      console.error("Create template error:", error);
      throw error;
    }
  };

  const handleUpdateTemplate = async (
    templateData: Partial<NotificationTemplate>
  ) => {
    if (!editingTemplate) return;

    try {
      await updateTemplate(editingTemplate.id, templateData);
      setEditingTemplate(null);
    } catch (error) {
      console.error("Update template error:", error);
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
    } catch (error) {
      console.error("Delete template error:", error);
    }
  };

  const handleDuplicateTemplate = async (template: NotificationTemplate) => {
    try {
      await duplicateTemplate(template);
    } catch (error) {
      console.error("Duplicate template error:", error);
    }
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const getTemplateStats = () => {
    const total = templates.length;
    const active = templates.filter((t) => t.isActive).length;
    const byChannel = templates.reduce((acc, template) => {
      acc[template.channel] = (acc[template.channel] || 0) + 1;
      return acc;
    }, {} as Record<NotificationChannel, number>);

    return { total, active, byChannel };
  };

  const stats = getTemplateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Notification Templates
          </h1>
          <p className="text-gray-600">
            Create and manage templates for sending notifications to users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreateNew}>Create Template</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Templates
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Email Templates
            </CardTitle>
            <Badge variant="outline">{stats.byChannel.email || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byChannel.email || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
            <Badge variant="outline">{stats.byChannel.sms || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byChannel.sms || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In-App Templates
            </CardTitle>
            <Badge variant="outline">{stats.byChannel.in_app || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byChannel.in_app || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select
                value={filterType}
                onValueChange={(value) =>
                  setFilterType(value as NotificationType | "all")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="KYC">KYC</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterChannel}
                onValueChange={(value) =>
                  setFilterChannel(value as NotificationChannel | "all")
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterStatus}
                onValueChange={(value) =>
                  setFilterStatus(value as "active" | "inactive" | "all")
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchTerm ||
            filterType !== "all" ||
            filterChannel !== "all" ||
            filterStatus !== "all") && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-600">Filters applied:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterType !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Type: {filterType}
                  <button
                    onClick={() => setFilterType("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterChannel !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Channel: {filterChannel}
                  <button
                    onClick={() => setFilterChannel("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filterStatus}
                  <button
                    onClick={() => setFilterStatus("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterChannel("all");
                  setFilterStatus("all");
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates List */}
      <TemplateList
        templates={filteredTemplates}
        onEdit={handleEdit}
        onDelete={handleDeleteTemplate}
        onDuplicate={handleDuplicateTemplate}
        onCreateNew={handleCreateNew}
        isLoading={isLoading}
      />

      {/* Template Form Dialog */}
      <TemplateForm
        template={editingTemplate || undefined}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTemplate(null);
        }}
        onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        isEditing={!!editingTemplate}
      />
    </div>
  );
}
