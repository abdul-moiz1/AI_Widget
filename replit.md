# VocalAI - Voice-Based Conversational Application

## Overview
A production-ready AI voice assistant application featuring real-time voice interaction with state transitions (Listening → Thinking → Speaking). The app uses React frontend, Express backend, PostgreSQL with Drizzle ORM, and WebSocket communication. Includes an embeddable voice widget and admin dashboard for managing multiple businesses.

## Project Structure

### Frontend (React + Vite)
- `client/src/` - React application
- `client/public/widget.js` - Standalone embeddable voice widget
- `client/public/firebase-functions-reference.js` - Firebase Cloud Function reference

### Backend (Express)
- `server/index.ts` - Express server entry point
- `server/routes.ts` - API routes
- `server/storage.ts` - Storage interface

### Admin Dashboard
- `admin/` - Standalone admin dashboard (vanilla HTML/CSS/JS)
- `admin/index.html` - Dashboard UI
- `admin/app.js` - Firebase Firestore integration
- `admin/firebase-config.js` - Firebase configuration (requires setup)

### Shared
- `shared/schema.ts` - Database schema (Drizzle ORM)

## Key Features

### Voice Widget (`/widget.js`)
- Embeddable web component via script tag
- Voice Mode: Minimal mic-only interface
- Text/Messages Mode: Chat history view
- State transitions: Listening → Thinking → Speaking
- Continuous listening loop for multiple commands
- Uses Firebase Cloud Function for AI responses

### Admin Dashboard (`/admin`)
- Internal dashboard for managing businesses
- Business List: View all businesses, create/edit/delete
- Business Editor: Configure business info, context, widget settings
- Widget Script Generator: Copy-paste embed code for each business
- Firebase Firestore for data storage

## Configuration

### Firebase Setup (Required for Admin Dashboard)
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Get your web app configuration from Project Settings
4. Update `admin/firebase-config.js` with your credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Firestore Structure
```
businesses/{businessId}
{
  "businessName": "ABC Restaurant",
  "status": "active",
  "context": {
    "description": "Business description for AI",
    "services": ["Dine-in", "Takeaway"],
    "hours": "Daily 11 AM to 11 PM",
    "rules": ["Always greet warmly"]
  },
  "widget": {
    "logoUrl": "https://...",
    "theme": {
      "primaryColor": "#0ea5e9",
      "mode": "dark"
    }
  },
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

## Development

### Running the Application
```bash
npm run dev
```
This starts both the Express backend and Vite frontend on port 5000.

### Access Points
- Main App: `/`
- Admin Dashboard: `/admin`
- Voice Widget: `/widget.js`

## Widget Integration

To embed the voice widget on any website:
```html
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "YOUR_BUSINESS_ID"
  };
</script>
<script src="https://YOUR_DOMAIN/widget.js"></script>
```

## Recent Changes
- December 2024: Added admin dashboard for business management
- December 2024: Fixed continuous listening loop for multiple voice commands
- December 2024: Simplified voice mode UI to show only microphone button

## Tech Stack
- Frontend: React, Vite, TailwindCSS, Shadcn/UI
- Backend: Express, Node.js
- Database: PostgreSQL with Drizzle ORM
- Voice: Web Speech API (SpeechRecognition + SpeechSynthesis)
- Admin: Vanilla HTML/CSS/JS + Firebase Firestore
