# Dawn Naglich Wellness App

A cross-platform wellness appointment booking application for Dawn Naglich's private practice, featuring AI-powered voice assistants, real-time calendar integration, and seamless appointment scheduling.

## Overview

Dawn Naglich Wellness App is a comprehensive booking platform that enables clients to schedule appointments for muscle activation, functional stretching, and healing realignment services. The app features an intuitive interface with voice AI assistants, real-time calendar availability, and admin tools for managing appointments and calendar synchronization.

## Features

### Client Features
- **Interactive Landing Page**: Multi-section landing page showcasing services, facility information, and location map
- **Appointment Booking**: Real-time availability viewing and appointment scheduling with Google Calendar integration
- **Voice AI Assistant**: "Becky" AI assistant powered by Google Gemini that helps clients navigate services, answer questions, and provide directions
- **Service Selection**: Three specialized wellness services with detailed descriptions and pricing
- **User Authentication**: Secure Firebase authentication for personalized booking experience
- **Privacy & Terms**: Dedicated pages for privacy policy and terms & conditions

### Admin Features
- **Admin Dashboard**: Comprehensive dashboard for managing appointments and calendar configuration
- **Admin Voice Assistant**: AI-powered assistant for administrative tasks
- **Calendar Synchronization**: Sync multiple Google Calendars with the appointment calendar
- **Appointment Management**: View, confirm, and cancel appointments directly from the dashboard

## Tech Stack

### Frontend
- **React Native** 0.81.5 with **Expo** ~54.0.30
- **React** 19.1.0
- **TypeScript** ~5.9.3
- **NativeWind** 4.2.1 (Tailwind CSS for React Native)
- **Expo Router** 6.0.21 for navigation
- **React Native Reanimated** 4.1.6 for animations
- **Three.js** 0.182.0 for 3D graphics (Snow overlay)

### Backend & Services
- **Firebase** 10.14.1
  - Authentication
  - Firestore Database
  - Cloud Functions (Node.js 22)
  - Hosting
- **Google Gemini AI** (@google/genai 1.34.0) for voice assistants
- **Google Calendar API** for appointment management
- **Google Auth Library** for OAuth2 authentication

### Custom Modules
- **expo-audio-streaming**: Custom native module for real-time audio streaming (iOS, Android, Web)

### Package Manager
- **pnpm** 10.26.2

## Services Offered

1. **Muscle Activation** - $120 (60 minutes)
   - Targeted sessions to identify and reactivate dormant muscles, reducing pain and improving mobility

2. **Functional Stretching** - $90 (45 minutes)
   - Guided stretching focused on realigning the body and loosening long-term muscle tension

3. **Healing Realignment** - $165 (90 minutes)
   - Combined physical therapy principles and massage techniques for total body recovery

## Prerequisites

- **Node.js** v22.21.1 (as specified in EAS config)
- **pnpm** 10.26.2+
- **Firebase CLI** (for deployment)
- **EAS CLI** (for native app builds)
- **Google Cloud Project** with:
  - Firebase project configured
  - Google Calendar API enabled
  - Google Gemini API access
  - Service account credentials

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dawn-naglich
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Install Firebase Functions dependencies**
   ```bash
   cd functions
   pnpm install
   cd ..
   ```

4. **Configure Firebase**
   - Place `google-services.json` in `android/app/`
   - Place `GoogleService-Info.plist` in `ios/DawnNaglich/`
   - Configure Firebase project settings in `firebaseConfig.ts`

5. **Set up environment variables**
   - For Firebase Functions: Set `EXPO_PUBLIC_FIREBASE_GEMINI_API_KEY` as a Firebase secret
   - For EAS builds: Configure `FIREBASE_CONFIG_JSON` environment variable
   - For local development: Firebase config is hardcoded in `firebaseConfig.ts` (update as needed)

6. **Configure Google Service Account**
   - Place service account JSON file: `dawn-naglich-firebase.json` in project root
   - Ensure the service account has Calendar API access

## Development

### Start Development Server

```bash
# Start Expo development server
pnpm start

# Run on specific platform
pnpm android    # Android
pnpm ios        # iOS
pnpm web        # Web
```

### Firebase Emulators

```bash
# Start Firebase emulators (Auth, Functions, Firestore, Hosting)
firebase emulators:start

# The app will automatically connect to emulators when running on localhost
```

### Linting

```bash
# Lint all code
pnpm lint:all

# Lint specific areas
pnpm lint:web          # Web code (app, components, scripts)
pnpm lint:native       # Native code (android, ios)
pnpm lint:functions    # Firebase Functions

# Auto-fix linting issues
pnpm lint:fix:all
```

## Project Structure

