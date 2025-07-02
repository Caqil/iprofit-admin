"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PlusCircle,
  Edit3,
  Trash2,
  MoreVertical,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Copy,
  Eye,
  Calendar,
} from "lucide-react";
import {
  NotificationTemplate,
  NotificationChannel,
} from "@/types/notification";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface TemplateListProps {
  templates: NotificationTemplate[];
  onEdit: (template: NotificationTemplate) => void;
  onDelete: (templateId: string) => void;
  onDuplicate: (template: NotificationTemplate) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  in_app: <Bell className="w-4 h-4" />,
  push: <Smartphone className="w-4 h-4" />,
};

const channelColors: Record<NotificationChannel, string> = {
  email: "bg-blue-100 text-blue-800",
  sms: "bg-green-100 text-green-800",
  in_app: "bg-purple-100 text-purple-800",
  push: "bg-orange-100 text-orange-800",
};

const typeColors: Record<string, string> = {
  KYC: "bg-yellow-100 text-yellow-800",
  Withdrawal: "bg-red-100 text-red-800",
  Loan: "bg-indigo-100 text-indigo-800",
  Task: "bg-cyan-100 text-cyan-800",
  Referral: "bg-emerald-100 text-emerald-800",
  System: "bg-gray-100 text-gray-800",
  Marketing: "bg-pink-100 text-pink-800",
};

export function TemplateList({
  templates,
  onEdit,
  onDelete,
  onDuplicate,
  onCreateNew,
  isLoading = false,
}: TemplateListProps) {
  const [deleteTemplate, setDeleteTemplate] =
    useState<NotificationTemplate | null>(null);

  const handleDelete = async () => {
    if (deleteTemplate) {
      await onDelete(deleteTemplate.id);
      setDeleteTemplate(null);
      toast.success("Template deleted successfully");
    }
  };

  const getVariableCount = (template: NotificationTemplate) => {
    return template.variables?.length || 0;
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Notification Templates</h2>
          <p className="text-gray-600">
            Manage templates for sending notifications to users
          </p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first notification template to start sending messages
              to users
            </p>
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold mb-2">
                      {template.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${
                          channelColors[template.channel]
                        } border-0`}
                      >
                        {channelIcons[template.channel]}
                        <span className="ml-1 capitalize">
                          {template.channel}
                        </span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${
                          typeColors[template.type] ||
                          "bg-gray-100 text-gray-800"
                        } border-0`}
                      >
                        {template.type}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(template)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTemplate(template)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {template.subject && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Subject:
                      </p>
                      <p className="text-sm text-gray-600">
                        {truncateContent(template.subject, 60)}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Content:
                    </p>
                    <p className="text-sm text-gray-600">
                      {truncateContent(template.content)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{getVariableCount(template)} variables</span>
                    <div className="flex items-center gap-1">
                      {template.isActive ? (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTemplate}
        onOpenChange={() => setDeleteTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
