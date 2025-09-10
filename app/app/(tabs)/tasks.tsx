import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function TasksScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Aufgaben</ThemedText>
      <ThemedText>Hier kommen später deine Tasks rein.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
