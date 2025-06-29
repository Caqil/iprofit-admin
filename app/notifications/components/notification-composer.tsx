"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Users, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationTemplate } from "@/types";

const notificationSchema = z.object({
  type: z.enum([
    "KYC",
    "Withdrawal",
    "Loan",
    "Task",
    "Referral",
    "System",
    "Marketing",
  ]),
  channel: z.enum(["email", "sms", "in_app", "push"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  scheduledAt: z.date().optional(),
  sendImmediately: z.boolean(),
  templateId: z.string().optional(),
  recipients: z
    .array(
      z.object({
        userId: z.string(),
        variables: z.record(z.any()).optional(),
      })
    )
    .min(1, "At least one recipient is required"),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface NotificationComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: NotificationFormData) => Promise<void>;
  templates: NotificationTemplate[];
}

export function NotificationComposer({
  open,
  onOpenChange,
  onSend,
  templates,
}: NotificationComposerProps) {
  const [isSending, setIsSending] = useState(false);
  const [recipients, setRecipients] = useState<
    Array<{ userId: string; name: string; email: string }>
  >([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: "System",
      channel: "email",
      priority: "Medium",
      sendImmediately: true,
      recipients: [],
      title: "",
      message: "",
    },
  });

  const channel = form.watch("channel");
  const sendImmediately = form.watch("sendImmediately");
  const templateId = form.watch("templateId");

  // Load template when selected
  React.useEffect(() => {
    if (templateId && templates) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        form.setValue("title", template.subject ?? "");
        form.setValue("message", template.content ?? "");
      }
    }
  }, [templateId, templates, form]);

  const addRecipient = async () => {
    if (!recipientInput.trim()) return;

    // Here you would typically search for users by email/ID
    // For now, we'll simulate adding a recipient
    const newRecipient = {
      userId: "temp-" + Date.now(),
      name: "User Name",
      email: recipientInput,
    };

    setRecipients([...recipients, newRecipient]);
    setRecipientInput("");

    // Update form
    const currentRecipients = form.getValues("recipients");
    form.setValue("recipients", [
      ...currentRecipients,
      { userId: newRecipient.userId, variables: {} },
    ]);
  };

  const removeRecipient = (index: number) => {
    const updatedRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(updatedRecipients);

    const currentRecipients = form.getValues("recipients");
    form.setValue(
      "recipients",
      currentRecipients.filter((_, i) => i !== index)
    );
  };

  const addAllUsers = () => {
    // Here you would add all users from the system
    // For now, we'll simulate adding multiple users
    const allUsers = [
      { userId: "user1", name: "John Doe", email: "john@example.com" },
      { userId: "user2", name: "Jane Smith", email: "jane@example.com" },
    ];

    setRecipients([...recipients, ...allUsers]);

    const newRecipients = allUsers.map((user) => ({
      userId: user.userId,
      variables: {},
    }));

    const currentRecipients = form.getValues("recipients");
    form.setValue("recipients", [...currentRecipients, ...newRecipients]);
  };

  const handleSubmit = async (data: NotificationFormData) => {
    setIsSending(true);
    try {
      await onSend(data);
      onOpenChange(false);
      form.reset();
      setRecipients([]);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to send notification:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>
            Compose and send notifications to users across different channels
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Template Selection */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a pre-defined template to auto-fill content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KYC">KYC</SelectItem>
                        <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                        <SelectItem value="Loan">Loan</SelectItem>
                        <SelectItem value="Task">Task</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="System">System</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="in_app">In-App</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Content */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title/Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter notification title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter notification message"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {channel === "sms" &&
                      "Keep SMS messages under 160 characters"}
                    {channel === "push" &&
                      "Push notifications should be concise"}
                    {channel === "email" &&
                      "HTML formatting is supported for emails"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recipients */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Recipients</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAllUsers}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Add All Users
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter email or user ID"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addRecipient())
                  }
                  className="flex-1"
                />
                <Button type="button" onClick={addRecipient}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {recipients.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Selected Recipients ({recipients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((recipient, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          {recipient.email}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => removeRecipient(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="sendImmediately"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Send Immediately</FormLabel>
                      <FormDescription>
                        Send the notification right away or schedule for later
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!sendImmediately && (
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Schedule For</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP 'at' p")
                              ) : (
                                <span>Pick a date and time</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSending || recipients.length === 0}
              >
                {isSending
                  ? "Sending..."
                  : sendImmediately
                  ? "Send Now"
                  : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
