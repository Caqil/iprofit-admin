"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Phone,
  Video,
  MoreVertical,
  User,
  Clock,
  Paperclip,
  Smile,
} from "lucide-react";
import { ChatMessage } from "@/types";
import { toast } from "sonner";

const formatTime = (date: Date) => {
  const d = new Date(date);
  let hours = d.getHours();
  let minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = Number(minutes < 10 ? 0 + String(minutes) : minutes);
  const strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
};

interface LiveChatProps {
  chatId: string;
  onSendMessage: (chatId: string, message: string) => Promise<void>;
  onUpdateStatus: (chatId: string, status: string) => Promise<any>;
}

export function LiveChat({
  chatId,
  onSendMessage,
  onUpdateStatus,
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatDetails();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/support/chat/${chatId}`);
      if (!response.ok) throw new Error("Failed to fetch chat");

      const result = await response.json();
      const chat = result.success ? result.data : result;

      setChatInfo(chat);
      setMessages(chat.messages || []);
    } catch (error) {
      toast.error("Failed to load chat details");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(chatId, newMessage);

      // Add message to local state immediately for better UX
      const tempMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: "admin",
        senderType: "admin",
        message: newMessage,
        timestamp: new Date(),
        isRead: true,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      // Refresh chat details to get the actual message
      setTimeout(fetchChatDetails, 500);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdateStatus(chatId, newStatus);
      setChatInfo((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Chat status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update chat status");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading chat...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chatInfo) {
    return (
      <Card className="h-96">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Chat not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{(chatInfo.userId?.name || "U")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {chatInfo.userId?.name || "Anonymous User"}
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  chatInfo.status === "Active"
                    ? "default"
                    : chatInfo.status === "Waiting"
                    ? "secondary"
                    : "outline"
                }
              >
                {chatInfo.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Started {formatTime(chatInfo.startedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleStatusChange(
                chatInfo.status === "Active" ? "Ended" : "Active"
              )
            }
          >
            {chatInfo.status === "Active" ? "End Chat" : "Resume Chat"}
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderType === "admin"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderType === "admin"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.senderType === "admin"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatInfo.status === "Ended" || isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              !newMessage.trim() || chatInfo.status === "Ended" || isSending
            }
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
