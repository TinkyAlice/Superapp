import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function StyledCard() {
  return (
    <ThemedView style={styles.card}>
      <Image
        source={require('@/assets/images/test1.png')}
        style={styles.icon}
      />
      <View>
        <ThemedText type="title" style={styles.title}>
          Dein Tagesplan
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          🍵 Keep it cozy – alles im Blick
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8f5f0',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#3a2e2a',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  title: {
    color: '#3a2e2a',
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#89b27f',
    fontSize: 14,
  },
});
