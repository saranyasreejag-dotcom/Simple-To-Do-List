import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

const LEGACY_TASKS_KEY = 'simple-todo.tasks.v1';
const MIGRATION_KEY = 'simple-todo.supabase-migration.v1';

type LoadMode = 'initial' | 'refresh' | 'silent';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Could not connect to Supabase.';
}

export function useSupabaseTasks(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const loadTasks = useCallback(
    async (mode: LoadMode) => {
      if (!supabase || requestInProgress.current) {
        return;
      }

      requestInProgress.current = true;
      if (mode === 'initial') {
        setIsLoading(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      }

      try {
        const { data, error: selectError } = await supabase
          .from('tasks')
          .select('id, title, completed, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (selectError) {
          throw selectError;
        }

        let loadedTasks = (data ?? []) as Task[];
        const migrationComplete = await AsyncStorage.getItem(MIGRATION_KEY);

        if (migrationComplete !== 'true') {
          const legacyData = await AsyncStorage.getItem(LEGACY_TASKS_KEY);
          if (legacyData) {
            const parsed: unknown = JSON.parse(legacyData);
            if (!Array.isArray(parsed)) {
              throw new Error('The saved on-device task list has an unexpected format.');
            }

            const legacyTasks = parsed.filter(
              (task): task is { id: string; title: string; completed: boolean } =>
                typeof task?.id === 'string' &&
                typeof task?.title === 'string' &&
                typeof task?.completed === 'boolean',
            );

            if (legacyTasks.length > 0) {
              const { data: importedTasks, error: importError } = await supabase
                .from('tasks')
                .insert(
                  legacyTasks.map((task) => ({
                    user_id: userId,
                    title: task.title,
                    completed: task.completed,
                  })),
                )
                .select('id, title, completed, created_at');

              if (importError) {
                throw importError;
              }

              loadedTasks = [...((importedTasks ?? []) as Task[]), ...loadedTasks];
            }
          }

          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
          await AsyncStorage.removeItem(LEGACY_TASKS_KEY);
        }

        setTasks(loadedTasks);
        setError(null);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        requestInProgress.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setError('Supabase is not configured.');
      setIsLoading(false);
      return;
    }

    void loadTasks('initial');
    const channel = client
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadTasks('silent');
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadTasks, userId]);

  const addTask = useCallback(
    async (title: string): Promise<boolean> => {
      if (!supabase) {
        setError('Supabase is not configured.');
        return false;
      }

      const cleanTitle = title.trim();
      if (!cleanTitle || cleanTitle.length > 500) {
        setError('Enter a task with 1 to 500 characters.');
        return false;
      }

      try {
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert({ user_id: userId, title: cleanTitle, completed: false })
          .select('id, title, completed, created_at')
          .single();

        if (insertError) {
          setError(getErrorMessage(insertError));
          return false;
        }

        setTasks((current) => [data as Task, ...current]);
        setError(null);
        return true;
      } catch (insertError) {
        setError(getErrorMessage(insertError));
        return false;
      }
    },
    [userId],
  );

  const toggleTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!supabase) {
        setError('Supabase is not configured.');
        return false;
      }

      const task = tasks.find((entry) => entry.id === taskId);
      if (!task) {
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ completed: !task.completed })
          .eq('id', taskId)
          .eq('user_id', userId);

        if (updateError) {
          setError(getErrorMessage(updateError));
          return false;
        }

        setTasks((current) =>
          current.map((entry) =>
            entry.id === taskId ? { ...entry, completed: !entry.completed } : entry,
          ),
        );
        setError(null);
        return true;
      } catch (updateError) {
        setError(getErrorMessage(updateError));
        return false;
      }
    },
    [tasks, userId],
  );

  const clearCompleted = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('completed', true);

      if (deleteError) {
        setError(getErrorMessage(deleteError));
        return false;
      }

      setTasks((current) => current.filter((task) => !task.completed));
      setError(null);
      return true;
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      return false;
    }
  }, [userId]);

  const refresh = useCallback(() => loadTasks('refresh'), [loadTasks]);

  return {
    tasks,
    isLoading,
    isRefreshing,
    error,
    addTask,
    toggleTask,
    clearCompleted,
    refresh,
  };
}
