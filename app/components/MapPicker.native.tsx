import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import { ThemedText } from '@/components/ThemedText';

export type Coord = { latitude: number; longitude: number };
export type MapPickerProps = {
  region?: Region;
  coordinate?: Coord;
  onPress?: (e: MapPressEvent) => void;
  onDragEnd?: (e: MapPressEvent) => void;
  title?: string;
  height?: number;
};

export default function MapPicker({
  region,
  coordinate,
  onPress,
  onDragEnd,
  title,
  height = 280,
}: MapPickerProps) {
  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} initialRegion={region} onPress={onPress}>
        {coordinate && (
          <Marker
            draggable
            coordinate={coordinate}
            onDragEnd={onDragEnd}
            title={title || 'Ausgewählter Ort'}
          />
        )}
      </MapView>
    </View>
  );
}
