# DocSlot — Clinic Appointment Management System

A full-stack clinic management system built for real-world use. Supports multiple doctors, live queue management, and a public patient self-booking portal — all in one platform.

---

## Features

### Doctor Portal
- Secure JWT-based doctor authentication
- Dashboard with today's stats — total, pending, completed, no-shows
- Appointment management with status tracking
- **Live Queue System** — token-based queue with real-time call-next flow
- Patient records with visit history and doctor notes
- Weekly calendar view

### Patient Booking Portal
- Public-facing booking page — no login required
- Doctor selection with specialty and consultation fee
- Real-time slot availability per doctor
- Auto token number assignment on booking
- Printable appointment slip

### Settings
- Editable doctor profile (name, specialization, clinic name, fee)
- Time slot management per day (add, remove, toggle)
- Block specific dates (holidays, leaves)
- Change password

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MySQL
- npm

### 1. Clone the repo

```bash
git clone https://github.com/minhajasghar/docslot.git
cd docslot
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=doctor_appointment
JWT_SECRET=your_secret_key
PORT=5000
```

Run the backend:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in `/frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Run the frontend:

```bash
npm run dev
```

### 4. Database

Create a MySQL database named `doctor_appointment` and import the schema from `/backend/schema.sql`.

App runs at `http://localhost:3000`

---

## Project Structure

```
docslot/
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   ├── slots.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js
│   ├── db.js
│   └── server.js
│
└── frontend/
    └── app/
        ├── book/          → Patient booking portal (public)
        ├── dashboard/     → Doctor dashboard
        │   ├── appointments/
        │   ├── patients/
        │   ├── queue/     → Live queue management
        │   └── settings/
        └── login/
```

---

## Screenshots

> Coming soon

---

## Author

**Minhaj Asghar** — AI/ML Engineer & Full-Stack Developer  
[GitHub](https://github.com/minhajasghar) · [Portfolio](https://minhaj-asghar-portfolio.vercel.app)

---

## License

This project is licensed under the MIT License.
