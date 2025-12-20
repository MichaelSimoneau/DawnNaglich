import { httpsCallable } from 'firebase/functions';
import { functions, isDemo } from '../firebaseConfig';
import { Appointment } from '../types';

export const CalendarService = {
  async getEventsSecure(timeMin: string, timeMax: string): Promise<any[]> {
    if (isDemo) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(today.getDate() + 2);
      
      // Fixed set of mixed fake bookings for visual variety in the agenda
      return [
        {
          id: 'demo-1',
          summary: 'Client Session',
          description: 'Muscle Activation',
          start: { dateTime: new Date(new Date(today).setHours(10, 0, 0)).toISOString() },
          end: { dateTime: new Date(new Date(today).setHours(11, 0, 0)).toISOString() },
          extendedProperties: { private: { status: 'confirmed' } }
        },
        {
          id: 'demo-2',
          summary: 'Client Session',
          description: 'Functional Stretching',
          start: { dateTime: new Date(new Date(today).setHours(15, 30, 0)).toISOString() },
          end: { dateTime: new Date(new Date(today).setHours(16, 30, 0)).toISOString() },
          extendedProperties: { private: { status: 'pending' } }
        },
        {
          id: 'demo-3',
          summary: 'Client Session',
          description: 'Healing Realignment',
          start: { dateTime: new Date(new Date(tomorrow).setHours(8, 30, 0)).toISOString() },
          end: { dateTime: new Date(new Date(tomorrow).setHours(10, 0, 0)).toISOString() },
          extendedProperties: { private: { status: 'confirmed' } }
        },
        {
          id: 'demo-4',
          summary: 'Client Session',
          description: 'Muscle Activation',
          start: { dateTime: new Date(new Date(dayAfter).setHours(11, 0, 0)).toISOString() },
          end: { dateTime: new Date(new Date(dayAfter).setHours(12, 0, 0)).toISOString() },
          extendedProperties: { private: { status: 'confirmed' } }
        },
        {
          id: 'demo-5',
          summary: 'Client Session',
          description: 'Structural Realignment',
          start: { dateTime: new Date(new Date(dayAfter).setHours(16, 0, 0)).toISOString() },
          end: { dateTime: new Date(new Date(dayAfter).setHours(17, 30, 0)).toISOString() },
          extendedProperties: { private: { status: 'pending' } }
        }
      ];
    }

    try {
      if (!functions) return [];
      const getEventsFunc = httpsCallable(functions, 'getCalendarEventsSecure');
      const response = await getEventsFunc({ timeMin, timeMax });
      const data = response.data as { success: boolean; items: any[] };
      return data.items || [];
    } catch (error: any) {
      console.error('Secure Fetch Error:', error);
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
    if (isDemo) return { success: true, eventId: 'demo-' + Date.now() };
    try {
      if (!functions) return { success: false };
      const createEventFunc = httpsCallable(functions, 'createCalendarEventSecure');
      const response = await createEventFunc(appointment);
      return response.data as any;
    } catch (error) { return { success: false }; }
  },

  async confirmEventSecure(eventId: string): Promise<boolean> {
    if (isDemo) return true;
    try {
      if (!functions) return false;
      const confirmFunc = httpsCallable(functions, 'confirmCalendarEventSecure');
      const response = await confirmFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  },

  async cancelEventSecure(eventId: string): Promise<boolean> {
    if (isDemo) return true;
    try {
      if (!functions) return false;
      const cancelEventFunc = httpsCallable(functions, 'cancelCalendarEventSecure');
      const response = await cancelEventFunc({ eventId });
      return (response.data as any).success;
    } catch (error) { return false; }
  }
};