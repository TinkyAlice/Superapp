import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type Coord = { latitude: number; longitude: number };

type Props = {
  coordinate?: Coord;
  query?: string;                     // Adresse vom Parent
  onQueryChange?: (q: string) => void;// Parent updaten, wenn der User tippt
  onResolved?: (c: Coord, display?: string) => void; // nach Geocoding
  title?: string;
  height?: number;
};

export default function MapPicker({
  coordinate,
  query,
  onQueryChange,
  onResolved,
  title,
  height = 280,
}: Props) {
  const [addr, setAddr] = useState(query ?? '');
  const [coord, setCoord] = useState<Coord | undefined>(coordinate);

  useEffect(() => { if (query !== undefined) setAddr(query); }, [query]);
  useEffect(() => { setCoord(coordinate); }, [coordinate]);

  async function geocode() {
    if (!addr.trim()) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`;
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const c: Coord = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        setCoord(c);
        onResolved?.(c, data[0].display_name);
      }
    } catch {
      // still & cozy
    }
  }

  const iframeSrc = useMemo(() => {
    if (addr.trim()) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
    if (coord) return `https://www.google.com/maps?q=${coord.latitude},${coord.longitude}&output=embed`;
return `https://www.google.com/maps?q=${encodeURIComponent('Bremen, Germany')}&output=embed`;
  }, [addr, coord]);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Adresse eingeben (z. B. Vegesacker Str. 87, Bremen)"
          placeholderTextColor="#9aa39a"
          value={addr}
          onChangeText={(v) => { setAddr(v); onQueryChange?.(v); }}
          onSubmitEditing={geocode}
          style={{ flex: 1, backgroundColor: '#1f2421', color: '#e9efe6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
        />
        <Pressable onPress={geocode} style={({ pressed }) => [{ paddingHorizontal: 14, borderRadius: 12, backgroundColor: pressed ? '#6f9f68' : '#89b27f', alignItems: 'center', justifyContent: 'center' }]}>
          <ThemedText style={{ color: '#0d0d0d' }}>Suchen</ThemedText>
        </Pressable>
      </View>

      <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1f2421' }}>
        <iframe
          title={title || 'Map'}
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: '0' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </View>

      <ThemedText style={{ color: '#9aa39a', fontSize: 12 }}>
        Hinweis: Web nutzt ein Google Maps Embed. Zum Bestätigen der Adresse bitte „Suchen“ drücken.
      </ThemedText>
    </View>
  );
}
