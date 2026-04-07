import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const ITEMS = Array.from({ length: 30 }, (_, index) => `Test satiri ${index + 1}`);

const DebugTouchScreen = (): JSX.Element => {
  const [pressCount, setPressCount] = useState<number>(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>iOS Touch Test</Text>
        <Text style={styles.subtitle}>Bu ekran nativewind ve karmaşık bileşen kullanmaz.</Text>
      </View>

      <Pressable style={styles.button} onPress={() => setPressCount((current) => current + 1)}>
        <Text style={styles.buttonText}>Buton testi: {pressCount}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
        {ITEMS.map((item) => (
          <View key={item} style={styles.card}>
            <Text style={styles.cardText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F3EA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16333B',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5D6C69',
  },
  button: {
    backgroundColor: '#2F6F7E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  cardText: {
    fontSize: 16,
    color: '#16333B',
  },
});

export default DebugTouchScreen;
