"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  User,
  Calendar,
  Paperclip,
  Send,
  Edit,
  Save,
  X,
} from "lucide-react";
import { SupportTicket, TicketPriority } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface TicketDetailsProps {
  ticket: SupportTicket;
  onUpdate: () => void;
}

export function TicketDetails({ ticket, onUpdate }: TicketDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    tags: ticket.tags?.join(", ") || "",
  });

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          tags: editData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      setIsEditing(false);
      onUpdate();
      toast.success("Ticket updated successfully");
    } catch (error) {
      toast.error("Failed to update ticket");
    }
  };

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              #{ticket.ticketNumber}
              <Badge
                variant={ticket.status === "Open" ? "destructive" : "default"}
              >
                {ticket.status}
              </Badge>
              <Badge
                variant={
                  ticket.priority === "High" || ticket.priority === "Urgent"
                    ? "destructive"
                    : "secondary"
                }
              >
                {ticket.priority}
              </Badge>
            </CardTitle>
            <p className="text-muted-foreground mt-1">{ticket.subject}</p>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <Edit className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editData.status}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, status: value as SupportTicket["status"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting for User">
                      Waiting for User
                    </SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={editData.priority}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, priority: value as TicketPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Original Message */}
      <Card>
        <CardHeader>
          <CardTitle>Original Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {((ticket as any).userId?.name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">
                    {(ticket as any).userId?.name || "Unknown User"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{ticket.message}</p>
                </div>
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {ticket.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Paperclip className="h-4 w-4" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {attachment.filename}
                        </a>
                        <span className="text-muted-foreground">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      {ticket.responses && ticket.responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Responses ({ticket.responses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticket.responses.map((response, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {response.isAdminResponse ? "A" : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {response.isAdminResponse
                          ? "Support Agent"
                          : "Customer"}
                      </span>
                      <Badge
                        variant={
                          response.isAdminResponse ? "default" : "secondary"
                        }
                      >
                        {response.isAdminResponse ? "Admin" : "Customer"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(response.createdAt)}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{response.message}</p>
                    </div>
                    {response.attachments &&
                      response.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {response.attachments.map(
                            (attachment, attachIndex) => (
                              <div
                                key={attachIndex}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Paperclip className="h-4 w-4" />
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {attachment.filename}
                                </a>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
