import { supabase } from '@/lib/supabase';
import type {
  ConversationItem,
  ConversationParticipant,
  ConversationRow,
  MessageItem,
  MessageRow,
} from '@/types/app.types';

const PAGE_SIZE = 20;

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

const getParticipantMap = async (
  userIds: string[],
): Promise<Map<string, ConversationParticipant>> => {
  if (!userIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    ]),
  );
};

const buildConversationItems = async (
  rows: ConversationRow[],
  currentUserId: string,
): Promise<ConversationItem[]> => {
  if (!rows.length) {
    return [];
  }

  const otherUserIds = rows.map((row) =>
    row.participant_1 === currentUserId ? row.participant_2 : row.participant_1,
  );
  const participantMap = await getParticipantMap(otherUserIds);
  const { data: unreadRows, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .in(
      'conversation_id',
      rows.map((row) => row.id),
    )
    .eq('is_read', false)
    .neq('sender_id', currentUserId);

  if (unreadError) {
    throw new Error(unreadError.message);
  }

  const unreadMap = new Map<string, number>();
  (unreadRows ?? []).forEach((row) => {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  });

  return rows.map((row) => {
    const otherParticipantId =
      row.participant_1 === currentUserId ? row.participant_2 : row.participant_1;

    return {
      ...row,
      otherParticipant: participantMap.get(otherParticipantId) ?? {
        id: otherParticipantId,
        username: 'Bilinmeyen',
        avatar_url: null,
      },
      unreadCount: unreadMap.get(row.id) ?? 0,
    };
  });
};

export const getOrCreateConversation = async (
  otherUserId: string,
): Promise<ConversationRow> => {
  const currentUserId = await getCurrentUserId();

  if (currentUserId === otherUserId) {
    throw new Error('Kendine mesaj gonderemezsin.');
  }

  const [participant1, participant2] = [currentUserId, otherUserId].sort();
  const { data: existingConversation, error: selectError } = await supabase
    .from('conversations')
    .select('*')
    .eq('participant_1', participant1)
    .eq('participant_2', participant2)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existingConversation) {
    return existingConversation;
  }

  const { data: createdConversation, error: insertError } = await supabase
    .from('conversations')
    .insert({
      participant_1: participant1,
      participant_2: participant2,
    })
    .select('*')
    .single();

  if (insertError) {
    const { data: retryConversation, error: retryError } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1', participant1)
      .eq('participant_2', participant2)
      .maybeSingle();

    if (retryError) {
      throw new Error(retryError.message);
    }

    if (retryConversation) {
      return retryConversation;
    }

    throw new Error(insertError.message);
  }

  return createdConversation;
};

export const getConversations = async (): Promise<ConversationItem[]> => {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return buildConversationItems(data ?? [], currentUserId);
};

export const getConversationById = async (
  conversationId: string,
): Promise<ConversationItem> => {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const items = await buildConversationItems([data], currentUserId);

  return items[0];
};

export const getMessages = async (
  conversationId: string,
  cursor?: string,
): Promise<MessageItem[]> => {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const senderMap = await getParticipantMap(
    Array.from(new Set(rows.map((row) => row.sender_id))),
  );

  return rows.map((row) => ({
    ...row,
    sender: senderMap.get(row.sender_id) ?? null,
  }));
};

export const sendMessage = async (
  conversationId: string,
  body: string,
): Promise<MessageRow> => {
  const currentUserId = await getCurrentUserId();
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error('Mesaj bos olamaz.');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: trimmedBody,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const markAsRead = async (conversationId: string): Promise<void> => {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw new Error(error.message);
  }
};
