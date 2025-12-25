import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6 } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Appointment } from "../types";
import { CalendarService } from "../services/calendarService";
import AdminVoiceAssistant from "./AdminVoiceAssistant";

interface CalendarConfig {
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
}

interface AvailableCalendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole?: string;
}

const AdminDashboard: React.FC = () => {
  const [showVoice, setShowVoice] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const events = await CalendarService.getEventsSecureV2(
        new Date(now.setHours(0, 0, 0, 0)).toISOString(),
        new Date(now.setHours(23, 59, 59, 999)).toISOString(),
      );
      setAppointments(CalendarService.mapGoogleEventsToAppointments(events));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    loadCalendarConfig();
  }, []);

  const loadCalendarConfig = async () => {
    setLoadingConfig(true);
    try {
      const config = await CalendarService.getCalendarConfig();
      if (config.success) {
        setCalendarConfig({
          appCalendar: config.appCalendar,
          syncConfig: config.syncConfig,
        });
      }
      const calendars = await CalendarService.listAvailableCalendars();
      if (calendars.success && calendars.calendars) {
        setAvailableCalendars(calendars.calendars);
      }
    } catch (error) {
      console.error("Error loading calendar config:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSyncCalendars = async () => {
    setSyncing(true);
    try {
      const result = await CalendarService.syncCalendars();
      if (result.success) {
        // Refresh calendar and config
        await fetchCalendar();
        await loadCalendarConfig();
      }
    } catch (error) {
      console.error("Error syncing calendars:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      await CalendarService.updateCalendarSync({ enabled });
      await loadCalendarConfig();
    } catch (error) {
      console.error("Error updating sync config:", error);
    }
  };

  const handleToggleCalendarSelection = async (calendarId: string) => {
    const currentIds = calendarConfig?.syncConfig?.syncedCalendarIds || [];
    const newIds = currentIds.includes(calendarId)
      ? currentIds.filter((id) => id !== calendarId)
      : [...currentIds, calendarId];
    
    try {
      await CalendarService.updateCalendarSync({ syncedCalendarIds: newIds });
      await loadCalendarConfig();
    } catch (error) {
      console.error("Error updating sync config:", error);
    }
  };

  const handleSetSyncToCalendar = async (calendarId: string | null) => {
    try {
      await CalendarService.updateCalendarSync({ syncToCalendarId: calendarId || undefined });
      await loadCalendarConfig();
    } catch (error) {
      console.error("Error updating sync config:", error);
    }
  };

  const handleAction = async (id: string, action: "confirm" | "cancel") => {
    setProcessingId(id);
    try {
      const success =
        action === "confirm"
          ? await CalendarService.confirmEventSecure(id)
          : await CalendarService.cancelEventSecure(id);
      if (success) fetchCalendar();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {showVoice && <AdminVoiceAssistant onClose={() => setShowVoice(false)} />}
      
      <View style={styles.centerContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Dawn&apos;s Studio</Text>
              <Text style={styles.subtitle}>Daily Management & Alignment</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.voiceBtn}
                onPress={() => setShowVoice(true)}
              >
                <FontAwesome6 name="microphone" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutIconBtn}
                onPress={() => {
                  if (auth) signOut(auth);
                }}
              >
                <FontAwesome6 name="right-from-bracket" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today&apos;s Agenda</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity onPress={fetchCalendar} disabled={loading}>
                  <FontAwesome6
                    name="rotate"
                    size={14}
                    color="#059669"
                    style={loading ? { transform: [{ rotate: "180deg" }] } : undefined}
                  />
                </TouchableOpacity>
                {loading && <ActivityIndicator size="small" color="#10B981" />}
              </View>
            </View>

            {appointments.length === 0 && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  All quiet today. Perfect for personal practice.
                </Text>
              </View>
            ) : (
              appointments.map((appt) => (
                <View key={appt.id} style={styles.apptRow}>
                  <View style={styles.apptTime}>
                    <Text style={styles.timeLabel}>
                      {new Date(appt.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.apptMain,
                      appt.status === "pending" && styles.pendingBorder,
                    ]}
                  >
                    <View style={styles.apptInfo}>
                      <Text style={styles.clientName}>{appt.clientName}</Text>
                      <Text style={styles.serviceLabel}>{appt.service}</Text>
                    </View>

                    <View style={styles.apptActions}>
                      {appt.status === "pending" ? (
                        <TouchableOpacity
                          onPress={() => handleAction(appt.id, "confirm")}
                          disabled={!!processingId}
                          style={styles.confirmBtn}
                        >
                          {processingId === appt.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.confirmedBadge}>
                          <FontAwesome6 name="check-double" size={16} color="#059669" />
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleAction(appt.id, "cancel")}
                        disabled={!!processingId}
                        style={styles.cancelBtn}
                      >
                        <FontAwesome6 name="trash" size={16} color="#FCA5A5" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Calendar Sync</Text>
              <TouchableOpacity
                onPress={() => setShowSyncConfig(!showSyncConfig)}
                style={styles.toggleBtn}
              >
                <FontAwesome6
                  name={showSyncConfig ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#059669"
                />
              </TouchableOpacity>
            </View>

            {loadingConfig ? (
              <View style={styles.empty}>
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : (
              <>
                {calendarConfig?.appCalendar && (
                  <View style={styles.syncInfo}>
                    <Text style={styles.syncLabel}>App Calendar:</Text>
                    <Text style={styles.syncValue}>{calendarConfig.appCalendar.name}</Text>
                    {calendarConfig.appCalendar.id && (
                      <Text style={styles.syncHint}>
                        Calendar ID: {calendarConfig.appCalendar.id.substring(0, 20)}...
                      </Text>
                    )}
                  </View>
                )}

                {showSyncConfig && (
                  <>
                    <View style={styles.syncToggleRow}>
                      <Text style={styles.syncLabel}>Enable Sync:</Text>
                      <TouchableOpacity
                        onPress={() => handleToggleSync(!calendarConfig?.syncConfig?.enabled)}
                        style={[
                          styles.switch,
                          calendarConfig?.syncConfig?.enabled && styles.switchActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.switchThumb,
                            calendarConfig?.syncConfig?.enabled && styles.switchThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>

                    {calendarConfig?.syncConfig?.enabled && (
                      <>
                        <Text style={styles.syncSectionTitle}>Sync Personal Calendars (Busy Times)</Text>
                        <Text style={styles.syncHint}>
                          Select calendars to show busy times in the app calendar
                        </Text>
                        {availableCalendars.map((cal) => {
                          const isSelected = calendarConfig.syncConfig?.syncedCalendarIds?.includes(cal.id);
                          return (
                            <TouchableOpacity
                              key={cal.id}
                              onPress={() => handleToggleCalendarSelection(cal.id)}
                              style={styles.calendarOption}
                            >
                              <View style={styles.calendarOptionLeft}>
                                <View
                                  style={[
                                    styles.checkbox,
                                    isSelected && styles.checkboxChecked,
                                  ]}
                                >
                                  {isSelected && (
                                    <FontAwesome6 name="check" size={10} color="#FFFFFF" />
                                  )}
                                </View>
                                <View>
                                  <Text style={styles.calendarName}>{cal.summary}</Text>
                                  {cal.primary && (
                                    <Text style={styles.calendarHint}>Primary Calendar</Text>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        <Text style={styles.syncSectionTitle}>Sync App Events To</Text>
                        <Text style={styles.syncHint}>
                          Choose which personal calendar receives app appointments
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleSetSyncToCalendar(null)}
                          style={[
                            styles.calendarOption,
                            !calendarConfig.syncConfig?.syncToCalendarId && styles.calendarOptionSelected,
                          ]}
                        >
                          <View style={styles.calendarOptionLeft}>
                            <View
                              style={[
                                styles.radio,
                                !calendarConfig.syncConfig?.syncToCalendarId && styles.radioSelected,
                              ]}
                            />
                            <Text style={styles.calendarName}>Don&apos;t sync to personal calendar</Text>
                          </View>
                        </TouchableOpacity>
                        {availableCalendars.map((cal) => {
                          const isSelected = calendarConfig.syncConfig?.syncToCalendarId === cal.id;
                          return (
                            <TouchableOpacity
                              key={cal.id}
                              onPress={() => handleSetSyncToCalendar(cal.id)}
                              style={[
                                styles.calendarOption,
                                isSelected && styles.calendarOptionSelected,
                              ]}
                            >
                              <View style={styles.calendarOptionLeft}>
                                <View
                                  style={[
                                    styles.radio,
                                    isSelected && styles.radioSelected,
                                  ]}
                                />
                                <Text style={styles.calendarName}>{cal.summary}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        <TouchableOpacity
                          onPress={handleSyncCalendars}
                          disabled={syncing}
                          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                        >
                          {syncing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <FontAwesome6 name="arrows-rotate" size={14} color="#FFFFFF" />
                              <Text style={styles.syncButtonText}>Sync Calendars</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {calendarConfig.syncConfig?.lastSyncTime && (
                          <Text style={styles.lastSyncText}>
                            Last synced: {new Date(calendarConfig.syncConfig.lastSyncTime).toLocaleString()}
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.externalLink}
            onPress={() => Linking.openURL("https://calendar.google.com")}
          >
            <Text style={styles.externalLinkText}>Open Google Calendar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  centerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
  },
  scrollContent: { padding: 30, paddingTop: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#064E3B",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  voiceBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "#ECFDF5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#334155" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontWeight: "500", textAlign: "center" },
  apptRow: { flexDirection: "row", gap: 15, marginBottom: 15 },
  apptTime: { width: 70, justifyContent: "center" },
  timeLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    opacity: 0.7,
  },
  apptMain: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#E2E8F0",
  },
  pendingBorder: { borderLeftColor: "#F59E0B" },
  apptInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  serviceLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },
  apptActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  confirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: { padding: 8 },
  confirmedBadge: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  externalLink: { marginTop: 30, alignItems: "center" },
  externalLinkText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toggleBtn: {
    padding: 8,
  },
  syncInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  syncLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  syncValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  syncHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  syncToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: "#059669",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  syncSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 20,
    marginBottom: 8,
  },
  calendarOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calendarOptionSelected: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  calendarOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  radioSelected: {
    borderColor: "#059669",
    backgroundColor: "#059669",
  },
  calendarName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  lastSyncText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
  },
});

export default AdminDashboard;
