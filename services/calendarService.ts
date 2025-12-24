import { Appointment } from "../types";
import { Platform } from "react-native";

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  extendedProperties?: {
    private?: {
      status?: string;
      clientEmail?: string;
    };
  };
}

export const CalendarService = {
  async getEventsSecureV2(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        // Use direct Cloud Functions URL - Hosting rewrites don't work reliably with callable functions
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/getCalendarEventsSecure"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/getCalendarEventsSecure";
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/getCalendarEventsSecure";
      }

      const requestBody = {
        data: {
          timeMin,
          timeMax,
        },
      };
      
      console.log("Calling secure function via URL:", url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response || !response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        console.error("Request URL:", url);
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}, body: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const result = await response.json() as { result?: { data?: { items?: GoogleCalendarEvent[] } }; items?: GoogleCalendarEvent[] };
      
      // Firebase callable functions via HTTP return: { result: { data: { items: [...] } } }
      let data;
      if (result.result?.data) {
        data = result.result.data;
      } else if (result.items) {
        data = result;
      } else {
        data = result;
      }
      
      return data.items || [];
    } catch (error) {
      console.error("Secure Fetch Error:", error);
      return [];
    }
  },

  mapGoogleEventsToAppointments(items: GoogleCalendarEvent[]): Appointment[] {
    return items.map((item) => ({
      id: item.id || '',
      clientName:
        item.summary?.split(" - ")[0] || item.summary || "Private Event",
      service: item.description || "General Session",
      startTime:
        item.start?.dateTime || item.start?.date || new Date().toISOString(),
      endTime: item.end?.dateTime || item.end?.date || new Date().toISOString(),
      status: (item.extendedProperties?.private?.status as Appointment['status']) || "confirmed",
      clientEmail: item.extendedProperties?.private?.clientEmail, // Extract client email
    }));
  },

  async createEventSecure(
    appointment: Partial<Appointment>,
  ): Promise<{ success: boolean; eventId?: string }> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        // Use direct Cloud Functions URL - Hosting rewrites don't work reliably with callable functions
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/createCalendarEventSecure"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/createCalendarEventSecure";
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/createCalendarEventSecure";
      }

      const requestBody = {
        data: appointment,
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response || !response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        console.error("Request URL:", url);
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}, body: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const result = await response.json();
      
      // Firebase callable functions via HTTP return: { result: { data: {...} } }
      let data;
      if (result.result?.data) {
        data = result.result.data;
      } else if (result.success !== undefined) {
        data = result;
      } else {
        data = result;
      }
      
      return data as { success: boolean; eventId?: string };
    } catch (error) {
      console.error("Create event error:", error);
      return { success: false };
    }
  },

  async confirmEventSecure(eventId: string): Promise<boolean> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        // Use direct Cloud Functions URL - Hosting rewrites don't work reliably with callable functions
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/confirmCalendarEventSecure"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/confirmCalendarEventSecure";
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/confirmCalendarEventSecure";
      }

      const requestBody = {
        data: { eventId },
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response || !response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        console.error("Request URL:", url);
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}, body: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const result = await response.json();
      
      // Firebase callable functions via HTTP return: { result: { data: {...} } }
      let data;
      if (result.result?.data) {
        data = result.result.data;
      } else if (result.success !== undefined) {
        data = result;
      } else {
        data = result;
      }
      
      return (data as { success: boolean }).success || false;
    } catch (error) {
      console.error("Confirm event error:", error);
      return false;
    }
  },

  async cancelEventSecure(eventId: string): Promise<boolean> {
    try {
      // Determine the API endpoint URL - always use /api/ path
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        // Use direct Cloud Functions URL - Hosting rewrites don't work reliably with callable functions
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/cancelCalendarEventSecure"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/cancelCalendarEventSecure";
      } else {
        // For native, use the Firebase Hosting domain with /api/ path
        url = "https://dawn-naglich.firebaseapp.com/api/cancelCalendarEventSecure";
      }

      const requestBody = {
        data: { eventId },
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response || !response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        console.error("Request URL:", url);
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}, body: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const result = await response.json();
      
      // Firebase callable functions via HTTP return: { result: { data: {...} } }
      let data;
      if (result.result?.data) {
        data = result.result.data;
      } else if (result.success !== undefined) {
        data = result;
      } else {
        data = result;
      }
      
      return (data as { success: boolean }).success || false;
    } catch (error) {
      console.error("Cancel event error:", error);
      return false;
    }
  },

  async getCalendarConfig(): Promise<{
    success: boolean;
    appCalendar?: {
      id: string;
      name: string;
      description?: string;
      timeZone?: string;
    };
    syncConfig?: {
      enabled: boolean;
      syncedCalendarIds: string[];
      syncToCalendarId?: string | null;
      lastSyncTime?: string | null;
    };
  }> {
    try {
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/getCalendarConfig"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/getCalendarConfig";
      } else {
        url = "https://dawn-naglich.firebaseapp.com/api/getCalendarConfig";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: {} }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.result?.data || result;
      return data as typeof data;
    } catch (error) {
      console.error("Get calendar config error:", error);
      return { success: false };
    }
  },

  async listAvailableCalendars(): Promise<{
    success: boolean;
    calendars?: Array<{
      id: string;
      summary: string;
      description?: string;
      primary: boolean;
      accessRole?: string;
    }>;
  }> {
    try {
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/listAvailableCalendars"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/listAvailableCalendars";
      } else {
        url = "https://dawn-naglich.firebaseapp.com/api/listAvailableCalendars";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: {} }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.result?.data || result;
      return data as typeof data;
    } catch (error) {
      console.error("List calendars error:", error);
      return { success: false, calendars: [] };
    }
  },

  async updateCalendarSync(config: {
    enabled?: boolean;
    syncedCalendarIds?: string[];
    syncToCalendarId?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/updateCalendarSync"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/updateCalendarSync";
      } else {
        url = "https://dawn-naglich.firebaseapp.com/api/updateCalendarSync";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: config }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.result?.data || result;
      return data as typeof data;
    } catch (error) {
      console.error("Update calendar sync error:", error);
      return { success: false };
    }
  },

  async syncCalendars(): Promise<{
    success: boolean;
    message?: string;
    syncedCalendars?: number;
  }> {
    try {
      let url: string;
      if (Platform.OS === 'web') {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const isEmulator =
          origin.includes("localhost") || origin.includes("127.0.0.1");
        url = isEmulator
          ? "http://127.0.0.1:5001/dawn-naglich/us-central1/syncCalendars"
          : "https://us-central1-dawn-naglich.cloudfunctions.net/syncCalendars";
      } else {
        url = "https://dawn-naglich.firebaseapp.com/api/syncCalendars";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: {} }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.result?.data || result;
      return data as typeof data;
    } catch (error) {
      console.error("Sync calendars error:", error);
      return { success: false };
    }
  },
};
