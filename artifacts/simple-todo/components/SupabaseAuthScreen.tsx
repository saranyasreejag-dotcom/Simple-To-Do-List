import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Feedback = {
  text: string;
  isError: boolean;
};

type SupabaseAuthScreenProps = {
  configError?: string | null;
  authError?: string | null;
};

export function SupabaseAuthScreen({
  configError = null,
  authError = null,
}: SupabaseAuthScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const passwordInput = useRef<TextInput>(null);
  const hasConfigError = Boolean(configError || !supabase);

  async function submit() {
    if (!supabase || hasConfigError) {
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setFeedback({ text: 'Enter your email and password.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (isCreatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          setFeedback({ text: error.message, isError: true });
        } else if (!data.session) {
          setFeedback({
            text: 'Check your email to confirm your account, then sign in.',
            isError: false,
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setFeedback({ text: error.message, isError: true });
        }
      }
    } catch {
      setFeedback({
        text: 'Could not reach Supabase. Check your connection and try again.',
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const webInsets = Platform.OS === 'web';
  const notice = configError
    ? { text: configError, isError: true }
    : authError
      ? { text: authError, isError: true }
      : feedback;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: webInsets ? 67 : insets.top + 24,
            paddingBottom: webInsets ? 34 : insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <View style={[styles.brandMark, { backgroundColor: colors.accent }]}>
          <Feather name="check" size={24} color={colors.accentForeground} />
        </View>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
          SIMPLE TO-DO
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your list,{'\n'}wherever you are.
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to keep your tasks private and in sync.
        </Text>

        <View style={styles.form}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!hasConfigError && !isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => passwordInput.current?.focus()}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            testID="auth-email"
            value={email}
          />

          <Text style={[styles.fieldLabel, styles.passwordLabel, { color: colors.foreground }]}>
            Password
          </Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
            editable={!hasConfigError && !isSubmitting}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="Enter your password"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            ref={passwordInput}
            secureTextEntry
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            testID="auth-password"
            value={password}
          />

          {notice ? (
            <View
              accessibilityRole={notice.isError ? 'alert' : 'text'}
              style={[
                styles.notice,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Feather
                name={notice.isError ? 'alert-circle' : 'mail'}
                size={16}
                color={notice.isError ? colors.destructive : colors.primary}
              />
              <Text style={[styles.noticeText, { color: colors.foreground }]}>
                {notice.text}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={hasConfigError || isSubmitting}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                opacity: hasConfigError || isSubmitting ? 0.55 : pressed ? 0.8 : 1,
              },
            ]}
            testID="auth-submit"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                  {isCreatingAccount ? 'Create account' : 'Sign in'}
                </Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </>
            )}
          </Pressable>

          {!hasConfigError ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => {
                setIsCreatingAccount((current) => !current);
                setFeedback(null);
              }}
              style={styles.switchButton}
              testID="auth-switch-mode"
            >
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                {isCreatingAccount ? 'Already have an account? ' : 'New here? '}
              </Text>
              <Text style={[styles.switchAction, { color: colors.primary }]}>
                {isCreatingAccount ? 'Sign in' : 'Create an account'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  passwordLabel: {
    marginTop: 18,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 13,
    padding: 13,
    marginTop: 16,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 55,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  submitText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  switchButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  switchText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  switchAction: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
