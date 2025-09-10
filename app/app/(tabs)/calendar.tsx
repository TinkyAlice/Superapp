import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type Event = {
  id: string;
  title: string;
  date: string;   // 'YYYY-MM-DD'
  start: string;  // 'HH:mm'
  end: string;    // 'HH:mm'
  location?: string;
  note?: string;
  color?: string;
};

const MATCHA = '#89b27f';
const BG = '#0d0d0d';
const CARD = '#1b1f1c';

/* ---------- helpers ---------- */
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatHuman(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/* ---------- seed data ---------- */
const seedEvents: Event[] = [
  { id: '1', title: 'Deep Work', date: todayISO(), start: '09:00', end: '11:00', color: '#7aa874' },
  { id: '2', title: 'Matcha mit Mia', date: todayISO(), start: '13:00', end: '14:00', location: 'Matcha Café', color: '#9ec49e' },
  { id: '3', title: 'Lofi & Sketch', date: addDaysISO(0), start: '16:00', end: '17:00', color: '#c4e3c0' },
  { id: '4', title: 'Gym', date: addDaysISO(1), start: '07:30', end: '08:15', color: '#7aa874' },
];

export default function CalendarScreen() {
  const [date, setDate] = useState<string>(todayISO());
  const [events] = useState<Event[]>(seedEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { width } = useWindowDimensions();
  const isNarrow = width < 720; // <— bei Bedarf anpassen

  const dayEvents = useMemo(
    () => events.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [events, date]
  );

  const marked = useMemo(() => {
    const dots: Record<string, any> = {};
    for (const e of events) {
      dots[e.date] ??= { dots: [{ color: MATCHA }] };
    }
    dots[date] = { ...(dots[date] ?? {}), selected: true, selectedColor: MATCHA };
    return dots;
  }, [events, date]);

  return (
    <ThemedView style={styles.container}>
      {/* Kopfzeile */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: '#fff' }}>Kalender</ThemedText>
        <ThemedText style={{ color: MATCHA }}>🍵 Keep it cozy</ThemedText>
      </View>

      {/* Kalender + Bild nebeneinander (oder untereinander auf schmalen Geräten) */}
      <ThemedView style={styles.card}>
        <View style={[styles.splitRow, isNarrow && { flexDirection: 'column' }]}>
          {/* Kalender */}
          <View style={styles.leftPane}>
            <Calendar
              current={date}
              onDayPress={(d: DateObject) => setDate(d.dateString)}
              markedDates={marked}
              theme={{
                backgroundColor: CARD,
                calendarBackground: CARD,
                textSectionTitleColor: '#c8d6c3',
                dayTextColor: '#e9efe6',
                monthTextColor: '#e9efe6',
                todayTextColor: '#f7d9e3',
                selectedDayBackgroundColor: MATCHA,
                selectedDayTextColor: '#0d0d0d',
                arrowColor: MATCHA,
              }}
              firstDay={1}
              hideExtraDays
              style={{ borderRadius: 12 }}
            />
          </View>

          {/* Bild */}
          <View style={styles.imageWrap}>
            <Image
              source={require('@/assets/images/test1.png')} // <— Dein Bild
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </View>
      </ThemedView>

      {/* Tages-Agenda */}
      <ThemedView style={[styles.card, { flex: 1 }]}>
        <View style={styles.dayHeader}>
          <ThemedText type="subtitle" style={{ color: '#fff' }}>
            {formatHuman(date)}
          </ThemedText>
          <Pressable onPress={() => setDate(todayISO())} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={{ color: MATCHA }}>Heute</ThemedText>
          </Pressable>
        </View>

        {dayEvents.length === 0 ? (
          <ThemedText style={{ opacity: 0.7, color: '#e9efe6' }}>Keine Termine 🎉</ThemedText>
        ) : (
          <FlatList
            data={dayEvents}
            keyExtractor={(e) => e.id}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedEvent(item)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={[styles.eventRow, { borderLeftColor: item.color ?? MATCHA }]}>
                  <View style={{ width: 72 }}>
                    <ThemedText style={{ color: '#e9efe6' }}>{item.start}</ThemedText>
                    <ThemedText style={{ color: '#c8d6c3', fontSize: 12 }}>{item.end}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>{item.title}</ThemedText>
                    {!!item.location && (
                      <ThemedText style={{ color: '#c8d6c3', fontSize: 12 }}>{item.location}</ThemedText>
                    )}
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </ThemedView>

      {/* Event-Detail Modal */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle" style={{ color: '#fff', marginBottom: 6 }}>
              {selectedEvent?.title}
            </ThemedText>
            <ThemedText style={{ color: '#e9efe6' }}>
              {selectedEvent?.date} • {selectedEvent?.start}–{selectedEvent?.end}
            </ThemedText>
            {!!selectedEvent?.location && (
              <ThemedText style={{ color: '#c8d6c3' }}>Ort: {selectedEvent?.location}</ThemedText>
            )}
            {!!selectedEvent?.note && (
              <ThemedText style={{ color: '#c8d6c3' }}>{selectedEvent?.note}</ThemedText>
            )}
            <Pressable
              onPress={() => setSelectedEvent(null)}
              style={({ pressed }) => [{ marginTop: 14, opacity: pressed ? 0.7 : 1 }]}
            >
              <ThemedText style={{ color: MATCHA }}>Schließen</ThemedText>
            </Pressable>
                      <View style={styles.imageWrap}>
                    <Image
                      source={require('@/assets/images/test1.png')}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
          </ThemedView>

        </View>
      </Modal>

    </ThemedView>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 12, gap: 12 },
  header: { paddingHorizontal: 4, gap: 4 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  leftPane: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  image: {
    flex: 1,
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9, // für schöne Proportionen; entfernen, wenn volle Höhe gewünscht
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#212622',
    borderLeftWidth: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 6 },
});
