// app/loans/components/emi-calculator.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  DollarSign,
  Calendar,
  Percent,
  TrendingUp,
  Download,
  Send,
  Copy,
  Share,
  PieChart,
  BarChart3,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { LOAN_CONSTANTS } from "@/utils/constants";

interface EMICalculation {
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalAmount: number;
  totalInterest: number;
  schedule: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[];
}

interface EMICalculatorProps {
  initialValues?: {
    amount?: number;
    rate?: number;
    tenure?: number;
  };
  onCalculate?: (calculation: EMICalculation) => void;
  showAdvanced?: boolean;
}

export function EMICalculator({
  initialValues,
  onCalculate,
  showAdvanced = true,
}: EMICalculatorProps) {
  const { user } = useAuth();

  // Form state
  const [loanAmount, setLoanAmount] = useState(initialValues?.amount || 5000);
  const [interestRate, setInterestRate] = useState(initialValues?.rate || 15);
  const [tenure, setTenure] = useState(initialValues?.tenure || 12);
  const [sendEmail, setSendEmail] = useState(false);

  // Calculation state
  const [calculation, setCalculation] = useState<EMICalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Calculate EMI
  const calculateEMI = (
    amount: number,
    rate: number,
    months: number
  ): EMICalculation => {
    const monthlyRate = rate / 100 / 12;
    const emi =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const totalAmount = emi * months;
    const totalInterest = totalAmount - amount;

    // Generate schedule
    let balance = amount;
    const schedule: {
      month: number;
      emi: number;
      principal: number;
      interest: number;
      balance: number;
    }[] = [];

    for (let month = 1; month <= months; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;

      schedule.push({
        month,
        emi: Math.round(emi * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        balance: Math.max(0, Math.round(balance * 100) / 100),
      });
    }

    return {
      loanAmount: amount,
      interestRate: rate,
      tenure: months,
      emiAmount: Math.round(emi * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      schedule,
    };
  };

  // Handle calculation
  const handleCalculate = async () => {
    if (
      loanAmount < LOAN_CONSTANTS.MIN_LOAN_AMOUNT ||
      loanAmount > LOAN_CONSTANTS.MAX_LOAN_AMOUNT
    ) {
      toast.error(
        `Loan amount must be between $${LOAN_CONSTANTS.MIN_LOAN_AMOUNT} and $${LOAN_CONSTANTS.MAX_LOAN_AMOUNT}`
      );
      return;
    }

    if (
      interestRate < LOAN_CONSTANTS.MIN_INTEREST_RATE ||
      interestRate > LOAN_CONSTANTS.MAX_INTEREST_RATE
    ) {
      toast.error(
        `Interest rate must be between ${LOAN_CONSTANTS.MIN_INTEREST_RATE}% and ${LOAN_CONSTANTS.MAX_INTEREST_RATE}%`
      );
      return;
    }

    if (
      tenure < LOAN_CONSTANTS.MIN_TENURE ||
      tenure > LOAN_CONSTANTS.MAX_TENURE
    ) {
      toast.error(
        `Tenure must be between ${LOAN_CONSTANTS.MIN_TENURE} and ${LOAN_CONSTANTS.MAX_TENURE} months`
      );
      return;
    }

    setIsCalculating(true);

    try {
      // Calculate locally first
      const localCalculation = calculateEMI(loanAmount, interestRate, tenure);
      setCalculation(localCalculation);
      onCalculate?.(localCalculation);

      // Call API if user wants to send email or for audit purposes
      if (sendEmail || user) {
        const response = await fetch("/api/loans/emi-calculator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loanAmount,
            interestRate,
            tenure,
            sendCalculation: sendEmail,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process calculation");
        }

        if (sendEmail) {
          toast.success("EMI calculation sent to your email");
        }
      }
    } catch (error) {
      toast.error(`Calculation failed: ${error}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate on value changes
  useEffect(() => {
    if (loanAmount && interestRate && tenure) {
      const calc = calculateEMI(loanAmount, interestRate, tenure);
      setCalculation(calc);
    }
  }, [loanAmount, interestRate, tenure]);

  // Export schedule
  const exportSchedule = () => {
    if (!calculation) return;

    const csvContent = [
      ["Month", "EMI", "Principal", "Interest", "Balance"],
      ...calculation.schedule.map((row) => [
        row.month,
        row.emi,
        row.principal,
        row.interest,
        row.balance,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emi-schedule-${loanAmount}-${interestRate}-${tenure}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy calculation
  const copyCalculation = () => {
    if (!calculation) return;

    const text = `
EMI Calculation Results:
Loan Amount: $${calculation.loanAmount.toLocaleString()}
Interest Rate: ${calculation.interestRate}% per annum
Tenure: ${calculation.tenure} months
Monthly EMI: $${calculation.emiAmount.toLocaleString()}
Total Amount: $${calculation.totalAmount.toLocaleString()}
Total Interest: $${calculation.totalInterest.toLocaleString()}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success("Calculation copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            EMI Calculator
          </CardTitle>
          <CardDescription>
            Calculate your Equated Monthly Installment (EMI) for different loan
            amounts, interest rates, and tenures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loan Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="loanAmount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Loan Amount
              </Label>
              <span className="text-sm font-medium">
                ${loanAmount.toLocaleString()}
              </span>
            </div>
            <Slider
              id="loanAmount"
              min={LOAN_CONSTANTS.MIN_LOAN_AMOUNT}
              max={LOAN_CONSTANTS.MAX_LOAN_AMOUNT}
              step={100}
              value={[loanAmount]}
              onValueChange={(value) => setLoanAmount(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${LOAN_CONSTANTS.MIN_LOAN_AMOUNT.toLocaleString()}</span>
              <span>${LOAN_CONSTANTS.MAX_LOAN_AMOUNT.toLocaleString()}</span>
            </div>
            <Input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(parseInt(e.target.value) || 0)}
              min={LOAN_CONSTANTS.MIN_LOAN_AMOUNT}
              max={LOAN_CONSTANTS.MAX_LOAN_AMOUNT}
              className="mt-2"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="interestRate" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Interest Rate (% per annum)
              </Label>
              <span className="text-sm font-medium">{interestRate}%</span>
            </div>
            <Slider
              id="interestRate"
              min={LOAN_CONSTANTS.MIN_INTEREST_RATE}
              max={LOAN_CONSTANTS.MAX_INTEREST_RATE}
              step={0.1}
              value={[interestRate]}
              onValueChange={(value) => setInterestRate(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{LOAN_CONSTANTS.MIN_INTEREST_RATE}%</span>
              <span>{LOAN_CONSTANTS.MAX_INTEREST_RATE}%</span>
            </div>
            <Input
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
              min={LOAN_CONSTANTS.MIN_INTEREST_RATE}
              max={LOAN_CONSTANTS.MAX_INTEREST_RATE}
              className="mt-2"
            />
          </div>

          {/* Tenure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tenure" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tenure (Months)
              </Label>
              <span className="text-sm font-medium">
                {tenure} months ({Math.round((tenure / 12) * 10) / 10} years)
              </span>
            </div>
            <Slider
              id="tenure"
              min={LOAN_CONSTANTS.MIN_TENURE}
              max={LOAN_CONSTANTS.MAX_TENURE}
              step={1}
              value={[tenure]}
              onValueChange={(value) => setTenure(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{LOAN_CONSTANTS.MIN_TENURE} months</span>
              <span>{LOAN_CONSTANTS.MAX_TENURE} months</span>
            </div>
            <Input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(parseInt(e.target.value) || 0)}
              min={LOAN_CONSTANTS.MIN_TENURE}
              max={LOAN_CONSTANTS.MAX_TENURE}
              className="mt-2"
            />
          </div>

          {/* Advanced Options */}
          {showAdvanced && user && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                />
                <Label htmlFor="sendEmail" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Email calculation results
                </Label>
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full gap-2"
            size="lg"
          >
            {isCalculating ? (
              <>
                <Calculator className="h-4 w-4 animate-pulse" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Calculate EMI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {calculation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Calculation Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyCalculation}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={exportSchedule}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">
                  Monthly EMI
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  ${calculation.emiAmount.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium">
                  Principal Amount
                </div>
                <div className="text-2xl font-bold text-green-700">
                  ${calculation.loanAmount.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">
                  Total Interest
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  ${calculation.totalInterest.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">
                  Total Amount
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  ${calculation.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Loan Summary
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Interest Rate:</span>
                    <span className="font-medium">
                      {calculation.interestRate}% per annum
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loan Tenure:</span>
                    <span className="font-medium">
                      {calculation.tenure} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest Percentage:</span>
                    <span className="font-medium">
                      {(
                        (calculation.totalInterest / calculation.loanAmount) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Payment Breakdown
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Principal</span>
                    <span className="font-medium">
                      {(
                        (calculation.loanAmount / calculation.totalAmount) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (calculation.loanAmount / calculation.totalAmount) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Interest</span>
                    <span className="font-medium">
                      {(
                        (calculation.totalInterest / calculation.totalAmount) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (calculation.totalInterest /
                            calculation.totalAmount) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for Schedule and Chart */}
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList>
                <TabsTrigger value="schedule">Repayment Schedule</TabsTrigger>
                <TabsTrigger value="summary">Yearly Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Monthly Repayment Schedule</h4>
                  <Badge variant="outline">
                    {calculation.schedule.length} installments
                  </Badge>
                </div>

                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>EMI</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculation.schedule.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">
                            {row.month}
                          </TableCell>
                          <TableCell>${row.emi.toLocaleString()}</TableCell>
                          <TableCell>
                            ${row.principal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ${row.interest.toLocaleString()}
                          </TableCell>
                          <TableCell>${row.balance.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <h4 className="font-medium">Yearly Payment Summary</h4>
                <div className="space-y-2">
                  {Array.from(
                    { length: Math.ceil(calculation.tenure / 12) },
                    (_, yearIndex) => {
                      const startMonth = yearIndex * 12 + 1;
                      const endMonth = Math.min(
                        (yearIndex + 1) * 12,
                        calculation.tenure
                      );
                      const yearPayments = calculation.schedule.slice(
                        startMonth - 1,
                        endMonth
                      );
                      const yearPrincipal = yearPayments.reduce(
                        (sum, payment) => sum + payment.principal,
                        0
                      );
                      const yearInterest = yearPayments.reduce(
                        (sum, payment) => sum + payment.interest,
                        0
                      );
                      const yearTotal = yearPrincipal + yearInterest;

                      return (
                        <div key={yearIndex} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">
                              Year {yearIndex + 1}
                            </span>
                            <Badge variant="outline">
                              Months {startMonth}-{endMonth}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Principal:
                              </span>
                              <div className="font-medium">
                                ${yearPrincipal.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Interest:
                              </span>
                              <div className="font-medium">
                                ${yearInterest.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Total:
                              </span>
                              <div className="font-medium">
                                ${yearTotal.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
