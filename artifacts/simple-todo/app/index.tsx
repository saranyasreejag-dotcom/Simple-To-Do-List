import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const STORAGE_KEY = 'simple-todo.tasks.v1';

function triggerHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function TodoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function restoreTasks() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isActive || stored === null) {
          return;
        }

        const restored: unknown = JSON.parse(stored);
        if (!Array.isArray(restored)) {
          throw new Error('Saved task data has an unexpected format.');
        }

        const validTasks = restored.filter(
          (task): task is Task =>
            typeof task?.id === 'string' &&
            typeof task?.title === 'string' &&
            typeof task?.completed === 'boolean',
        );
        setTasks(validTasks);
      } catch {
        if (isActive) {
          setStorageError('Saved tasks could not be loaded. You can still add tasks.');
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    }

    void restoreTasks();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {
      setStorageError('Your latest changes could not be saved on this device.');
    });
  }, [isHydrated, tasks]);

  const remainingCount = useMemo(
    () => tasks.filter((task) => !task.completed).length,
    [tasks],
  );
  const completedCount = tasks.length - remainingCount;
  const progress = tasks.length === 0 ? 0 : completedCount / tasks.length;
  const orderedTasks = useMemo(
    () => [...tasks].sort((first, second) => Number(first.completed) - Number(second.completed)),
    [tasks],
  );
  const hasCompletedTasks = completedCount > 0;
  const webInsets = Platform.OS === 'web';

  function addTask() {
    const title = draft.trim();
    if (!title || !isHydrated) {
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setTasks((current) => [{ id, title, completed: false }, ...current]);
    setDraft('');
    Keyboard.dismiss();
    triggerHaptic();
  }

  function toggleTask(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
    triggerHaptic();
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.completed));
    triggerHaptic();
  }

  function renderTask({ item }: { item: Task }) {
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.completed }}
        accessibilityLabel={`${item.title}, ${item.completed ? 'completed' : 'not completed'}`}
        onPress={() => toggleTask(item.id)}
        style={({ pressed }) => [
          styles.taskRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
        testID={`task-${item.id}`}
      >
        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: item.completed ? colors.primary : 'transparent',
              borderColor: item.completed ? colors.primary : colors.border,
            },
          ]}
        >
          {item.completed ? (
            <Feather name="check" size={15} color={colors.primaryForeground} />
          ) : null}
        </View>
        <Text
          style={[
            styles.taskTitle,
            { color: item.completed ? colors.mutedForeground : colors.foreground },
            item.completed && styles.completedTitle,
          ]}
        >
          {item.title}
        </Text>
      </Pressable>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={0}
      style={[styles.keyboardContainer, { backgroundColor: colors.background }]}
    >
      <SafeAreaView
        edges={[]}
        style={[
          styles.safeArea,
          {
            paddingTop: webInsets ? 67 : insets.top,
            paddingBottom: webInsets ? 34 : insets.bottom,
          },
        ]}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.eyebrow}>
              <View style={[styles.sunMark, { backgroundColor: colors.accent }]}>
                <Feather name="sun" size={15} color={colors.accentForeground} />
              </View>
              <Text style={[styles.eyebrowText, { color: colors.mutedForeground }]}>
                A LITTLE AT A TIME
              </Text>
            </View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Today</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Make room for what matters.
            </Text>
          </View>

          <View
            style={[
              styles.progressCard,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <View style={styles.progressCopy}>
              <Text style={[styles.progressLabel, { color: colors.primaryForeground }]}>
                {remainingCount === 0 && tasks.length > 0
                  ? 'All done. Nicely done.'
                  : remainingCount === 1
                    ? 'One thing left to do'
                    : `${remainingCount} things left to do`}
              </Text>
              <Text style={[styles.progressDetail, { color: colors.primaryForeground }]}>
                {tasks.length === 0
                  ? 'Start with one small thing'
                  : `${completedCount} of ${tasks.length} completed`}
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={[
                styles.progressTrack,
                { backgroundColor: colors.primaryForeground },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: colors.accent,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>YOUR TASKS</Text>
            {hasCompletedTasks ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear completed tasks"
                onPress={clearCompleted}
                style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.6 : 1 }]}
                testID="clear-completed"
              >
                <Text style={[styles.clearButtonText, { color: colors.primary }]}>
                  Clear done
                </Text>
              </Pressable>
            ) : null}
          </View>

          {storageError ? (
            <View
              accessibilityRole="alert"
              style={[styles.errorBanner, { backgroundColor: colors.secondary }]}
            >
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.foreground }]}>{storageError}</Text>
            </View>
          ) : null}

          {isHydrated ? (
            <FlatList
              data={orderedTasks}
              keyExtractor={(item) => item.id}
              renderItem={renderTask}
              contentContainerStyle={[
                styles.taskList,
                orderedTasks.length === 0 && styles.emptyList,
              ]}
              ItemSeparatorComponent={() => <View style={styles.taskSeparator} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
                    <Feather name="check" size={22} color={colors.accentForeground} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    Nothing on your list yet
                  </Text>
                  <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
                    Add a task below and take it one step at a time.
                  </Text>
                </View>
              }
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              scrollEnabled={orderedTasks.length > 0}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              testID="task-list"
            />
          ) : (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          <View
            style={[
              styles.composer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              accessibilityLabel="New task"
              autoCapitalize="sentences"
              editable={isHydrated}
              onChangeText={setDraft}
              onSubmitEditing={addTask}
              placeholder="Add a task..."
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              style={[styles.input, { color: colors.foreground }]}
              testID="new-task-input"
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add task"
              disabled={!draft.trim() || !isHydrated}
              onPress={addTask}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: draft.trim() && isHydrated ? colors.primary : colors.muted,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
              testID="add-task"
            >
              <Feather
                name="plus"
                size={21}
                color={draft.trim() && isHydrated ? colors.primaryForeground : colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 14,
    paddingBottom: 22,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 18,
  },
  sunMark: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.3,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginTop: 4,
  },
  progressCard: {
    padding: 19,
    marginBottom: 27,
  },
  progressCopy: {
    marginBottom: 16,
  },
  progressLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  progressDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.78,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  listHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  clearButton: {
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  clearButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  list: {
    flex: 1,
  },
  taskList: {
    paddingBottom: 14,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  taskSeparator: {
    height: 9,
  },
  taskRow: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  checkCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 6,
  },
  emptyMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 58,
    paddingLeft: 17,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingVertical: 10,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
