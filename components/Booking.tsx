import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { SERVICES } from "../constants";
import { Service, Appointment } from "../types";
import { CalendarService } from "../services/calendarService";
import { auth } from "../firebaseConfig";
import { useUser } from "../UserContext";

interface Slot {
  id: string;
  day: Date;
  time: string;
}

interface BookingProps {
  activeSlotId: string | null;
  onSlotSelect: (id: string | null) => void;
}

interface SelectedSlot {
  id: string;
  day: Date;
  time: string;
}

const Booking: React.FC<BookingProps> = ({ activeSlotId, onSlotSelect }) => {
  const { user } = useUser();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  // Persistent Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    notes: "",
    serviceId: SERVICES[0].id,
  });

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const now = new Date();
        const timeMin = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const timeMax = new Date(now.setDate(now.getDate() + 30)).toISOString();
        const events = await CalendarService.getEventsSecureV2(
          timeMin,
          timeMax,
        );
        setAppointments(CalendarService.mapGoogleEventsToAppointments(events));
      } catch (e) {
        console.error("Failed to fetch availability:", e);
      } finally {
        setIsLoadingAvailability(false);
      }
    };
    fetchAvailability();
  }, [isSuccess]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Sync selectedSlots with activeSlotId for backward compatibility
  useEffect(() => {
    if (activeSlotId === null) {
      setSelectedSlots([]);
    }
  }, [activeSlotId]);

  // Animate layout changes when selectedSlots changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [selectedSlots]);

  const generateDays = () => {
    const days = [];
    let d = new Date();
    d.setHours(0, 0, 0, 0);
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
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      slots.push(`${displayHour}:00 ${ampm}`);
      if (hour !== 19) slots.push(`${displayHour}:30 ${ampm}`);
    }
    return slots;
  };

  const parseTimeToMinutes = (time: string): number => {
    const [timeStr, ampm] = time.split(" ");
    let [hour, minute] = timeStr.split(":").map(Number);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  const getTimeSlotIndex = (
    day: Date,
    time: string,
    slots: string[],
  ): number => {
    return slots.findIndex((s) => s === time);
  };

  const isSlotTaken = (day: Date, time: string) => {
    return appointments.some((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const isSameDay = bStart.toDateString() === day.toDateString();

      if (!isSameDay) return false;

      const slotMinutes = parseTimeToMinutes(time);
      const slotEndMinutes = slotMinutes + 30;
      const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes();
      const bEndMinutes = bEnd.getHours() * 60 + bEnd.getMinutes();

      // Check if appointment overlaps with this 30-minute slot
      return bStartMinutes < slotEndMinutes && bEndMinutes > slotMinutes;
    });
  };

  const canExpandToSlot = (
    day: Date,
    time: string,
    slots: string[],
  ): { canExpandUp: boolean; canExpandDown: boolean } => {
    if (selectedSlots.length === 0)
      return { canExpandUp: false, canExpandDown: false };

    const currentSlotIndex = getTimeSlotIndex(day, time, slots);
    if (currentSlotIndex === -1)
      return { canExpandUp: false, canExpandDown: false };

    const selectedIndices = selectedSlots
      .filter((s) => s.day.toDateString() === day.toDateString())
      .map((s) => getTimeSlotIndex(s.day, s.time, slots))
      .filter((idx) => idx !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0)
      return { canExpandUp: false, canExpandDown: false };

    const minSelected = Math.min(...selectedIndices);
    const maxSelected = Math.max(...selectedIndices);

    // Can expand up if this slot is immediately before the first selected slot
    const canExpandUp =
      currentSlotIndex === minSelected - 1 &&
      selectedIndices.length < 3 &&
      !isSlotTaken(day, time);

    // Can expand down if this slot is immediately after the last selected slot
    const canExpandDown =
      currentSlotIndex === maxSelected + 1 &&
      selectedIndices.length < 3 &&
      !isSlotTaken(day, time);

    return { canExpandUp, canExpandDown };
  };

  const isSlotInSelection = (id: string): boolean => {
    return selectedSlots.some((s) => s.id === id);
  };

  const isSlotInSelectedRange = (
    day: Date,
    time: string,
    slots: string[],
  ): boolean => {
    if (selectedSlots.length === 0) return false;

    const currentSlotIndex = getTimeSlotIndex(day, time, slots);
    if (currentSlotIndex === -1) return false;

    const selectedIndices = selectedSlots
      .filter((s) => s.day.toDateString() === day.toDateString())
      .map((s) => getTimeSlotIndex(s.day, s.time, slots))
      .filter((idx) => idx !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) return false;

    const minSelected = Math.min(...selectedIndices);
    const maxSelected = Math.max(...selectedIndices);

    return currentSlotIndex >= minSelected && currentSlotIndex <= maxSelected;
  };

  const handleBookSubmit = async () => {
    if (selectedSlots.length === 0) return;

    const service =
      SERVICES.find((s) => s.id === formData.serviceId) || SERVICES[0];

    // Sort slots by time to get start and end
    const sortedSlots = [...selectedSlots].sort((a, b) => {
      if (a.day.toDateString() !== b.day.toDateString()) {
        return a.day.getTime() - b.day.getTime();
      }
      const aMinutes = parseTimeToMinutes(a.time);
      const bMinutes = parseTimeToMinutes(b.time);
      return aMinutes - bMinutes;
    });

    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    // Parse start time
    const [startTimeStr, startAmpm] = firstSlot.time.split(" ");
    let [startHour, startMinute] = startTimeStr.split(":").map(Number);
    if (startAmpm === "PM" && startHour !== 12) startHour += 12;
    if (startAmpm === "AM" && startHour === 12) startHour = 0;

    const startTime = new Date(firstSlot.day);
    startTime.setHours(startHour, startMinute, 0, 0);

    // Calculate end time: last slot + 30 minutes
    const [endTimeStr, endAmpm] = lastSlot.time.split(" ");
    let [endHour, endMinute] = endTimeStr.split(":").map(Number);
    if (endAmpm === "PM" && endHour !== 12) endHour += 12;
    if (endAmpm === "AM" && endHour === 12) endHour = 0;

    const endTime = new Date(lastSlot.day);
    endTime.setHours(endHour, endMinute + 30, 0, 0);

    const durationMinutes = selectedSlots.length * 30;
    const timeRange =
      selectedSlots.length === 1
        ? firstSlot.time
        : `${firstSlot.time} - ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;

    const detailString = `${firstSlot.day.toLocaleDateString("en-US", { month: "long", day: "numeric" })} at ${timeRange} (${durationMinutes} min)`;
    setConfirmedDetails(detailString);
    setIsBooking(true);

    try {
      const result = await CalendarService.createEventSecure({
        clientName: formData.name,
        service: service.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      if (result.success) {
        setIsSuccess(true);
        onSlotSelect(null);
        setSelectedSlots([]);
        setFormData((prev) => ({ ...prev, notes: "" }));
      }
    } catch (e) {
      alert("Booking error.");
    } finally {
      setIsBooking(false);
    }
  };

  const toggleSlot = (id: string, day: Date, time: string, slots: string[]) => {
    const slotIndex = getTimeSlotIndex(day, time, slots);
    const existingIndex = selectedSlots.findIndex((s) => s.id === id);

    if (existingIndex !== -1) {
      // Remove this slot
      const newSlots = selectedSlots.filter((s) => s.id !== id);
      setSelectedSlots(newSlots);
      if (newSlots.length === 0) {
        onSlotSelect(null);
      } else {
        onSlotSelect(newSlots[0].id);
      }
    } else {
      // Add this slot if it's consecutive
      if (selectedSlots.length === 0) {
        // First slot selection
        const newSlots = [{ id, day, time }];
        setSelectedSlots(newSlots);
        onSlotSelect(id);
      } else {
        // Check if it's consecutive to existing selection
        const selectedIndices = selectedSlots
          .filter((s) => s.day.toDateString() === day.toDateString())
          .map((s) => getTimeSlotIndex(s.day, s.time, slots))
          .filter((idx) => idx !== -1)
          .sort((a, b) => a - b);

        if (selectedIndices.length === 0) {
          // Different day, start new selection
          setSelectedSlots([{ id, day, time }]);
          onSlotSelect(id);
        } else {
          const minSelected = Math.min(...selectedIndices);
          const maxSelected = Math.max(...selectedIndices);

          // Check if consecutive (before or after)
          if (
            (slotIndex === minSelected - 1 || slotIndex === maxSelected + 1) &&
            selectedSlots.length < 3
          ) {
            const newSlots = [...selectedSlots, { id, day, time }].sort(
              (a, b) => {
                if (a.day.toDateString() !== b.day.toDateString()) {
                  return a.day.getTime() - b.day.getTime();
                }
                const aMinutes = parseTimeToMinutes(a.time);
                const bMinutes = parseTimeToMinutes(b.time);
                return aMinutes - bMinutes;
              },
            );
            setSelectedSlots(newSlots);
            onSlotSelect(newSlots[0].id);
          }
        }
      }
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <View className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
          <FontAwesome6 name="calendar-check" size={32} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Confirmed</Text>
        <Text style={styles.successSub}>
          Your session for {confirmedDetails} is secured.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setIsSuccess(false)}
        >
          <Text style={styles.backBtnText}>View Schedule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // overflow-visible is crucial for sticky children to work
    <View style={[styles.container, { overflow: "visible" }]}>
      {isLoadingAvailability && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      )}
      <View className="w-full bg-white">
        {generateDays().map((day, dIdx) => (
          <View key={dIdx} className="w-full relative">
            {/* 
               STICKY HEADER:
               top-0 since the top bar doesn't persist in this scroll context.
               z-index needs to be high enough to sit over content, but lower than Nav (3000).
            */}
            <View className="sticky top-0 z-[50] bg-white/95 border-b border-emerald-50 px-8 py-5 flex-row items-center">
              <View style={styles.dayIndicator}>
                <Text style={styles.dayIndicatorText}>{day.getDate()}</Text>
              </View>
              <View style={[styles.dateHeader, { marginLeft: 16 }]}>
                <Text style={styles.dateDayName}>
                  {day.toLocaleDateString("en-US", { weekday: "long" })}
                </Text>
                <Text style={styles.dateFull}>
                  {day.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            {(() => {
              const slots = getTimeSlots();
              return slots.map((time) => {
                const id = `${day.toDateString()}-${time}`;
                const taken = isSlotTaken(day, time);
                const isSelected = activeSlotId === id;
                const isInSelectedRange = isSlotInSelectedRange(
                  day,
                  time,
                  slots,
                );
                const isSlotSelected = isSlotInSelection(id);
                const { canExpandUp, canExpandDown } = canExpandToSlot(
                  day,
                  time,
                  slots,
                );

                return (
                  <View
                    key={id}
                    style={[
                      styles.agendaRowContainer,
                      isSelected && styles.agendaRowExpanded,
                      taken && styles.agendaRowTaken,
                      isInSelectedRange &&
                        !isSelected &&
                        styles.agendaRowInRange,
                    ]}
                  >
                    {/* Expand indicator above */}
                    {canExpandUp && (
                      <View style={styles.expandIndicator}>
                        <Text style={styles.expandIndicatorText}>↑ Expand</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => !taken && toggleSlot(id, day, time, slots)}
                      disabled={taken}
                      style={[
                        styles.agendaRowHeader,
                        (isSelected || isInSelectedRange) &&
                          styles.agendaRowHeaderSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.rowTimeBox}>
                        <Text
                          style={[
                            styles.rowTimeText,
                            taken && styles.textMuted,
                            (isSelected || isInSelectedRange) &&
                              styles.textSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </View>
                      <View className="w-[1px] h-8 bg-slate-100 mx-5" />
                      <View style={styles.rowMain}>
                        {taken ? (
                          <View style={styles.takenContainer}>
                            <Text style={styles.takenLabel}>Reserved</Text>
                          </View>
                        ) : (
                          <View style={styles.availableContainer}>
                            <Text
                              style={[
                                styles.availableLabel,
                                (isSelected || isInSelectedRange) &&
                                  styles.textSelected,
                              ]}
                            >
                              {isSelected
                                ? "Secure your session below"
                                : isInSelectedRange
                                  ? `Part of ${selectedSlots.length * 30}-min session`
                                  : canExpandUp || canExpandDown
                                    ? "Click to extend session"
                                    : `Book at ${time}`}
                            </Text>
                            <FontAwesome6
                              name={
                                isSelected
                                  ? "chevron-up"
                                  : isInSelectedRange
                                    ? "check"
                                    : "plus"
                              }
                              size={11}
                              color={isSelected || isInSelectedRange ? "#064E3B" : "#10B981"}
                              style={{ marginLeft: "auto" }}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expand indicator below */}
                    {canExpandDown && (
                      <View
                        style={[
                          styles.expandIndicator,
                          styles.expandIndicatorBottom,
                        ]}
                      >
                        <Text style={styles.expandIndicatorText}>↓ Expand</Text>
                      </View>
                    )}

                    {isSelected &&
                      (() => {
                        const sortedSlots = [...selectedSlots].sort((a, b) => {
                          if (a.day.toDateString() !== b.day.toDateString()) {
                            return a.day.getTime() - b.day.getTime();
                          }
                          const aMinutes = parseTimeToMinutes(a.time);
                          const bMinutes = parseTimeToMinutes(b.time);
                          return aMinutes - bMinutes;
                        });
                        const firstSlot = sortedSlots[0];
                        const lastSlot = sortedSlots[sortedSlots.length - 1];
                        const [endTimeStr, endAmpm] = lastSlot.time.split(" ");
                        let [endHour, endMinute] = endTimeStr
                          .split(":")
                          .map(Number);
                        if (endAmpm === "PM" && endHour !== 12) endHour += 12;
                        if (endAmpm === "AM" && endHour === 12) endHour = 0;
                        const endTime = new Date(lastSlot.day);
                        endTime.setHours(endHour, endMinute + 30, 0, 0);
                        const timeRange =
                          selectedSlots.length === 1
                            ? firstSlot.time
                            : `${firstSlot.time} - ${endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
                        const durationText =
                          selectedSlots.length === 1
                            ? ""
                            : ` (${selectedSlots.length * 30} min)`;

                        return (
                          <View style={styles.formContent}>
                            <View style={styles.formHeader}>
                              <Text style={styles.formTitle}>
                                Secure Session
                              </Text>
                              <Text style={styles.formSub}>
                                Scheduling for{" "}
                                {day.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                at {timeRange}
                                {durationText}
                              </Text>
                            </View>

                            <View style={styles.inputWrapper}>
                              <Text style={styles.inputLabel}>
                                CHOOSE YOUR ACTIVITY
                              </Text>
                              <View style={styles.servicePicker}>
                                {SERVICES.map((s) => (
                                  <TouchableOpacity
                                    key={s.id}
                                    onPress={() =>
                                      setFormData({
                                        ...formData,
                                        serviceId: s.id,
                                      })
                                    }
                                    style={[
                                      styles.serviceChip,
                                      formData.serviceId === s.id &&
                                        styles.serviceChipActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.serviceChipText,
                                        formData.serviceId === s.id &&
                                          styles.serviceChipTextActive,
                                      ]}
                                    >
                                      {s.title}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            <View style={styles.formRow}>
                              <View
                                style={[
                                  styles.inputWrapper,
                                  { flex: 1, marginRight: 15 },
                                ]}
                              >
                                <Text style={styles.inputLabel}>FULL NAME</Text>
                                <TextInput
                                  style={styles.input}
                                  value={formData.name}
                                  onChangeText={(t) =>
                                    setFormData({ ...formData, name: t })
                                  }
                                  placeholder="Full Name"
                                  placeholderTextColor="#CBD5E1"
                                />
                              </View>
                              <View
                                style={[styles.inputWrapper, { flex: 1.5 }]}
                              >
                                <Text style={styles.inputLabel}>
                                  EMAIL ADDRESS
                                </Text>
                                <TextInput
                                  style={styles.input}
                                  value={formData.email}
                                  onChangeText={(t) =>
                                    setFormData({ ...formData, email: t })
                                  }
                                  keyboardType="email-address"
                                  placeholder="email@example.com"
                                  placeholderTextColor="#CBD5E1"
                                  autoCapitalize="none"
                                />
                              </View>
                            </View>

                            <View style={styles.inputWrapper}>
                              <Text style={styles.inputLabel}>
                                SESSION NOTES (OPTIONAL)
                              </Text>
                              <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.notes}
                                onChangeText={(t) =>
                                  setFormData({ ...formData, notes: t })
                                }
                                multiline
                                placeholder="What are your goals or current focus areas?"
                                placeholderTextColor="#CBD5E1"
                              />
                            </View>

                            <View style={styles.formActions}>
                              <TouchableOpacity
                                style={[
                                  styles.submitBtn,
                                  (!formData.name ||
                                    !formData.email ||
                                    selectedSlots.length === 0) && {
                                    opacity: 0.5,
                                  },
                                ]}
                                onPress={handleBookSubmit}
                                disabled={
                                  isBooking ||
                                  !formData.name ||
                                  !formData.email ||
                                  selectedSlots.length === 0
                                }
                              >
                                {isBooking ? (
                                  <ActivityIndicator color="#FFF" />
                                ) : (
                                  <Text style={styles.submitBtnText}>
                                    Confirm Appointment
                                  </Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => toggleSlot(id, day, time, slots)}
                              >
                                <Text style={styles.cancelBtnText}>
                                  Collapse Row
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })()}
                  </View>
                );
              });
            })()}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  dateHeader: { flex: 1 },
  dateDayName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#064E3B",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  dateFull: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginTop: 2 },
  dayIndicator: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  dayIndicatorText: { color: "#059669", fontWeight: "900", fontSize: 16 },

  agendaRowContainer: {
    overflow: "hidden",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    position: "relative",
  },
  agendaRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    paddingHorizontal: 30,
    backgroundColor: "#FFF",
  },
  agendaRowHeaderSelected: { backgroundColor: "#F0FDF4" },
  agendaRowExpanded: { minHeight: 520, backgroundColor: "#FFF" },
  agendaRowTaken: { backgroundColor: "#F8FAFC" },
  agendaRowInRange: { backgroundColor: "#F0FDF4" },

  rowTimeBox: { width: 85 },
  rowTimeText: { fontSize: 13, fontWeight: "900", color: "#334155" },
  textSelected: { color: "#064E3B" },
  textMuted: { color: "#CBD5E1", fontWeight: "600" },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center" },

  availableContainer: { flex: 1, flexDirection: "row", alignItems: "center" },
  availableLabel: { fontSize: 14, color: "#064E3B", fontWeight: "600" },
  takenContainer: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  takenLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  formContent: {
    paddingHorizontal: 40,
    paddingVertical: 35,
    backgroundColor: "#FFF",
  },
  formHeader: { marginBottom: 30 },
  formTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#064E3B",
    letterSpacing: -1.5,
  },
  formSub: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  formRow: { flexDirection: "row", width: "100%" },
  inputWrapper: { marginBottom: 25 },
  inputLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: "#F1F5F9",
    fontSize: 16,
    color: "#064E3B",
    fontWeight: "700",
    paddingVertical: 12,
  },
  textArea: { height: 70, textAlignVertical: "top" },

  servicePicker: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  serviceChipActive: { backgroundColor: "#064E3B", borderColor: "#064E3B" },
  serviceChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
  },
  serviceChipTextActive: { color: "#FFF" },

  formActions: { marginTop: 20, gap: 12, paddingBottom: 20 },
  submitBtn: {
    backgroundColor: "#059669",
    padding: 22,
    borderRadius: 18,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cancelBtn: { padding: 15, alignItems: "center" },
  cancelBtnText: {
    color: "#94A3B8",
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 450,
    backgroundColor: "#FFF",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#064E3B",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 35,
    maxWidth: 280,
  },
  backBtn: {
    backgroundColor: "#064E3B",
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 14,
  },
  backBtnText: {
    color: "#FFF",
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
  },

  expandIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 30,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 185, 129, 0.2)",
  },
  expandIndicatorBottom: {
    top: "auto",
    bottom: 0,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 185, 129, 0.2)",
  },
  expandIndicatorText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
});

export default Booking;
