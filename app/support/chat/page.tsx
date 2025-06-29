"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Users,
  Clock,
  Search,
  Filter,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";
import { useSupport } from "@/hooks/use-support";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatRelativeTime } from "@/lib/utils";
import { LiveChat } from "../components/live-chat";

export default function ChatPage() {
  const {
    chats,
    totalChats,
    isChatsLoading,
    sendChatMessage,
    updateChatStatus,
    error,
  } = useSupport();

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      !searchTerm ||
      (chat as any).userId?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (chat as any).userId?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || chat.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeChatCount = chats.filter(
    (chat) => chat.status === "Active"
  ).length;
  const waitingChatCount = chats.filter(
    (chat) => chat.status === "Waiting"
  ).length;

  if (isChatsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Chat</h1>
          <p className="text-muted-foreground">
            Monitor and respond to customer chat sessions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="default" className="px-3 py-1">
            {activeChatCount} Active
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {waitingChatCount} Waiting
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeChatCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently in session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingChatCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChats}</div>
            <p className="text-xs text-muted-foreground">All chat sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5m</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chat Sessions</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Ended">Ended</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No chat sessions found
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`cursor-pointer border-b p-4 hover:bg-muted/50 ${
                        selectedChat === chat.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {(chat as any).userId?.name || "Anonymous User"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatRelativeTime(chat.startedAt)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            chat.status === "Active"
                              ? "default"
                              : chat.status === "Waiting"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {chat.status}
                        </Badge>
                      </div>
                      {chat.messages && chat.messages.length > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {chat.messages[chat.messages.length - 1]?.message}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <LiveChat
              chatId={selectedChat}
              onSendMessage={sendChatMessage}
              onUpdateStatus={updateChatStatus}
            />
          ) : (
            <Card className="h-96">
              <CardContent className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No chat selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a chat session to start messaging
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
