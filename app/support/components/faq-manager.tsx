"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FAQ } from "@/types";
import { toast } from "sonner";

interface FAQManagerProps {
  faq?: FAQ;
  onSave: (data: Partial<FAQ>) => Promise<void>;
  onCancel: () => void;
}

export function FAQManager({ faq, onSave, onCancel }: FAQManagerProps) {
  const [formData, setFormData] = useState({
    question: faq?.question || "",
    answer: faq?.answer || "",
    category: faq?.category || "",
    tags: faq?.tags?.join(", ") || "",
    priority: faq?.priority || 0,
    isActive: faq?.isActive ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    "General",
    "Account",
    "Payments",
    "Loans",
    "KYC",
    "Technical",
    "Security",
    "Features",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      toast.success(
        faq ? "FAQ updated successfully" : "FAQ created successfully"
      );
    } catch (error) {
      toast.error("Failed to save FAQ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="question">Question *</Label>
          <Input
            id="question"
            value={formData.question}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, question: e.target.value }))
            }
            placeholder="Enter the frequently asked question"
            required
          />
        </div>

        <div>
          <Label htmlFor="answer">Answer *</Label>
          <Textarea
            id="answer"
            value={formData.answer}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, answer: e.target.value }))
            }
            placeholder="Enter the detailed answer"
            rows={6}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, priority: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Low</SelectItem>
                <SelectItem value="5">Medium</SelectItem>
                <SelectItem value="10">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, tags: e.target.value }))
            }
            placeholder="Enter tags separated by commas"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
          <Label htmlFor="isActive">Active</Label>
          <Badge variant={formData.isActive ? "default" : "secondary"}>
            {formData.isActive ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : faq ? "Update FAQ" : "Create FAQ"}
        </Button>
      </div>
    </form>
  );
}
