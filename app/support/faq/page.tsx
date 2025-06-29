"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  HelpCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { FAQManager } from "../components/faq-manager";
import { useSupport } from "@/hooks/use-support";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PaginationParams } from "@/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<any>(null);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "priority",
    sortOrder: "desc",
  });

  const {
    faqs,
    totalFAQs,
    isFAQsLoading,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    submitFAQFeedback,
    error,
  } = useSupport({}, pagination);

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || faq.category === categoryFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && faq.isActive) ||
      (statusFilter === "inactive" && !faq.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));
  const totalPages = Math.ceil(totalFAQs / pagination.limit);

  const handleCreateFAQ = async (data: any) => {
    try {
      await createFAQ(data);
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Failed to create FAQ:", error);
    }
  };

  const handleUpdateFAQ = async (id: string, data: any) => {
    try {
      await updateFAQ(id, data);
      setSelectedFAQ(null);
    } catch (error) {
      console.error("Failed to update FAQ:", error);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      await deleteFAQ(id);
    } catch (error) {
      console.error("Failed to delete FAQ:", error);
    }
  };

  if (isFAQsLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">FAQ Management</h1>
          <p className="text-muted-foreground">
            Create and manage frequently asked questions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New FAQ</DialogTitle>
            </DialogHeader>
            <FAQManager
              onSave={handleCreateFAQ}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFAQs}</div>
            <p className="text-xs text-muted-foreground">All questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faqs.filter((faq) => faq.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active FAQs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">FAQ categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faqs.reduce((total, faq) => total + faq.viewCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time views</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <CardTitle>FAQ List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">No FAQs found</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first FAQ to get started
                </p>
              </div>
            ) : (
              filteredFAQs.map((faq) => (
                <div key={faq._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{faq.question}</h3>
                        <Badge variant={faq.isActive ? "default" : "secondary"}>
                          {faq.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{faq.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {faq.answer}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {faq.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {faq.helpfulCount} helpful
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          {faq.notHelpfulCount} not helpful
                        </span>
                        <span>Created {formatDate(faq.createdAt)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedFAQ(faq)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdateFAQ(faq._id, {
                              isActive: !faq.isActive,
                            })
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {faq.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteFAQ(faq._id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>

          <DataTablePagination
            currentPage={pagination.page}
            totalPages={totalPages}
            pageSize={pagination.limit}
            totalItems={totalFAQs}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onPageSizeChange={(limit) =>
              setPagination({ ...pagination, limit, page: 1 })
            }
          />
        </CardContent>
      </Card>

      {/* Edit FAQ Dialog */}
      {selectedFAQ && (
        <Dialog open={!!selectedFAQ} onOpenChange={() => setSelectedFAQ(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
            </DialogHeader>
            <FAQManager
              faq={selectedFAQ}
              onSave={(data) => handleUpdateFAQ(selectedFAQ._id, data)}
              onCancel={() => setSelectedFAQ(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
