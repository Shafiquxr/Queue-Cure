# Queue Cure '26

A modern, brutalist-styled real-time queue management system designed for fast-paced clinics. Built with Next.js, Firebase, and Tailwind CSS, it streamlines the waiting room experience for both patients and receptionists.

## 🌟 Features

- **Receptionist Dashboard (`/r/[clinicSlug]`)**: A high-efficiency dashboard for clinic staff. Generate tokens, call the next patient, handle no-shows (skips), and recall patients to the queue with a single click.
- **TV / Waiting Room Display (`/q/[clinicSlug]` & `/q/[clinicSlug]/[doctorSlug]`)**: A high-contrast, big-screen display for the clinic waiting area. It shows the currently serving token, wait times, and a daily QR code/access code for patients to track their status.
- **Clinic Administration (`/admin/[clinicSlug]`)**: Securely configure clinic settings, manage the roster of doctors, and view analytics.
- **Intelligent Wait Time Estimation**: Wait times are not hard-coded; they are dynamically calculated using the real-time average of recent consultations and the elapsed time of the current patient.
- **Real-time Synchronization**: Powered by Firebase Firestore, ensuring that all connected TVs, dashboards, and patient mobile devices are instantly in sync.

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom brutalist aesthetic with distinct shapes and high-contrast colors)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) (Headless accessibility primitives)
- **Icons**: [Lucide React](https://lucide.dev/)

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
