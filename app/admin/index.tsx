import {
  useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { SettingsRow } from '@/components/SettingsRow';
import { getAdminStats, getRecentReports } from '@/services/admin.service';
import { formatTimeAgo } from '@/utils/date';

const AdminDashboardScreen = (): JSX.Element => {
  const router = useRouter();
  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const reportsQuery = useQuery({ queryKey: ['admin-reports'], queryFn: () => getRecentReports(5) });
  const stats = statsQuery.data;

  return (
    <ScrollView
      className="flex-1 bg-main"
      contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <Text className="text-3xl font-semibold text-ink">🛡️ Admin Paneli</Text>
      <View className="flex-row flex-wrap gap-3">
        <View className="w-[48%] rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
          <Text className="text-xs text-white/45">Bugünkü soru</Text>
          <Text className="mt-2 text-lg font-semibold text-ink">{stats?.hasTodayQuestion ? 'Var' : 'Yok'}</Text>
        </View>
        <View className="w-[48%] rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
          <Text className="text-xs text-white/45">Balık challenge</Text>
          <Text className="mt-2 text-lg font-semibold text-ink">{stats?.hasTodayFishChallenge ? 'Var' : 'Yok'}</Text>
        </View>
        <View className="w-[48%] rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
          <Text className="text-xs text-white/45">Bu haftanin challenge&apos;i</Text>
          <Text className="mt-2 text-base font-semibold text-ink">{stats?.currentWeeklyChallengeTitle ?? 'Yok'}</Text>
        </View>
        <View className="w-[48%] rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
          <Text className="text-xs text-white/45">Toplam aktif kullanıcı</Text>
          <Text className="mt-2 text-lg font-semibold text-ink">{stats?.activeUsers ?? 0}</Text>
        </View>
      </View>
      <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5">
        <SettingsRow icon="help-circle-outline" label="Günün Sorusunu Oluştur" onPress={() => router.push('/admin/daily-question')} />
        <SettingsRow icon="fish-outline" label="Balık Challenge Oluştur" onPress={() => router.push('/admin/fish-challenge')} />
        <SettingsRow icon="trophy-outline" label="Haftalık Challenge Yönet" onPress={() => router.push('/admin/weekly-challenge')} />
      </View>
      <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5">
        <Text className="text-lg font-semibold text-ink">Son raporlar</Text>
        {(reportsQuery.data ?? []).map((report) => (
          <View className="rounded-2xl bg-white/5 px-4 py-4" key={report.id}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-ink">@{report.reporter?.username ?? 'bilinmeyen'}</Text>
                <Text className="text-sm text-white/70">{report.reason}</Text>
                <Text className="text-xs text-white/45">{formatTimeAgo(report.created_at)}</Text>
              </View>
              {report.catches?.photo_url ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: report.catches.photo_url }}
                  style={{ width: 56, height: 56, borderRadius: 16 }}
                />
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              className="mt-3 self-start rounded-full bg-sea px-4 py-2"
              onPress={() => router.push(`/catch/${report.catch_id}`)}
            >
              <Text className="text-sm font-semibold text-sand">İncele</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default AdminDashboardScreen;
