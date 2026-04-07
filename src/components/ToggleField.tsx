import { Switch, Text, View } from 'react-native';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const ToggleField = ({
  label,
  value,
  onValueChange,
}: ToggleFieldProps): JSX.Element => {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <Text className="mr-4 flex-1 text-base text-ink">{label}</Text>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
};
