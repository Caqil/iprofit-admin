"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  User,
  Clock,
  MessageSquare,
  Paperclip,
  Send,
  Edit,
  Trash2,
  UserCheck,
} from "lucide-react";
import { SupportTicket } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { TicketDetails } from "../../components/ticket-details";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/support/tickets/${ticketId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch ticket");
      }

      const result = await response.json();
      setTicket(result.success ? result.data : result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddResponse = async () => {
    if (!responseMessage.trim()) return;

    try {
      setIsResponding(true);
      const response = await fetch(
        `/api/support/tickets/${ticketId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: responseMessage,
            isAdminResponse: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add response");
      }

      setResponseMessage("");
      await fetchTicket();
      toast.success("Response added successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add response"
      );
    } finally {
      setIsResponding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Ticket not found</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>
        <div>
          <h1 className="text-2xl font-bold">#{ticket.ticketNumber}</h1>
          <p className="text-muted-foreground">{ticket.subject}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <TicketDetails ticket={ticket} onUpdate={fetchTicket} />

          {/* Add Response */}
          <Card>
            <CardHeader>
              <CardTitle>Add Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your response..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddResponse}
                  disabled={!responseMessage.trim() || isResponding}
                >
                  {isResponding ? (
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1">
                  <Badge
                    variant={
                      ticket.status === "Open" ? "destructive" : "default"
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <div className="mt-1">
                  <Badge
                    variant={
                      ticket.priority === "High" || ticket.priority === "Urgent"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <p className="mt-1 text-sm">{ticket.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="mt-1 text-sm">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Last Response</label>
                <p className="mt-1 text-sm">
                  {formatRelativeTime(ticket.lastResponseAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {(ticket as any).userId?.name || "Unknown User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(ticket as any).userId?.email || "No email"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
