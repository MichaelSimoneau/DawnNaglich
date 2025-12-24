# Calendar Integration Assessment & Implementation Plan

## Current State Analysis

### Current Architecture
1. **Calendar ID**: Hardcoded to `'dawn.naglich@gmail.com'` (Dawn's personal calendar)
2. **Authentication**: Uses service account authentication via `dawn-naglich-firebase.json`
3. **Admin Access**: Both `dawn.naglich@gmail.com` and `michael@brainycouch.com` have admin privileges
4. **Privacy**: Non-admins see "Busy" for private events, admins see full details
5. **Voice Assistant**: Becky AI can create/cancel events via function calls

### Current Limitations
- ❌ App directly uses Dawn's personal calendar (not ideal for separation)
- ❌ No separate app calendar that can be shared/imported
- ❌ No sync functionality to pull busy times from personal calendars
- ❌ No UI for calendar management/sync
- ❌ Dawn cannot choose which personal calendar to sync

## Required Changes

### 1. App's Own Calendar
- Create a dedicated shared calendar for the app (e.g., "Dawn Naglich Wellness Appointments")
- This calendar should be:
  - Owned by the service account or Dawn's account
  - Shareable with other admins (like Michael)
  - Importable on Dawn's phone
  - Separate from Dawn's personal calendars

### 2. Calendar Sync Functionality
- Add ability to sync Dawn's personal calendars to show busy times
- Personal appointments should appear as "Busy" (masked) in the app calendar
- Dawn should be able to:
  - Select which personal calendars to sync
  - Enable/disable sync
  - See sync status

### 3. Admin UI Enhancements
- Add "Sync Calendars" button in AdminDashboard
- Show sync status and configuration
- Allow Dawn to manage which calendars are synced

### 4. Backend Functions
- Create function to initialize/create app calendar
- Create function to sync personal calendars (fetch busy times)
- Update all calendar operations to use app calendar instead of personal calendar
- Store app calendar ID (in Firestore or environment)

### 5. Multi-Admin Support
- Ensure other admins (Michael) can manage app calendar
- App calendar should sync to Dawn's chosen personal calendar
- Voice assistant should work for all admins

## Implementation Plan

### Phase 1: Backend - App Calendar Creation
1. Create function to initialize/create app calendar
2. Store app calendar ID in Firestore
3. Share calendar with admins

### Phase 2: Backend - Calendar Sync
1. Create function to fetch busy times from Dawn's personal calendars
2. Create function to sync busy times to app calendar (as masked events)
3. Add function to list Dawn's available calendars for selection

### Phase 3: Backend - Update Operations
1. Update all calendar operations to use app calendar ID
2. Ensure voice assistant functions work with app calendar
3. Add sync management functions

### Phase 4: Frontend - Admin UI
1. Add "Sync Calendars" section to AdminDashboard
2. Add UI to select which calendars to sync
3. Show sync status and last sync time
4. Add button to trigger manual sync

### Phase 5: Testing & Validation
1. Test calendar creation and sharing
2. Test sync functionality
3. Test voice assistant with new calendar
4. Test multi-admin access

## Technical Considerations

### Google Calendar API Requirements
- Need `calendar` scope (already have)
- Need `calendar.calendarlist` scope to list calendars
- Need to create calendar with proper sharing settings
- Need to handle OAuth for Dawn's personal calendars (if using user auth)

### Data Storage
- Store app calendar ID in Firestore: `config/appCalendarId`
- Store sync configuration in Firestore: `config/calendarSync` with:
  - `enabled`: boolean
  - `syncedCalendarIds`: string[] (Dawn's personal calendar IDs to sync)
  - `lastSyncTime`: timestamp
  - `syncToCalendarId`: string (Dawn's personal calendar to sync app events to)

### Authentication Strategy
- Service account can create/manage calendars
- For syncing Dawn's personal calendars, we may need:
  - OAuth token from Dawn (stored securely)
  - OR use service account with domain-wide delegation (if using Workspace)

## Next Steps
1. Implement app calendar creation function
2. Update calendar operations to use app calendar
3. Implement sync functionality
4. Add admin UI for sync management
5. Test end-to-end flow