```
dawn-naglich/
├── app/                    # Expo Router pages
│   ├── index.tsx          # Main entry point
│   ├── privacy.tsx         # Privacy policy page
│   └── terms.tsx           # Terms & conditions page
├── components/             # React components
│   ├── AdminDashboard.tsx      # Admin management interface
│   ├── AdminVoiceAssistant.tsx # Admin AI assistant
│   ├── Booking.tsx             # Appointment booking component
│   ├── ClientAssistant.tsx     # Client AI assistant
│   ├── ClientLanding.tsx       # Client landing page
│   ├── LandingPage.tsx         # Landing page animations
│   ├── LocationMap.tsx          # Facility location map
│   ├── Login.tsx               # Authentication component
│   └── SnowOverlay.tsx         # 3D snow animation overlay
├── services/              # Business logic
│   ├── audioUtils.ts          # Audio processing utilities
│   ├── calendarService.ts     # Google Calendar integration
│   ├── voiceMessageBus.ts     # Voice message handling
│   └── voiceService.ts        # Voice recording service
├── functions/            # Firebase Cloud Functions
│   └── src/
│       └── index.ts      # All Cloud Functions
├── expo-audio-streaming/ # Custom native module
│   ├── android/          # Android implementation
│   ├── ios/              # iOS implementation
│   └── src/              # TypeScript source
├── assets/               # Images, fonts, icons
├── constants.tsx         # App constants (services, admin emails)
├── content.ts            # Landing page content
├── types.ts              # TypeScript type definitions
├── firebaseConfig.ts     # Firebase initialization
├── firebase.json         # Firebase configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies and scripts
```

## Build & Deployment

### Web Build

```bash
# Build web app
pnpm build:web

# Deploy to Firebase Hosting
pnpm deploy:web
```

### Native App Builds (EAS)

```bash
# Build for production
pnpm build:eas              # Both platforms
pnpm build:ios              # iOS only
pnpm build:android          # Android only

# Build profiles available:
# - development: Development client with dev tools
# - preview: Internal distribution
# - production: App store builds
```

### Firebase Functions

```bash
# Build and deploy functions
pnpm deploy:functions

# Or deploy everything (functions + hosting)
pnpm deploy:firebase
```

### Full Deployment

```bash
# Deploy Firebase services and EAS builds
pnpm deploy:all
```

## Firebase Configuration

### Required Services

- **Authentication**: Email/password authentication
- **Firestore**: Database for user data and configuration
- **Cloud Functions**: Backend API endpoints
- **Hosting**: Web app hosting with API rewrites

### Cloud Functions

The app uses the following Cloud Functions (defined in `functions/src/index.ts`):

- `getCalendarEventsSecure` - Fetch calendar availability
- `createCalendarEventSecure` - Create new appointments
- `confirmCalendarEventSecure` - Confirm pending appointments
- `cancelCalendarEventSecure` - Cancel appointments
- `generateGeminiResponse` - Generate AI responses
- `createGeminiLiveSession` - Create live AI chat sessions
- `proxyGeminiLiveMessage` - Proxy messages to Gemini Live API
- `getCalendarConfig` - Get calendar configuration
- `listAvailableCalendars` - List user's calendars
- `updateCalendarSync` - Update calendar sync settings
- `syncCalendars` - Sync calendars

### Firestore Collections

- `config/appCalendar` - App calendar configuration
- `config/calendarSync` - Calendar sync settings

### API Routes (Firebase Hosting Rewrites)

All API routes are proxied through Firebase Hosting:
- `/api/getCalendarEventsSecure`
- `/api/createCalendarEventSecure`
- `/api/confirmCalendarEventSecure`
- `/api/cancelCalendarEventSecure`
- `/api/generateGeminiResponse`
- `/api/createGeminiLiveSession`
- `/api/proxyGeminiLiveMessage`
- `/api/getCalendarConfig`
- `/api/listAvailableCalendars`
- `/api/updateCalendarSync`
- `/api/syncCalendars`

## Scripts Reference

### Development
- `pnpm start` - Start Expo development server
- `pnpm android` - Run on Android
- `pnpm ios` - Run on iOS
- `pnpm web` - Run on web

### Linting
- `pnpm lint:all` - Lint all code
- `pnpm lint:web` - Lint web code
- `pnpm lint:native` - Lint native code
- `pnpm lint:functions` - Lint Firebase Functions
- `pnpm lint:fix:all` - Auto-fix all linting issues

### Building
- `pnpm build` - Build Firebase functions and web
- `pnpm build:firebase` - Build Firebase functions and web
- `pnpm build:web` - Build web app only
- `pnpm build:eas` - Build native apps with EAS
- `pnpm build:ios` - Build iOS app
- `pnpm build:android` - Build Android app

### Deployment
- `pnpm deploy` - Deploy Firebase services
- `pnpm deploy:firebase` - Deploy Firebase functions and hosting
- `pnpm deploy:web` - Build and deploy web only
- `pnpm deploy:functions` - Deploy Firebase Functions only
- `pnpm deploy:all` - Deploy Firebase and EAS

