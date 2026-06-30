"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDoctors,
  getAvailableSlots,
  lookupPatientByPhone,
  createPatient,
  createAppointment,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Printer,
  Stethoscope,
  Phone,
  User,
  Loader2,
  DollarSign,
  Building2,
  RefreshCw,
} from "lucide-react";

const DOCTOR_COLORS = [
  "bg-blue-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-cyan-600",
];

function getDoctorColor(index: number) {
  return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDateLabel(d: string): string {
  const date = new Date(d + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d === today.toISOString().split("T")[0]) return "Today";
  if (d === tomorrow.toISOString().split("T")[0]) return "Tomorrow";

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string) {
  if (!t) return "";
  return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFee(fee: number) {
  return `Rs. ${fee.toLocaleString("en-IN")}`;
}

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [allDates] = useState(() => generateDateRange(30));
  const [dateOffset, setDateOffset] = useState(0);
  const visibleDates = allDates.slice(dateOffset, dateOffset + 7);

  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [reason, setReason] = useState("");
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const [phoneLookupDone, setPhoneLookupDone] = useState(false);

  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  const totalSteps = useMemo(() => (doctors.length <= 1 ? 3 : 4), [doctors.length]);

  const effectiveStep = useMemo(() => {
    if (doctors.length <= 1) {
      if (step === 0) return { display: 0, actual: 1 };
      return { display: step - 1, actual: step };
    }
    return { display: step, actual: step };
  }, [step, doctors.length]);

  useEffect(() => {
    getDoctors()
      .then((res) => {
        const docs = res.data || [];
        setDoctors(docs);
        if (docs.length === 1) {
          setSelectedDoctor(docs[0]);
          setStep(1);
        }
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      setLoadingSlots(true);
      setSelectedSlot("");
      setAvailableSlots([]);
      getAvailableSlots(selectedDate, selectedDoctor.id)
        .then((res) => setAvailableSlots(res.data || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDate, selectedDoctor]);

  const handlePhoneBlur = useCallback(async () => {
    const phone = patientPhone.trim();
    if (phone.length < 5 || phoneLookupDone) return;
    setPhoneLookupLoading(true);
    try {
      const res = await lookupPatientByPhone(phone);
      if (res.data) {
        setPatientName(res.data.name || "");
        setPatientAge(res.data.age ? String(res.data.age) : "");
        setPatientGender(res.data.gender || "");
        setPhoneLookupDone(true);
      }
    } catch {
      // Patient not found — leave fields empty
    } finally {
      setPhoneLookupLoading(false);
    }
  }, [patientPhone, phoneLookupDone]);

  const validateStep1 = () => {
    if (!selectedDate) return "Please select a date.";
    if (!selectedSlot) return "Please select a time slot.";
    return "";
  };

  const validateStep2 = () => {
    if (!patientName.trim()) return "Please enter your full name.";
    if (!patientPhone.trim()) return "Please enter your phone number.";
    if (patientPhone.replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit phone number.";
    if (!patientAge || isNaN(Number(patientAge)) || Number(patientAge) < 1 || Number(patientAge) > 150)
      return "Please enter a valid age.";
    if (!patientGender) return "Please select your gender.";
    return "";
  };

  const handleContinue = () => {
    setError("");
    const currentStep = doctors.length <= 1 ? step : step;
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > (doctors.length <= 1 ? 1 : 0)) setStep(step - 1);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      const patientRes = await createPatient({
        name: patientName.trim(),
        phone: patientPhone.trim(),
        age: Number(patientAge),
        gender: patientGender,
      });
      const patientId = patientRes.data.id;

      const aptRes = await createAppointment({
        doctor_id: selectedDoctor.id,
        patient_id: patientId,
        appointment_date: selectedDate,
        slot_time: selectedSlot,
        reason: reason.trim() || undefined,
      });
      setConfirmedAppointment(aptRes.data);
      setStep(doctors.length <= 1 ? 4 : 4);
    } catch (err: any) {
      setError(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(doctors.length <= 1 ? 1 : 0);
    setSelectedDoctor(null);
    setSelectedDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setPatientGender("");
    setReason("");
    setPhoneLookupDone(false);
    setConfirmedAppointment(null);
    setError("");
    if (doctors.length <= 1) {
      setSelectedDoctor(doctors[0]);
    }
  };

  const progressSteps = useMemo(() => {
    if (doctors.length <= 1) {
      return ["Date & Time", "Your Info", "Confirm"];
    }
    return ["Doctor", "Date & Time", "Your Info", "Confirm"];
  }, [doctors.length]);

  const renderProgressBar = () => {
    if (step === (doctors.length <= 1 ? 4 : 4) && confirmedAppointment) return null;

    const displayStep = doctors.length <= 1 ? step - 1 : step;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {progressSteps.map((label, i) => {
            const idx = i + 1;
            const isActive = displayStep === idx;
            const isDone = displayStep > idx;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx}
                  </div>
                  <span
                    className={`mt-1 text-xs font-medium ${
                      isActive ? "text-primary" : isDone ? "text-green-600" : "text-gray-400"
                    } hidden sm:block`}
                  >
                    {label}
                  </span>
                </div>
                {i < progressSteps.length - 1 && (
                  <div
                    className={`mx-2 h-px flex-1 ${displayStep > idx ? "bg-green-500" : "bg-gray-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-sm">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Book an Appointment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 0 && loadingDoctors
              ? "Loading doctors..."
              : selectedDoctor
                ? `${selectedDoctor.name} — ${selectedDoctor.specialization}`
                : "Select your doctor to get started"}
          </p>
        </div>

        {renderProgressBar()}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* STEP 0 — Select Doctor */}
        {step === 0 && !loadingDoctors && doctors.length > 1 && (
          <div>
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {doctors.map((doc, i) => {
                const isSelected = selectedDoctor?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`group relative w-full rounded-xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 shadow-md"
                        : "border-border bg-white shadow-sm hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className={`h-14 w-14 ${getDoctorColor(i)}`}>
                        <AvatarFallback className="bg-transparent text-lg font-bold text-white">
                          {getInitials(doc.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-foreground">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">{doc.specialization}</p>
                        {doc.clinic_name && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {doc.clinic_name}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatFee(doc.consultation_fee || 0)}
                        </div>
                        {doc.bio && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{doc.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div
                        className={`rounded-md py-2 text-center text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-primary/5 text-primary group-hover:bg-primary/10"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => { if (selectedDoctor) setStep(1); }} disabled={!selectedDoctor}>
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 0 — Empty state (API failed or no doctors) */}
        {step === 0 && !loadingDoctors && doctors.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Stethoscope className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">No doctors available</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Unable to load doctor information. Please check your connection and try again.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setLoadingDoctors(true);
                  getDoctors()
                    .then((res) => {
                      const docs = res.data || [];
                      setDoctors(docs);
                      if (docs.length === 1) {
                        setSelectedDoctor(docs[0]);
                        setStep(1);
                      }
                    })
                    .catch(() => setDoctors([]))
                    .finally(() => setLoadingDoctors(false));
                }}
              >
                <RefreshCw className="mr-1 h-4 w-4" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {step === 0 && loadingDoctors && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-9 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Doctor info bar (steps 1-3) */}
        {selectedDoctor && step >= 1 && step < 4 && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-3">
              <Avatar className={`h-8 w-8 ${getDoctorColor(doctors.findIndex((d) => d.id === selectedDoctor.id))}`}>
                <AvatarFallback className="bg-transparent text-xs font-bold text-white">
                  {getInitials(selectedDoctor.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedDoctor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedDoctor.specialization}</p>
              </div>
            </div>
            {doctors.length > 1 && (
              <button
                onClick={() => { setStep(0); setSelectedDate(""); setSelectedSlot(""); }}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Change Doctor
              </button>
            )}
          </div>
        )}

        {/* STEP 1 — Select Date & Time */}
        {step === 1 && (
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                <CalendarDays className="mr-2 inline h-5 w-5 text-primary" />
                Select a Date
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Choose a day for your visit</p>

              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={dateOffset === 0}
                  onClick={() => setDateOffset((o) => Math.max(0, o - 7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1.5 overflow-x-auto">
                  {visibleDates.map((d) => {
                    const isSelected = selectedDate === d;
                    const isPast = d < new Date().toISOString().split("T")[0];
                    return (
                      <button
                        key={d}
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedSlot("");
                        }}
                        className={`flex min-w-[72px] flex-col items-center rounded-lg border px-2 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-xs font-medium">
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(d + "T00:00:00").getDate()}
                        </span>
                        <span className="text-xs">
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={dateOffset + 7 >= allDates.length}
                  onClick={() => setDateOffset((o) => Math.min(allDates.length - 7, o + 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {selectedDate && (
                <>
                  <h3 className="mb-3 mt-2 text-sm font-semibold text-foreground">
                    <Clock className="mr-1 inline h-4 w-4 text-primary" />
                    Available Times for {formatDateLabel(selectedDate)}
                  </h3>
                  {loadingSlots ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-md" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="rounded-lg bg-muted/50 py-8 text-center text-sm text-muted-foreground">
                      <CalendarDays className="mx-auto mb-1 h-8 w-8 opacity-40" />
                      No available slots for this date.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((slot: any) => {
                        const isSelected = selectedSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-border hover:border-primary/50 hover:bg-primary/5"
                            }`}
                          >
                            {slot.label}
              </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  ← Back
                </Button>
                <Button onClick={handleContinue} disabled={!selectedDate || !selectedSlot}>
                  Continue →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Your Information */}
        {step === 2 && (
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                <User className="mr-2 inline h-5 w-5 text-primary" />
                Your Information
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Enter your details to complete the booking
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. John Smith"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 555-0100"
                      className="pl-9"
                      value={patientPhone}
                      onChange={(e) => {
                        setPatientPhone(e.target.value);
                        setPhoneLookupDone(false);
                      }}
                      onBlur={handlePhoneBlur}
                    />
                    {phoneLookupLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {phoneLookupDone && (
                    <p className="mt-1 text-xs text-green-600">
                      Returning patient — details filled automatically.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      placeholder="e.g. 35"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="flex h-9 gap-2">
                      {["Male", "Female", "Other"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setPatientGender(g)}
                          className={`flex-1 rounded-md border text-sm font-medium transition-colors ${
                            patientGender === g
                              ? "border-primary bg-primary text-white"
                              : "border-input bg-transparent hover:border-primary/50"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Reason for visit <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Briefly describe your symptoms or reason for the appointment..."
                    className="min-h-[80px]"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  ← Back
                </Button>
                <Button onClick={handleContinue}>Continue →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Confirm & Book */}
        {step === 3 && (
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                <CheckCircle2 className="mr-2 inline h-5 w-5 text-green-600" />
                Confirm Your Appointment
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">Please review the details below</p>

              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-3 border-b pb-3">
                    <Avatar className={`h-10 w-10 ${getDoctorColor(doctors.findIndex((d) => d.id === selectedDoctor.id))}`}>
                      <AvatarFallback className="bg-transparent text-sm font-bold text-white">
                        {getInitials(selectedDoctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{selectedDoctor.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Date</span>
                      <p className="font-semibold">{formatDateLabel(selectedDate)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Time</span>
                      <p className="font-semibold">{formatTime(selectedSlot)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Patient</span>
                      <p className="font-semibold">{patientName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Phone</span>
                      <p className="font-semibold">{patientPhone}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Age</span>
                      <p className="font-semibold">{patientAge}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Gender</span>
                      <p className="font-semibold">{patientGender}</p>
                    </div>
                    {selectedDoctor.consultation_fee > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Consultation Fee</span>
                        <p className="font-semibold text-primary">{formatFee(selectedDoctor.consultation_fee)}</p>
                      </div>
                    )}
                    {reason && (
                      <div className="sm:col-span-2">
                        <span className="text-xs text-muted-foreground">Reason</span>
                        <p className="font-semibold">{reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 p-3 text-sm text-primary">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Please arrive 10 minutes before your scheduled time.
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  ← Back
                </Button>
                <Button onClick={handleConfirm} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Booking...
                    </>
                  ) : (
                    "Confirm Appointment"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Booking Confirmed */}
        {step === 4 && confirmedAppointment && (
          <Card className="border-green-200">
            <CardContent className="p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-700 sm:text-2xl">Booking Confirmed!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your appointment has been successfully booked.
              </p>

              <div className="my-6 space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-center gap-3">
                    <Avatar className={`h-10 w-10 ${getDoctorColor(doctors.findIndex((d) => d.id === selectedDoctor.id))}`}>
                      <AvatarFallback className="bg-transparent text-sm font-bold text-white">
                        {getInitials(selectedDoctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{selectedDoctor.name}</p>
                      {selectedDoctor.clinic_name && (
                        <p className="text-xs text-muted-foreground">{selectedDoctor.clinic_name}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDateLabel(confirmedAppointment.appointment_date)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-semibold">{formatTime(confirmedAppointment.slot_time)}</p>
                </div>
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">Your Token Number</p>
                  <p className="text-4xl font-bold text-primary">
                    #{String(confirmedAppointment.token_number).padStart(2, "0")}
                  </p>
                </div>
              </div>

              <p className="mb-6 text-sm text-muted-foreground">
                Please arrive 10 minutes early. Show this token number at reception.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button variant="outline" onClick={() => window.print()} className="print-hidden">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={resetBooking} className="print-hidden">
                  Book Another Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DocSlot. All rights reserved.
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          @page { margin: 1.5cm; }
          .max-w-2xl { max-width: 100% !important; padding: 0 !important; }
          .min-h-screen { min-height: auto !important; }
          .bg-gradient-to-b { background: white !important; }
          .border-green-200 { border: 2px solid #16a34a !important; }
          .text-4xl { font-size: 48px !important; }
          .border-2 { border-width: 3px !important; }
          .space-y-3 > * { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
