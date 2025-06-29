"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Code,
  Send,
} from "lucide-react";
import { NotificationTemplate } from "@/types";
import { formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface EmailTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: NotificationTemplate[];
}

export function EmailTemplate({
  open,
  onOpenChange,
  templates,
}: EmailTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showPreview, setShowPreview] = useState(false);

  // Filter templates based on search and tab
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.subject ?? "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "email" && template.channel === "email") ||
      (activeTab === "sms" && template.channel === "sms") ||
      (activeTab === "push" && template.channel === "push") ||
      (activeTab === "in_app" && template.channel === "in_app");

    return matchesSearch && matchesTab;
  });

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: Mail,
      sms: MessageSquare,
      in_app: Bell,
      push: Smartphone,
    };
    const Icon = icons[channel as keyof typeof icons] || Mail;
    return <Icon className="h-4 w-4" />;
  };

  const getChannelBadge = (channel: string) => {
    const variants = {
      email: "bg-blue-100 text-blue-800 border-blue-200",
      sms: "bg-green-100 text-green-800 border-green-200",
      in_app: "bg-purple-100 text-purple-800 border-purple-200",
      push: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return variants[channel as keyof typeof variants] || variants.email;
  };

  const handlePreviewTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const renderTemplateContent = (content: string, variables: string[]) => {
    let rendered = content;

    // Replace template variables with sample data
    const sampleData: Record<string, string> = {
      userName: "John Doe",
      userEmail: "john.doe@example.com",
      amount: "1,500 BDT",
      taskName: "Complete Profile Setup",
      loanAmount: "50,000 BDT",
      dueDate: "December 31, 2024",
      approvalDate: "December 15, 2024",
      rejectionReason: "Insufficient documentation",
      bonusAmount: "100 BDT",
      transactionId: "TXN123456789",
      supportEmail: "support@example.com",
      loginUrl: "https://app.example.com/login",
      dashboardUrl: "https://app.example.com/dashboard",
    };

    variables.forEach((variable) => {
      const value = sampleData[variable] || `{{${variable}}}`;
      rendered = rendered.replace(new RegExp(`{{${variable}}}`, "g"), value);
    });

    return rendered;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
            <DialogDescription>
              Manage notification templates for different channels and types
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={() => {}}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            {/* Channel Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Templates</TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="in_app">
                  <Bell className="h-4 w-4 mr-2" />
                  In-App
                </TabsTrigger>
                <TabsTrigger value="push">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Push
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No templates found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(template.channel)}
                              <Badge
                                className={getChannelBadge(template.channel)}
                              >
                                {template.channel}
                              </Badge>
                            </div>
                            <Badge variant="outline">{template.type}</Badge>
                          </div>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {template.subject}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                              <div className="line-clamp-3">
                                {template.content.substring(0, 120)}...
                              </div>
                            </div>

                            {template.variables &&
                              template.variables.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Variables ({template.variables.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {template.variables
                                      .slice(0, 3)
                                      .map((variable, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {typeof variable === "string" ? variable : variable.name}
                                        </Badge>
                                      ))}
                                    {template.variables.length > 3 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        +{template.variables.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                            <div className="flex items-center justify-between pt-2">
                             
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handlePreviewTemplate(template)
                                  }
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && getChannelIcon(selectedTemplate.channel)}
              Template Preview: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Preview how this template will appear to recipients
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Channel</p>
                  <Badge className={getChannelBadge(selectedTemplate.channel)}>
                    {selectedTemplate.channel}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <Badge variant="outline">{selectedTemplate.type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Variables</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.variables?.length || 0}
                  </p>
                </div>
                
              </div>

              {/* Variables */}
              {selectedTemplate.variables &&
                selectedTemplate.variables.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Available Variables</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="font-mono"
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Preview */}
              <div className="space-y-4">
                <h4 className="font-medium">Preview</h4>

                {selectedTemplate.channel === "email" && (
                  <Card>
                    <CardHeader className="border-b">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">From:</span>
                          <span>notifications@yourapp.com</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">To:</span>
                          <span>john.doe@example.com</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Subject:</span>
                          <span className="font-medium">
                            {renderTemplateContent(
                              selectedTemplate.subject || "",
                              (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                            )}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: renderTemplateContent(
                            selectedTemplate.content.replace(/\n/g, "<br>"),
                            (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                          ),
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {selectedTemplate.channel === "sms" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-100 p-4 rounded-lg max-w-sm">
                        <p className="text-sm">
                          {renderTemplateContent(
                            selectedTemplate.content || "",
                            (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Length:{" "}
                          {
                            renderTemplateContent(
                              selectedTemplate.content,
                              (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                            ).length
                          }
                          /160 characters
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedTemplate.channel === "push" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Push Notification Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 text-white p-4 rounded-lg max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded"></div>
                          <span className="text-sm font-medium">Your App</span>
                          <span className="text-xs text-gray-400 ml-auto">
                            now
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {renderTemplateContent(
                            selectedTemplate.subject || "",
                            (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                          )}
                        </p>
                        <p className="text-sm text-gray-300">
                          {renderTemplateContent(
                            selectedTemplate.content,
                            (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedTemplate.channel === "in_app" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        In-App Notification Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                        <div className="flex items-start gap-3">
                          <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-blue-900">
                              {renderTemplateContent(
                                selectedTemplate.subject || "",
                                (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                              )}
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              {renderTemplateContent(
                                selectedTemplate.content,
                                (selectedTemplate.variables || []).map(v => typeof v === "string" ? v : v.name)
                              )}
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              Just now
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </Button>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
