import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';
import { TodoScreen } from '@/components/TodoScreen';
import { useColors } from '@/hooks/useColors';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseTasks } from '@/hooks/useSupabaseTasks';
import { supabase, supabaseConfigError } from '@/lib/supabase';

export default function TodoRoute() {
  const { session, isLoading, authError, signOut } = useSupabaseAuth();

  if (!supabase) {
    return (
      <SupabaseAuthScreen
        configError={supabaseConfigError ?? 'Supabase is not configured.'}
      />
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <SupabaseAuthScreen authError={authError} />;
  }

  return (
    <SignedInTodo
      email={session.user.email ?? ''}
      onSignOut={signOut}
      userId={session.user.id}
    />
  );
}

function SignedInTodo({
  email,
  onSignOut,
  userId,
}: {
  email: string;
  onSignOut: () => Promise<void>;
  userId: string;
}) {
  const taskState = useSupabaseTasks(userId);

  return (
    <TodoScreen
      email={email}
      error={taskState.error}
      isLoading={taskState.isLoading}
      isRefreshing={taskState.isRefreshing}
      onAddTask={taskState.addTask}
      onClearCompleted={taskState.clearCompleted}
      onRefresh={taskState.refresh}
      onSignOut={onSignOut}
      onToggleTask={taskState.toggleTask}
      tasks={taskState.tasks}
    />
  );
}

function LoadingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webInsets = Platform.OS === 'web';

  return (
    <SafeAreaView
      edges={[]}
      style={[
        styles.loadingScreen,
        {
          backgroundColor: colors.background,
          paddingTop: webInsets ? 67 : insets.top,
          paddingBottom: webInsets ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ActivityIndicator color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
