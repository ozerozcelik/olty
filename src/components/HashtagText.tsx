import * as Linking from 'expo-linking';
import { useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useRouter } from 'expo-router';

import {
  getHashtagSearchQuery,
  parseInteractiveTextSegments,
} from '@/utils/hashtags';

const COLORS = {
  accent: '#D4FF00',
};

interface HashtagTextProps extends TextProps {
  text: string;
}

export const HashtagText = ({
  numberOfLines,
  style,
  text,
  ...props
}: HashtagTextProps): JSX.Element => {
  const router = useRouter();
  const segments = useMemo(() => parseInteractiveTextSegments(text), [text]);

  return (
    <Text numberOfLines={numberOfLines} style={style} {...props}>
      {segments.map((segment, index) => {
        if (segment.url) {
          const url = segment.url;

          return (
            <Text
              key={`${url}-${index}`}
              onPress={() => {
                void Linking.openURL(url);
              }}
              style={styles.link}
              suppressHighlighting
            >
              {segment.text}
            </Text>
          );
        }

        if (!segment.hashtag) {
          return segment.text;
        }

        const hashtag = segment.hashtag;

        return (
          <Text
            key={`${hashtag}-${index}`}
            onPress={() =>
              router.push({
                pathname: '/search',
                params: {
                  query: getHashtagSearchQuery(hashtag),
                  tab: 'catches',
                },
              })
            }
            style={styles.hashtag}
            suppressHighlighting
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  link: {
    fontWeight: '600',
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  hashtag: {
    fontWeight: '600',
    color: COLORS.accent,
  },
});
