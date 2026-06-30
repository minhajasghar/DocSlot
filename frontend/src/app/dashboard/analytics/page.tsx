"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalyticsOverview, getAnalyticsDaily, getAnalyticsByDayOfWeek, getAnalyticsPeakHours, getAnalyticsMonthlySummary, getAnalyticsTopPatients } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, CalendarCheck, Users, Ban, DollarSign, Activity, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [overview, setOverview] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<any[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [topPatients, setTopPatients] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        dailyRes,
        dowRes,
        peakRes,
        monthlyRes,
        topRes
      ] = await Promise.all([
        getAnalyticsOverview(month, year),
        getAnalyticsDaily(month, year),
        getAnalyticsByDayOfWeek(),
        getAnalyticsPeakHours(),
        getAnalyticsMonthlySummary(year),
        getAnalyticsTopPatients()
      ]);

      setOverview(overviewRes.data);
      setDailyData(dailyRes.data.map((d: any) => ({ ...d, date: d.date.split("-")[2] }))); // format date for chart
      
      const dowKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      setDayOfWeekData(dowKeys.map(k => ({ name: k, count: dowRes.data[k] || 0 })));
      
      setPeakHoursData(Object.keys(peakRes.data).map(k => ({ time: k, count: peakRes.data[k] })));
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      setMonthlySummary(monthlyRes.data.map((d: any) => ({
        ...d,
        name: monthNames[parseInt(d.month) - 1]
      })));
      
      setTopPatients(topRes.data);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      toast("error", "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [month, year, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = () => {
    window.print();
  };

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const kpiCards = [
    { title: "Total Appointments", value: overview?.total_appointments || 0, icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
    { title: "Completed Consultations", value: overview?.completed || 0, icon: Activity, color: "text-success", bg: "bg-success/10" },
    { title: "Cancellations", value: overview?.cancelled || 0, icon: Ban, color: "text-danger", bg: "bg-danger/10" },
    { title: "No-Show Rate", value: `${overview?.no_show_rate || 0}%`, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
    { title: "Total Revenue", value: `Rs. ${overview?.total_revenue || 0}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { title: "New Patients", value: overview?.new_patients || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print-analytics">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Overview</h1>
          <p className="text-muted-foreground mt-1">Track clinic performance and patient trends.</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="flex h-10 w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="" disabled>Month</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="flex h-10 w-24 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="" disabled>Year</option>
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointments Per Day */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Appointments This Month</CardTitle>
            <CardDescription>Daily appointment volume for the selected month.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                <RechartsTooltip cursor={{stroke: '#e2e8f0', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="count" stroke="#1e40af" strokeWidth={3} dot={{r: 4, fill: '#1e40af', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Day of Week & Peak Hours */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>By Day of Week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData.slice(0, 8)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Top Patients</CardTitle>
            <CardDescription>Most frequent visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPatients.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{p.visit_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Monthly Summary ({year})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-right">Revenue (Rs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySummary.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-center">{m.total}</TableCell>
                    <TableCell className="text-center text-success">{m.completed}</TableCell>
                    <TableCell className="text-right font-semibold">Rs. {m.revenue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-analytics, .print-analytics * {
            visibility: visible;
          }
          .print-analytics {
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
