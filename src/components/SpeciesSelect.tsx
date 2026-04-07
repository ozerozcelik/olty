import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import type { FishSpeciesOption } from '@/types/app.types';
import { getFishCategoryLabel } from '@/utils/fishdex';

interface SpeciesSelectProps {
  options: readonly FishSpeciesOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  error?: string;
}

const MAX_VISIBLE_OPTIONS = 12;

const normalizeSpeciesSearch = (value: string): string =>
  value
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/ı/gu, 'i')
    .replace(/[^a-z0-9]/gu, '');

export const SpeciesSelect = ({
  options,
  selectedId,
  onSelect,
  error,
}: SpeciesSelectProps): JSX.Element => {
  const [query, setQuery] = useState<string>('');
  const selectedOption = options.find((option) => option.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedOption && !query.trim()) {
      setQuery(selectedOption.name);
    }
  }, [query, selectedOption]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSpeciesSearch(query.trim());
    const baseItems = normalizedQuery
      ? options.filter((option) =>
          normalizeSpeciesSearch(option.name).includes(normalizedQuery),
        )
      : options;

    return baseItems.slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink">Tür</Text>
      <TextInput
        autoCapitalize="words"
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-ink"
        onChangeText={setQuery}
        placeholder="Tür ara: levrek, sazan, sudak..."
        placeholderTextColor="rgba(240,247,249,0.45)"
        value={query}
      />

      {selectedOption ? (
        <View className="flex-row items-center justify-between rounded-2xl border border-sea/20 bg-sea/10 px-4 py-3">
          <View>
            <Text className="text-sm font-semibold text-ink">{selectedOption.name}</Text>
            <Text className="text-xs text-white/70">
              {getFishCategoryLabel(selectedOption.category)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2"
            onPress={() => {
              setQuery('');
              onSelect(null);
            }}
          >
            <Text className="text-xs font-semibold text-sea">Temizle</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
        <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
          <View className="gap-2">
            {filteredOptions.map((option) => {
              const isSelected = option.id === selectedId;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className={`rounded-2xl px-4 py-3 ${
                    isSelected ? 'bg-sea' : 'bg-white/5'
                  }`}
                  key={option.id}
                  onPress={() => {
                    setQuery(option.name);
                    onSelect(option.id);
                  }}
                >
                  <Text className={isSelected ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-ink'}>
                    {option.name}
                  </Text>
                  <Text className={isSelected ? 'text-xs text-white/80' : 'text-xs text-white/70'}>
                    {getFishCategoryLabel(option.category)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {!filteredOptions.length ? (
              <View className="rounded-2xl bg-white/5 px-4 py-4">
                <Text className="text-sm text-white/70">
                  Aramana uyan bir tür bulunamadı. İstersen alttan özel tür girebilirsin.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        className={`rounded-2xl border border-dashed px-4 py-3 ${
          selectedId === null ? 'border-sea bg-sea/10' : 'border-white/10 bg-white/10'
        }`}
        onPress={() => onSelect(null)}
      >
        <Text className={selectedId === null ? 'font-semibold text-sea' : 'text-ink'}>
          Tür listede yok, özel tür gireceğim
        </Text>
      </TouchableOpacity>

      {error ? <Text className="text-sm text-[#A6422B]">{error}</Text> : null}
    </View>
  );
};
