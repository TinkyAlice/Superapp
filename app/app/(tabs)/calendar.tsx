import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Modal,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MapPicker from '@/components/MapPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

/* ---------------- TimeField (Web: <input type="time">, Native: DateTimePicker) ---------------- */
function formatHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function parseHHMM(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function TimeField({
  label,
  date,
  setDate,
}: {
  label: string;
  date: Date;
  setDate: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    // @ts-ignore: react-native-web erlaubt raw HTML-Inputs
    return (
      <View style={{ flex: 1 }}>
        <ThemedText style={{ color: '#c8d6c3', marginBottom: 4 }}>{label}</ThemedText>
        <input
          type="time"
          value={formatHHMM(date)}
          onChange={(e: any) => setDate(parseHHMM(date, e.target.value))}
          style={{
            width: '100%',
            background: '#1f2421',
            color: '#e9efe6',
            borderRadius: 12,
            padding: 10,
            border: 'none',
            outline: 'none',
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemedText style={{ color: '#c8d6c3', marginBottom: 4 }}>
        {label}: {formatHHMM(date)}
      </ThemedText>
      <Pressable
        onPress={() => setShow(true)}
        style={{ backgroundColor: '#1f2421', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
      >
        <ThemedText style={{ color: '#e9efe6' }}>Uhrzeit wählen</ThemedText>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e: DateTimePickerEvent, d?: Date) => {
            setShow(Platform.OS === 'ios'); // iOS lässt offen; Android schließt
            if (d) setDate(d);
          }}
        />
      )}
    </View>
  );
}

/* --------------------------------------- Types & Consts -------------------------------------- */
type EventType = 'Termin' | 'Event';

type Event = {
  id: string;
  title: string;
  date: string;   // 'YYYY-MM-DD'
  start: string;  // 'HH:mm'
  end: string;    // 'HH:mm'
  type: EventType;
  locationName?: string;
  location?: { latitude: number; longitude: number };
  note?: string;
  color?: string;
  symbol?: string; // emoji oder icon-name
};

const MATCHA = '#89b27f';
const BG = '#0d0d0d';
const CARD = '#1b1f1c';
const LEAF_COLORS = ['#7aa874', '#9ec49e', '#c4e3c0', '#89b27f'];
const SYMBOLS = ['🍵', '📚', '🏃‍♂️', '💻', '🎨', '🧠', '📅', '🛒', '☕️', '🗒️'];
const DEFAULT_REGION = {
  latitude: 53.0793,   // Bremen
  longitude: 8.8017,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};


/* --------------------------------------- Helpers -------------------------------------------- */
function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
function addDaysISO(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function formatHuman(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' });
}
function hhmmFromDate(date: Date) { return formatHHMM(date); }
function dateFromISOAndTime(iso: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(iso + 'T00:00:00');
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/* --------------------------------------- Seed ----------------------------------------------- */
const seedEvents: Event[] = [
  { id: '1', title: 'Deep Work', date: todayISO(), start: '09:00', end: '11:00', type: 'Termin', color: '#7aa874', symbol: '💻' },
  { id: '2', title: 'Matcha mit Mia', date: todayISO(), start: '13:00', end: '14:00', type: 'Event', color: '#9ec49e', symbol: '🍵', locationName: 'Matcha Café' },
  { id: '3', title: 'Lofi & Sketch', date: addDaysISO(0), start: '16:00', end: '17:00', type: 'Event', color: '#c4e3c0', symbol: '🎨' },
  { id: '4', title: 'Gym', date: addDaysISO(1), start: '07:30', end: '08:15', type: 'Termin', color: '#7aa874', symbol: '🏃‍♂️' },
];

/* ------------------------------------- Screen ----------------------------------------------- */
export default function CalendarScreen() {
  const [date, setDate] = useState(todayISO());
  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<EventType>('Termin');
  const [draftColor, setDraftColor] = useState(LEAF_COLORS[0]);
  const [draftSymbol, setDraftSymbol] = useState<string>(SYMBOLS[0]);
  const [draftDate, setDraftDate] = useState<string>(date);
  const [startDate, setStartDate] = useState<Date>(dateFromISOAndTime(date, '09:00'));
  const [endDate, setEndDate] = useState<Date>(dateFromISOAndTime(date, '10:00'));
  const [note, setNote] = useState('');
  const [locationName, setLocationName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);


  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const dayEvents = useMemo(
    () => events.filter(e => e.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [events, date]
  );

  const marked = useMemo(() => {
    const dots: Record<string, any> = {};
    for (const e of events) dots[e.date] ??= { dots: [{ color: e.color || MATCHA }] };
    dots[date] = { ...(dots[date] ?? {}), selected: true, selectedColor: MATCHA };
    return dots;
  }, [events, date]);

  function openNewEditor(forDate: string) {
    setDate(forDate);
    setEditingId(null);
    setDraftTitle('');
    setDraftType('Termin');
    setDraftColor(LEAF_COLORS[0]);
    setDraftSymbol(SYMBOLS[0]);
    setDraftDate(forDate);
    const s = dateFromISOAndTime(forDate, '09:00');
    const e = dateFromISOAndTime(forDate, '10:00');
    setStartDate(s); setEndDate(e);
    setNote(''); setLocationName(''); setLocation(undefined);
    setEditorOpen(true);
  }

  function openEditEditor(ev: Event) {
    setEditingId(ev.id);
    setDraftTitle(ev.title);
    setDraftType(ev.type);
    setDraftColor(ev.color || LEAF_COLORS[0]);
    setDraftSymbol(ev.symbol || SYMBOLS[0]);
    setDraftDate(ev.date);
    setStartDate(dateFromISOAndTime(ev.date, ev.start));
    setEndDate(dateFromISOAndTime(ev.date, ev.end));
    setNote(ev.note || '');
    setLocationName(ev.locationName || '');
    setLocation(ev.location);
    setEditorOpen(true);
  }

async function geocodeOSM(addr: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch {}
  return undefined;
}

async function save() {
  const t = draftTitle.trim();
  if (!t) { Alert.alert('Titel fehlt', 'Bitte gib einen Titel ein.'); return; }
  if (endDate < startDate) { Alert.alert('Zeit prüfen', 'Ende liegt vor Start.'); return; }

  // WEB-REGEL: Wenn Adresse eingetippt wurde, muss sie bestätigt/gecodet sein
  if (Platform.OS === 'web') {
    if (locationName.trim() && !location) {
      // Option A: Abbrechen + Hinweis
      Alert.alert('Adresse bestätigen', 'Bitte „Suchen“ drücken, um die Adresse zu bestätigen.');
      return;

      // Option B (alternativ): Auto-Geocode beim Speichern
      // const c = await geocodeOSM(locationName.trim());
      // if (!c) { Alert.alert('Adresse nicht gefunden', 'Bitte Adresse prüfen und erneut suchen.'); return; }
      // setLocation(c);
    }
  }

  const newEvent: Event = {
    id: editingId ?? String(Date.now()),
    title: t,
    date: draftDate,
    start: hhmmFromDate(startDate),
    end: hhmmFromDate(endDate),
    type: draftType,
    locationName: locationName.trim() || undefined,
    location,
    note: note.trim() || undefined,
    color: draftColor,
    symbol: draftSymbol,
  };

  setEvents(prev => (editingId ? prev.map(e => e.id === editingId ? newEvent : e) : [...prev, newEvent]));
  setEditorOpen(false);
  setSelectedEvent(null);
}


function confirmDelete(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // @ts-ignore: window.confirm existiert nur im Web
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Termin löschen?', message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}

function requestDelete(id: string) {
  confirmDelete('Das kann nicht rückgängig gemacht werden.', () => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
    if (editingId === id) setEditorOpen(false);
  });
}

function ConfirmModal({
  visible,
  title = 'Bist du sicher?',
  message,
  confirmText = 'Löschen',
  cancelText = 'Abbrechen',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center', padding: 24
      }}>
        <View style={{
          width: '100%', maxWidth: 420,
          backgroundColor: '#1b1f1c', borderRadius: 16, padding: 16
        }}>
          <ThemedText type="subtitle" style={{ color: '#fff', marginBottom: 6 }}>
            {title}
          </ThemedText>
          {!!message && (
            <ThemedText style={{ color: '#c8d6c3', marginBottom: 12 }}>
              {message}
            </ThemedText>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onCancel} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText style={{ color: '#c8d6c3' }}>{cancelText}</ThemedText>
            </Pressable>
            <Pressable onPress={onConfirm} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={{ color: '#f38b82' }}>{confirmText}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}



  return (
    <ThemedView style={styles.container}>
      {/* Kopfzeile */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: '#fff' }}>Kalender</ThemedText>
        <ThemedText style={{ color: MATCHA }}>🍵 Keep it cozy</ThemedText>
      </View>

      {/* Kalender + Bild */}
      <ThemedView style={styles.card}>
        <View style={[styles.splitRow, isNarrow && { flexDirection: 'column' }]}>
          <View style={styles.leftPane}>
            <Calendar
              current={date}
              onDayPress={(d: DateObject) => openNewEditor(d.dateString)} // Tag tippen = Neuer Editor
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
          <View style={styles.imageWrap}>
            <Image source={require('@/assets/images/test1.png')} style={styles.image} resizeMode="cover" />
          </View>
        </View>
      </ThemedView>

      {/* Tages-Agenda mit Bild links */}
      <ThemedView style={[styles.card, { flex: 1 }]}>
        <View style={[styles.agendaRow, isNarrow && { flexDirection: 'column' }]}>
          <View style={styles.agendaImageWrap}>
            <Image source={require('@/assets/images/test1.png')} style={styles.agendaImage} resizeMode="cover" />
          </View>

          <View style={styles.agendaPane}>
            <View style={styles.dayHeader}>
              <ThemedText type="subtitle" style={{ color: '#fff' }}>{formatHuman(date)}</ThemedText>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setDate(todayISO())} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText style={{ color: MATCHA }}>Heute</ThemedText>
                </Pressable>
                <Pressable onPress={() => openNewEditor(date)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText style={{ color: MATCHA }}>+ Termin</ThemedText>
                </Pressable>
              </View>
            </View>

            {dayEvents.length === 0 ? (
              <ThemedText style={{ opacity: 0.7, color: '#e9efe6' }}>Keine Termine 🎉</ThemedText>
            ) : (
              <FlatList
                data={dayEvents}
                keyExtractor={(e) => e.id}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                contentContainerStyle={{ paddingBottom: 4 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => setSelectedEvent(item)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <View style={[styles.eventRow, { borderLeftColor: item.color || MATCHA }]}>
                      <View style={{ width: 72 }}>
                        <ThemedText style={{ color: '#e9efe6' }}>{item.start}</ThemedText>
                        <ThemedText style={{ color: '#c8d6c3', fontSize: 12 }}>{item.end}</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>
                          {item.symbol ? `${item.symbol} ` : ''}{item.title}
                        </ThemedText>
                        <ThemedText style={{ color: '#c8d6c3', fontSize: 12 }}>
                          {item.type}{item.locationName ? ` • ${item.locationName}` : ''}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </ThemedView>

      {/* Detail-Modal (inkl. read-only Map) */}
      <Modal visible={!!selectedEvent} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle" style={{ color: '#fff', marginBottom: 6 }}>
              {selectedEvent?.symbol ? `${selectedEvent.symbol} ` : ''}{selectedEvent?.title}
            </ThemedText>
            <ThemedText style={{ color: '#e9efe6' }}>
              {selectedEvent?.date} • {selectedEvent?.start}–{selectedEvent?.end}
            </ThemedText>
            {!!selectedEvent?.type && <ThemedText style={{ color: '#c8d6c3' }}>{selectedEvent.type}</ThemedText>}
            {!!selectedEvent?.locationName && <ThemedText style={{ color: '#c8d6c3' }}>Ort: {selectedEvent.locationName}</ThemedText>}
            {!!selectedEvent?.note && <ThemedText style={{ color: '#c8d6c3' }}>{selectedEvent?.note}</ThemedText>}

            {!!selectedEvent?.location && (
              <View style={{ marginTop: 12 }}>
                <MapPicker
                  coordinate={selectedEvent.location}
                  title={selectedEvent.locationName || 'Ort'}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
              {selectedEvent && (
                <>
                  <Pressable
                    onPress={() => { const ev = selectedEvent; setSelectedEvent(null); openEditEditor(ev); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <ThemedText style={{ color: MATCHA }}>Bearbeiten</ThemedText>
                  </Pressable>
<Pressable
  onPress={() => { setPendingDeleteId(selectedEvent!.id); setConfirmOpen(true); }}
  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
>
  <ThemedText style={{ color: '#f38b82' }}>Löschen</ThemedText>
</Pressable>


                </>
              )}
              <Pressable onPress={() => setSelectedEvent(null)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <ThemedText style={{ color: '#c8d6c3' }}>Schließen</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Editor-Modal */}
      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={[styles.modalCard, { gap: 12 }]}>
            <ThemedText type="subtitle" style={{ color: '#fff' }}>
              {editingId ? 'Termin bearbeiten' : 'Neuer Termin'}
            </ThemedText>
            <ThemedText style={{ color: '#c8d6c3' }}>{formatHuman(draftDate)}</ThemedText>

            {/* Titel */}
            <TextInput
              placeholder="Titel*"
              placeholderTextColor="#9aa39a"
              value={draftTitle}
              onChangeText={setDraftTitle}
              style={styles.input}
            />

            {/* Typ Umschalter */}
            <View style={styles.segment}>
              {(['Termin', 'Event'] as EventType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setDraftType(t)}
                  style={[styles.segmentBtn, draftType === t && styles.segmentBtnActive]}
                >
                  <ThemedText style={{ color: draftType === t ? '#0d0d0d' : '#c8d6c3' }}>{t}</ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Zeiten */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TimeField label="Start" date={startDate} setDate={setStartDate} />
              <TimeField label="Ende" date={endDate} setDate={setEndDate} />
            </View>

            {/* Ort & Karte (Web: Adresse & Embed, Native: MapView) */}
<ThemedText style={{ color: '#c8d6c3' }}>Ort wählen (Adresse eingeben und „Suchen“ drücken):</ThemedText>
<MapPicker
  query={locationName}
  onQueryChange={setLocationName}
  coordinate={location}
  onResolved={(c, display) => {
    setLocation(c);
    if (display && !locationName) setLocationName(display);
  }}
  title={locationName || 'Ausgewählter Ort'}
/>

            <TextInput
              placeholder="Ortsname (optional)"
              placeholderTextColor="#9aa39a"
              value={locationName}
              onChangeText={setLocationName}
              style={styles.input}
            />

            {/* Symbol & Farbe */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <ThemedText style={{ color: '#c8d6c3' }}>Symbol:</ThemedText>
              <View style={styles.symbolGrid}>
                {SYMBOLS.map((sym) => (
                  <TouchableOpacity
                    key={sym}
                    onPress={() => setDraftSymbol(sym)}
                    style={[styles.symbolItem, draftSymbol === sym && styles.symbolItemActive]}
                  >
                    <ThemedText style={{ fontSize: 18 }}>{sym}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ThemedText style={{ color: '#c8d6c3' }}>Farbe:</ThemedText>
              {LEAF_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setDraftColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderColor: draftColor === c ? '#fff' : 'transparent' }]}
                />
              ))}
            </View>

            {/* Notiz */}
            <TextInput
              placeholder="Notiz (optional)"
              placeholderTextColor="#9aa39a"
              value={note}
              onChangeText={setNote}
              style={[styles.input, { height: 80 }]}
              multiline
            />

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setEditorOpen(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <ThemedText style={{ color: '#c8d6c3' }}>Abbrechen</ThemedText>
              </Pressable>
              <Pressable onPress={save} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <ThemedText style={{ color: MATCHA }}>{editingId ? 'Speichern' : 'Hinzufügen'}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmOpen}
        title="Termin löschen?"
        message="Das kann nicht rückgängig gemacht werden."
        confirmText="Löschen"
        cancelText="Abbrechen"
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        onConfirm={() => {
          if (pendingDeleteId) {
            setEvents(prev => prev.filter(e => e.id !== pendingDeleteId));
            setSelectedEvent(null);
          }
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

    </ThemedView>
  );
}

/* --------------------------------------- Styles --------------------------------------------- */
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

  // Kalender + Bild
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  leftPane: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  imageWrap: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#222' },
  image: { flex: 1, width: '100%', height: undefined, aspectRatio: 16 / 9 },

  // Agenda + Bild links
  agendaRow: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  agendaImageWrap: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#222', minHeight: 180 },
  agendaImage: { width: '100%', height: '100%' },
  agendaPane: { flex: 1.5 },

  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#212622', borderLeftWidth: 4 },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 6 },

  // Inputs & controls
  input: { backgroundColor: '#1f2421', color: '#e9efe6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#1f2421', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: MATCHA },

  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  symbolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbolItem: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1f2421', alignItems: 'center', justifyContent: 'center' },
  symbolItemActive: { borderWidth: 2, borderColor: MATCHA },
});
