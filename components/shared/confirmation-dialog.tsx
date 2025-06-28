"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  icon?: React.ReactNode;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const variantConfig = {
  default: {
    icon: Info,
    confirmVariant: "default" as const,
    iconColor: "text-blue-500",
  },
  destructive: {
    icon: XCircle,
    confirmVariant: "destructive" as const,
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    confirmVariant: "default" as const,
    iconColor: "text-yellow-500",
  },
  success: {
    icon: CheckCircle,
    confirmVariant: "default" as const,
    iconColor: "text-green-500",
  },
};

export function ConfirmationDialog({
  children,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
  disabled = false,
  open,
  onOpenChange,
}: ConfirmationDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const config = variantConfig[variant];
  const IconComponent = icon || React.createElement(config.icon);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const isActionDisabled = disabled || isLoading || isConfirming;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {React.isValidElement(IconComponent) ? (
              React.cloneElement(IconComponent, {
                className: cn("h-5 w-5", config.iconColor),
              } as React.SVGProps<SVGSVGElement>)
            ) : (
              <config.icon className={cn("h-5 w-5", config.iconColor)} />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isConfirming}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isActionDisabled}
            className={cn(
              isConfirming && "cursor-not-allowed",
              config.confirmVariant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for imperative usage
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    props: Omit<ConfirmationDialogProps, "children" | "open" | "onOpenChange">;
  }>({
    isOpen: false,
    props: {
      title: "",
      description: "",
      onConfirm: () => {},
    },
  });

  const confirm = React.useCallback(
    (
      props: Omit<ConfirmationDialogProps, "children" | "open" | "onOpenChange">
    ) => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          isOpen: true,
          props: {
            ...props,
            onConfirm: async () => {
              await props.onConfirm();
              resolve(true);
            },
            onCancel: () => {
              props.onCancel?.();
              resolve(false);
            },
          },
        });
      });
    },
    []
  );

  const ConfirmationDialogComponent = React.useCallback(() => {
    if (!dialogState.isOpen) return null;

    return (
      <ConfirmationDialog
        {...dialogState.props}
        open={dialogState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <div />
      </ConfirmationDialog>
    );
  }, [dialogState]);

  return {
    confirm,
    ConfirmationDialog: ConfirmationDialogComponent,
  };
}
