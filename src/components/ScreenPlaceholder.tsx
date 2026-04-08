import { Text, View } from 'react-native';

interface ScreenPlaceholderProps {
  title: string;
}

export const ScreenPlaceholder = ({ title }: ScreenPlaceholderProps): JSX.Element => {
  return (
    <View className="flex-1 items-center justify-center bg-main px-6">
      <Text className="text-center text-2xl font-semibold text-ink">{title}</Text>
    </View>
  );
};
