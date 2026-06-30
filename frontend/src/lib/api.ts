const API_BASE = (typeof window !== "undefined" && (window as any).__NEXT_PUBLIC_API_URL) || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Request failed");
  }

  return json;
}

// Auth
export const login = (email: string, password: string) =>
  request<{ token: string; doctor: { id: number; name: string; email: string; specialization: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );

// Appointments
export const getAppointments = (params?: { date?: string; status?: string; search?: string }) => {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return request<any[]>(`/appointments${qs ? `?${qs}` : ""}`);
};

export const getTodayAppointments = () => request<any[]>("/appointments/today");

export const getAppointment = (id: number) => request<any>(`/appointments/${id}`);

export const createAppointment = (data: {
  doctor_id: number;
  patient_id: number;
  appointment_date: string;
  slot_time: string;
  reason?: string;
}) => request<any>("/appointments", { method: "POST", body: JSON.stringify(data) });

export const updateAppointmentStatus = (id: number, status: string) =>
  request<any>(`/appointments/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });

export const updateAppointmentNotes = (id: number, notes: string) =>
  request<any>(`/appointments/${id}/notes`, { method: "PUT", body: JSON.stringify({ notes }) });

export const updateAppointmentPayment = (id: number, payment_status: string, payment_method?: string) =>
  request<any>(`/appointments/${id}/payment`, { method: "PUT", body: JSON.stringify({ payment_status, payment_method }) });

export const rescheduleAppointment = (id: number, data: { appointment_date: string; slot_time: string }) =>
  request<any>(`/appointments/${id}/reschedule`, { method: "PUT", body: JSON.stringify(data) });

export const deleteAppointment = (id: number) =>
  request<any>(`/appointments/${id}`, { method: "DELETE" });

// Patients
export const getPatients = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<any[]>(`/patients${qs}`);
};

export const lookupPatientByPhone = (phone: string) =>
  request<any>(`/patients/phone/${encodeURIComponent(phone)}`);

export const getPatient = (id: number) => request<any>(`/patients/${id}`);

export const createPatient = (data: {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  address?: string;
}) => request<any>("/patients", { method: "POST", body: JSON.stringify(data) });

export const updatePatient = (id: number, data: any) =>
  request<any>(`/patients/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const getPatientAppointments = (id: number) =>
  request<any[]>(`/patients/${id}/appointments`);

export const getPatientMedicalProfile = (id: number) =>
  request<any>(`/patients/${id}/profile`);

export const updatePatientMedicalProfile = (id: number, data: any) =>
  request<any>(`/patients/${id}/profile`, { method: "PUT", body: JSON.stringify(data) });

export const getPatientPrescriptions = (id: number) =>
  request<any[]>(`/patients/${id}/prescriptions`);

export const createPrescription = (id: number, data: any) =>
  request<any>(`/patients/${id}/prescriptions`, { method: "POST", body: JSON.stringify(data) });

// Doctors
export const getDoctors = () =>
  request<{ id: number; name: string; specialization: string; clinic_name: string; bio: string; consultation_fee: number; profile_pic: string }[]>("/doctors");

export const getDoctor = (id: number) =>
  request<any>(`/doctors/${id}`);

export const getDoctorSlots = (id: number) =>
  request<any[]>(`/doctors/${id}/slots`);

export const updateDoctorProfile = (data: {
  name?: string;
  specialization?: string;
  clinic_name?: string;
  bio?: string;
  consultation_fee?: number;
}) => request<any>("/doctors/profile", { method: "PUT", body: JSON.stringify(data) });

export const changeDoctorPassword = (data: { old_password: string; new_password: string }) =>
  request<any>("/doctors/password", { method: "PUT", body: JSON.stringify(data) });

// Slots
export const getAvailableSlots = (date: string, doctor_id?: number) => {
  let url = `/slots/available?date=${date}`;
  if (doctor_id) url += `&doctor_id=${doctor_id}`;
  return request<{ time: string; label: string }[]>(url);
};

export const getSlots = () => request<any[]>("/slots");

export const createSlot = (data: {
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_mins: number;
}) => request<any>("/slots", { method: "POST", body: JSON.stringify(data) });

export const deleteSlot = (id: number) =>
  request<any>(`/slots/${id}`, { method: "DELETE" });

export const toggleSlot = (id: number) =>
  request<any>(`/slots/${id}/toggle`, { method: "PUT" });

export const blockDate = (blocked_date: string, reason?: string) =>
  request<any>("/slots/blocked-dates", {
    method: "POST",
    body: JSON.stringify({ blocked_date, reason }),
  });

export const getBlockedDates = () => request<any[]>("/slots/blocked-dates");

export const unblockDate = (id: number) =>
  request<any>(`/slots/blocked-dates/${id}`, { method: "DELETE" });

// Dashboard
export const getDashboardStats = () =>
  request<{
    today_total: number;
    today_pending: number;
    today_confirmed: number;
    today_completed: number;
    today_cancelled: number;
    today_no_show: number;
    this_month_total: number;
    total_patients: number;
  }>("/dashboard/stats");

export const getDashboardUpcoming = () =>
  request<{ date: string; day: string; appointment_count: number }[]>("/dashboard/upcoming");

// Analytics
export const getAnalyticsOverview = (month: string, year: string) =>
  request<any>(`/analytics/overview?month=${month}&year=${year}`);

export const getAnalyticsDaily = (month: string, year: string) =>
  request<any[]>(`/analytics/daily?month=${month}&year=${year}`);

export const getAnalyticsByDayOfWeek = () =>
  request<any>(`/analytics/by-day-of-week`);

export const getAnalyticsPeakHours = () =>
  request<any>(`/analytics/peak-hours`);

export const getAnalyticsTopPatients = () =>
  request<any[]>(`/analytics/top-patients`);

export const getAnalyticsMonthlySummary = (year: string) =>
  request<any[]>(`/analytics/monthly-summary?year=${year}`);

// Billing
export const getBillingToday = () =>
  request<any>(`/billing/today`);

export const getBillingSummary = (month: string, year: string) =>
  request<any[]>(`/billing/summary?month=${month}&year=${year}`);

// Settings
export const getClinicSettings = () =>
  request<any>(`/settings`);

export const updateClinicSettings = (data: any) =>
  request<any>(`/settings`, { method: "PUT", body: JSON.stringify(data) });
