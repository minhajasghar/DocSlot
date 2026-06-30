"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTodayAppointments,
  updateAppointmentStatus,
  updateAppointmentNotes,
  updateAppointmentPayment,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  Stethoscope,
  CalendarCheck,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  in_consultation: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatTime(t: string) {
  if (!t) return "";
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function QueuePage() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [notesModal, setNotesModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [callNextLoading, setCallNextLoading] = useState(false);

  const [paymentModal, setPaymentModal] = useState<{ open: boolean; appointment: any | null }>({ open: false, appointment: null });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [savingPayment, setSavingPayment] = useState(false);

  const [showCompleted, setShowCompleted] = useState(false);
  const { doctor } = useAuth();

  // Suppress 30s refresh when action is in progress or modal open
  const suppressRefresh = useRef(false);

  const fetchQueue = useCallback(async (showLoader = false) => {
    if (suppressRefresh.current) return;
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getTodayAppointments();
      setAppointments(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueue(true);
  }, [fetchQueue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchQueue(false), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // ---- derived data ----
  const waiting = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  );
  const inConsultation = appointments.filter((a) => a.status === "in_consultation");
  const completed = appointments.filter((a) => a.status === "completed");
  const noShow = appointments.filter((a) => a.status === "no_show");

  const currentPatient = inConsultation.length > 0 ? inConsultation[0] : null;

  const sortedWaiting = [...waiting].sort(
    (a, b) => a.token_number - b.token_number
  );

  const completedToday = [...completed].sort(
    (a, b) => a.token_number - b.token_number
  );

  const nextPatient = sortedWaiting.length > 0 ? sortedWaiting[0] : null;

  // ---- actions ----
  const markStatus = async (id: number, status: string) => {
    setActionLoading(id);
    suppressRefresh.current = true;
    try {
      await updateAppointmentStatus(id, status);
      await fetchQueue(false);
      toast("success", `Patient marked as ${status.replace("_", " ")}.`);
      
      if (status === "completed") {
        const apt = appointments.find(a => a.id === id);
        if (apt) {
          setPaymentModal({ open: true, appointment: apt });
        }
      }
    } catch {
      toast("error", "Failed to update status.");
    } finally {
      setActionLoading(null);
      suppressRefresh.current = false;
    }
  };

  const handlePayment = async (paymentStatus: string) => {
    if (!paymentModal.appointment) return;
    setSavingPayment(true);
    suppressRefresh.current = true;
    try {
      await updateAppointmentPayment(paymentModal.appointment.id, paymentStatus, paymentStatus === 'paid' ? paymentMethod : undefined);
      toast("success", `Payment marked as ${paymentStatus}.`);
      setPaymentModal({ open: false, appointment: null });
      await fetchQueue(false);
    } catch (err) {
      toast("error", "Failed to save payment.");
    } finally {
      setSavingPayment(false);
      suppressRefresh.current = false;
    }
  };

  const callNext = async () => {
    if (!nextPatient) return;
    setCallNextLoading(true);
    suppressRefresh.current = true;
    try {
      // Mark next patient as in_consultation
      await updateAppointmentStatus(nextPatient.id, "in_consultation");
      await fetchQueue(false);
      toast("success", `Calling token #${String(nextPatient.token_number).padStart(2, "0")}.`);
    } catch {
      toast("error", "Failed to call next patient.");
    } finally {
      setCallNextLoading(false);
      suppressRefresh.current = false;
    }
  };

  const callNow = async (id: number) => {
    // If there's a current consultation patient, mark them as completed first
    if (currentPatient && currentPatient.id !== id) {
      suppressRefresh.current = true;
      try {
        await updateAppointmentStatus(currentPatient.id, "completed");
      } catch {
        // continue anyway
      } finally {
        suppressRefresh.current = false;
      }
    }
    await markStatus(id, "in_consultation");
  };

  const openNotesModal = (id: number, currentNotes?: string) => {
    setNotesModal({ open: true, id });
    setNotesText(currentNotes || "");
  };

  const handleSaveNotes = async () => {
    if (!notesModal.id) return;
    setSavingNotes(true);
    suppressRefresh.current = true;
    try {
      await updateAppointmentNotes(notesModal.id, notesText);
      await fetchQueue(false);
      toast("success", "Notes saved.");
      setNotesModal({ open: false, id: null });
    } catch {
      toast("error", "Failed to save notes.");
    } finally {
      setSavingNotes(false);
      suppressRefresh.current = false;
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Live Queue</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Queue</h1>
          <p className="text-sm text-muted-foreground">
            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} today
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchQueue(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-700">{waiting.length}</p>
            <p className="text-xs font-medium text-amber-600">Waiting</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-700">
              {inConsultation.length}
            </p>
            <p className="text-xs font-medium text-blue-600">In Consultation</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-700">{completed.length}</p>
            <p className="text-xs font-medium text-green-600">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-700">{noShow.length}</p>
            <p className="text-xs font-medium text-red-600">No Show</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN — Now Serving */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-blue-50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Now Serving
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {currentPatient ? (
              <div className="space-y-6">
                {/* Token + Name */}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      #{String(currentPatient.token_number).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {currentPatient.patient_name}
                  </h2>
                  <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <span>{currentPatient.patient_age || "-"} yrs</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span>{currentPatient.patient_gender || "-"}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">
                        {formatTime(currentPatient.slot_time)}
                      </span>
                    </div>
                    {currentPatient.reason && (
                      <div className="flex items-start gap-2 text-sm">
                        <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Reason:</span>
                        <span className="font-medium">{currentPatient.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => markStatus(currentPatient.id, "completed")}
                    disabled={actionLoading === currentPatient.id}
                  >
                    {actionLoading === currentPatient.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => markStatus(currentPatient.id, "no_show")}
                    disabled={actionLoading === currentPatient.id}
                  >
                    {actionLoading === currentPatient.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Mark No Show
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() =>
                      openNotesModal(currentPatient.id, currentPatient.notes)
                    }
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                  No patient in consultation
                </p>
                <p className="mt-1 text-sm text-muted-foreground/60">
                  {waiting.length > 0
                    ? "Click &quot;Call Next&quot; to bring in the next patient."
                    : "All patients have been served."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT COLUMN — Waiting List */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarCheck className="h-5 w-5 text-amber-600" />
                Waiting List
                {sortedWaiting.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 bg-amber-50 text-amber-700 border-amber-200"
                  >
                    {sortedWaiting.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={callNext}
                disabled={!nextPatient || callNextLoading}
              >
                {callNextLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SkipForward className="h-4 w-4" />
                )}
                Call Next
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {sortedWaiting.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <CheckCircle2 className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground">No patients waiting</p>
                <p className="mt-1 text-sm text-muted-foreground/60">
                  All caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedWaiting.map((apt, idx) => {
                  const isNext = idx === 0 && !currentPatient;
                  return (
                    <div
                      key={apt.id}
                      className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 ${
                        isNext ? "bg-amber-50/50" : ""
                      }`}
                    >
                      {/* Token badge */}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isNext
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        #{String(apt.token_number).padStart(2, "0")}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {apt.patient_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(apt.slot_time)}</span>
                          {apt.reason && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                                {apt.reason}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1 text-xs"
                        onClick={() => callNow(apt.id)}
                        disabled={actionLoading === apt.id || !!currentPatient}
                      >
                        {actionLoading === apt.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <SkipForward className="h-3 w-3" />
                        )}
                        Call Now
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section — Completed Today */}
      {completedToday.length > 0 && (
        <Card>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-foreground">
                Completed Today
              </span>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                {completedToday.length}
              </Badge>
            </div>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showCompleted && (
            <div className="border-t">
              {completedToday.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-muted/30"
                >
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 font-bold"
                  >
                    #{String(apt.token_number).padStart(2, "0")}
                  </Badge>
                  <span className="font-medium text-foreground">
                    {apt.patient_name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTime(apt.slot_time)}
                  </span>
                  {apt.notes && (
                    <span className="ml-auto hidden max-w-[200px] truncate text-muted-foreground sm:block">
                      <ClipboardList className="mr-1 inline h-3 w-3" />
                      {apt.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Notes Modal */}
      <Dialog
        open={notesModal.open}
        onOpenChange={(open) => {
          if (!open) setNotesModal({ open: false, id: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter clinical notes..."
            className="min-h-[150px]"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesModal({ open: false, id: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Notes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Payment Modal */}
      <Dialog
        open={paymentModal.open}
        onOpenChange={(open) => {
          if (!open) setPaymentModal({ open: false, appointment: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">Select payment method for {paymentModal.appointment?.patient_name}.</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['cash', 'card', 'online'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${paymentMethod === method ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50'}`}
                >
                  <span className="capitalize font-medium">{method}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handlePayment('waived')}
              disabled={savingPayment}
              className="sm:mr-auto"
            >
              Waive Fee
            </Button>
            <Button
              variant="outline"
              onClick={() => setPaymentModal({ open: false, appointment: null })}
            >
              Skip
            </Button>
            <Button onClick={() => handlePayment('paid')} disabled={savingPayment} className="bg-green-600 hover:bg-green-700">
              {savingPayment ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                `Mark Paid`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
