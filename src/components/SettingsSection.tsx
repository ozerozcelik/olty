import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  surface: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
};

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export const SettingsSection = ({
  title,
  children,
}: SettingsSectionProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    gap: 12,
  },
});
