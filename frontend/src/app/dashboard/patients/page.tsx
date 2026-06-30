"use client";

import { useState, useEffect, useCallback } from "react";
import { getPatients, getPatient, updatePatient, getPatientMedicalProfile, updatePatientMedicalProfile, getPatientPrescriptions, createPrescription } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Loader2, Save, X, Plus, FileText, Activity } from "lucide-react";

function formatDate(d: string | Date) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [profileModal, setProfileModal] = useState<any>({ open: false, data: null, appointments: [], medical: null, prescriptions: [] });
  const [activeTab, setActiveTab] = useState("info");
  
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [medicalForm, setMedicalForm] = useState<any>({});
  const [savingMedical, setSavingMedical] = useState(false);

  const [newPrescription, setNewPrescription] = useState({ diagnosis: "", notes: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }] });
  const [savingPrescription, setSavingPrescription] = useState(false);

  const { toast } = useToast();

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatients(search || undefined);
      setPatients(res.data);
    } catch (err) {
      toast("error", "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPatients(), 400);
    return () => clearTimeout(timer);
  }, [search, fetchPatients]);

  const openProfile = async (id: number) => {
    try {
      const [patientRes, medicalRes, prescriptionsRes] = await Promise.all([
        getPatient(id),
        getPatientMedicalProfile(id).catch(() => ({ data: null })),
        getPatientPrescriptions(id).catch(() => ({ data: [] }))
      ]);

      setProfileModal({ 
        open: true, 
        data: patientRes.data, 
        appointments: patientRes.data.appointments || [],
        medical: medicalRes.data,
        prescriptions: prescriptionsRes.data || []
      });
      setActiveTab("info");
      
      setEditForm({
        name: patientRes.data.name,
        phone: patientRes.data.phone,
        email: patientRes.data.email || "",
        age: patientRes.data.age || "",
        gender: patientRes.data.gender || "",
        address: patientRes.data.address || "",
      });
      setMedicalForm(medicalRes.data || { blood_group: "", allergies: "", chronic_conditions: "", current_medications: "", past_surgeries: "", family_history: "", notes: "" });
      setEditing(false);
    } catch (err) {
      toast("error", "Failed to load patient details.");
    }
  };

  const handleSaveEdit = async () => {
    if (!profileModal.data) return;
    setSaving(true);
    try {
      const res = await updatePatient(profileModal.data.id, editForm);
      setProfileModal((prev: any) => ({ ...prev, data: { ...prev.data, ...res.data } }));
      setEditing(false);
      toast("success", "Patient info updated.");
      fetchPatients();
    } catch (err) {
      toast("error", "Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMedical = async () => {
    if (!profileModal.data) return;
    setSavingMedical(true);
    try {
      await updatePatientMedicalProfile(profileModal.data.id, medicalForm);
      toast("success", "Medical profile updated.");
    } catch (err) {
      toast("error", "Failed to update medical profile.");
    } finally {
      setSavingMedical(false);
    }
  };

  const handleAddPrescription = async () => {
    if (!profileModal.data) return;
    if (!newPrescription.diagnosis) {
      toast("error", "Diagnosis is required.");
      return;
    }
    setSavingPrescription(true);
    try {
      await createPrescription(profileModal.data.id, newPrescription);
      toast("success", "Prescription created.");
      const prescriptionsRes = await getPatientPrescriptions(profileModal.data.id);
      setProfileModal((prev: any) => ({ ...prev, prescriptions: prescriptionsRes.data || [] }));
      setNewPrescription({ diagnosis: "", notes: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }] });
    } catch (err) {
      toast("error", "Failed to create prescription.");
    } finally {
      setSavingPrescription(false);
    }
  };

  const noShowCount = (appointments: any[]) =>
    appointments.filter((a: any) => a.status === "no_show").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Patients Directory</h1>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search patients by name or phone..."
              className="pl-10 h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-lg">
            {patients.length} Patient{patients.length !== 1 ? "s" : ""} Total
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Users className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No patients found</p>
              <p className="text-sm">Try a different search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="w-16">Age</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Visits</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => {
                    const visits = p.appointments ? p.appointments.length : 0;
                    const lastVisit =
                      p.appointments && p.appointments.length > 0
                        ? p.appointments[0].appointment_date
                        : null;
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openProfile(p.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {p.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="font-semibold">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {p.phone}
                        </TableCell>
                        <TableCell>{p.age || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{p.gender || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell font-medium">{visits}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {lastVisit ? formatDate(lastVisit) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary-light"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProfile(p.id);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={profileModal.open} onOpenChange={(open) => setProfileModal((prev: any) => ({ ...prev, open }))}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {profileModal.data && (
            <>
              <div className="bg-primary p-6 text-white shrink-0">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold shadow-inner">
                    {profileModal.data.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{profileModal.data.name}</h2>
                    <p className="text-blue-100 mt-1 flex gap-3">
                      <span>{profileModal.data.phone}</span>
                      {profileModal.data.age && <span>• {profileModal.data.age} yrs</span>}
                      {profileModal.data.gender && <span className="capitalize">• {profileModal.data.gender}</span>}
                    </p>
                    {noShowCount(profileModal.appointments) > 2 && (
                      <Badge variant="destructive" className="mt-2 bg-red-500/20 text-red-100 border-red-400">
                        High No-Show Risk ({noShowCount(profileModal.appointments)})
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs Header */}
              <div className="flex border-b shrink-0 px-6 bg-muted/10">
                {[
                  { id: 'info', label: 'Basic Info' },
                  { id: 'medical', label: 'Medical Profile' },
                  { id: 'prescriptions', label: 'Prescriptions' },
                  { id: 'appointments', label: 'Visits' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-background">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {editing ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                          <Input value={editForm.name} onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                          <Input value={editForm.phone} onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Email</label>
                          <Input value={editForm.email} onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Age</label>
                          <Input type="number" value={editForm.age} onChange={(e) => setEditForm((f: any) => ({ ...f, age: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Gender</label>
                          <div className="flex gap-2 h-10">
                            {["Male", "Female", "Other"].map((g) => (
                              <Button
                                key={g}
                                variant={editForm.gender === g ? "default" : "outline"}
                                className="flex-1"
                                onClick={() => setEditForm((f: any) => ({ ...f, gender: g }))}
                              >
                                {g}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">Address</label>
                          <Input value={editForm.address} onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                          <Button onClick={handleSaveEdit} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Details
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Button variant="outline" size="sm" className="absolute top-0 right-0" onClick={() => setEditing(true)}>Edit Info</Button>
                        <div className="grid gap-6 sm:grid-cols-2 pt-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
                            <p className="text-base font-medium mt-1">{profileModal.data.email || "Not provided"}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</span>
                            <p className="text-base font-medium mt-1">{profileModal.data.age || "Not provided"}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</span>
                            <p className="text-base font-medium mt-1 capitalize">{profileModal.data.gender || "Not provided"}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</span>
                            <p className="text-base font-medium mt-1">{profileModal.data.address || "Not provided"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'medical' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Blood Group</label>
                        <Input value={medicalForm.blood_group} onChange={(e) => setMedicalForm((f: any) => ({ ...f, blood_group: e.target.value }))} placeholder="e.g. O+, A-" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">Allergies</label>
                        <Textarea value={medicalForm.allergies} onChange={(e) => setMedicalForm((f: any) => ({ ...f, allergies: e.target.value }))} placeholder="List any allergies..." />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">Chronic Conditions</label>
                        <Textarea value={medicalForm.chronic_conditions} onChange={(e) => setMedicalForm((f: any) => ({ ...f, chronic_conditions: e.target.value }))} placeholder="Diabetes, Hypertension, etc." />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">Current Medications</label>
                        <Textarea value={medicalForm.current_medications} onChange={(e) => setMedicalForm((f: any) => ({ ...f, current_medications: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Past Surgeries</label>
                        <Textarea value={medicalForm.past_surgeries} onChange={(e) => setMedicalForm((f: any) => ({ ...f, past_surgeries: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Family History</label>
                        <Textarea value={medicalForm.family_history} onChange={(e) => setMedicalForm((f: any) => ({ ...f, family_history: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSaveMedical} disabled={savingMedical} className="bg-primary">
                        {savingMedical ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Medical Profile
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'prescriptions' && (
                  <div className="space-y-8">
                    {/* Add New Prescription */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border">
                      <h4 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> New Prescription</h4>
                      <div className="grid gap-4 sm:grid-cols-2 mb-4">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">Diagnosis *</label>
                          <Input value={newPrescription.diagnosis} onChange={e => setNewPrescription(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Primary diagnosis" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">Notes/Advice</label>
                          <Textarea value={newPrescription.notes} onChange={e => setNewPrescription(p => ({ ...p, notes: e.target.value }))} placeholder="General advice, diet restrictions..." rows={2} />
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <label className="text-xs font-semibold text-muted-foreground">Medications</label>
                        {newPrescription.medicines.map((med, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <Input placeholder="Medicine Name" value={med.name} onChange={e => {
                              const newMeds = [...newPrescription.medicines];
                              newMeds[idx].name = e.target.value;
                              setNewPrescription(p => ({ ...p, medicines: newMeds }));
                            }} className="flex-2" />
                            <Input placeholder="Dosage (e.g. 500mg)" value={med.dosage} onChange={e => {
                              const newMeds = [...newPrescription.medicines];
                              newMeds[idx].dosage = e.target.value;
                              setNewPrescription(p => ({ ...p, medicines: newMeds }));
                            }} className="flex-1" />
                            <Input placeholder="Freq (e.g. 1-0-1)" value={med.frequency} onChange={e => {
                              const newMeds = [...newPrescription.medicines];
                              newMeds[idx].frequency = e.target.value;
                              setNewPrescription(p => ({ ...p, medicines: newMeds }));
                            }} className="flex-1" />
                            <Input placeholder="Days" value={med.duration} onChange={e => {
                              const newMeds = [...newPrescription.medicines];
                              newMeds[idx].duration = e.target.value;
                              setNewPrescription(p => ({ ...p, medicines: newMeds }));
                            }} className="flex-1 w-20" />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setNewPrescription(p => ({ ...p, medicines: [...p.medicines, { name: "", dosage: "", frequency: "", duration: "" }] }))}>
                          Add Medicine
                        </Button>
                      </div>

                      <div className="flex justify-end border-t pt-4">
                        <Button onClick={handleAddPrescription} disabled={savingPrescription || !newPrescription.diagnosis}>
                          {savingPrescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Create Prescription
                        </Button>
                      </div>
                    </div>

                    {/* Past Prescriptions */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Prescription History</h4>
                      {profileModal.prescriptions.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">No prescriptions recorded yet.</p>
                      ) : (
                        profileModal.prescriptions.map((px: any) => (
                          <Card key={px.id} className="border-border shadow-sm">
                            <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                              <div>
                                <CardTitle className="text-base">{px.diagnosis}</CardTitle>
                                <p className="text-xs text-muted-foreground">{formatDate(px.created_at)}</p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => window.print()} className="no-print">Print</Button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              {px.notes && (
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Advice/Notes</span>
                                  <p className="text-sm">{px.notes}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground block mb-2">Medications</span>
                                <div className="space-y-2">
                                  {(() => {
                                    try {
                                      const meds = typeof px.medicines === 'string' ? JSON.parse(px.medicines) : px.medicines;
                                      return meds.map((m: any, i: number) => m.name && (
                                        <div key={i} className="flex items-center gap-4 text-sm border-b pb-2 last:border-0 last:pb-0">
                                          <span className="font-medium flex-1">{m.name}</span>
                                          <span className="text-muted-foreground w-20">{m.dosage}</span>
                                          <span className="text-muted-foreground w-24 text-center">{m.frequency}</span>
                                          <span className="text-muted-foreground w-24 text-right">{m.duration} days</span>
                                        </div>
                                      ));
                                    } catch (e) {
                                      return <p className="text-sm text-muted-foreground">Error parsing medicines</p>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'appointments' && (
                  <div className="space-y-4">
                    {profileModal.appointments.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No past appointments found.</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profileModal.appointments.map((apt: any) => (
                              <TableRow key={apt.id}>
                                <TableCell className="whitespace-nowrap font-medium">
                                  {formatDate(apt.appointment_date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                  {apt.slot_time
                                    ? new Date(`1970-01-01T${apt.slot_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                                    : "-"}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{apt.reason || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[apt.status] || ""}`}>
                                    {apt.status.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                  {apt.notes || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
