import { httpsCallableFromURL } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { Appointment } from '../types';

export const CalendarService = {
  async getEventsSecureV2(timeMin: string, timeMax: string): Promise<any[]> {
    try {
      if (!functions) return [];
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Use relative /api/* path to hit Firebase Hosting rewrite (firebase.json)
      // This avoids CORS by making same-origin requests instead of cross-origin
      const url = `${origin}/api/getCalendarEventsSecure`;
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
      // Use relative /api/* path via Firebase Hosting rewrite to avoid CORS
      const createEventFunc = httpsCallableFromURL(functions, `${origin}/api/createCalendarEventSecure`);
      const response = await createEventFunc(appointment);
      return response.data as any;
    } catch (error) { return { success: false }; }
  },

  async confirmEventSecure(eventId: string): Promise<boolean> {
    try {
      if (!functions) return false;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Use relative /api/* path via Firebase Hosting rewrite to avoid CORS
      const confirmFunc = httpsCallableFromURL(functions, `${origin}/api/confirmCalendarEventSecure`);
      const response = await confirmFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  },

  async cancelEventSecure(eventId: string): Promise<boolean> {
    try {
      if (!functions) return false;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Use relative /api/* path via Firebase Hosting rewrite to avoid CORS
      const cancelEventFunc = httpsCallableFromURL(functions, `${origin}/api/cancelCalendarEventSecure`);
      const response = await cancelEventFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  }
};