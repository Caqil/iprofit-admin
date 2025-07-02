// components/notifications/template-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Save,
  X,
  Eye,
  Code,
  Mail,
  MessageSquare,
  Bell,
  Smartphone
} from "lucide-react";
import { NotificationTemplate, NotificationType, NotificationChannel } from "@/types/notification";
import { toast } from "sonner";

interface TemplateFormProps {
  template?: NotificationTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Partial<NotificationTemplate>) => Promise<void>;
  isEditing?: boolean;
}

const notificationTypes: { value: NotificationType; label: string; icon: React.ReactNode }[] = [
  { value: 'KYC', label: 'KYC Verification', icon: <Badge className="w-4 h-4" /> },
  { value: 'Withdrawal', label: 'Withdrawals', icon: <Badge className="w-4 h-4" /> },
  { value: 'Loan', label: 'Loans', icon: <Badge className="w-4 h-4" /> },
  { value: 'Task', label: 'Tasks', icon: <Badge className="w-4 h-4" /> },
  { value: 'Referral', label: 'Referrals', icon: <Badge className="w-4 h-4" /> },
  { value: 'System', label: 'System', icon: <Badge className="w-4 h-4" /> },
  { value: 'Marketing', label: 'Marketing', icon: <Badge className="w-4 h-4" /> },
];

const notificationChannels: { value: NotificationChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'in_app', label: 'In-App', icon: <Bell className="w-4 h-4" /> },
  { value: 'push', label: 'Push Notification', icon: <Smartphone className="w-4 h-4" /> },
];

export function TemplateForm({ template, isOpen, onClose, onSave, isEditing = false }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'System' as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: '',
    content: '',
    variables: [] as Array<{ name: string; description: string; type: string; required: boolean }>,
    isActive: true,
  });

  const [newVariable, setNewVariable] = useState({
    name: '',
    description: '',
    type: 'string',
    required: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        channel: template.channel,
        subject: template.subject || '',
        content: template.content,
        variables: template.variables || [],
        isActive: template.isActive,
      });
    } else {
      setFormData({
        name: '',
        type: 'System',
        channel: 'email',
        subject: '',
        content: '',
        variables: [],
        isActive: true,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('Template content is required');
      return;
    }

    if (formData.channel === 'email' && !formData.subject.trim()) {
      toast.error('Email subject is required for email templates');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        variables: formData.variables.map(variable => ({
          ...variable,
          type: variable.type as "string" | "number" | "boolean" | "date"
        }))
      });
      onClose();
      toast.success(isEditing ? 'Template updated successfully' : 'Template created successfully');
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const addVariable = () => {
    if (!newVariable.name.trim()) {
      toast.error('Variable name is required');
      return;
    }

    const exists = formData.variables.some(v => v.name === newVariable.name);
    if (exists) {
      toast.error('Variable name already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, { ...newVariable }]
    }));

    setNewVariable({
      name: '',
      description: '',
      type: 'string',
      required: false,
    });
  };

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    const channelConfig = notificationChannels.find(c => c.value === channel);
    return channelConfig?.icon || <Bell className="w-4 h-4" />;
  };

  const renderPreview = () => {
    let previewContent = formData.content;
    
    // Replace variables with sample values
    formData.variables.forEach(variable => {
      const sampleValue = variable.type === 'number' ? '123' : 
                         variable.type === 'date' ? '2024-01-01' : 
                         `[${variable.name}]`;
      previewContent = previewContent.replace(
        new RegExp(`{{${variable.name}}}`, 'g'), 
        sampleValue
      );
    });

    return (
      <div className="space-y-4">
        {formData.channel === 'email' && (
          <div>
            <Label className="text-sm font-medium">Subject Preview</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md border">
              {formData.subject || 'No subject'}
            </div>
          </div>
        )}
        
        <div>
          <Label className="text-sm font-medium">Content Preview</Label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[100px] whitespace-pre-wrap">
            {previewContent || 'No content'}
          </div>
        </div>

        {formData.variables.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Available Variables</Label>
            <div className="mt-2 space-y-2">
              {formData.variables.map((variable, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                  <code className="text-sm font-mono bg-blue-100 px-2 py-1 rounded">
                    {`{{${variable.name}}}`}
                  </code>
                  <span className="text-sm text-gray-600">{variable.description}</span>
                  {variable.required && (
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {isEditing ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the notification template details' : 'Create a new notification template for sending messages to users'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Notification Type*</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: NotificationType) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="channel">Channel*</Label>
                  <Select 
                    value={formData.channel} 
                    onValueChange={(value: NotificationChannel) => 
                      setFormData(prev => ({ ...prev, channel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationChannels.map((channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          <div className="flex items-center gap-2">
                            {channel.icon}
                            {channel.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive">Active Template</Label>
                </div>
              </div>

              {/* Variables Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Template Variables</Label>
                  <Badge variant="outline">Use {'{{variableName}}'} in content</Badge>
                </div>

                {/* Add Variable Form */}
                <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Variable name"
                    value={newVariable.name}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Description"
                    value={newVariable.description}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Select 
                    value={newVariable.type} 
                    onValueChange={(value) => setNewVariable(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newVariable.required}
                      onCheckedChange={(checked) => 
                        setNewVariable(prev => ({ ...prev, required: checked }))
                      }
                    />
                    <span className="text-sm">Required</span>
                    <Button type="button" onClick={addVariable} size="sm">
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Variables List */}
                <div className="space-y-2">
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {`{{${variable.name}}}`}
                        </code>
                        <span className="text-sm text-gray-600">{variable.description}</span>
                        <Badge variant="outline" className="text-xs">{variable.type}</Badge>
                        {variable.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {formData.channel === 'email' && (
                <div>
                  <Label htmlFor="subject">Email Subject*</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Welcome to {{platformName}}, {{userName}}!"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use variables like {`{{userName}}`} to personalize the subject
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="content">Template Content*</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={`Hello {{userName}},

Welcome to our platform! Your account has been successfully created.

Best regards,
Support Team`}
                  rows={12}
                  className="font-mono"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use variables like {'{{userName}}'} to personalize the content
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Preview</h4>
                  <p className="text-sm text-blue-700">
                    This is how your template will look with sample data
                  </p>
                </div>
              </div>
              
              {renderPreview()}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
