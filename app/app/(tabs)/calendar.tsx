// Calendar.tsx — Responsive, auto-adapting layout
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
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
  useWindowDimensions,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateObject } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MapPicker from '@/components/MapPicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

/* =============================================================================
   AsyncStorage: robust Fallback (verhindert Crash wenn Paket fehlt)
============================================================================= */
let AsyncStorage: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem: Record<string, string> = {};
  AsyncStorage = {
    async getItem(k: string) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage.getItem(k);
      return mem[k] ?? null;
    },
    async setItem(k: string, v: string) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.localStorage.setItem(k, v);
      else mem[k] = v;
    },
    async removeItem(k: string) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.localStorage.removeItem(k);
      else delete mem[k];
    },
  };
  console.warn('[Calendar] AsyncStorage native nicht gefunden – Fallback aktiv. Installiere @react-native-async-storage/async-storage für echte Persistenz.');
}

/* =============================================================================
   Farben & Basics
============================================================================= */
const MATCHA = '#89b27f';
const BG = '#0d0d0d';
const CARD = '#1b1f1c';

/* =============================================================================
   Types
============================================================================= */
export type EventType = 'Termin' | 'Event' | 'Routine';
export type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

type LatLng = { latitude: number; longitude: number };

type Event = {
  id: string;
  title: string;
  date: string;   // 'YYYY-MM-DD'
  start: string;  // 'HH:mm'
  end: string;    // 'HH:mm'
  type: EventType;
  locationName?: string;
  location?: LatLng;
  note?: string;
  color?: string;
  symbol?: string; // emoji
  seriesId?: string; // für Routinen-Serien
};

type Conflict = { a: Event; b: Event };

/* =============================================================================
   Helpers
============================================================================= */
const LEAF_COLORS = ['#7aa874', '#9ec49e', '#c4e3c0', '#89b27f'];
const SYMBOLS = ['🍵', '📚', '🏃‍♂️', '💻', '🎨', '🧠', '📅', '🛒', '☕️', '🗒️'];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(days: number, baseISO?: string) {
  const d = baseISO ? new Date(baseISO + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatHuman(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
}
function yymm(iso: string) { return iso.slice(0, 7); }
function isSameMonth(aISO: string, bISO: string) { return yymm(aISO) === yymm(bISO); }
function humanDayShort(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
}
function dateFromISOAndTime(iso: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(iso + 'T00:00:00');
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function hhmmFromDate(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function hhmmToMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minToHHMM(min: number) {
  const m = ((min % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function minutesDiff(a: string, b: string) { return Math.max(0, hhmmToMin(b) - hhmmToMin(a)); }
function clamp(v:number,a:number,b:number){ return Math.max(a, Math.min(b, v)); }
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
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' }),
    };
  });
}
function weekdayFromISO(iso:string){
  const d = new Date(iso+'T00:00:00');
  const js = d.getDay(); // So=0..Sa=6
  return js===0 ? 7 : js;
}
function addDaysISOFrom(iso:string, n:number){
  const d = new Date(iso+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function addMinutesHHMM(hhmm:string, mins:number) {
  const t = hhmmToMin(hhmm) + mins;
  return minToHHMM((t+24*60)%(24*60));
}
function parseHHMM(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/* =============================
   Breakpoints & responsive hook
============================== */
function useBreakpoints() {
  const { width } = useWindowDimensions();
  const bp = width < 480 ? 'xs' : width < 768 ? 'sm' : width < 1024 ? 'md' : width < 1440 ? 'lg' : 'xl';
  const scale = width < 360 ? 0.95 : width < 480 ? 0.98 : width < 768 ? 1.0 : 1.0;
  return {
    width,
    bp,
    isXS: bp==='xs', isSM: bp==='sm', isMD: bp==='md', isLG: bp==='lg', isXL: bp==='xl',
    fontScale: scale,
  } as const;
}

/* Monatsliste */
function buildMonthSections(allEvents: Event[], monthRefISO: string) {
  const monthEvents = allEvents
    .filter(e => isSameMonth(e.date, monthRefISO))
    .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)));

  const byDate: Record<string, Event[]> = {};
  for (const ev of monthEvents) (byDate[ev.date] ??= []).push(ev);

  return Object.keys(byDate).sort().map(dayISO => ({ title: dayISO, data: byDate[dayISO] }));
}

/* =============================================================================
   TimeField – Uhrzeit-Auswahl
============================================================================= */
function TimeField({ label, date, setDate }:{ label: string; date: Date; setDate: (d: Date) => void; }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    // @ts-ignore – raw HTML auf Web ist ok
    return (
      <View style={{ flex: 1 }}>
        <ThemedText style={{ color: '#c8d6c3', marginBottom: 4 }}>{label}</ThemedText>
        <input
          type="time"
          value={hhmmFromDate(date)}
          onChange={(e: any) => setDate(parseHHMM(date, e.target.value))}
          style={{ width: '100%', background: '#1f2421', color: '#e9efe6', borderRadius: 12, padding: 10, border: 'none', outline: 'none' }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemedText style={{ color: '#c8d6c3', marginBottom: 4 }}>{label}: {hhmmFromDate(date)}</ThemedText>
      <Pressable onPress={() => setShow(true)} style={styles.timeButton} accessibilityRole="button" accessibilityLabel={`${label} auswählen`}>
        <ThemedText style={{ color: '#e9efe6' }}>Uhrzeit wählen</ThemedText>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e: DateTimePickerEvent, d?: Date) => { setShow(Platform.OS === 'ios'); if (d) setDate(d); }}
        />
      )}
    </View>
  );
}

