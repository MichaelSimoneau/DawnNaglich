import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Appointment } from '../types';
import { CalendarService } from '../services/calendarService';
import AdminVoiceAssistant from './AdminVoiceAssistant';

const AdminDashboard: React.FC = () => {
  const [showVoice, setShowVoice] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const events = await CalendarService.getEventsSecure(
        new Date(now.setHours(0,0,0,0)).toISOString(),
        new Date(now.setHours(23,59,59,999)).toISOString()
      );
      setAppointments(CalendarService.mapGoogleEventsToAppointments(events));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalendar(); }, []);

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    setProcessingId(id);
    try {
      const success = action === 'confirm' 
        ? await CalendarService.confirmEventSecure(id)
        : await CalendarService.cancelEventSecure(id);
      if (success) fetchCalendar();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {showVoice && <AdminVoiceAssistant onClose={() => setShowVoice(false)} />}
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dawn's Studio</Text>
            <Text style={styles.subtitle}>Daily Management & Alignment</Text>
          </View>
          <TouchableOpacity style={styles.voiceBtn} onPress={() => setShowVoice(true)}>
            <Text className="fa-solid fa-microphone text-white text-xl" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Agenda</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={fetchCalendar} disabled={loading}>
                <Text className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin' : ''} text-emerald-600 text-sm`} />
              </TouchableOpacity>
              {loading && <ActivityIndicator size="small" color="#10B981" />}
            </View>
          </View>

          {appointments.length === 0 && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>All quiet today. Perfect for personal practice.</Text>
            </View>
          ) : (
            appointments.map(appt => (
              <View key={appt.id} style={styles.apptRow}>
                <View style={styles.apptTime}>
                  <Text style={styles.timeLabel}>
                    {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.apptMain, appt.status === 'pending' && styles.pendingBorder]}>
                  <View style={styles.apptInfo}>
                    <Text style={styles.clientName}>{appt.clientName}</Text>
                    <Text style={styles.serviceLabel}>{appt.service}</Text>
                  </View>
                  
                  <View style={styles.apptActions}>
                    {appt.status === 'pending' ? (
                      <TouchableOpacity 
                        onPress={() => handleAction(appt.id, 'confirm')}
                        disabled={!!processingId}
                        style={styles.confirmBtn}
                      >
                        {processingId === appt.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text className="fa-solid fa-check text-white" />
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.confirmedBadge}>
                        <Text className="fa-solid fa-check-double text-emerald-600" />
                      </View>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleAction(appt.id, 'cancel')}
                      disabled={!!processingId}
                      style={styles.cancelBtn}
                    >
                      <Text className="fa-solid fa-trash-can text-red-300" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={styles.externalLink}
          onPress={() => Linking.openURL('https://calendar.google.com')}
        >
          <Text style={styles.externalLinkText}>Open Google Calendar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { padding: 30, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#064E3B', letterSpacing: -1 },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },
  voiceBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#F8FAFC', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#ECFDF5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#334155' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  apptRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  apptTime: { width: 70, justifyContent: 'center' },
  timeLabel: { fontSize: 11, fontWeight: '800', color: '#059669', opacity: 0.7 },
  apptMain: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#E2E8F0' },
  pendingBorder: { borderLeftColor: '#F59E0B' },
  apptInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  serviceLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  apptActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  confirmBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { padding: 8 },
  confirmedBadge: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  externalLink: { marginTop: 30, alignItems: 'center' },
  externalLinkText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }
});

export default AdminDashboard;