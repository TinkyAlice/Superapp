// calendar.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MapPicker from '@/components/MapPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

/* =============================================================================
   TimeField – Uhrzeit-Auswahl (Web: <input type="time">, Native: DateTimePicker)
============================================================================= */
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
    // @ts-ignore – raw HTML auf Web ist ok
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
      <Pressable onPress={() => setShow(true)} style={styles.timeButton}>
        <ThemedText style={{ color: '#e9efe6' }}>Uhrzeit wählen</ThemedText>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e: DateTimePickerEvent, d?: Date) => {
            setShow(Platform.OS === 'ios'); // iOS offen lassen, Android schließt
            if (d) setDate(d);
          }}
        />
      )}
    </View>
  );
}

/* =============================================================================
   TimelineDay – linke Tages-Timeline
============================================================================= */
type TimelineProps = {
  events: Event[];                 // sortiert nach Start
  nowISO?: string;                 // z.B. todayISO()
  onPressItem?: (ev: Event) => void;
  onAdd?: () => void;              // für das + Node
};

function isNowBetween(ev: Event, ref: Date) {
  const s = new Date(`${ev.date}T${ev.start}:00`);
  const e = new Date(`${ev.date}T${ev.end}:00`);
  return ref >= s && ref <= e;
}

function TimelineDay({ events, nowISO, onPressItem, onAdd }: TimelineProps) {
  const now = nowISO ? new Date(nowISO + 'T' + new Date().toTimeString().slice(0, 8)) : new Date();

  return (
    <View style={tl.timelineWrap}>
      {/* linke Zeitspalte */}
      <View style={tl.timeCol}>
        {events.map((ev, i) => (
          <ThemedText key={ev.id} style={[tl.timeText, i === 0 && { marginTop: 6 }]}>
            {ev.start}
          </ThemedText>
        ))}
        {!!events[events.length - 1] && (
          <ThemedText style={[tl.timeText, { marginTop: 12 }]}>
            {events[events.length - 1].end}
          </ThemedText>
        )}
      </View>

      {/* rechte Timeline-Spalte */}
      <View style={tl.lineCol}>
        <View style={tl.line} />
        {events.map((ev) => {
          const active = isNowBetween(ev, now);
          return (
            <Pressable key={ev.id} onPress={() => onPressItem?.(ev)} style={{ width: '100%' }}>
              <View style={tl.row}>
                <View style={[tl.node, { backgroundColor: ev.color || '#555' }, active && tl.nodeActive]}>
                  <ThemedText style={tl.nodeIcon}>{ev.symbol || '•'}</ThemedText>
                </View>
                <View style={[tl.card, active && tl.cardActive]}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#fff' }}>
                      {ev.title}
                    </ThemedText>
                    <ThemedText style={{ color: '#c8d6c3', fontSize: 12 }}>
                      {ev.start}–{ev.end}
                    </ThemedText>
                  </View>
                  {!!ev.locationName && (
                    <ThemedText style={{ color: '#c8d6c3', marginTop: 2, fontSize: 12 }}>
                      {ev.locationName}
                    </ThemedText>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* Plus-Node */}
        <Pressable onPress={onAdd} style={{ width: '100%' }}>
          <View style={tl.row}>
            <View style={[tl.node, tl.nodePlus]}>
              <ThemedText style={tl.nodeIcon}>＋</ThemedText>
            </View>
            <View style={[tl.card, { opacity: 0.9 }]}>
              <ThemedText style={{ color: '#c8d6c3' }}>Was hast du noch zu tun?</ThemedText>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const tl = StyleSheet.create({
  timelineWrap: { flexDirection: 'row', gap: 10 },
  timeCol: { width: 52, alignItems: 'flex-end', paddingTop: 8 },
  timeText: { color: '#9aa39a', fontSize: 12, marginVertical: 14 },
  lineCol: { flex: 1, position: 'relative', paddingLeft: 20 },
  line: { position: 'absolute', left: 10, top: 0, bottom: 0, width: 3, backgroundColor: '#2b312d', borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  node: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2b312d' },
  nodeActive: { borderColor: '#f0c5cf' },
  nodePlus: { backgroundColor: '#303632' },
  nodeIcon: { color: '#0d0d0d', fontSize: 16 },
  card: { flex: 1, backgroundColor: '#212622', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  cardActive: { backgroundColor: '#2b2f2c' },
});

/* =============================================================================
   Types & Consts (inkl. Routine)
============================================================================= */
type EventType = 'Termin' | 'Event' | 'Routine';
type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

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

type Routine = {
  id: string;
  title: string;
  defaultTime: string; // 'HH:mm'
  weekdays: number[]; // 0..6 (0 = Sonntag) – welche Wochentage aktiv
  overrides?: Record<string, string>; // ISO date -> 'HH:mm' (ausnahmen)
  active?: boolean;
  symbol?: string;
  color?: string;
};

const MATCHA = '#89b27f';
const BG = '#0d0d0d';
const CARD = '#1b1f1c';

const LEAF_COLORS = ['#7aa874', '#9ec49e', '#c4e3c0', '#89b27f'];
const SYMBOLS = ['🍵', '📚', '🏃‍♂️', '💻', '🎨', '🧠', '📅', '🛒', '☕️', '🗒️'];
const DEFAULT_REGION = { latitude: 53.0793, longitude: 8.8017, latitudeDelta: 0.05, longitudeDelta: 0.05 }; // Bremen

/* =============================================================================
   Helpers
============================================================================= */
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(days: number, baseISO?: string) {
  const d = baseISO ? new Date(baseISO + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatHuman(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' });
}
function dateFromISOAndTime(iso: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(iso + 'T00:00:00');
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function hhmmFromDate(date: Date) { return formatHHMM(date); }
function startOfWeekISO(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // 0..6 (Mo=0)
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function range7(iso: string) {
  const start = new Date(iso + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' }) };
  });
}
function yymm(iso: string) { return iso.slice(0, 7); }
function isSameMonth(aISO: string, bISO: string) { return yymm(aISO) === yymm(bISO); }
function humanDayShort(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}
function buildMonthSections(allEvents: Event[], monthRefISO: string) {
  const monthEvents = allEvents
    .filter(e => isSameMonth(e.date, monthRefISO))
    .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)));
  const byDate: Record<string, Event[]> = {};
  for (const ev of monthEvents) (byDate[ev.date] ??= []).push(ev);
  return Object.keys(byDate).sort().map(dayISO => ({ title: dayISO, data: byDate[dayISO] }));
}

/* =============================================================================
   Seed
============================================================================= */
const seedEvents: Event[] = [
  { id: '1', title: 'Deep Work', date: todayISO(), start: '09:00', end: '11:00', type: 'Termin', color: '#7aa874', symbol: '💻' },
  { id: '2', title: 'Matcha mit Mia', date: todayISO(), start: '13:00', end: '14:00', type: 'Event', color: '#9ec49e', symbol: '🍵', locationName: 'Matcha Café' },
  { id: '3', title: 'Lofi & Sketch', date: todayISO(), start: '16:00', end: '17:00', type: 'Event', color: '#c4e3c0', symbol: '🎨' },
  { id: '4', title: 'Gym', date: addDaysISO(1), start: '07:30', end: '08:15', type: 'Termin', color: '#7aa874', symbol: '🏃‍♂️' },
];

const seedRoutines: Routine[] = [
  { id: 'r1', title: 'Zähne putzen', defaultTime: '21:20', weekdays: [1,2,3,4,5,6], active:true, symbol:'🪥', color:'#f0c5cf' }, // Mo-Sa
  { id: 'r2', title: 'Morgenstretch', defaultTime: '07:10', weekdays: [1,2,3,4,5], active:true, symbol:'🧘', color:'#c4e3c0' },
];

/* =============================================================================
   Screen
============================================================================= */
export default function CalendarScreen() {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState<ViewMode>('DAY');

  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [routines, setRoutines] = useState<Routine[]>(seedRoutines);

  // routineDone: map ISO -> Set of routineIds done on that date
  const [routineDone, setRoutineDone] = useState<Record<string, string[]>>({});

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Editor (events)
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
  const [leftMode, setLeftMode] = useState<'DAY' | 'MONTH'>('DAY');

  // Routine editor
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [rTitle, setRTitle] = useState('');
  const [rTime, setRTime] = useState('21:20');
  const [rWeekdays, setRWeekdays] = useState<number[]>([1,2,3,4,5,6]); // Mo-Sa default
  const [rOverrides, setROverrides] = useState<Record<string,string>>({});
  const [rActive, setRActive] = useState(true);
  const [rSymbol, setRSymbol] = useState('🪥');
  const [rColor, setRColor] = useState('#f0c5cf');

  // Confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const isNarrow = width < 900;

  const dayEvents = useMemo(
    () => events.filter(e => e.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [events, date]
  );

  // Create "events from routines" for the selected date
  function routinesForDate(iso: string) {
    const d = new Date(iso + 'T00:00:00');
    const weekday = d.getDay(); // 0..6 Sun..Sat
    const list: Event[] = [];
    for (const r of routines) {
      if (!r.active) continue;
      // override?
      const override = r.overrides?.[iso];
      const time = override ?? r.defaultTime;
      // check if scheduled this weekday or override exists for this date
      const scheduled = (r.weekdays.includes(weekday)) || (!!override);
      if (!scheduled) continue;
      list.push({
        id: `routine:${r.id}:${iso}`,
        title: r.title,
        date: iso,
        start: time,
        end: time, // routines no duration by default
        type: 'Routine',
        color: r.color,
        symbol: r.symbol || '🔁',
      });
    }
    // sort by start
    return list.sort((a,b)=>a.start.localeCompare(b.start));
  }

  // Markierungen für Monatskalender (aus events + routines)
  const marked = useMemo(() => {
    const dots: Record<string, any> = {};
    for (const e of events) {
      if (!dots[e.date]) dots[e.date] = { dots: [] };
      dots[e.date].dots.push({ color: e.color || MATCHA });
    }
    // routines: mark days that have at least one routine
    const now = new Date();
    const monthStart = new Date(date + 'T00:00:00');
    // we'll just iterate next 31 days to mark
    for (let i= -3; i < 35; i++) {
      const iso = addDaysISO(i, date);
      const rlist = routinesForDate(iso);
      if (rlist.length) {
        if (!dots[iso]) dots[iso] = { dots: [] };
        dots[iso].dots.push({ color: '#f0c5cf' });
      }
    }
    dots[date] = { ...(dots[date] ?? {}), selected: true, selectedColor: MATCHA };
    return dots;
  }, [events, routines, date]);

  // WEEK: week helpers
  const weekStart = useMemo(() => startOfWeekISO(date), [date]);
  const weekDays = useMemo(() => range7(weekStart), [weekStart]);

  /* ---------- Editor helpers ---------- */
  function openNewEditor(forDate: string) {
    setDate(forDate);
    setEditingId(null);
    setDraftTitle('');
    setDraftType('Termin');
    setDraftColor(LEAF_COLORS[0]);
    setDraftSymbol(SYMBOLS[0]);
    setDraftDate(forDate);
    setStartDate(dateFromISOAndTime(forDate, '09:00'));
    setEndDate(dateFromISOAndTime(forDate, '10:00'));
    setNote('');
    setLocationName('');
    setLocation(undefined);
    setEditorOpen(true);
  }

  function openEditEditor(ev: Event) {
    setEditingId(ev.id.startsWith('routine:') ? null : ev.id);
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

  function save() {
    const t = draftTitle.trim();
    if (!t) { Alert.alert('Titel fehlt', 'Bitte gib einen Titel ein.'); return; }
    if (endDate < startDate) { Alert.alert('Zeit prüfen', 'Ende liegt vor Start.'); return; }
    if (Platform.OS === 'web' && locationName.trim() && !location) {
      Alert.alert('Adresse bestätigen', 'Bitte „Suchen“ im Karten-Widget drücken, um die Adresse zu bestätigen.');
      return;
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

  /* ---------- Routine helpers ---------- */
  function openNewRoutineEditor(forRoutine?: Routine) {
    if (forRoutine) {
      setEditingRoutineId(forRoutine.id);
      setRTitle(forRoutine.title);
      setRTime(forRoutine.defaultTime);
      setRWeekdays(forRoutine.weekdays.slice());
      setROverrides(forRoutine.overrides ? { ...forRoutine.overrides } : {});
      setRActive(forRoutine.active ?? true);
      setRSymbol(forRoutine.symbol || '🪥');
      setRColor(forRoutine.color || '#f0c5cf');
    } else {
      setEditingRoutineId(null);
      setRTitle('Neue Routine');
      setRTime('21:20');
      setRWeekdays([1,2,3,4,5,6]);
      setROverrides({});
      setRActive(true);
      setRSymbol('🪥');
      setRColor('#f0c5cf');
    }
    setRoutineEditorOpen(true);
  }

  function toggleWeekday(w: number) {
    setRWeekdays(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w].sort());
  }

  function saveRoutine() {
    const t = rTitle.trim();
    if (!t) { Alert.alert('Titel fehlt', 'Bitte gib einen Titel ein.'); return; }
    const r: Routine = {
      id: editingRoutineId ?? String(Date.now()),
      title: t,
      defaultTime: rTime,
      weekdays: rWeekdays,
      overrides: Object.keys(rOverrides).length ? { ...rOverrides } : undefined,
      active: rActive,
      symbol: rSymbol,
      color: rColor,
    };
    setRoutines(prev => editingRoutineId ? prev.map(x => x.id === editingRoutineId ? r : x) : [...prev, r]);
    setRoutineEditorOpen(false);
  }

  function removeRoutine(id: string) {
    Alert.alert('Routine löschen?', 'Wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => setRoutines(prev => prev.filter(r => r.id !== id)) },
    ]);
  }

  // Toggle routine done for a given date ISO
  function toggleRoutineDoneForDate(routineId: string, iso: string) {
    setRoutineDone(prev => {
      const arr = prev[iso] ? [...prev[iso]] : [];
      if (arr.includes(routineId)) {
        return { ...prev, [iso]: arr.filter(x => x !== routineId) };
      } else {
        return { ...prev, [iso]: [...arr, routineId] };
      }
    });
  }

  function isRoutineDone(routineId: string, iso: string) {
    return (routineDone[iso] ?? []).includes(routineId);
  }

  /* ---------- Pretty Confirm ---------- */
  function ConfirmModal({
    visible,
    title = 'Bist du sicher?',
    message,
    confirmText = 'Löschen',
    cancelText = 'Abbrechen',
    onConfirm,
    onCancel,
  }: {
    visible: boolean; title?: string; message?: string;
    confirmText?: string; cancelText?: string;
    onConfirm: () => void; onCancel: () => void;
  }) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={[styles.modalCard, { gap: 12 }]}>
            <ThemedText type="subtitle" style={{ color: '#fff' }}>{title}</ThemedText>
            {!!message && <ThemedText style={{ color: '#c8d6c3' }}>{message}</ThemedText>}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={onCancel} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <ThemedText style={{ color: '#c8d6c3' }}>{cancelText}</ThemedText>
              </Pressable>
              <Pressable onPress={onConfirm} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <ThemedText style={{ color: '#f38b82' }}>{confirmText}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    );
  }
  function requestDelete(id: string) { setPendingDeleteId(id); setConfirmOpen(true); }
  function commitDelete() {
    if (pendingDeleteId) setEvents(prev => prev.filter(e => e.id !== pendingDeleteId));
    setPendingDeleteId(null);
    setConfirmOpen(false);
    setSelectedEvent(null);
  }

  /* =============================================================================
     UI
  ============================================================================= */
  return (
    <ThemedView style={styles.container}>
      {/* Kopfzeile */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: '#fff' }}>Kalender</ThemedText>
        <ThemedText style={{ color: MATCHA }}>🍵 Keep it cozy</ThemedText>
      </View>

      {/* Alles scrollfähig */}
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* GRID: linke Spalte + rechte Spalte */}
        <View style={styles.gridRow}>
          {/* LEFT: Switch + Liste (Timeline / Monat) + Routines */}
          <View style={styles.leftCol}>
            <ThemedView style={styles.card}>
              <View style={styles.segment}>
                {(['DAY', 'MONTH'] as const).map(mode => (
                  <Pressable
                    key={mode}
                    onPress={() => setLeftMode(mode)}
                    style={[styles.segmentBtn, leftMode === mode && styles.segmentBtnActive]}
                  >
                    <ThemedText style={{ color: leftMode === mode ? '#0d0d0d' : '#c8d6c3' }}>
                      {mode === 'DAY' ? 'Tagesplaner' : 'Monatsevents'}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ThemedView>

            <ThemedView style={[styles.card, { marginTop: 12 }]}>
              {leftMode === 'DAY' ? (
                <>
                  {/* Timeline für Events + Routines */}
                  <ThemedText type="defaultSemiBold" style={{ color: '#e9efe6', marginBottom: 8 }}>Heute</ThemedText>
                  {/* Merge events + routines for today */}
                  <TimelineDay
                    events={[...routinesForDate(date), ...dayEvents].sort((a,b)=>a.start.localeCompare(b.start))}
                    nowISO={date}
                    onPressItem={(ev)=> {
                      // if routine-event clicked, open routine details -> find base routine
                      if (ev.id.startsWith('routine:')) {
                        // show routine quick actions: mark done
                        const parts = ev.id.split(':'); // routine:id:iso
                        const rid = parts[1];
                        // quick-mark done:
                        toggleRoutineDoneForDate(rid, date);
                      } else {
                        setSelectedEvent(ev);
                      }
                    }}
                    onAdd={() => openNewEditor(date)}
                  />
                </>
              ) : (
                <SectionList
                  sections={buildMonthSections(events, date)}
                  keyExtractor={(it) => it.id}
                  nestedScrollEnabled
                  renderSectionHeader={({ section }) => (
                    <ThemedText type="defaultSemiBold" style={{ color: '#e9efe6', marginTop: 10 }}>
                      {humanDayShort(section.title)}
                    </ThemedText>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                  SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => setSelectedEvent(item)}>
                      <View style={[styles.weekEventPill, { borderLeftColor: item.color || MATCHA }]}>
                        <ThemedText style={{ color: '#e9efe6', fontSize: 12 }}>
                          {item.start} {item.symbol ? item.symbol + ' ' : ''}{item.title}
                        </ThemedText>
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={<ThemedText style={{ color: '#9aa39a' }}>Keine Einträge</ThemedText>}
                />
              )}
            </ThemedView>

            {/* ROUTINES CARD */}
            <ThemedView style={[styles.card, { marginTop: 12 }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <ThemedText type="subtitle" style={{ color:'#fff' }}>Routinen</ThemedText>
                <Pressable onPress={() => openNewRoutineEditor()}><ThemedText style={{ color: MATCHA }}>+ Neu</ThemedText></Pressable>
              </View>

              {routines.length === 0 ? (
                <ThemedText style={{ color:'#9aa39a' }}>Keine Routinen</ThemedText>
              ) : (
                <FlatList
                  data={routines}
                  keyExtractor={(r) => r.id}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item }) => {
                    const scheduledToday = (() => {
                      const override = item.overrides?.[date];
                      const weekday = new Date(date + 'T00:00:00').getDay();
                      return (!!override) || item.weekdays.includes(weekday);
                    })();
                    const timeForToday = item.overrides?.[date] ?? item.defaultTime;
                    const done = isRoutineDone(item.id, date);
                    return (
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <Pressable onPress={() => openNewRoutineEditor(item)} style={{ flex:1 }}>
                          <View style={{ flexDirection:'row', gap:10, alignItems:'center' }}>
                            <View style={{ width:44, height:44, borderRadius:10, backgroundColor:item.color || '#333', alignItems:'center', justifyContent:'center' }}>
                              <ThemedText>{item.symbol}</ThemedText>
                            </View>
                            <View style={{ flex:1 }}>
                              <ThemedText type="defaultSemiBold" style={{ color:'#fff' }}>{item.title}</ThemedText>
                              <ThemedText style={{ color:'#c8d6c3', fontSize:12 }}>
                                {timeForToday} {scheduledToday ? '' : '(nicht heute)'}
                              </ThemedText>
                            </View>
                          </View>
                        </Pressable>

                        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                          <Pressable onPress={() => toggleRoutineDoneForDate(item.id, date)} style={({ pressed })=>[{ opacity: pressed ? 0.7 : 1 }]}>
                            <View style={{ width:36, height:36, borderRadius:18, borderWidth:2, borderColor: done ? MATCHA : '#555', alignItems:'center', justifyContent:'center' }}>
                              <ThemedText style={{ color: done ? MATCHA : '#c8d6c3' }}>{done ? '✓' : ''}</ThemedText>
                            </View>
                          </Pressable>
                          <Pressable onPress={() => removeRoutine(item.id)} style={({ pressed })=>[{ opacity: pressed ? 0.7 : 1 }]}>
                            <ThemedText style={{ color:'#f38b82' }}>🗑️</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </ThemedView>
          </View>

          {/* RIGHT: oben Kalender + Bild, darunter Week + Bilder */}
          <View style={styles.rightCol}>
            {/* Top row: Kalender + Bild */}
            <View style={[styles.topRightRow, isNarrow && { flexDirection: 'column' }]}>
              <ThemedView style={[styles.card, styles.calCard]}>
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
              </ThemedView>

              <ThemedView style={[styles.card, styles.sideImageCard]}>
                <Image source={require('@/assets/images/test1.png')} style={styles.sideImage} resizeMode="cover" />
              </ThemedView>
            </View>

            {/* Wochenplaner */}
            <ThemedView style={[styles.card, styles.weekPlannerCard]}>
              <View style={styles.weekHeader}>
                <ThemedText type="subtitle" style={{ color: '#fff' }}>Wochenplaner</ThemedText>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={() => setDate(addDaysISO(-7, date))}><ThemedText style={{ color: MATCHA }}>←</ThemedText></Pressable>
                  <Pressable onPress={() => setDate(addDaysISO(7, date))}><ThemedText style={{ color: MATCHA }}>→</ThemedText></Pressable>
                  <Pressable onPress={() => setDate(todayISO())}><ThemedText style={{ color: MATCHA }}>Heute</ThemedText></Pressable>
                </View>
              </View>

              <FlatList
                data={range7(startOfWeekISO(date))}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(d) => d.iso}
                contentContainerStyle={{ gap: 12 }}
                nestedScrollEnabled
                renderItem={({ item }) => {
                  const list = events
                    .filter(e => e.date === item.iso)
                    .concat(routinesForDate(item.iso))
                    .sort((a, b) => a.start.localeCompare(b.start));
                  const isSelected = item.iso === date;
                  return (
                    <Pressable onPress={() => setDate(item.iso)}>
                      <View style={[styles.weekDayCard, isSelected && { borderColor: MATCHA }]}>
                        <ThemedText style={{ color: '#e9efe6', marginBottom: 6 }}>{item.label}</ThemedText>
                        {list.length === 0 ? (
                          <ThemedText style={{ color: '#9aa39a', fontSize: 12 }}>—</ThemedText>
                        ) : list.map(ev => (
                          <View key={ev.id} style={[styles.weekEventPill, { borderLeftColor: ev.color || MATCHA }]}>
                            <ThemedText style={{ color: '#e9efe6', fontSize: 12 }}>
                              {ev.start} {ev.symbol ? ev.symbol + ' ' : ''}{ev.title}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                }}
              />
            </ThemedView>

            {/* Untere Bilder (nebeneinander / auf Mobile untereinander) */}
            <View style={[styles.bottomRow, isNarrow && { flexDirection: 'column' }]}>
              <ThemedView style={[styles.card, styles.bottomImageCard]}>
                <Image source={require('@/assets/images/test1.png')} style={styles.bottomImage} resizeMode="cover" />
              </ThemedView>
              <ThemedView style={[styles.card, styles.bottomImageCard]}>
                <Image source={require('@/assets/images/test2.png')} style={styles.bottomImage} resizeMode="cover" />
              </ThemedView>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Detail-Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={[styles.modalCard, { gap: 10 }]}>
            <ThemedText type="subtitle" style={{ color: '#fff' }}>
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
                <MapPicker coordinate={selectedEvent.location} title={selectedEvent.locationName || 'Ort'} />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'flex-end', marginTop: 12 }}>
              <Pressable onPress={() => { const ev = selectedEvent!; setSelectedEvent(null); openEditEditor(ev); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <ThemedText style={{ color: MATCHA }}>Bearbeiten</ThemedText>
              </Pressable>
              <Pressable onPress={() => requestDelete(selectedEvent!.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <ThemedText style={{ color: '#f38b82' }}>Löschen</ThemedText>
              </Pressable>
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
              {(['Termin', 'Event', 'Routine'] as EventType[]).map((t) => (
                <Pressable key={t} onPress={() => setDraftType(t)} style={[styles.segmentBtn, draftType === t && styles.segmentBtnActive]}>
                  <ThemedText style={{ color: draftType === t ? '#0d0d0d' : '#c8d6c3' }}>{t}</ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Zeiten */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TimeField label="Start" date={startDate} setDate={setStartDate} />
              <TimeField label="Ende" date={endDate} setDate={setEndDate} />
            </View>

            {/* Ort & Karte */}
            <ThemedText style={{ color: '#c8d6c3' }}>
              Ort wählen (Adresse eingeben und „Suchen“ drücken):
            </ThemedText>
            <MapPicker
              // @ts-ignore: web/native Props unterscheiden sich leicht
              query={locationName}
              // @ts-ignore
              onQueryChange={setLocationName}
              coordinate={location}
              // @ts-ignore
              onResolved={(c: any) => setLocation(c)}
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

      {/* ROUTINE EDITOR Modal */}
      <Modal visible={routineEditorOpen} transparent animationType="slide" onRequestClose={() => setRoutineEditorOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={[styles.modalCard, { gap: 12 }]}>
            <ThemedText type="subtitle" style={{ color: '#fff' }}>{editingRoutineId ? 'Routine bearbeiten' : 'Neue Routine'}</ThemedText>

            <TextInput placeholder="Titel" placeholderTextColor="#9aa39a" value={rTitle} onChangeText={setRTitle} style={styles.input} />

            <View style={{ flexDirection:'row', gap: 10 }}>
              <TimeField label="Standardzeit" date={dateFromISOAndTime(todayISO(), rTime)} setDate={(d)=>setRTime(formatHHMM(d))} />
            </View>

            <ThemedText style={{ color:'#c8d6c3', marginTop: 6 }}>Wochentage</ThemedText>
            <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {['So','Mo','Di','Mi','Do','Fr','Sa'].map((lab, idx) => {
                const active = rWeekdays.includes(idx);
                return (
                  <Pressable key={lab} onPress={() => toggleWeekday(idx)} style={[{ paddingVertical:8, paddingHorizontal:10, borderRadius:8, borderWidth:1, borderColor: active?MATCHA:'#2b312d' }]}>
                    <ThemedText style={{ color: active ? '#0d0d0d' : '#c8d6c3' }}>{lab}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText style={{ color:'#c8d6c3', marginTop: 8 }}>Ausnahmen (Datum => andere Zeit)</ThemedText>
            <View style={{ gap:8 }}>
              {/* Simple rows for overrides: show existing and allow manual add */}
              {Object.keys(rOverrides || {}).map(k => (
                <View key={k} style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                  <ThemedText style={{ color:'#e9efe6' }}>{k}</ThemedText>
                  <TextInput value={rOverrides[k]} onChangeText={(val)=>setROverrides(prev=>({...prev,[k]:val}))} placeholder="HH:MM" placeholderTextColor="#9aa39a" style={[styles.input,{flex:1}]} />
                  <Pressable onPress={()=>setROverrides(prev=>{ const p={...prev}; delete p[k]; return p; })}><ThemedText style={{ color:'#f38b82' }}>✖</ThemedText></Pressable>
                </View>
              ))}
              <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                <TextInput placeholder="YYYY-MM-DD" placeholderTextColor="#9aa39a" style={[styles.input,{flex:1}]} onSubmitEditing={(e:any)=>{
                  const iso = e.nativeEvent.text;
                  if (!iso.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Datum ungültig'); return; }
                  setROverrides(prev=>({...prev, [iso]: rTime}));
                }} />
                <Pressable onPress={()=>{ /* nothing */ }}><ThemedText style={{ color: MATCHA }}>Hinzufügen</ThemedText></Pressable>
              </View>
            </View>

            <View style={{ flexDirection:'row', gap: 8, alignItems:'center', marginTop:8 }}>
              <Pressable onPress={() => setRActive(!rActive)} style={({pressed})=>[{ opacity: pressed?0.7:1 }]}>
                <ThemedText style={{ color: rActive?MATCHA:'#c8d6c3' }}>{rActive ? 'Aktiv' : 'Inaktiv'}</ThemedText>
              </Pressable>
              <Pressable onPress={() => setRSymbol(sym => sym === '🪥' ? '🔁' : '🪥')}><ThemedText style={{ color:'#c8d6c3' }}>Symbol: {rSymbol}</ThemedText></Pressable>
            </View>

            <View style={{ flexDirection:'row', gap:12, justifyContent:'flex-end' }}>
              <Pressable onPress={()=>setRoutineEditorOpen(false)} style={({pressed})=>[{opacity: pressed?0.6:1}]}><ThemedText style={{color:'#c8d6c3'}}>Abbrechen</ThemedText></Pressable>
              <Pressable onPress={saveRoutine} style={({pressed})=>[{opacity: pressed?0.6:1}]}><ThemedText style={{color: MATCHA}}>Speichern</ThemedText></Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pretty Confirm */}
      <ConfirmModal
        visible={confirmOpen}
        title="Termin löschen?"
        message="Das kann nicht rückgängig gemacht werden."
        confirmText="Löschen"
        cancelText="Abbrechen"
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        onConfirm={commitDelete}
      />
    </ThemedView>
  );
}

/* =============================================================================
   Styles
============================================================================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 12 },
  header: { paddingHorizontal: 4, gap: 4, marginBottom: 8 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  /* Layout Grid */
  gridRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  leftCol: { width: 320, gap: 12 },                // Sidebar fix (etwas breiter für routines)
  rightCol: { flex: 1, gap: 12 },                  // Content
  topRightRow: { flexDirection: 'row', gap: 12 },  // Kalender + Bild

  /* Kalender + Bild oben rechts */
  calCard: { flex: 1 },
  sideImageCard: { width: 320, overflow: 'hidden' },
  sideImage: { width: '100%', height: 220 },

  /* Wochenplaner */
  weekPlannerCard: {},
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekDayCard: { width: 200, backgroundColor: '#1f2421', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },

  /* Untere Bilder-Zeile */
  bottomRow: { flexDirection: 'row', gap: 12 },
  bottomImageCard: { flex: 1, overflow: 'hidden' },
  bottomImage: { width: '100%', height: 180 },

  /* Event-Items Basics */
  weekEventPill: { padding: 8, backgroundColor: '#262b27', borderRadius: 10, borderLeftWidth: 3 },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: CARD, borderRadius: 16, padding: 16 },

  /* Inputs & Controls */
  input: { backgroundColor: '#1f2421', color: '#e9efe6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#1f2421', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: MATCHA },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  symbolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbolItem: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1f2421', alignItems: 'center', justifyContent: 'center' },
  symbolItemActive: { borderWidth: 2, borderColor: MATCHA },

  timeButton: { backgroundColor: '#1f2421', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
});