/* =============================================================================
   Routine-Materialisierung
============================================================================= */
function materializeWeeklyRoutine(
  base: Omit<Event,'id'|'date'> & { date:string },
  weekdays:number[], startFromISO:string,
  untilISO?:string, excludeISO:Set<string> = new Set(), countLimit = 120, seriesId?: string,
): Event[] {
  const out:Event[]=[]; let cursor = startFromISO;
  for (let i=0; i<countLimit; i++){
    const wd = weekdayFromISO(cursor);
    if (weekdays.includes(wd) && !excludeISO.has(cursor)) {
      out.push({ ...base, id: `${seriesId||'series'}-${cursor}-${i}-${Math.random().toString(36).slice(2,6)}`, date: cursor, seriesId });
    }
    if (untilISO && cursor>untilISO) break;
    cursor = addDaysISOFrom(cursor, 1);
  }
  return out;
}

/* =============================================================================
   Overnight-Splitting + Kollisionen
============================================================================= */
function splitIfOvernight(ev: Event): Event[] {
  const s = hhmmToMin(ev.start), e = hhmmToMin(ev.end);
  if (e >= s) return [ev];
  const first: Event = { ...ev, end: '24:00' };
  const second: Event = { ...ev, id: ev.id + ':spill', date: addDaysISOFrom(ev.date, 1), start: '00:00', end: ev.end };
  return [first, second];
}
function dayConflicts(dayEvents: Event[]): Conflict[] {
  const list = [...dayEvents].sort((a,b)=>a.start.localeCompare(b.start));
  const out: Conflict[] = [];
  for (let i=0;i<list.length;i++){
    const a = list[i]; const aS = hhmmToMin(a.start), aE = hhmmToMin(a.end);
    for (let j=i+1;j<list.length;j++){
      const b = list[j]; const bS = hhmmToMin(b.start), bE = hhmmToMin(b.end);
      if (bS >= aE) break; // da sortiert
      if (Math.max(aS, bS) < Math.min(aE, bE)) out.push({ a, b });
    }
  }
  return out;
}
function layoutColumns(items: Event[]) {
  type LItem = Event & { _s:number; _e:number; col:number; cols:number; };
  const evs = items.map(ev => ({...ev, _s: hhmmToMin(ev.start), _e: hhmmToMin(ev.end)}))
                   .sort((a,b)=> a._s - b._s || a._e - b._e);
  const result: LItem[] = [];
  let cluster: LItem[] = []; let clusterEnd = -1;
  const flushCluster = () => {
    if (cluster.length===0) return;
    const lanes: number[] = [];
    for (const ev of cluster) {
      let lane = lanes.findIndex(end => end <= ev._s);
      if (lane === -1) { lane = lanes.length; lanes.push(ev._e); } else { lanes[lane] = ev._e; }
      result.push({ ...ev, col: lane, cols: 0 });
    }
    const cols = lanes.length; for (const r of result.slice(-cluster.length)) r.cols = cols;
    cluster = []; clusterEnd = -1;
  };
  for (const ev of evs) {
    if (cluster.length===0) { cluster.push(ev); clusterEnd = ev._e; }
    else if (ev._s < clusterEnd) { cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev._e); }
    else { flushCluster(); cluster.push(ev); clusterEnd = ev._e; }
  }
  flushCluster();
  return result;
}

/* =============================================================================
   Seed
============================================================================= */
const seedEvents: Event[] = [
  { id: '1', title: 'Deep Work', date: todayISO(), start: '09:00', end: '11:00', type: 'Termin', color: '#7aa874', symbol: '💻' },
  { id: '2', title: 'Matcha mit Mia', date: todayISO(), start: '13:00', end: '14:00', type: 'Event', color: '#9ec49e', symbol: '🍵', locationName: 'Matcha Café' },
  { id: '3', title: 'Lofi & Sketch', date: todayISO(), start: '16:00', end: '17:00', type: 'Event', color: '#c4e3c0', symbol: '🎨' },
  { id: '4', title: 'Night Shift', date: todayISO(), start: '22:30', end: '01:00', type: 'Termin', color: '#7aa874', symbol: '🌙' },
];

