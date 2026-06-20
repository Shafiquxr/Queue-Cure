# **App Name**: QueueCure '26

## Core Features:

- Atomic Token Generation: Sequential, non-duplicable token assignment scoped to clinic, doctor, and date using transactional integrity.
- Predictive Wait Time Engine: A tool that analyzes rolling consultation averages from the 5 previous consultants to predict personalized patient ETAs.
- Live Receptionist Command Center: Single-button interface for 'Call Next', 'Skip', and 'Recall' actions with real-time broadcasting to all screens.
- TV-Optimized Display View: Fullscreen-optimized high-contrast view for waiting rooms showing current serving token and waiting count.
- Patient QR Tracker: Mobile-web view for patients to track their specific queue position and ETA from their own device without login.
- Multi-Tenant Clinic Isolation: Data architecture that guarantees complete isolation between clinics and specific doctor queues using unique room-based identifiers.
- Persistent SQLite Storage: Transactional data persistence using Better-SQLite3 to ensure queue continuity across server restarts.

## Style Guidelines:

- Background in 'QC-Cream' (#F5F0E8), primary accents in vibrant 'QC-Yellow' (#F5D900), and all text/borders in solid 'QC-Black' (#0A0A0A).
- Font pairing: 'Space Grotesk' (700/400) for display headings and body; 'Space Mono' (700/400) for token numbers, status badges, and timestamps.
- Zero emoji policy. Use stark, monochromatic icons from Tabler or Lucide with a stroke weight matching the UI borders.
- Neo-brutalist structure with strict zero border-radius. Interactive buttons utilize hard, 3px solid black borders and offset hard shadows (no blur).
- Motion is restricted to vertical 'odometer-style' slide-ups (300ms) for token number changes to signal new arrivals/servicing events.