import { BlurView } from '@react-native-community/blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  useRouter,
} from 'expo-router';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { SPORT_THEME } from '@/lib/sport-theme';
import { useNotificationStore } from '@/stores/useNotificationStore';

const TabBarBackground = (): JSX.Element | null => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        blurAmount={25}
        blurType="dark"
        reducedTransparencyFallbackColor="rgba(5,6,8,0.96)"
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return null;
};

const TabLayout = (): JSX.Element => {
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: SPORT_THEME.active,
        tabBarBackground: () => <TabBarBackground />,
        tabBarInactiveTintColor: SPORT_THEME.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="home-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="compass-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="chatbubbles-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Yeni Av',
          tabBarButton: () => (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/log')}
              style={styles.centerTabButton}
            >
              <View style={styles.centerTabIcon}>
                <Ionicons color="#050608" name="add" size={28} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Harita',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="map-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirim',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.notificationWrap}>
              <Ionicons color={color} name="notifications-outline" size={size} />
              {unreadCount ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/[username]"
        options={{
          href: null,
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : SPORT_THEME.bg,
    borderTopColor: SPORT_THEME.border,
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    position: Platform.OS === 'ios' ? 'absolute' : 'relative',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  centerTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  centerTabIcon: {
    alignItems: 'center',
    backgroundColor: SPORT_THEME.active,
    borderRadius: 28,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: SPORT_THEME.active,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    width: 56,
  },
  notificationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: SPORT_THEME.warning,
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    right: -10,
    top: -3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default TabLayout;