/* =============================================================================
   Timeline Day (00:00–24:00) — responsive
============================================================================= */
function TimelineDay({
  items, dateISO, doneSet, onToggleDone, onPressItem, onAdd, autoScrollRef,
}:{ items: Event[]; dateISO: string; doneSet: Set<string>; onToggleDone: (key:string)=>void; onPressItem?: (ev:Event)=>void; onAdd?: ()=>void; autoScrollRef?: React.RefObject<ScrollView>; }) {
  const { bp } = useBreakpoints();
  const PPM = bp==='xs' ? 1.0 : bp==='sm' ? 1.1 : 1.25; // etwas kompakter auf sehr kleinen Screens
  const startMin = 0; const endMin = 24 * 60; const trackH = (endMin - startMin) * PPM;
  const hours:number[]=[]; for(let t=startMin; t<=endMin; t+=60) hours.push(t);

  const isToday = dateISO === todayISO();
  const calcNowMin = () => { const n = new Date(); return n.getHours()*60 + n.getMinutes() + n.getSeconds()/60; };
  const nowAnim = useRef(new Animated.Value(0)).current;
  const [nowMinSnap, setNowMinSnap] = useState<number>(calcNowMin());

  const [trackWidth, setTrackWidth] = useState<number>(0);
  const leftRail = 34; const gutter = 8;

  useEffect(()=>{
    if (!isToday){ nowAnim.setValue(0); return; }
    const nowMin = clamp(calcNowMin(), startMin, endMin);
    nowAnim.setValue((nowMin - startMin) * PPM); setNowMinSnap(nowMin);
  },[isToday, PPM]);

  useEffect(()=>{
    if (!isToday) return;
    const id = setInterval(()=>{
      const nowMin = clamp(calcNowMin(), startMin, endMin);
      setNowMinSnap(nowMin);
      Animated.timing(nowAnim, { toValue: (nowMin - startMin) * PPM, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    }, 1200);
    return ()=>clearInterval(id);
  },[isToday, PPM]);

  const containerTop = useRef(0);
  useEffect(()=>{
    if (!isToday || !autoScrollRef?.current) return;
    const y = containerTop.current + (nowMinSnap - 60) * PPM - 180; if (y>0) autoScrollRef.current.scrollTo({ y, animated: true });
  },[isToday, nowMinSnap, autoScrollRef, PPM]);

  // Freizeitflächen
  const sorted = [...items].sort((a,b)=>a.start.localeCompare(b.start));
  const gaps:{top:number;height:number;label:string}[] = []; let cursor = startMin;
  for (const it of sorted) { const s = hhmmToMin(it.start), e = hhmmToMin(it.end);
    if (s>cursor) gaps.push({ top:(cursor-startMin)*PPM, height:(s-cursor)*PPM, label:`Freizeit ${minToHHMM(cursor)}–${minToHHMM(s)}` });
    cursor = Math.max(cursor, e);
  }
  if (cursor<endMin) gaps.push({ top:(cursor-startMin)*PPM, height:(endMin-cursor)*PPM, label:`Freizeit ${minToHHMM(cursor)}–24:00` });

  const between = (min:number,val:number,max:number)=> val>=min && val<max; const nowAbs = isToday ? nowMinSnap : undefined;
  const laid = useMemo(()=>layoutColumns(items), [items]);

  return (
    <View style={{ flexDirection:'row', gap:10 }} onLayout={(e)=>{ containerTop.current = e.nativeEvent.layout.y; }}>
      {/* Zeiten-Spalte */}
      <View style={{ width: bp==='xs' ? 64 : 88, paddingTop:2 }} pointerEvents="none">
        {hours.map(t=> (
          <ThemedText key={t} style={{ color:'#9aa39a', fontSize: bp==='xs'?10:12, position:'absolute', right:8, top:(t-startMin)*PPM - 7 }}>
            {minToHHMM(t)}
          </ThemedText>
        ))}
        <View style={{ height: trackH }} />
      </View>

      {/* Track */}
      <View style={{ flex:1, position:'relative' }} onLayout={(e)=>setTrackWidth(e.nativeEvent.layout.width)}>
        <View pointerEvents="none" style={{ position:'absolute', left:10, top:0, bottom:0, width:3, backgroundColor:'#2b312d', borderRadius:2 }} />
        {hours.map(t=> (<View key={t} pointerEvents="none" style={{ position:'absolute', left:0, right:0, height:1, backgroundColor:'#27302b', top:(t-startMin)*PPM }} />))}

        {/* Freizeitflächen */}
        {gaps.map((g,idx)=>(
          <View key={idx} pointerEvents="none" style={{ position:'absolute', left:0, right:0, top:g.top, height:g.height, backgroundColor:'#141815' }}>
            <ThemedText style={{ color:'#56605a', fontSize:11, position:'absolute', left:12, top:6 }}>{g.label}</ThemedText>
          </View>
        ))}

        {/* River */}
        {isToday && (<>
          <Animated.View pointerEvents="none" style={{ position:'absolute', left:10, width:3, top:0, height: nowAnim, backgroundColor: MATCHA, borderRadius:2, opacity:0.85 }} />
          <Animated.View pointerEvents="none" style={{ position:'absolute', left:5, top: Animated.add(nowAnim, new Animated.Value(-6)), width:14, height:14, borderRadius:7, backgroundColor:'#f7d9e3' }} />
        </>)}

        {/* ITEMS mit Spalten-Layout */}
        {laid.map(ev=>{
          const top = (hhmmToMin(ev.start)-startMin)*PPM;
          const height = Math.max(40, Math.max(1, minutesDiff(ev.start, ev.end))*PPM);
          const s = hhmmToMin(ev.start), e = hhmmToMin(ev.end);
          const status: 'past'|'current'|'future' = !isToday ? 'future' : (nowAbs! >= e) ? 'past' : between(s, nowAbs!, e) ? 'current' : 'future';
          const key = `${ev.type}:${ev.id}`; const done = doneSet.has(key);
          const cardBg = status==='current' ? '#283229' : status==='past' ? '#202522' : '#212622';
          const iconBg = status==='current' ? (ev.color||MATCHA) : status==='past' ? '#3a3f3b' : (ev.color||'#5a5a5a');
          const progress = (status==='current' && isToday) ? clamp(((nowAbs! - s) / Math.max(1, (e - s))), 0, 1) : 0;

          const usable = Math.max(0, trackWidth - (leftRail + 8));
          const gutter = 8; const colWidth = ev.cols>0 ? (usable - gutter*(ev.cols-1)) / ev.cols : usable;
          const left = leftRail + 8 + ev.col * (colWidth + gutter);

          return (
            <View key={ev.id} style={{ position:'absolute', left, width: colWidth, top, height }}>
              <View style={{ flexDirection:'row', height:'100%' }}>
                <View style={{ position:'absolute', left:-leftRail, width:34, height:34, borderRadius:17, backgroundColor: iconBg, borderWidth:3, borderColor:'#2b312d', alignItems:'center', justifyContent:'center', marginTop:-6 }}>
                  <ThemedText style={{ color:'#0d0d0d' }}>{ev.symbol || '•'}</ThemedText>
                </View>

                <Pressable onPress={()=>onPressItem?.(ev)} style={{ flex:1 }}>
                  <View style={{ height:'100%', borderRadius:12, backgroundColor: cardBg, borderLeftWidth:4, borderLeftColor: ev.color||MATCHA, padding:10, justifyContent:'space-between', opacity: done ? 0.55 : (status==='past'?0.85:1) }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', gap:8, alignItems:'flex-start' }}>
                      <View style={{ flexShrink:1 }}>
                        <ThemedText type="defaultSemiBold" numberOfLines={2} style={[ { color:'#fff' }, done && { textDecorationLine:'line-through' }, status==='current' && { textShadowColor: ev.color||MATCHA, textShadowRadius:8, textShadowOffset:{width:0, height:1} }, ] as any}>
                          {ev.title}
                        </ThemedText>
                        {ev.type==='Routine' && ev.seriesId && (
                          <ThemedText style={{ color:'#c8d6c3', fontSize:11, opacity:0.9, marginTop:2 }}>Wöchentlich</ThemedText>
                        )}
                      </View>
                      <ThemedText style={{ color:'#c8d6c3', fontSize:11, minWidth:64, textAlign:'right' }}>{ev.start}–{ev.end}</ThemedText>
                    </View>
                    {!!ev.locationName && (<ThemedText numberOfLines={1} style={{ color:'#c8d6c3', fontSize:12 }}>{ev.locationName}</ThemedText>)}
                    {status==='current' && (
                      <View style={{ marginTop:6, height:6, backgroundColor:'#1b221e', borderRadius:3, overflow:'hidden' }}>
                        <Animated.View style={{ height:'100%', width:`${Math.round(progress*100)}%`, backgroundColor: ev.color||MATCHA }} />
                      </View>
                    )}
                  </View>
                </Pressable>

                <Pressable onPress={()=>onToggleDone(key)} style={{ alignSelf:'center', marginLeft:8 }} accessibilityRole="button" accessibilityLabel={`${done ? 'Erledigt' : 'Offen'} umschalten`}>
                  <View style={{ width:26, height:26, borderRadius:13, borderWidth:2, borderColor: done? MATCHA : '#59615d', alignItems:'center', justifyContent:'center', backgroundColor: done? 'rgba(137,178,127,.15)' : 'transparent' }}>
                    <ThemedText style={{ color: done? MATCHA : '#c8d6c3', fontSize:12 }}>{done ? '✓' : ''}</ThemedText>
                  </View>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable onPress={onAdd} style={{ marginTop: trackH + 10, paddingLeft:6 }}>
          <ThemedText style={{ color: MATCHA }}>+ hinzufügen</ThemedText>
        </Pressable>
        <View style={{ height: 8 }} />
      </View>
    </View>
  );
}

/* =============================================================================
   Screen
============================================================================= */
export default function CalendarScreen() {
  const [date, setDate] = useState(todayISO());
  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

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
  const [location, setLocation] = useState<LatLng | undefined>(undefined);

  // Routine
  const [routineDuration, setRoutineDuration] = useState<number>(30);
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurWeekdays, setRecurWeekdays] = useState<number[]>([]);
  const [recurUntil, setRecurUntil] = useState<string>('');
  const [recurExceptions, setRecurExceptions] = useState<string>('');

  const [leftMode, setLeftMode] = useState<'DAY' | 'MONTH'>('DAY');
  const pageScrollRef = useRef<ScrollView>(null);

  // Responsive decisions
  const { width, bp } = useBreakpoints();
  const layout = useMemo(() => {
    const twoColumn = bp!=='xs' && bp!=='sm';
    const leftWidth = twoColumn ? Math.min(680, Math.max(480, Math.floor(width * (bp==='md' ? 0.58 : bp==='lg' ? 0.52 : 0.48)))) : '100%';
    const showSideImages = bp==='lg' || bp==='xl';
    const weekCardWidth = bp==='xs' ? 140 : bp==='sm' ? 160 : bp==='md' ? 180 : 200;
    return { twoColumn, leftWidth, showSideImages, weekCardWidth } as const;
  }, [bp, width]);

  // Persistenz
  useEffect(() => { (async () => { const raw = await AsyncStorage.getItem('events.v1'); if (raw) setEvents(JSON.parse(raw)); })(); }, []);
  useEffect(() => { AsyncStorage.setItem('events.v1', JSON.stringify(events)); }, [events]);

  const dayEvents = useMemo(
    () => events.flatMap(splitIfOvernight).filter(e => e.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [events, date]
  );
  const dayConflictsList = useMemo(() => dayConflicts(dayEvents), [dayEvents]);

  const marked = useMemo(() => {
    const map: Record<string, any> = {};
    for (const e of events) { if (!map[e.date]) map[e.date] = { dots: [], marked: true }; map[e.date].dots.push({ color: e.color || MATCHA }); }
    map[date] = { ...(map[date] ?? { dots: [], marked: true }), selected: true, selectedColor: MATCHA };
    return map;
  }, [events, date]);

  function openNewEditor(forDate: string, preType: EventType = 'Termin') {
    setDate(forDate); setEditingId(null); setDraftTitle(''); setDraftType(preType); setDraftColor(LEAF_COLORS[0]); setDraftSymbol(SYMBOLS[0]);
    setDraftDate(forDate); setStartDate(dateFromISOAndTime(forDate, '09:00')); setEndDate(dateFromISOAndTime(forDate, '10:00'));
    setRoutineDuration(30); setRecurEnabled(false); setRecurWeekdays([]); setRecurUntil(''); setRecurExceptions(''); setNote(''); setLocationName(''); setLocation(undefined);
    setEditorOpen(true);
  }
  function openEditEditor(ev: Event) {
    setEditingId(ev.id); setDraftTitle(ev.title); setDraftType(ev.type); setDraftColor(ev.color || LEAF_COLORS[0]); setDraftSymbol(ev.symbol || SYMBOLS[0]);
    setDraftDate(ev.date); setStartDate(dateFromISOAndTime(ev.date, ev.start)); setEndDate(dateFromISOAndTime(ev.date, ev.end));
    setNote(ev.note || ''); setLocationName(ev.locationName || ''); setLocation(ev.location); setRoutineDuration(minutesDiff(ev.start, ev.end) || 30); setRecurEnabled(!!ev.seriesId);
    setEditorOpen(true);
  }
  const onPressItem = useCallback((ev: Event) => setSelectedEvent(ev), []);
  const onAdd = useCallback(() => openNewEditor(date), [date]);
  function onToggleDone(key:string){ setDoneSet(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }

  function confirmConflicts(candidate: Event[], original: Event[]): Promise<boolean> {
    const expanded = candidate.flatMap(splitIfOvernight);
    const byDate: Record<string, Event[]> = {}; for (const ev of expanded) (byDate[ev.date] ??= []).push(ev);
    const conflicts: Conflict[] = []; for (const d of Object.keys(byDate)) conflicts.push(...dayConflicts(byDate[d]));
    const originalIds = new Set(original.map(e=>e.id)); const newConflicts = conflicts.filter(({a,b}) => !originalIds.has(a.id) || !originalIds.has(b.id));
    if (newConflicts.length === 0) return Promise.resolve(true);
    const sample = newConflicts.slice(0, 4).map(c => `• ${c.a.title} (${c.a.date} ${c.a.start}–${c.a.end}) ↔ ${c.b.title} (${c.b.date} ${c.b.start}–${c.b.end})`).join('\n');
    return new Promise(resolve => {
      Alert.alert('Kollisionen erkannt', `${newConflicts.length} Überschneidung(en):\n\n${sample}${newConflicts.length>4 ? '\n…' : ''}\n\nTrotzdem speichern?`, [
        { text: 'Abbrechen', style: 'cancel', onPress: ()=>resolve(false) },
        { text: 'Trotzdem speichern', style: 'destructive', onPress: ()=>resolve(true) },
      ]);
    });
  }

  async function save() {
    const t = draftTitle.trim(); if (!t) { Alert.alert('Titel fehlt', 'Bitte gib einen Titel ein.'); return; }
    if (Platform.OS === 'web' && locationName.trim() && !location) { Alert.alert('Adresse bestätigen', 'Bitte „Suchen“ im Karten-Widget drücken, um die Adresse zu bestätigen.'); return; }
    const startHHMM = hhmmFromDate(startDate);
    const computedEnd = draftType==='Routine' ? addMinutesHHMM(startHHMM, Math.max(1, routineDuration)) : hhmmFromDate(endDate);
    const seedSeriesId = (editingId && events.find(e=>e.id===editingId)?.seriesId) || (draftType==='Routine' ? `series_${Date.now().toString(36)}` : undefined);

    const baseEvent: Event = {
      id: editingId ?? String(Date.now()), title: t, date: draftDate, start: startHHMM, end: computedEnd, type: draftType,
      locationName: locationName.trim() || undefined, location, note: note.trim() || undefined, color: draftColor, symbol: draftSymbol, seriesId: draftType==='Routine' ? seedSeriesId : undefined,
    };

    const prev = events; let nextList: Event[];
    if (editingId) {
      let base = prev.map(e => e.id === editingId ? baseEvent : e);
      if (draftType==='Routine' && recurEnabled) {
        const exc = new Set((recurExceptions||'').split(',').map(s=>s.trim()).filter(Boolean)); const until = recurUntil.trim() || undefined;
        const weekdays = recurWeekdays.length?recurWeekdays:[weekdayFromISO(draftDate)];
        const clones = materializeWeeklyRoutine({ ...baseEvent }, weekdays, draftDate, until, exc, 120, seedSeriesId);
        base = base.filter(e => e.seriesId !== seedSeriesId); nextList = [...base, ...clones];
      } else { nextList = base; }
    } else {
      if (draftType==='Routine' && recurEnabled) {
        const exc = new Set((recurExceptions||'').split(',').map(s=>s.trim()).filter(Boolean)); const until = recurUntil.trim() || undefined;
        const weekdays = recurWeekdays.length?recurWeekdays:[weekdayFromISO(draftDate)];
        const clones = materializeWeeklyRoutine({ ...baseEvent }, weekdays, draftDate, until, exc, 120, seedSeriesId);
        nextList = [...prev, ...clones];
      } else { nextList = [...prev, baseEvent]; }
    }
    const ok = await confirmConflicts(nextList, prev); if (!ok) return;

    setEvents(nextList); setEditorOpen(false); setSelectedEvent(null);
  }

  const weekStart = useMemo(() => startOfWeekISO(date), [date]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: '#fff' }}>Kalender</ThemedText>
        <ThemedText style={{ color: MATCHA }}>🍵 Keep it cozy</ThemedText>
      </View>

      <ScrollView ref={pageScrollRef} contentContainerStyle={{ gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.gridRow, !layout.twoColumn && { flexDirection:'column' }]}>
          {/* LEFT */}
          <View style={[styles.leftCol, { width: layout.twoColumn ? layout.leftWidth : '100%' }]}>
            <ThemedView style={styles.card}>
              <View style={styles.segment}>
                {(['DAY','MONTH'] as const).map(mode => (
                  <Pressable key={mode} onPress={() => setLeftMode(mode)} style={[styles.segmentBtn, leftMode===mode && styles.segmentBtnActive]} accessibilityRole="button">
                    <ThemedText style={{ color: leftMode===mode ? '#0d0d0d' : '#c8d6c3' }}>
                      {mode==='DAY' ? 'Tagesplaner' : 'Monatsevents'}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ThemedView>

            {dayConflictsList.length>0 && (
              <ThemedView style={[styles.card, { borderLeftWidth:4, borderLeftColor:'#f38b82', backgroundColor:'#2a201f' }]}>
                <ThemedText type="defaultSemiBold" style={{ color:'#ffd2cd', marginBottom:6 }}>⚠️ {dayConflictsList.length} Überschneidung(en) heute</ThemedText>
                {dayConflictsList.slice(0,4).map((c,idx)=>(
                  <ThemedText key={idx} style={{ color:'#ffd2cd', fontSize:12 }}>• {c.a.start} {c.a.title} ↔ {c.b.start} {c.b.title}</ThemedText>
                ))}
                {dayConflictsList.length>4 && (<ThemedText style={{ color:'#ffd2cd', fontSize:12, opacity:0.8 }}>…</ThemedText>)}
              </ThemedView>
            )}

            <ThemedView style={[styles.card, { marginTop: 12 }]}>
              {leftMode==='DAY' ? (
                dayEvents.length === 0 ? (
                  <ThemedText style={{ color:'#9aa39a' }}>Keine Termine 🎉</ThemedText>
                ) : (
                  <FlatList
                    data={dayEvents}
                    keyExtractor={(e) => e.id}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => setSelectedEvent(item)} accessibilityRole="button">
                        <View style={[styles.eventRow, { borderLeftColor: item.color || MATCHA }]}>
                          <View style={{ width: 64 }}>
                            <ThemedText style={{ color:'#e9efe6' }}>{item.start}</ThemedText>
                            <ThemedText style={{ color:'#c8d6c3', fontSize:12 }}>{item.end}</ThemedText>
                          </View>
                          <View style={{ flex:1 }}>
                            <ThemedText type="defaultSemiBold" style={{ color:'#fff' }}>{item.symbol ? `${item.symbol} ` : ''}{item.title}</ThemedText>
                            <ThemedText style={{ color:'#c8d6c3', fontSize:12 }}>{item.type}{item.locationName ? ` • ${item.locationName}` : ''}</ThemedText>
                          </View>
                        </View>
                      </Pressable>
                    )}
                  />
                )
              ) : (
                <SectionList
                  sections={buildMonthSections(events, date)}
                  keyExtractor={(it) => it.id}
                  renderSectionHeader={({ section }) => (
                    <ThemedText type="defaultSemiBold" style={{ color:'#e9efe6', marginTop: 10 }}>{humanDayShort(section.title)}</ThemedText>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                  SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => setSelectedEvent(item)} accessibilityRole="button">
                      <View style={[styles.weekEventPill, { borderLeftColor: item.color || MATCHA }]}>
                        <ThemedText style={{ color:'#e9efe6', fontSize:12 }}>{item.start} {item.symbol ? item.symbol+' ' : ''}{item.title}</ThemedText>
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={<ThemedText style={{ color:'#9aa39a' }}>Keine Einträge</ThemedText>}
                />
              )}
            </ThemedView>

            <ThemedView style={[styles.card, { marginTop: 12 }]}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 8, flexWrap:'wrap', gap:12 }}>
                <ThemedText type="subtitle" style={{ color:'#fff' }}>{formatHuman(date)}</ThemedText>
                <View style={{ flexDirection:'row', gap:12 }}>
                  <Pressable onPress={() => setDate(todayISO())}><ThemedText style={{ color: MATCHA }}>Heute</ThemedText></Pressable>
                  <Pressable onPress={() => openNewEditor(date)}><ThemedText style={{ color: MATCHA }}>+ Termin</ThemedText></Pressable>
                  <Pressable onPress={() => openNewEditor(date,'Routine')}><ThemedText style={{ color: MATCHA }}>+ Routine</ThemedText></Pressable>
                </View>
              </View>
              <TimelineDay items={dayEvents} dateISO={date} doneSet={doneSet} onToggleDone={onToggleDone} onPressItem={onPressItem} onAdd={onAdd} />
            </ThemedView>
          </View>

          {/* RIGHT */}
          <View style={[styles.rightCol, !layout.twoColumn && { width:'100%' }]}>
            <View style={[styles.topRightRow, !layout.twoColumn && { flexDirection:'column' }]}>
              <ThemedView style={[styles.card, styles.calCard]}>
                <Calendar
                  current={date}
                  onDayPress={(d: DateObject) => setDate(d.dateString)}
                  markedDates={marked}
                  markingType="multi-dot"
                  theme={{ backgroundColor: CARD, calendarBackground: CARD, textSectionTitleColor: '#c8d6c3', dayTextColor: '#e9efe6', monthTextColor: '#e9efe6', todayTextColor: '#f7d9e3', selectedDayBackgroundColor: MATCHA, selectedDayTextColor: '#0d0d0d', arrowColor: MATCHA }}
                  firstDay={1}
                  hideExtraDays
                  style={{ borderRadius: 12 }}
                />
              </ThemedView>

              {layout.showSideImages && (
                <ThemedView style={[styles.card, styles.sideImageCard]}>
                  <Image source={require('@/assets/images/test1.png')} style={styles.sideImage} resizeMode="cover" />
                </ThemedView>
              )}
            </View>

            <ThemedView style={[styles.card, styles.weekPlannerCard]}>
              <View style={styles.weekHeader}>
                <ThemedText type="subtitle" style={{ color:'#fff' }}>Wochenplaner</ThemedText>
                <View style={{ flexDirection:'row', gap:12 }}>
                  <Pressable onPress={() => setDate(addDaysISO(-7, date))}><ThemedText style={{ color: MATCHA }}>←</ThemedText></Pressable>
                  <Pressable onPress={() => setDate(addDaysISO(7, date))}><ThemedText style={{ color: MATCHA }}>→</ThemedText></Pressable>
                  <Pressable onPress={() => setDate(todayISO())}><ThemedText style={{ color: MATCHA }}>Heute</ThemedText></Pressable>
                </View>
              </View>

              <FlatList
                data={range7(weekStart)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(d) => d.iso}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => {
                  const list = events.filter(e => e.date === item.iso).sort((a,b)=>a.start.localeCompare(b.start));
                  const isSelected = item.iso === date;
                  return (
                    <Pressable onPress={() => setDate(item.iso)} accessibilityRole="button">
                      <View style={[styles.weekDayCard, { width: layout.weekCardWidth }, isSelected && { borderColor: MATCHA }]}>
                        <ThemedText style={{ color:'#e9efe6', marginBottom:6 }}>{item.label}</ThemedText>
                        {list.length === 0 ? (
                          <ThemedText style={{ color:'#9aa39a', fontSize:12 }}>—</ThemedText>
                        ) : list.map(ev => (
                          <View key={ev.id} style={[styles.weekEventPill, { borderLeftColor: ev.color || MATCHA }]}>
                            <ThemedText style={{ color:'#e9efe6', fontSize:12 }}>{ev.start} {ev.symbol ? ev.symbol+' ' : ''}{ev.title}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                }}
              />
            </ThemedView>

            {layout.showSideImages && (
              <View style={styles.bottomRow}>
                <ThemedView style={[styles.card, styles.bottomImageCard]}>
                {dayEvents.length === 0 ? (
                  <ThemedText style={{ color:'#9aa39a' }}>Keine Termine 🎉</ThemedText>
                ) : (
                  <FlatList
                    data={dayEvents}
                    keyExtractor={(e) => e.id}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => setSelectedEvent(item)} accessibilityRole="button">
                        <View style={[styles.eventRow, { borderLeftColor: item.color || MATCHA }]}>
                          <View style={{ width: 64 }}>
                            <ThemedText style={{ color:'#e9efe6' }}>{item.start}</ThemedText>
                            <ThemedText style={{ color:'#c8d6c3', fontSize:12 }}>{item.end}</ThemedText>
                          </View>
                          <View style={{ flex:1 }}>
                            <ThemedText type="defaultSemiBold" style={{ color:'#fff' }}>{item.symbol ? `${item.symbol} ` : ''}{item.title}</ThemedText>
                            <ThemedText style={{ color:'#c8d6c3', fontSize:12 }}>{item.type}{item.locationName ? ` • ${item.locationName}` : ''}</ThemedText>
                          </View>
                        </View>
                      </Pressable>
                    )}
                  />
                )
              }

                </ThemedView>
                <ThemedView style={[styles.card, styles.bottomImageCard]}>
                  <Image source={require('@/assets/images/test2.png')} style={styles.bottomImage} resizeMode="cover" />
                </ThemedView>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Detail-Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalBackdrop}>
          <ThemedView style={[styles.modalCard, { gap: 10 }]}>
            <ThemedText type="subtitle" style={{ color: '#fff' }}>{selectedEvent?.symbol ? `${selectedEvent.symbol} ` : ''}{selectedEvent?.title}</ThemedText>
            <ThemedText style={{ color: '#e9efe6' }}>{selectedEvent?.date} • {selectedEvent?.start}–{selectedEvent?.end}</ThemedText>
            {!!selectedEvent?.type && <ThemedText style={{ color: '#c8d6c3' }}>{selectedEvent.type}{selectedEvent?.seriesId?' • Serie':''}</ThemedText>}
            {!!selectedEvent?.locationName && <ThemedText style={{ color: '#c8d6c3' }}>Ort: {selectedEvent.locationName}</ThemedText>}
            {!!selectedEvent?.note && <ThemedText style={{ color: '#c8d6c3' }}>{selectedEvent?.note}</ThemedText>}

            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'flex-end', flexWrap:'wrap', marginTop: 12 }}>
              {selectedEvent?.type==='Routine' && selectedEvent?.seriesId && (<>
                <Pressable onPress={()=>{ const ev = selectedEvent!; setEvents(prev => prev.map(e => (e.seriesId===ev.seriesId && e.date>=ev.date) ? { ...e, title: ev.title, color: ev.color, symbol: ev.symbol } : e )); setSelectedEvent(null); }} style={({pressed})=>[{ opacity: pressed?0.7:1 }]}>
                  <ThemedText style={{ color: MATCHA }}>Serie ab hier aktualisieren</ThemedText>
                </Pressable>
                <Pressable onPress={()=>{ const sid = selectedEvent!.seriesId!; setEvents(prev => prev.filter(e => e.seriesId !== sid)); setSelectedEvent(null); }} style={({pressed})=>[{ opacity: pressed?0.7:1 }]}>
                  <ThemedText style={{ color: '#f38b82' }}>Serie löschen</ThemedText>
                </Pressable>
              </>)}
              {selectedEvent && (
                <Pressable onPress={() => { const ev = selectedEvent; setSelectedEvent(null); openEditEditor(ev); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText style={{ color: MATCHA }}>Bearbeiten</ThemedText>
                </Pressable>
              )}
              {selectedEvent && (
                <Pressable onPress={() => { setEvents(prev => prev.filter(e => e.id !== selectedEvent.id)); setSelectedEvent(null); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText style={{ color: '#f38b82' }}>Löschen</ThemedText>
                </Pressable>
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
          <ThemedView style={[styles.modalCard, { paddingBottom:0 }]}>
            <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:8, borderBottomWidth:1, borderBottomColor:'#243027' }}>
              <ThemedText type="subtitle" style={{ color:'#fff' }}>{editingId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</ThemedText>
              <ThemedText style={{ color:'#c8d6c3' }}>{formatHuman(draftDate)}</ThemedText>
            </View>

            <ScrollView contentContainerStyle={{ padding:16, gap:12, paddingBottom:20 }} style={{ maxHeight: '70vh' as any }}>
              <TextInput placeholder="Titel*" placeholderTextColor="#9aa39a" value={draftTitle} onChangeText={setDraftTitle} style={styles.input} />

              <View style={styles.segment}>
                {(['Termin', 'Event', 'Routine'] as EventType[]).map((t) => (
                  <Pressable key={t} onPress={() => setDraftType(t)} style={[styles.segmentBtn, draftType === t && styles.segmentBtnActive]} accessibilityRole="button">
                    <ThemedText style={{ color: draftType === t ? '#0d0d0d' : '#c8d6c3' }}>{t}</ThemedText>
                  </Pressable>
                ))}
              </View>

              {draftType!=='Routine' ? (
                <View style={{ flexDirection: (bp==='xs' || bp==='sm') ? 'column' : 'row', gap: 10 }}>
                  <TimeField label="Start" date={startDate} setDate={setStartDate} />
                  <TimeField label="Ende" date={endDate} setDate={setEndDate} />
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: (bp==='xs' || bp==='sm') ? 'column' : 'row', gap: 10 }}>
                    <TimeField label="Start" date={startDate} setDate={setStartDate} />
                    <View style={{ flex:1 }}>
                      <ThemedText style={{ color:'#c8d6c3', marginBottom:4 }}>Dauer (Minuten)</ThemedText>
                      <TextInput keyboardType="number-pad" placeholder="z.B. 15" placeholderTextColor="#9aa39a" value={String(routineDuration)} onChangeText={(v)=>setRoutineDuration(Math.max(1, parseInt(v||'0',10)||0))} style={styles.input} />
                    </View>
                  </View>

                  <View style={{ backgroundColor:'#1f2421', borderRadius:12, padding:12, gap:10 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                      <ThemedText style={{ color:'#e9efe6' }}>Wiederholen</ThemedText>
                      <Pressable onPress={()=>setRecurEnabled(v=>!v)} accessibilityRole="button">
                        <ThemedText style={{ color: recurEnabled? MATCHA : '#c8d6c3' }}>{recurEnabled ? 'An' : 'Aus'}</ThemedText>
                      </Pressable>
                    </View>

                    {recurEnabled && (<>
                      <ThemedText style={{ color:'#c8d6c3' }}>Wochentage</ThemedText>
                      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((lbl,idx)=>{
                          const val = idx+1; const on = recurWeekdays.includes(val);
                          return (
                            <Pressable key={lbl} onPress={()=>{ setRecurWeekdays(prev => on ? prev.filter(x=>x!==val) : [...prev, val].sort()); }} accessibilityRole="button">
                              <View style={[ { paddingVertical:6, paddingHorizontal:10, borderRadius:10, backgroundColor:'#1b221e' }, on && { backgroundColor: MATCHA } ]}>
                                <ThemedText style={{ color: on? '#0d0d0d' : '#e9efe6' }}>{lbl}</ThemedText>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>

                      <ThemedText style={{ color:'#c8d6c3', marginTop:6 }}>Ende-Datum (optional, YYYY-MM-DD)</ThemedText>
                      <TextInput placeholder="z.B. 2025-12-31" placeholderTextColor="#9aa39a" value={recurUntil} onChangeText={setRecurUntil} style={styles.input} />

                      <ThemedText style={{ color:'#c8d6c3' }}>Ausnahmen (Komma-getrennt, YYYY-MM-DD)</ThemedText>
                      <TextInput placeholder="z.B. 2025-06-03,2025-06-10" placeholderTextColor="#9aa39a" value={recurExceptions} onChangeText={setRecurExceptions} style={styles.input} />
                    </>)}
                  </View>
                </>
              )}

              <ThemedText style={{ color: '#c8d6c3' }}>Ort wählen (Adresse eingeben und „Suchen“ drücken):</ThemedText>
              <MapPicker query={locationName} onQueryChange={setLocationName} coordinate={location} onResolved={(c: any) => setLocation(c)} title={locationName || 'Ausgewählter Ort'} />
              <TextInput placeholder="Ortsname (optional)" placeholderTextColor="#9aa39a" value={locationName} onChangeText={setLocationName} style={styles.input} />

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap:'wrap' }}>
                <ThemedText style={{ color: '#c8d6c3' }}>Symbol:</ThemedText>
                <View style={styles.symbolGrid}>
                  {SYMBOLS.map((sym) => (
                    <TouchableOpacity key={sym} onPress={() => setDraftSymbol(sym)} style={[styles.symbolItem, draftSymbol === sym && styles.symbolItemActive]}>
                      <ThemedText style={{ fontSize: 18 }}>{sym}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap:'wrap' }}>
                <ThemedText style={{ color: '#c8d6c3' }}>Farbe:</ThemedText>
                {LEAF_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setDraftColor(c)} style={[styles.colorDot, { backgroundColor: c, borderColor: draftColor === c ? '#fff' : 'transparent' }]} />
                ))}
              </View>

              <TextInput placeholder="Notiz (optional)" placeholderTextColor="#9aa39a" value={note} onChangeText={setNote} style={[styles.input, { height: 80 }]} multiline />
            </ScrollView>

            <View style={{ padding:12, borderTopWidth:1, borderTopColor:'#243027', flexDirection:'row', justifyContent:'flex-end', gap:12 }}>
              <Pressable onPress={()=>setEditorOpen(false)}><ThemedText style={{ color:'#c8d6c3' }}>Abbrechen</ThemedText></Pressable>
              <Pressable onPress={save}><ThemedText style={{ color: MATCHA }}>{editingId ? 'Speichern' : 'Hinzufügen'}</ThemedText></Pressable>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

/* =============================================================================
   Styles
============================================================================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 12 },
  header: { paddingHorizontal: 4, gap: 4, marginBottom: 8 },

  card: { backgroundColor: CARD, borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  gridRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },

  leftCol: { gap: 12 },
  rightCol: { flex: 1, gap: 12 },
  topRightRow: { flexDirection: 'row', gap: 12 },
  calCard: { flex: 1 },
  sideImageCard: { width: 320, overflow: 'hidden' },
  sideImage: { width: '100%', height: 220 },

  weekPlannerCard: {},
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekDayCard: { backgroundColor: '#1f2421', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  weekEventPill: { padding:8, backgroundColor:'#262b27', borderRadius:10, borderLeftWidth:3 },

  bottomRow: { flexDirection: 'row', gap: 12 },
  bottomImageCard: { flex: 1, overflow: 'hidden' },
  bottomImage: { width: '100%', height: 180 },

  eventRow: { flexDirection:'row', alignItems:'flex-start', gap:12, padding:12, borderRadius:12, backgroundColor:'#212622', borderLeftWidth:4 },

  input: { backgroundColor: '#1f2421', color: '#e9efe6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#1f2421', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: MATCHA },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  symbolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbolItem: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1f2421', alignItems: 'center', justifyContent: 'center' },
  symbolItemActive: { borderWidth: 2, borderColor: MATCHA },
  timeButton: { backgroundColor: '#1f2421', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: CARD, borderRadius: 16, padding: 16 },
});
