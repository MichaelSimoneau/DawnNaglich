import React, { useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, Text, TouchableOpacity, TextInput, LayoutAnimation } from 'react-native';
import { SERVICES } from '../constants';
import { Service, Appointment } from '../types';
import { CalendarService } from '../services/calendarService';
import { auth, isDemo } from '../firebaseConfig';

interface Slot {
  id: string;
  day: Date;
  time: string;
}

interface BookingProps {
  activeSlotId: string | null;
  onSlotSelect: (id: string | null) => void;
}

const Booking: React.FC<BookingProps> = ({ activeSlotId, onSlotSelect }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState<string>('');
  const [mockBookings, setMockBookings] = useState<Appointment[]>([]);
  
  // Persistent Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    serviceId: SERVICES[0].id
  });

  useEffect(() => {
    const fetchMockStatus = async () => {
      if (isDemo) {
        const events = await CalendarService.getEventsSecure('', '');
        setMockBookings(CalendarService.mapGoogleEventsToAppointments(events));
      }
    };
    fetchMockStatus();
  }, [isSuccess]);

  useEffect(() => {
    const user = auth?.currentUser;
    if (user && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.displayName || '', email: user.email || '' }));
    }
  }, []);

  // Animate layout changes when activeSlotId changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [activeSlotId]);

  const generateDays = () => {
    const days = [];
    let d = new Date();
    d.setHours(0,0,0,0);
    while (days.length < 30) {
      if (d.getDay() !== 0) days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      if (hour === 13) continue; // Lunch
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      slots.push(`${displayHour}:00 ${ampm}`);
      if (hour !== 19) slots.push(`${displayHour}:30 ${ampm}`);
    }
    return slots;
  };

  const isSlotTaken = (day: Date, time: string) => {
    return mockBookings.some(b => {
      const bDate = new Date(b.startTime);
      const isSameDay = bDate.toDateString() === day.toDateString();
      const bTime = bDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return isSameDay && bTime.trim().toLowerCase() === time.trim().toLowerCase();
    });
  };

  const handleBookSubmit = async (slot: Slot) => {
    const service = SERVICES.find(s => s.id === formData.serviceId) || SERVICES[0];
    const detailString = `${slot.day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${slot.time}`;
    setConfirmedDetails(detailString);
    setIsBooking(true);
    
    try {
      const result = await CalendarService.createEventSecure({
        clientName: formData.name || "Valued Client",
        service: service.title,
        startTime: new Date(slot.day.setHours(parseInt(slot.time), 0)).toISOString(),
      });
      if (result.success) {
        setIsSuccess(true);
        onSlotSelect(null);
        setFormData(prev => ({ ...prev, notes: '' }));
      }
    } catch (e) {
      alert("Booking error.");
    } finally {
      setIsBooking(false);
    }
  };

  const toggleSlot = (id: string) => {
    onSlotSelect(activeSlotId === id ? null : id);
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
           <i className="fa-solid fa-calendar-check text-emerald-500 text-3xl"></i>
        </div>
        <Text style={styles.successTitle}>Confirmed</Text>
        <Text style={styles.successSub}>Your session for {confirmedDetails} is secured.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => setIsSuccess(false)}>
           <Text style={styles.backBtnText}>View Schedule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // overflow-visible is crucial for sticky children to work
    <View style={[styles.container, { overflow: 'visible' }]}>
      <div className="w-full bg-white">
        {generateDays().map((day, dIdx) => (
          <div key={dIdx} className="w-full relative">
            {/* 
               STICKY HEADER:
               top-[85px] aligns it right below the main Nav bar (which is ~88px).
               z-index needs to be high enough to sit over content, but lower than Nav (100).
            */}
            <div className="sticky top-[85px] z-[50] bg-white/95 backdrop-blur-md border-b border-emerald-50 px-8 py-5 flex items-center shadow-sm">
              <View style={styles.dayIndicator}>
                <Text style={styles.dayIndicatorText}>{day.getDate()}</Text>
              </View>
              <View style={[styles.dateHeader, { marginLeft: 16 }]}>
                <Text style={styles.dateDayName}>{day.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                <Text style={styles.dateFull}>{day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              </View>
            </div>
            
            {getTimeSlots().map(time => {
              const id = `${day.toDateString()}-${time}`;
              const taken = isSlotTaken(day, time);
              const isSelected = activeSlotId === id;
              
              return (
                <View 
                  key={id} 
                  style={[
                    styles.agendaRowContainer, 
                    isSelected && styles.agendaRowExpanded,
                    taken && styles.agendaRowTaken
                  ]}
                >
                  <TouchableOpacity 
                    onPress={() => !taken && toggleSlot(id)}
                    disabled={taken}
                    style={[styles.agendaRowHeader, isSelected && styles.agendaRowHeaderSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.rowTimeBox}>
                      <Text style={[styles.rowTimeText, taken && styles.textMuted, isSelected && styles.textSelected]}>{time}</Text>
                    </View>
                    <div className="w-[1px] h-8 bg-slate-100 mx-5" />
                    <View style={styles.rowMain}>
                      {taken ? (
                        <View style={styles.takenContainer}>
                          <Text style={styles.takenLabel}>Reserved</Text>
                        </View>
                      ) : (
                        <View style={styles.availableContainer}>
                          <Text style={[styles.availableLabel, isSelected && styles.textSelected]}>
                            {isSelected ? 'Secure your session below' : `Book at ${time}`}
                          </Text>
                          <i className={`fa-solid ${isSelected ? 'fa-chevron-up' : 'fa-plus'} ${isSelected ? 'text-emerald-900' : 'text-emerald-400'} text-[11px] ml-auto`}></i>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isSelected && (
                    <View style={styles.formContent}>
                      <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Secure Session</Text>
                        <Text style={styles.formSub}>
                          Scheduling for {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {time}
                        </Text>
                      </View>

                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>CHOOSE YOUR ACTIVITY</Text>
                        <View style={styles.servicePicker}>
                          {SERVICES.map(s => (
                            <TouchableOpacity 
                              key={s.id}
                              onPress={() => setFormData({ ...formData, serviceId: s.id })}
                              style={[styles.serviceChip, formData.serviceId === s.id && styles.serviceChipActive]}
                            >
                              <Text style={[styles.serviceChipText, formData.serviceId === s.id && styles.serviceChipTextActive]}>{s.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formRow}>
                        <View style={[styles.inputWrapper, { flex: 1, marginRight: 15 }]}>
                          <Text style={styles.inputLabel}>FULL NAME</Text>
                          <TextInput 
                            style={styles.input} 
                            value={formData.name} 
                            onChangeText={(t) => setFormData({...formData, name: t})} 
                            placeholder="Full Name" 
                            placeholderTextColor="#CBD5E1" 
                          />
                        </View>
                        <View style={[styles.inputWrapper, { flex: 1.5 }]}>
                          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                          <TextInput 
                            style={styles.input} 
                            value={formData.email} 
                            onChangeText={(t) => setFormData({...formData, email: t})} 
                            keyboardType="email-address" 
                            placeholder="email@example.com" 
                            placeholderTextColor="#CBD5E1" 
                            autoCapitalize="none" 
                          />
                        </View>
                      </View>

                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>SESSION NOTES (OPTIONAL)</Text>
                        <TextInput 
                          style={[styles.input, styles.textArea]} 
                          value={formData.notes} 
                          onChangeText={(t) => setFormData({...formData, notes: t})} 
                          multiline 
                          placeholder="What are your goals or current focus areas?" 
                          placeholderTextColor="#CBD5E1" 
                        />
                      </View>
                      
                      <View style={styles.formActions}>
                        <TouchableOpacity 
                          style={[styles.submitBtn, (!formData.name || !formData.email) && { opacity: 0.5 }]} 
                          onPress={() => handleBookSubmit({ id, day, time })} 
                          disabled={isBooking || !formData.name || !formData.email}
                        >
                          {isBooking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Confirm Appointment</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => toggleSlot(id)}>
                           <Text style={styles.cancelBtnText}>Collapse Row</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </div>
        ))}
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  dateHeader: { flex: 1 },
  dateDayName: { fontSize: 13, fontWeight: '900', color: '#064E3B', textTransform: 'uppercase', letterSpacing: 1.5 },
  dateFull: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  dayIndicator: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  dayIndicatorText: { color: '#059669', fontWeight: '900', fontSize: 16 },

  agendaRowContainer: { overflow: 'hidden', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  agendaRowHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 80, paddingHorizontal: 30, backgroundColor: '#FFF' },
  agendaRowHeaderSelected: { backgroundColor: '#F0FDF4' },
  agendaRowExpanded: { minHeight: 520, backgroundColor: '#FFF' },
  agendaRowTaken: { backgroundColor: '#F8FAFC' },
  
  rowTimeBox: { width: 85 },
  rowTimeText: { fontSize: 13, fontWeight: '900', color: '#334155' },
  textSelected: { color: '#064E3B' },
  textMuted: { color: '#CBD5E1', fontWeight: '600' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  
  availableContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  availableLabel: { fontSize: 14, color: '#064E3B', fontWeight: '600' },
  takenContainer: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  takenLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  formContent: { paddingHorizontal: 40, paddingVertical: 35, backgroundColor: '#FFF' },
  formHeader: { marginBottom: 30 },
  formTitle: { fontSize: 32, fontWeight: '900', color: '#064E3B', letterSpacing: -1.5 },
  formSub: { fontSize: 13, color: '#64748B', fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  formRow: { flexDirection: 'row', width: '100%' },
  inputWrapper: { marginBottom: 25 },
  inputLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: { borderBottomWidth: 1.5, borderColor: '#F1F5F9', fontSize: 16, color: '#064E3B', fontWeight: '700', paddingVertical: 12 },
  textArea: { height: 70, textAlignVertical: 'top' },
  
  servicePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  serviceChipActive: { backgroundColor: '#064E3B', borderColor: '#064E3B' },
  serviceChipText: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  serviceChipTextActive: { color: '#FFF' },

  formActions: { marginTop: 20, gap: 12, paddingBottom: 20 },
  submitBtn: { backgroundColor: '#059669', padding: 22, borderRadius: 18, alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.2, shadowRadius: 10 },
  submitBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  cancelBtn: { padding: 15, alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 450, backgroundColor: '#FFF' },
  successTitle: { fontSize: 32, fontWeight: '900', color: '#064E3B', marginBottom: 8 },
  successSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 35, maxWidth: 280 },
  backBtn: { backgroundColor: '#064E3B', paddingHorizontal: 36, paddingVertical: 18, borderRadius: 14 },
  backBtnText: { color: '#FFF', fontWeight: '900', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }
});

export default Booking;