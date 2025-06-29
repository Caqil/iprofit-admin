"use client";
import { Button } from "@/components/ui/button";
import { Search, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6 relative">
              <Search className="w-16 h-16 text-primary/60" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto rounded-full" />
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Page Not Found
            </h2>
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-sm text-foreground mb-2">
              What can you do?
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Check the URL for typos</li>
              <li>• Go back to the previous page</li>
              <li>• Visit our homepage</li>
              <li>• Contact support if you think this is a mistake</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => window.history.back()}
              variant="default"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground mt-6">
            Need help?{" "}
            <Link
              href="/contact"
              className="text-primary hover:underline font-medium"
            >
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
