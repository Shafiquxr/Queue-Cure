# Queue Cure '26

A modern, brutalist-styled real-time queue management system designed for fast-paced clinics. Built with Next.js, Firebase, and Tailwind CSS, it streamlines the waiting room experience for both patients and receptionists, allowing them to manage high throughput smoothly.

## 🌟 Features

- **Receptionist Dashboard (`/r/[clinicSlug]`)**: A high-efficiency dashboard for clinic staff. Generate tokens, call the next patient, handle no-shows (skips), and recall patients to the queue with a single click. Includes visual cues for current wait times and queue lengths.
- **TV / Waiting Room Display (`/q/[clinicSlug]` & `/q/[clinicSlug]/[doctorSlug]`)**: A high-contrast, big-screen display for the clinic waiting area. It shows the currently serving token, dynamically updating wait times, and a daily QR code/access code for patients to track their status.
- **Clinic Administration (`/admin/[clinicSlug]`)**: Securely configure clinic settings, manage the roster of doctors, view analytics, and control the daily tokens.
- **Intelligent Wait Time Estimation**: Wait times are not hard-coded. They are dynamically calculated using the real-time average of recent consultations and the elapsed time of the current patient. We use a sophisticated algorithm that considers the timestamps of `calledAt` and `completedAt` to derive accurate wait times for upcoming tokens.
- **Real-time Synchronization**: Powered by Firebase Firestore, ensuring that all connected TVs, dashboards, and patient mobile devices are instantly in sync. Utilizing Firebase's optimistic updates allows immediate UI feedback for receptionists before the server round-trip completes.
- **Brutalist Design System**: Designed to be highly readable, bold, and distinct. It uses heavy borders, stark contrasts, and clear typography to ensure visibility from a distance (on TVs) and clarity for fast usage (by receptionists).

## 🏗️ Architecture & Core Logic

### Data Model
Queue Cure relies heavily on a structured Firestore database:
- **`clinics`**: The root configuration for a clinic.
- **`doctors`**: A subcollection of clinics, containing profiles for doctors.
- **`dailyCodes`**: Manages the unique 4-digit code and token counters for a specific day, per doctor. This ensures tokens reset at midnight and patients have a secure way to access their digital queue ticket.
- **`tokens`**: Individual patient tickets, tracking their `status` ('waiting', 'serving', 'completed', 'skipped'), `number`, and vital timestamps (`createdAt`, `calledAt`, `completedAt`).

### Wait Time Algorithm
The system calculates the wait time by:
1. Fetching the last $N$ completed tokens to compute an average consultation time.
2. Checking the currently `serving` token to calculate how long they have been in the consultation room.
3. Estimating the time remaining for the current token and adding the average consultation time multiplied by the number of people waiting ahead of a given patient.
4. Handling edge cases where timestamps are missing or pending (e.g. during a local optimistic update) by estimating server timestamps or falling back to safe defaults.

### State Management
State is managed using custom React hooks wrapped around Firebase SDK listeners (`useCollection`, `useDoc`). We use `{ serverTimestamps: 'estimate' }` to ensure that local, uncommitted writes immediately reflect the current time, preventing UI flickering or "Invalid Date" bugs.

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom brutalist aesthetic with distinct shapes and high-contrast colors)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) (Headless accessibility primitives)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) setup for future AI-driven triage and optimizations.

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have Node.js (v18 or higher) and npm installed.

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/brnghse/Queue-Cure.git
cd Queue-Cure
npm install
```

### 3. Firebase Setup
Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/) and enable Firestore and Authentication. 

Create a `.env.local` file in the root of the project and add your Firebase config keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server
Start the development server using Turbopack:
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) in your browser to see the result.

## 📐 Project Structure

- `src/app/` - Next.js App Router pages and layouts.
  - `/admin` - Clinic management and settings.
  - `/q` - Public-facing waiting room displays (TVs and mobile).
  - `/r` - Internal receptionist dashboard.
- `src/components/` - Reusable UI components (Brutalist theme, Radix UI wrappers).
- `src/firebase/` - Firebase initialization and custom React hooks (`useDoc`, `useCollection`).
- `src/lib/` - Utility functions (e.g., date formatting, daily code generation).

## 📄 License
This project is proprietary. All rights reserved.
