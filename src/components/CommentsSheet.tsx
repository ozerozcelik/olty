import { BlurView } from '@react-native-community/blur';
import {
  useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef,
  useEffect,
  useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentItem } from '@/components/CommentItem';
import { addComment, getCatchComments } from '@/services/catches.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CommentListItem } from '@/types/app.types';

interface CommentsSheetProps {
  catchId: string | null;
  visible: boolean;
  onClose: () => void;
}

export const CommentsSheet = ({
  catchId,
  visible,
  onClose,
}: CommentsSheetProps): JSX.Element => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const [commentBody, setCommentBody] = useState<string>('');
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState<number>(0);
  const commentInputRef = useRef<TextInput | null>(null);
  const commentsQuery = useQuery({
    queryKey: ['sheet-comments', catchId],
    queryFn: () => getCatchComments(catchId ?? ''),
    enabled: visible && Boolean(catchId),
  });
  const commentMutation = useMutation({
    mutationFn: (body: string) => addComment(catchId ?? '', body),
  });

  const withReplyPrefix = (value: string, username: string | null): string => {
    if (!username) {
      return value;
    }

    const prefix = `@${username}`;
    return value.startsWith(prefix) ? value : `${prefix} ${value}`;
  };

  const handleReplyPress = (item: CommentListItem): void => {
    const username = item.profiles?.username;

    if (!username) {
      return;
    }

    setReplyToUsername(username);
    setCommentBody((current) => {
      const nextValue = withReplyPrefix(current.trim(), username).trimStart();
      return current.trim() ? nextValue : `${nextValue} `;
    });
    commentInputRef.current?.focus();
  };

  const handleProfilePress = (item: CommentListItem): void => {
    const username = item.profiles?.username;

    if (!username) {
      return;
    }

    onClose();
    router.push(`/(tabs)/profile/${username}`);
  };

  const handleSendComment = async (): Promise<void> => {
    const trimmedBody = commentBody.trim();
    const submittedBody = withReplyPrefix(trimmedBody, replyToUsername);

    if (!submittedBody.trim() || !catchId) {
      return;
    }

    setCommentBody('');

    const optimisticComment: CommentListItem = {
      id: `temp-${Date.now()}`,
      catch_id: catchId,
      user_id: session?.user.id ?? '',
      body: submittedBody,
      created_at: new Date().toISOString(),
      profiles: {
        username: profile?.username ?? 'Sen',
        avatar_url: profile?.avatar_url ?? null,
      },
    };

    queryClient.setQueryData(['sheet-comments', catchId], (current: CommentListItem[] | undefined) => [
      optimisticComment,
      ...(current ?? []),
    ]);

    try {
      const createdComment = await commentMutation.mutateAsync(submittedBody);
      queryClient.setQueryData(['sheet-comments', catchId], (current: CommentListItem[] | undefined) => [
        createdComment,
        ...(current ?? []).filter((item) => item.id !== optimisticComment.id),
      ]);
      await commentsQuery.refetch();
      setReplyToUsername(null);
    } catch {
      setCommentBody(submittedBody);
      queryClient.setQueryData(['sheet-comments', catchId], (current: CommentListItem[] | undefined) =>
        (current ?? []).filter((item) => item.id !== optimisticComment.id),
      );
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.overlayTouchable} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 12) + 12 + keyboardInset },
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                blurAmount={30}
                blurType="dark"
                reducedTransparencyFallbackColor={SHEET_COLORS.background}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.handle}>
              <View style={styles.handleBar} />
              <Text style={styles.title}>Yorumlar</Text>
            </View>

            <FlatList
              contentContainerStyle={styles.listContent}
              data={commentsQuery.data ?? []}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>Henüz yorum yok</Text>}
              renderItem={({ item }) => (
                <CommentItem
                  item={item}
                  onProfilePress={handleProfilePress}
                  onReplyPress={handleReplyPress}
                />
              )}
              style={styles.list}
            />

            {replyToUsername ? (
              <View style={styles.replyBanner}>
                <Text style={styles.replyText}>Yanıt: @{replyToUsername}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setReplyToUsername(null)}>
                  <Text style={styles.replyCancel}>İptal</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <TextInput
                onChangeText={setCommentBody}
                placeholder="Yorum yaz..."
                placeholderTextColor="rgba(240,247,249,0.45)"
                ref={commentInputRef}
                style={styles.input}
                value={commentBody}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleSendComment()}
                style={styles.sendBtn}
              >
                <Text style={styles.sendBtnText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SHEET_COLORS = {
  background: '#050608',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: '#8B92A5',
  accent: '#D4FF00',
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    height: '78%',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : SHEET_COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: SHEET_COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    overflow: 'hidden',
  },
  handle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handleBar: {
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: SHEET_COLORS.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  emptyText: {
    paddingTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: SHEET_COLORS.textMuted,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SHEET_COLORS.border,
    backgroundColor: SHEET_COLORS.surface,
  },
  replyText: {
    fontSize: 14,
    color: SHEET_COLORS.textMuted,
  },
  replyCancel: {
    fontSize: 12,
    fontWeight: '600',
    color: SHEET_COLORS.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(125,212,232,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 40,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: SHEET_COLORS.accent,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
