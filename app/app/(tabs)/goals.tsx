import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function GoalsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Ziele</ThemedText>
      <ThemedText>KPIs, Fortschritt, Meilensteine – später hier.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