### Testing
- `pnpm test:web` - Test web login flow
- `pnpm screenshot:login` - Generate login page screenshot

## Platform-Specific Notes

### iOS
- Bundle ID: `com.dawnnaglich.wellness`
- Requires microphone permission for voice assistant
- Google Services file: `GoogleService-Info.plist`
- App Store Connect App ID: `6756852968`

### Android
- Package: `com.dawnnaglich.wellness`
- Requires `RECORD_AUDIO` permission
- Google Services file: `google-services.json`
- Build type: App Bundle (AAB)

### Web
- Base URL: `/`
- Metro bundler
- Firebase Hosting with SPA rewrites

## Voice Assistant Features

The app includes two AI-powered voice assistants:

1. **Client Assistant ("Becky")**: Helps clients with:
   - Service explanations
   - Schedule navigation
   - Facility directions
   - General wellness questions

2. **Admin Assistant**: Assists admins with:
   - Appointment management
   - Calendar operations
   - Administrative tasks

Both assistants use Google Gemini Live API for real-time voice interactions with streaming audio support.

For detailed information about the AI assistants, system instructions, and function declarations, see [GEMINI.md](GEMINI.md).

## Calendar Integration

The app integrates with Google Calendar using a dedicated app calendar architecture:

### App Calendar Architecture
- **Dedicated Calendar**: A separate "Dawn Naglich Wellness Appointments" calendar is automatically created and managed by the app
- **Calendar Storage**: Calendar ID stored in Firestore at `config/appCalendar`
- **Multi-Admin Support**: Calendar is automatically shared with all admin users
- **Calendar Import**: Admins can import the calendar on their devices using the calendar ID from the admin dashboard

### Calendar Synchronization
- **Personal Calendar Sync**: Admins can select which personal calendars to sync for busy time display
- **Busy Time Masking**: Personal appointments appear as "Busy" (masked) slots in the app calendar
- **Bidirectional Sync**: App appointments can optionally sync to Dawn's chosen personal calendar
- **Sync Configuration**: Stored in Firestore at `config/calendarSync` with:
  - `enabled`: boolean - Enable/disable sync
  - `syncedCalendarIds`: string[] - Personal calendars to sync for busy times
  - `syncToCalendarId`: string | null - Personal calendar to receive app appointments
  - `lastSyncTime`: Timestamp | null - Last sync timestamp

### Calendar Operations
- **Availability Display**: Real-time availability fetched from app calendar and synced busy times
- **Appointment Creation**: Events created in app calendar, optionally synced to personal calendar
- **Status Management**: Supports confirmed, pending, and cancelled appointment statuses
- **Admin Management**: Full calendar sync configuration available in admin dashboard

### Firestore Data Structure

#### `config/appCalendar`
```typescript
{
  calendarId: string;
  calendarName: string;
  createdAt: Timestamp;
}
```

#### `config/calendarSync`
```typescript
{
  enabled: boolean;
  syncedCalendarIds: string[];  // Personal calendars to sync for busy times
  syncToCalendarId: string | null;  // Personal calendar to receive app appointments
  lastSyncTime: Timestamp | null;
  updatedAt: Timestamp;
}
```

## Admin Access

Admin users are identified by email addresses configured in `constants.tsx`:
- `dawn.naglich@gmail.com`
- `michael@brainycouch.com`

Admin users have access to:
- Admin dashboard (`/admin`)
- Calendar synchronization settings
- Appointment management tools
- Admin voice assistant

## Design & Styling

### Brand Philosophy
Elite, healing-focused, and restorative. The visual identity is built on a "Monochromatic Green" theme, signifying wellness, growth, and neurological balance.

### Color Palette
Using the Tailwind CSS Emerald scale:
- **Primary Accent**: `#10B981` (Emerald-500) - Primary CTAs, markers, and brand elements
- **Deep Background**: `#022C22` (Emerald-950) - Dark layouts and primary branding
- **Strong Green**: `#064E3B` (Emerald-900) - Header text on light backgrounds
- **Soft Light Green**: `#ECFDF5` (Emerald-50) - Light component backgrounds
- **Muted Green**: `#D1FAE5` (Emerald-100) - Border accents and highlights

### Typography
- **Headers**: `Playfair Display` - Serif font for elite, high-end therapeutic feel
- **Body/System**: `Inter` - Clean, modern sans-serif for readability

### Layout Principles
- **Spacing**: Generous padding (minimum 24px/6 units) for breathability and calm
- **Radius**: Large border-radii (20px to 32px) for soft, organic feel
- **Glassmorphism**: `backdrop-blur-3xl` with low-opacity emerald overlays for navigation
- **Shadows**: Soft, colored shadows using emerald tints

### Iconography
- Consistent use of FontAwesome 6 (Solid/Brands)
- Icon accents in Primary Accent color (#10B981)

## License

Private project - All rights reserved

## Support

For issues or questions, please contact the development team.
