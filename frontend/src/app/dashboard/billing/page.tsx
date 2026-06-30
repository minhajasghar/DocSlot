"use client";

import { useState, useEffect, useCallback } from "react";
import { getBillingToday, getBillingSummary } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Wallet, CreditCard, Banknote, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  unpaid: "bg-red-100 text-red-700 border-red-200",
  waived: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function BillingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [todayData, setTodayData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any[]>([]);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, summaryRes] = await Promise.all([
        getBillingToday(),
        getBillingSummary(month, year)
      ]);
      setTodayData(todayRes.data);
      setSummaryData(summaryRes.data.map((d: any) => ({
        date: d.date.split("-")[2],
        collected: d.collected,
        pending: d.pending
      })));
    } catch (err: any) {
      console.error("Failed to load billing:", err);
      toast("error", "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [month, year, toast]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handlePrint = () => {
    window.print();
  };

  if (loading && !todayData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const kpiCards = [
    { title: "Collected Today", value: `Rs. ${todayData?.total_collected_today || 0}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { title: "Pending Collection", value: `Rs. ${todayData?.pending_collection || 0}`, icon: Wallet, color: "text-warning", bg: "bg-warning/10" },
    { title: "Waived Fees", value: todayData?.waived_count || 0, icon: Banknote, color: "text-muted-foreground", bg: "bg-muted" },
    { title: "Total Consultations", value: todayData?.total_completed_today || 0, icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
  ];

  const filteredPayments = todayData?.payments.filter((p: any) => {
    if (filter === "all") return true;
    return p.payment_status === filter;
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print-billing">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Payments</h1>
          <p className="text-muted-foreground mt-1">Manage today&apos;s collections and view monthly summaries.</p>
        </div>
        <div className="no-print">
          <Button onClick={handlePrint} variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <Download className="h-4 w-4" /> Print Daily Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <h3 className={`text-2xl font-bold ${card.color}`}>{card.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Payments Table */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Today&apos;s Billing</CardTitle>
              <CardDescription>Recent patient visits and their payment status</CardDescription>
            </div>
            <div className="no-print">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="flex h-10 w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="waived">Waived</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No billing records found for today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-semibold">#{String(p.token).padStart(2, "0")}</TableCell>
                        <TableCell className="font-medium">{p.patient_name}</TableCell>
                        <TableCell>
                          {new Date(`1970-01-01T${p.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">Rs. {p.fee}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{p.payment_method || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`capitalize ${PAYMENT_STYLES[p.payment_status]}`}>
                            {p.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Summary Chart */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle>Monthly Revenue</CardTitle>
            <div className="flex gap-2 mt-2 no-print">
              <select 
                value={month} 
                onChange={(e) => setMonth(e.target.value)}
                className="flex h-8 w-24 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="" disabled>Month</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                ))}
              </select>
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                className="flex h-8 w-20 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="" disabled>Year</option>
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            {summaryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '12px'}}/>
                  <Bar dataKey="collected" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" name="Pending" fill="#d97706" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-billing, .print-billing * {
            visibility: visible;
          }
          .print-billing {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
