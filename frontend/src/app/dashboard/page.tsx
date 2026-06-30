"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, getTodayAppointments, getDashboardUpcoming, updateAppointmentStatus, updateAppointmentNotes } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Clock, Users, XCircle, MoreHorizontal, Stethoscope, FileText, Plus, Search, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: number;
  appointment_date: string;
  slot_time: string;
  token_number: number;
  status: string;
  reason: string;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  patient_age: number;
};

type DayData = {
  date: string;
  day: string;
  appointment_count: number;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_ACTIONS = [
  { label: "Mark Confirmed", value: "confirmed" },
  { label: "Mark Completed", value: "completed" },
  { label: "Mark No Show", value: "no_show" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [notesModal, setNotesModal] = useState<{ open: boolean; appointmentId: number | null; notes: string }>({
    open: false,
    appointmentId: null,
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, todayRes, upcomingRes] = await Promise.all([
        getDashboardStats(),
        getTodayAppointments(),
        getDashboardUpcoming(),
      ]);
      setStats(statsRes.data);
      setAppointments(todayRes.data);
      setFilteredAppointments(todayRes.data);
      setWeeklyData(upcomingRes.data);
    } catch (err: any) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDayClick = (date: string) => {
    if (selectedDay === date) {
      setSelectedDay(null);
      setFilteredAppointments(appointments);
    } else {
      setSelectedDay(date);
      setFilteredAppointments(
        appointments.filter((a) => {
          const aDate = new Date(a.appointment_date).toISOString().split("T")[0];
          return aDate === date;
        })
      );
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      setFilteredAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      fetchData();
      toast("success", `Status updated to "${status}".`);
    } catch (err) {
      toast("error", "Failed to update status.");
    }
  };

  const handleSaveNotes = async () => {
    if (!notesModal.appointmentId) return;
    try {
      await updateAppointmentNotes(notesModal.appointmentId, notesModal.notes);
      setNotesModal({ open: false, appointmentId: null, notes: "" });
      toast("success", "Notes saved.");
    } catch (err) {
      toast("error", "Failed to save notes.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Appointments",
      value: stats?.today_total ?? 0,
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-gradient-to-br from-primary/10 to-primary/5",
      border: "border-primary/10",
    },
    {
      label: "Pending",
      value: stats?.today_pending ?? 0,
      icon: Clock,
      color: "text-warning",
      bg: "bg-gradient-to-br from-warning/10 to-warning/5",
      border: "border-warning/10",
    },
    {
      label: "Completed",
      value: stats?.today_completed ?? 0,
      icon: Stethoscope,
      color: "text-success",
      bg: "bg-gradient-to-br from-success/10 to-success/5",
      border: "border-success/10",
    },
    {
      label: "No Shows",
      value: stats?.today_no_show ?? 0,
      icon: XCircle,
      color: "text-danger",
      bg: "bg-gradient-to-br from-danger/10 to-danger/5",
      border: "border-danger/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button onClick={() => router.push('/dashboard/appointments?new=true')} className="flex-1 bg-gradient-to-r from-primary to-primary-light hover:shadow-lg transition-all h-14 text-lg">
          <Plus className="mr-2 h-5 w-5" /> New Appointment
        </Button>
        <Button onClick={() => router.push('/dashboard/patients')} variant="outline" className="flex-1 hover:shadow-md transition-all h-14 text-lg border-primary/20 text-primary">
          <Search className="mr-2 h-5 w-5" /> Find Patient
        </Button>
        <Button onClick={() => router.push('/dashboard/queue')} variant="secondary" className="flex-1 hover:shadow-md transition-all h-14 text-lg bg-secondary">
          <Activity className="mr-2 h-5 w-5 text-primary" /> Live Queue
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`border ${card.border || "border-border"} shadow-sm hover:shadow-md transition-all duration-300`}>
              <CardContent className="flex items-center gap-5 p-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.bg}`}>
                  <Icon className={`h-7 w-7 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">This Week Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weeklyData.map((day) => {
              const isToday =
                new Date(day.date).toDateString() === new Date().toDateString();
              const isSelected = selectedDay === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => handleDayClick(day.date)}
                  className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : isToday
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {day.day}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      day.appointment_count > 0 ? "" : "text-muted-foreground"
                    }`}
                  >
                    {day.date.split("-")[2]}
                  </span>
                  {day.appointment_count > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {day.appointment_count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">
            {selectedDay
              ? `Appointments for ${new Date(selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
              : "Today's Queue"}
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {filteredAppointments.length} patient{filteredAppointments.length !== 1 ? "s" : ""}
          </Badge>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Users className="h-12 w-12 opacity-30" />
              <p>No appointments for this day.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Token</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead className="w-16">Age</TableHead>
                    <TableHead className="w-24">Time</TableHead>
                    <TableHead className="max-w-[200px]">Reason</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-semibold">
                        #{String(apt.token_number).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{apt.patient_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {apt.patient_phone}
                        </div>
                      </TableCell>
                      <TableCell>{apt.patient_age}</TableCell>
                      <TableCell>
                        {new Date(`1970-01-01T${apt.slot_time}`).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit", hour12: true }
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {apt.reason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${STATUS_STYLES[apt.status] || ""}`}
                        >
                          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {STATUS_ACTIONS.map((action) => (
                              <DropdownMenuItem
                                key={action.value}
                                onClick={() => handleStatusUpdate(apt.id, action.value)}
                                disabled={apt.status === action.value}
                              >
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() =>
                                setNotesModal({
                                  open: true,
                                  appointmentId: apt.id,
                                  notes: "",
                                })
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Add Notes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={notesModal.open}
        onOpenChange={(open) =>
          setNotesModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visit Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter your clinical notes here..."
            className="min-h-[150px]"
            value={notesModal.notes}
            onChange={(e) =>
              setNotesModal((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setNotesModal({ open: false, appointmentId: null, notes: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
