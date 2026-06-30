"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAppointments,
  getAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
  deleteAppointment,
  getAvailableSlots,
  getBlockedDates,
  blockDate,
  unblockDate,
  rescheduleAppointment,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Search,
  Eye,
  MoreHorizontal,
  FileText,
  XCircle,
  Ban,
  CalendarX,
  Loader2,
  CalendarDays,
  Clock,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  in_consultation: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_OPTIONS = ["pending", "confirmed", "in_consultation", "completed", "cancelled", "no_show"];

function formatTime(t: string) {
  if (!t) return "";
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [detailModal, setDetailModal] = useState<any>({ open: false, id: null, data: null });
  const [detailNotes, setDetailNotes] = useState("");
  const [detailStatus, setDetailStatus] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);

  const [blockModal, setBlockModal] = useState(false);
  const [blockDateVal, setBlockDateVal] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blocking, setBlocking] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState<any>({ open: false, id: null });
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppointments({
        date: dateFilter,
        status: statusFilter || undefined,
        search: searchFilter || undefined,
      });
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchFilter(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openDetail = async (id: number) => {
    try {
      const res = await getAppointment(id);
      setDetailModal({ open: true, id, data: res.data });
      setDetailNotes(res.data.notes || "");
      setDetailStatus(res.data.status);
      const patId = res.data.patient_id;
      if (patId) {
        const { getPatientAppointments } = await import("@/lib/api");
        const hist = await getPatientAppointments(patId);
        setDetailHistory(hist.data?.slice(0, 3) || []);
      }
    } catch (err) {
      console.error("Failed to load appointment detail:", err);
    }
  };

  const handleSaveNotes = async () => {
    if (!detailModal.id) return;
    setSavingNotes(true);
    try {
      await updateAppointmentNotes(detailModal.id, detailNotes);
      setDetailModal((prev: any) => ({ ...prev, data: { ...prev.data, notes: detailNotes } }));
      fetchAppointments();
      toast("success", "Notes saved.");
    } catch (err) {
      toast("error", "Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!detailModal.id || !detailStatus) return;
    setUpdatingStatus(true);
    try {
      await updateAppointmentStatus(detailModal.id, detailStatus);
      setDetailModal((prev: any) => ({ ...prev, data: { ...prev.data, status: detailStatus } }));
      fetchAppointments();
      toast("success", `Status updated to "${detailStatus}".`);
    } catch (err) {
      toast("error", "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await deleteAppointment(id);
      fetchAppointments();
      toast("success", "Appointment cancelled.");
    } catch (err) {
      toast("error", "Failed to cancel appointment.");
    }
  };

  const openBlockModal = async () => {
    setBlockModal(true);
    setBlockDateVal("");
    setBlockReason("");
    try {
      const res = await getBlockedDates();
      setBlockedDates(res.data);
    } catch (err) {
      console.error("Failed to load blocked dates:", err);
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateVal) return;
    setBlocking(true);
    try {
      await blockDate(blockDateVal, blockReason);
      const res = await getBlockedDates();
      setBlockedDates(res.data);
      setBlockDateVal("");
      setBlockReason("");
      toast("success", "Date blocked.");
    } catch (err) {
      toast("error", "Failed to block date.");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (id: number) => {
    try {
      await unblockDate(id);
      const res = await getBlockedDates();
      setBlockedDates(res.data);
      toast("success", "Date unblocked.");
    } catch (err) {
      toast("error", "Failed to unblock date.");
    }
  };

  const openReschedule = (id: number) => {
    setRescheduleModal({ open: true, id });
    setRescheduleDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
  };

  useEffect(() => {
    if (rescheduleModal.open && rescheduleDate) {
      setLoadingSlots(true);
      setSelectedSlot("");
      getAvailableSlots(rescheduleDate)
        .then((res) => setAvailableSlots(res.data))
        .catch(console.error)
        .finally(() => setLoadingSlots(false));
    }
  }, [rescheduleModal.open, rescheduleDate]);

  const handleReschedule = async () => {
    if (!rescheduleModal.id || !rescheduleDate || !selectedSlot) return;
    setRescheduling(true);
    try {
      await rescheduleAppointment(rescheduleModal.id, {
        appointment_date: rescheduleDate,
        slot_time: selectedSlot,
      });
      setRescheduleModal({ open: false, id: null });
      fetchAppointments();
      toast("success", "Appointment rescheduled.");
    } catch (err) {
      toast("error", "Failed to reschedule.");
    } finally {
      setRescheduling(false);
    }
  };

  const ActionMenu = ({ appointment }: { appointment: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => openDetail(appointment.id)}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </DropdownMenuItem>
        {appointment.status !== "cancelled" && appointment.status !== "no_show" && (
          <>
            <DropdownMenuItem onClick={() => openReschedule(appointment.id)}>
              <CalendarDays className="mr-2 h-4 w-4" /> Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCancel(appointment.id)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        <Button onClick={openBlockModal}>
          <CalendarX className="mr-2 h-4 w-4" /> Block a Date
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or phone..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {appointments.length} Appointment{appointments.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No appointments found</p>
              <p className="text-sm">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Token</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead className="w-28 hidden md:table-cell">Phone</TableHead>
                    <TableHead className="w-12 hidden md:table-cell">Age</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-20">Time</TableHead>
                    <TableHead className="max-w-[160px] hidden lg:table-cell">Reason</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-semibold">
                        #{String(apt.token_number).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{apt.patient_name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {apt.patient_phone}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {apt.patient_phone}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{apt.patient_age || "-"}</TableCell>
                      <TableCell>{formatDate(apt.appointment_date)}</TableCell>
                      <TableCell>{formatTime(apt.slot_time)}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground hidden lg:table-cell">
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
                        <ActionMenu appointment={apt} />
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
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal((prev: any) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailModal.data && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Patient Information
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Name</span>
                      <p className="font-medium">{detailModal.data.patient_name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Age / Gender</span>
                      <p className="font-medium">
                        {detailModal.data.patient_age || "-"} /{" "}
                        {detailModal.data.patient_gender || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Phone</span>
                      <p className="font-medium">{detailModal.data.patient_phone}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="font-medium">{detailModal.data.patient_email || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Appointment
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Date</span>
                      <p className="font-medium">
                        {formatDate(detailModal.data.appointment_date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Time</span>
                      <p className="font-medium">{formatTime(detailModal.data.slot_time)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Token Number</span>
                      <p className="font-medium">
                        #{String(detailModal.data.token_number).padStart(2, "0")}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Current Status</span>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-xs font-medium ${
                          STATUS_STYLES[detailModal.data.status] || ""
                        }`}
                      >
                        {detailModal.data.status.charAt(0).toUpperCase() +
                          detailModal.data.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-muted-foreground">Reason</span>
                      <p className="font-medium">{detailModal.data.reason || "No reason provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Doctor Notes
                  </h4>
                  <Textarea
                    placeholder="Add clinical notes..."
                    className="min-h-[100px]"
                    value={detailNotes}
                    onChange={(e) => setDetailNotes(e.target.value)}
                  />
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-1 h-3 w-3" /> Save Notes
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Change Status
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleUpdateStatus}
                      disabled={updatingStatus || detailStatus === detailModal.data.status}
                    >
                      {updatingStatus ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Update"
                      )}
                    </Button>
                  </div>
                </div>

                {detailHistory.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Recent Appointments
                    </h4>
                    <div className="space-y-2">
                      {detailHistory.map((h: any) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                        >
                          <span>
                            {formatDate(h.appointment_date)} at {formatTime(h.slot_time)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_STYLES[h.status] || ""}`}
                          >
                            {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={blockModal} onOpenChange={setBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block a Date</DialogTitle>
            <DialogDescription>
              Block a date to prevent new appointments from being booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={blockDateVal}
                onChange={(e) => setBlockDateVal(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
              <Input
                placeholder="e.g., Public holiday"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
            <Button onClick={handleBlockDate} disabled={blocking || !blockDateVal}>
              {blocking ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Blocking...
                </>
              ) : (
                "Block Date"
              )}
            </Button>
          </div>
          {blockedDates.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Blocked Dates</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blockedDates.map((bd: any) => (
                  <div
                    key={bd.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{formatDate(bd.blocked_date)}</span>
                      {bd.reason && (
                        <span className="ml-2 text-muted-foreground">- {bd.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleUnblock(bd.id)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={rescheduleModal.open}
        onOpenChange={(open) => setRescheduleModal((prev: any) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time slot for this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">New Date</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            {rescheduleDate && (
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Available Slots
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available slots for this date.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {availableSlots.map((slot: any) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          selectedSlot === slot.time
                            ? "border-primary bg-primary text-white"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleModal({ open: false, id: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduling || !rescheduleDate || !selectedSlot}
            >
              {rescheduling ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Rescheduling...
                </>
              ) : (
                "Confirm Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
