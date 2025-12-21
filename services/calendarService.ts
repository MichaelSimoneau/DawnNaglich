import { httpsCallableFromURL } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { Appointment } from '../types';

export const CalendarService = {
  async getEventsSecureV2(timeMin: string, timeMax: string): Promise<any[]> {
    try {
      if (!functions) return [];
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Check if we're in emulator mode (localhost)
      const isEmulator = origin.includes('localhost') || origin.includes('127.0.0.1');
      
      let url: string;
      if (isEmulator) {
        // For emulators, use direct function URL
        url = 'http://127.0.0.1:5001/dawn-naglich/us-central1/getCalendarEventsSecure';
      } else {
        // For production, use relative /api/* path to hit Firebase Hosting rewrite
        url = `${origin}/api/getCalendarEventsSecure`;
      }
      
      console.log('Calling secure function via URL:', url);
      const getEventsFunc = httpsCallableFromURL(functions, url);
      const response = await getEventsFunc({ timeMin, timeMax });
      const data = response.data as { success: boolean; items: any[] };
      return data.items || [];
    } catch (error: any) {
      console.error('Secure Fetch Error:', error);
      
      // Check if this is a Google Calendar API not enabled error
      const errorMessage = error?.message || error?.details || '';
      const isApiNotEnabled = 
        error?.code === 403 || 
        error?.code === 'permission-denied' ||
        errorMessage.includes('API has not been used') ||
        errorMessage.includes('it is disabled') ||
        errorMessage.includes('PERMISSION_DENIED');
      
      if (isApiNotEnabled) {
        console.error(
          '⚠️ Google Calendar API is not enabled. ' +
          'Please enable the API at: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview'
        );
      }
      
      return [];
    }
  },

  mapGoogleEventsToAppointments(items: any[]): Appointment[] {
    return items.map(item => ({
      id: item.id,
      clientName: item.summary?.split(' - ')[0] || item.summary || 'Private Event',
      service: item.description || 'General Session',
      startTime: item.start?.dateTime || item.start?.date || new Date().toISOString(),
      endTime: item.end?.dateTime || item.end?.date || new Date().toISOString(),
      status: (item.extendedProperties?.private?.status as any) || 'confirmed'
    }));
  },

  async createEventSecure(appointment: Partial<Appointment>): Promise<{ success: boolean; eventId?: string }> {
    try {
      if (!functions) return { success: false };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isEmulator = origin.includes('localhost') || origin.includes('127.0.0.1');
      const url = isEmulator 
        ? 'http://127.0.0.1:5001/dawn-naglich/us-central1/createCalendarEventSecure'
        : `${origin}/api/createCalendarEventSecure`;
      const createEventFunc = httpsCallableFromURL(functions, url);
      const response = await createEventFunc(appointment);
      return response.data as any;
    } catch (error) { return { success: false }; }
  },

  async confirmEventSecure(eventId: string): Promise<boolean> {
    try {
      if (!functions) return false;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isEmulator = origin.includes('localhost') || origin.includes('127.0.0.1');
      const url = isEmulator 
        ? 'http://127.0.0.1:5001/dawn-naglich/us-central1/confirmCalendarEventSecure'
        : `${origin}/api/confirmCalendarEventSecure`;
      const confirmFunc = httpsCallableFromURL(functions, url);
      const response = await confirmFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  },

  async cancelEventSecure(eventId: string): Promise<boolean> {
    try {
      if (!functions) return false;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isEmulator = origin.includes('localhost') || origin.includes('127.0.0.1');
      const url = isEmulator 
        ? 'http://127.0.0.1:5001/dawn-naglich/us-central1/cancelCalendarEventSecure'
        : `${origin}/api/cancelCalendarEventSecure`;
      const cancelEventFunc = httpsCallableFromURL(functions, url);
      const response = await cancelEventFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  }
};