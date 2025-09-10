import { SafeAreaView, StyleSheet, View, ImageBackground, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      {/* Hero Header */}
      <ImageBackground
        source={require('@/assets/images/test1.png')}
        style={styles.header}
        resizeMode="cover"
      >
        <ThemedText type="title" style={styles.title}>
          University Dashboard
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          🍵 A matcha a day keeps life’s worries at bay
        </ThemedText>
      </ImageBackground>

      {/* Content */}
      <View style={styles.content}>
        {/* Cards Section */}
        <View style={styles.cardGrid}>
          <Card title="Tagesplan" image={require('@/assets/images/test2.png')}>
            <ThemedText>Deep Work, Meetings, Sketching…</ThemedText>
          </Card>
          <Card title="Budget" image={require('@/assets/images/test3.png')}>
            <ThemedText>€ 12,70 / 25,00</ThemedText>
          </Card>
          <Card title="Checklist" image={require('@/assets/images/test4.png')}>
            <ThemedText>Yoga 🌿</ThemedText>
            <ThemedText>Read 📖</ThemedText>
          </Card>
          <Card title="Vibes" image={require('@/assets/images/test5.png')}>
            <ThemedText>Lofi, Matcha, Tea time</ThemedText>
          </Card>
        </View>

        {/* Big Illustration */}
        <Image
          source={require('@/assets/images/test4.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>
    </SafeAreaView>
  );
}

function Card({ title, children, image }) {
  return (
    <ThemedView style={styles.card}>
      <Image source={image} style={styles.cardImg} />
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    justifyContent: 'flex-end',
    height: 180,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#89b27f',
    marginTop: 6,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '47%',
    backgroundColor: '#1b1f1c',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    color: '#89b27f',
  },
  cardImg: {
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroImage: {
    flex: 1,
    borderRadius: 16,
  },
});
