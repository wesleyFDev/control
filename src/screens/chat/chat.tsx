import React, { useCallback, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  type ListRenderItem,
} from 'react-native';

import ChatHeader from '../../features/chat/components/ChatHeader';
import ChatInput from '../../features/chat/components/ChatInput';
import ExpenseConfirmCard from '../../features/chat/components/ExpenseConfirmCard';
import MessageBubble from '../../features/chat/components/MessageBubble';
import ScopeQuestionCard from '../../features/chat/components/ScopeQuestionCard';
import { useChat } from '../../features/chat/hooks/useChat';
import type { ChatMessage } from '../../features/chat/types';
import { styles } from './style';

export default function Chat() {
  const { messages, send, actions } = useChat();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => {
      switch (item.kind) {
        case 'user':
          return <MessageBubble from="user" text={item.text} />;
        case 'assistant':
          return <MessageBubble from="assistant" text={item.text} />;
        case 'expense':
          return item.askScope ? (
            <ScopeQuestionCard message={item} actions={actions} />
          ) : (
            <ExpenseConfirmCard message={item} actions={actions} />
          );
      }
    },
    [actions],
  );

  return (
    <View style={styles.container}>
      <ChatHeader />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />
        <ChatInput onSend={send} />
      </KeyboardAvoidingView>
    </View>
  );
}
