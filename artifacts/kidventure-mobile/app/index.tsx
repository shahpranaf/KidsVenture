import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Pillar = 'learn' | 'create' | 'connect';
type Screen = 'auth' | 'onboarding' | 'home' | 'mission' | 'timer' | 'rewards' | 'offline' | 'parent';
type AuthMode = 'login' | 'register';

type Account = {
  email: string;
  passcode: string;
  childName: string;
};

type Profile = {
  name: string;
  age: number;
  companion: string;
  interests: string[];
  completed: Pillar[];
  scores: Record<Pillar, number>;
  streak: number;
  totalStars: number;
  level: number;
  dailyMinutes: number;
  minutesUsedToday: number;
  rewardsConsent: boolean;
  rewardName: string;
  timerSecondsLeft: number;
  timerRunning: boolean;
  offlineActivitiesCompleted: string[];
};

type Companion = {
  id: string;
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type Mission = {
  pillar: Pillar;
  label: string;
  title: string;
  instructions: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STORAGE_KEY = 'kidventure-profile-v1';
const ACCOUNT_KEY = 'kidventure-account-v1';
const mascot = require('../assets/images/kidventure-mascot.png');

const companions: Companion[] = [
  { id: 'nova', name: 'Nova', subtitle: 'Space scout', icon: 'rocket-outline', color: 'primary' },
  { id: 'pippa', name: 'Pippa', subtitle: 'Puzzle fox', icon: 'paw-outline', color: 'create' },
  { id: 'bolt', name: 'Bolt', subtitle: 'Game buddy', icon: 'football-outline', color: 'learn' },
  { id: 'milo', name: 'Milo', subtitle: 'Art explorer', icon: 'color-palette-outline', color: 'connect' },
  { id: 'sunny', name: 'Sunny', subtitle: 'Idea spark', icon: 'sunny-outline', color: 'yellow' },
  { id: 'sprout', name: 'Sprout', subtitle: 'Nature pal', icon: 'leaf-outline', color: 'success' },
];

const interestOptions = [
  { label: 'Dinosaurs', icon: 'paw-outline' as const },
  { label: 'Football', icon: 'football-outline' as const },
  { label: 'Drawing', icon: 'color-palette-outline' as const },
  { label: 'Space', icon: 'planet-outline' as const },
  { label: 'Animals', icon: 'fish-outline' as const },
  { label: 'Puzzles', icon: 'extension-puzzle-outline' as const },
  { label: 'Nature', icon: 'leaf-outline' as const },
  { label: 'Music', icon: 'musical-notes-outline' as const },
];

const missions: Mission[] = [
  {
    pillar: 'learn',
    label: 'LEARN',
    title: 'The Secret Number Trail',
    instructions: 'Find the missing number in each trail, then tell us how you spotted the pattern.',
    time: '15 min',
    icon: 'bulb-outline',
  },
  {
    pillar: 'create',
    label: 'CREATE',
    title: 'The Dinosaur Who Played Football',
    instructions: 'Invent a dinosaur who joins a football team. Tell us its name, position, and one funny problem.',
    time: '15 min',
    icon: 'color-wand-outline',
  },
  {
    pillar: 'connect',
    label: 'CONNECT',
    title: 'The Tiny Kindness Quest',
    instructions: 'Do one small kind thing for someone today. Tell us what you did and how it made you feel.',
    time: '15 min',
    icon: 'heart-outline',
  },
];

const initialProfile: Profile = {
  name: '',
  age: 9,
  companion: 'nova',
  interests: [],
  completed: [],
  scores: { learn: 0, create: 0, connect: 0 },
  streak: 0,
  totalStars: 0,
  level: 1,
  dailyMinutes: 20,
  minutesUsedToday: 0,
  rewardsConsent: false,
  rewardName: 'Choose a family reward',
  timerSecondsLeft: 15 * 60,
  timerRunning: false,
  offlineActivitiesCompleted: [],
};

const levelRewards = [
  { level: 1, title: 'First Spark', detail: 'Pick the next family game', icon: 'sparkles' as const, stars: 0 },
  { level: 2, title: 'Curiosity Scout', detail: 'Choose the next story at bedtime', icon: 'book-outline' as const, stars: 6 },
  { level: 3, title: 'Brave Maker', detail: 'Pick a 20-minute family adventure', icon: 'map-outline' as const, stars: 12 },
  { level: 4, title: 'Kindness Captain', detail: 'Choose a family treat together', icon: 'heart-outline' as const, stars: 20 },
  { level: 5, title: 'Trail Keeper', detail: 'Design tomorrow’s offline mission', icon: 'ribbon-outline' as const, stars: 30 },
];

const offlineActivities = [
  {
    id: 'kitchen-lab',
    title: 'Kitchen Lab',
    subtitle: 'Make a snack with three colors.',
    prompt: 'Can you invent a name for your snack and explain what each color does?',
    icon: 'restaurant-outline' as const,
    color: 'create',
    minutes: 15,
  },
  {
    id: 'neighborhood-notice',
    title: 'Notice Walk',
    subtitle: 'Spot five shapes on a walk together.',
    prompt: 'Which shape did you notice most, and where could it hide next?',
    icon: 'walk-outline' as const,
    color: 'connect',
    minutes: 15,
  },
  {
    id: 'build-it-together',
    title: 'Build It Together',
    subtitle: 'Make a bridge from things at home.',
    prompt: 'Test it with a small toy. What would make it stronger?',
    icon: 'construct-outline' as const,
    color: 'learn',
    minutes: 20,
  },
];

function getLevel(stars: number) {
  return Math.min(5, Math.max(1, 1 + Math.floor(stars / 6)));
}

function normalizeProfile(profile: Partial<Profile>): Profile {
  return {
    ...initialProfile,
    ...profile,
    scores: { ...initialProfile.scores, ...(profile.scores ?? {}) },
    completed: profile.completed ?? [],
    interests: profile.interests ?? [],
    offlineActivitiesCompleted: profile.offlineActivitiesCompleted ?? [],
    totalStars: profile.totalStars ?? 0,
    level: getLevel(profile.totalStars ?? 0),
    dailyMinutes: profile.dailyMinutes ?? 20,
    minutesUsedToday: profile.minutesUsedToday ?? 0,
    rewardsConsent: profile.rewardsConsent ?? false,
    rewardName: profile.rewardName ?? initialProfile.rewardName,
    timerSecondsLeft: profile.timerSecondsLeft ?? 15 * 60,
    timerRunning: false,
  };
}

function getPillarColor(pillar: Pillar, colors: ReturnType<typeof useColors>) {
  return colors[pillar];
}

function getCompanionColor(companion: Companion, colors: ReturnType<typeof useColors>) {
  return colors[companion.color as keyof ReturnType<typeof useColors>] as string;
}

function PillarIcon({ mission, size = 22 }: { mission: Mission; size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.pillarIcon, { backgroundColor: getPillarColor(mission.pillar, colors) }]}>
      <Ionicons name={mission.icon} size={size} color={colors.primaryForeground} />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={`button-${label.toLowerCase().replaceAll(' ', '-')}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: disabled ? colors.muted : colors.primary, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={[styles.primaryButtonText, { color: disabled ? colors.mutedForeground : colors.primaryForeground }]}>
        {label}
      </Text>
      <Ionicons name={icon} size={20} color={disabled ? colors.mutedForeground : colors.primaryForeground} />
    </Pressable>
  );
}

function TopBrand({ onParentPress }: { onParentPress?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.topBrand}>
      <View style={styles.brandLockup}>
        <View style={[styles.brandMark, { backgroundColor: colors.yellow }]}>
          <Ionicons name="sparkles" size={18} color={colors.navy} />
        </View>
        <View>
          <Text style={[styles.brandName, { color: colors.navy }]}>KidVenture</Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>Small missions. Big futures.</Text>
        </View>
      </View>
      {onParentPress ? (
        <Pressable
          testID="button-grown-up-view"
          onPress={onParentPress}
          style={({ pressed }) => [styles.parentButton, { backgroundColor: colors.card, opacity: pressed ? 0.72 : 1 }]}
        >
          <Ionicons name="bar-chart-outline" size={18} color={colors.navy} />
          <Text style={[styles.parentButtonText, { color: colors.navy }]}>Grown-up view</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuthScreen({
  mode,
  setMode,
  onSubmit,
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  onSubmit: (account: Account) => boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [childName, setChildName] = useState('');
  const [showError, setShowError] = useState(false);

  const submit = () => {
    const valid = email.includes('@') && passcode.trim().length >= 4 && (mode === 'login' || childName.trim().length > 1);
    if (!valid) {
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const accepted = onSubmit({ email: email.trim().toLowerCase(), passcode: passcode.trim(), childName: childName.trim() });
    setShowError(!accepted);
    if (accepted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.cream }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.authContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 22), paddingBottom: Math.max(insets.bottom + 26, 38) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TopBrand />
        <Animated.View entering={FadeInDown.duration(450)} style={styles.authHero}>
          <View style={[styles.authMascotHalo, { backgroundColor: colors.sky }]}>
            <Image source={mascot} style={styles.authMascot} resizeMode="contain" />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>A FAMILY ADVENTURE</Text>
          <Text style={[styles.authTitle, { color: colors.navy }]}>
            {mode === 'login' ? 'Welcome back, explorer.' : 'Make room for meaningful moments.'}
          </Text>
          <Text style={[styles.authCopy, { color: colors.mutedForeground }]}>
            {mode === 'login'
              ? 'One calm mission at a time. Your progress stays on this device.'
              : 'KidVenture turns a little screen time into a spark, then sends you back to real life.'}
          </Text>
        </Animated.View>

        <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.authTabs}>
            {(['login', 'register'] as AuthMode[]).map((item) => (
              <Pressable
                key={item}
                testID={`auth-${item}`}
                onPress={() => {
                  setMode(item);
                  setShowError(false);
                }}
                style={[styles.authTab, { backgroundColor: mode === item ? colors.navy : colors.cream }]}
              >
                <Text style={[styles.authTabText, { color: mode === item ? colors.primaryForeground : colors.mutedForeground }]}>
                  {item === 'login' ? 'Log in' : 'Register'}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === 'register' ? (
            <View style={styles.authField}>
              <Text style={[styles.authLabel, { color: colors.navy }]}>Child’s first name</Text>
              <TextInput
                testID="input-child-name"
                value={childName}
                onChangeText={setChildName}
                placeholder="e.g. Aarav"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                style={[styles.nameInput, { color: colors.navy, backgroundColor: colors.cream, borderColor: colors.border }]}
                maxLength={18}
              />
            </View>
          ) : null}
          <View style={styles.authField}>
            <Text style={[styles.authLabel, { color: colors.navy }]}>Parent email</Text>
            <TextInput
              testID="input-email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.nameInput, { color: colors.navy, backgroundColor: colors.cream, borderColor: showError ? colors.destructive : colors.border }]}
            />
          </View>
          <View style={styles.authField}>
            <Text style={[styles.authLabel, { color: colors.navy }]}>Family passcode</Text>
            <TextInput
              testID="input-passcode"
              value={passcode}
              onChangeText={setPasscode}
              placeholder="At least 4 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              style={[styles.nameInput, { color: colors.navy, backgroundColor: colors.cream, borderColor: showError ? colors.destructive : colors.border }]}
              maxLength={16}
            />
          </View>
          {showError ? (
            <Text style={[styles.authError, { color: colors.destructive }]}>
              {mode === 'login' ? 'Enter your email and family passcode.' : 'Add a name, email, and 4-character passcode.'}
            </Text>
          ) : null}
          <PrimaryButton label={mode === 'login' ? 'Open our adventure' : 'Create family account'} onPress={submit} icon="arrow-forward" />
          <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
            Local-first prototype: your family account stays on this device.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Onboarding({
  profile,
  setProfile,
  onStart,
}: {
  profile: Profile;
  setProfile: (value: Profile) => void;
  onStart: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const selectedCompanion = companions.find((item) => item.id === profile.companion) ?? companions[0];
  const canStart = profile.name.trim().length > 1 && profile.interests.length === 3;

  const toggleInterest = (interest: string) => {
    Haptics.selectionAsync();
    const selected = profile.interests.includes(interest);
    if (selected) {
      setProfile({ ...profile, interests: profile.interests.filter((item) => item !== interest) });
    } else if (profile.interests.length < 3) {
      setProfile({ ...profile, interests: [...profile.interests, interest] });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.cream }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.onboardingContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 24, 34) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TopBrand />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.welcomeBlock}>
          <View style={[styles.mascotHalo, { backgroundColor: colors.sky }]}>
            <Image source={mascot} style={styles.mascotImage} resizeMode="contain" />
            <View style={[styles.starBubble, { backgroundColor: colors.yellow }]}>
              <Ionicons name="star" size={17} color={colors.navy} />
            </View>
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>WELCOME, EXPLORER</Text>
          <Text style={[styles.welcomeTitle, { color: colors.navy }]}>Your next big idea starts small.</Text>
          <Text style={[styles.welcomeCopy, { color: colors.mutedForeground }]}>
            Pick a buddy and three things you love. We’ll turn them into one short, meaningful adventure.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>What should we call you?</Text>
          <TextInput
            testID="input-name"
            value={profile.name}
            onChangeText={(name) => setProfile({ ...profile, name })}
            placeholder="Your first name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.nameInput, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]}
            autoCapitalize="words"
            maxLength={18}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>How old are you?</Text>
          <View style={styles.ageRow}>
            {[6, 7, 8, 9, 10].map((age) => {
              const selected = profile.age === age;
              return (
                <Pressable
                  key={age}
                  testID={`age-${age}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setProfile({ ...profile, age });
                  }}
                  style={[
                    styles.ageChoice,
                    { backgroundColor: selected ? colors.navy : colors.card, borderColor: selected ? colors.navy : colors.border },
                  ]}
                >
                  <Text style={[styles.ageNumber, { color: selected ? colors.primaryForeground : colors.navy }]}>{age}</Text>
                  <Text style={[styles.ageLabel, { color: selected ? colors.accent : colors.mutedForeground }]}>years</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <View style={[styles.promiseCard, { backgroundColor: colors.mint, borderColor: colors.border }]}>
          <View style={[styles.promiseIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="phone-portrait-outline" size={19} color={colors.primaryForeground} />
          </View>
          <View style={styles.promiseCopy}>
            <Text style={[styles.promiseTitle, { color: colors.navy }]}>Small screen time by design</Text>
            <Text style={[styles.promiseText, { color: colors.navy }]}>A parent sets the limit. After one focused mission, the next step is offline.</Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Choose your cartoon buddy</Text>
            <Text style={[styles.selectionCount, { color: colors.primary }]}>1 of 1</Text>
          </View>
          <View style={styles.companionGrid}>
            {companions.map((companion) => {
              const selected = companion.id === profile.companion;
              const companionColor = getCompanionColor(companion, colors);
              return (
                <Pressable
                  key={companion.id}
                  testID={`companion-${companion.id}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setProfile({ ...profile, companion: companion.id });
                  }}
                  style={({ pressed }) => [
                    styles.companionCard,
                    {
                      backgroundColor: selected ? colors.card : colors.background,
                      borderColor: selected ? companionColor : colors.border,
                      borderWidth: selected ? 2 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.companionIcon, { backgroundColor: companionColor }]}>
                    <Ionicons name={companion.icon} size={24} color={colors.primaryForeground} />
                  </View>
                  <Text style={[styles.companionName, { color: colors.navy }]}>{companion.name}</Text>
                  <Text style={[styles.companionSubtitle, { color: colors.mutedForeground }]}>{companion.subtitle}</Text>
                  {selected ? (
                    <View style={[styles.selectedCheck, { backgroundColor: companionColor }]}>
                      <Ionicons name="checkmark" size={12} color={colors.primaryForeground} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Pick 3 things you love</Text>
            <Text style={[styles.selectionCount, { color: colors.primary }]}>{profile.interests.length} of 3</Text>
          </View>
          <View style={styles.interestGrid}>
            {interestOptions.map((interest) => {
              const selected = profile.interests.includes(interest.label);
              return (
                <Pressable
                  key={interest.label}
                  testID={`interest-${interest.label.toLowerCase()}`}
                  onPress={() => toggleInterest(interest.label)}
                  style={[
                    styles.interestChip,
                    { backgroundColor: selected ? colors.navy : colors.card, borderColor: selected ? colors.navy : colors.border },
                  ]}
                >
                  <Ionicons name={interest.icon} size={18} color={selected ? colors.accent : colors.primary} />
                  <Text style={[styles.interestLabel, { color: selected ? colors.primaryForeground : colors.navy }]}>{interest.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <PrimaryButton label="Start my adventure" onPress={onStart} disabled={!canStart} />
        <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
          Just your first name and age. That’s all we need.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Home({
  profile,
  onMission,
  onParent,
  onTimer,
  onRewards,
  onOffline,
}: {
  profile: Profile;
  onMission: (mission: Mission) => void;
  onParent: () => void;
  onTimer: () => void;
  onRewards: () => void;
  onOffline: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const selectedCompanion = companions.find((item) => item.id === profile.companion) ?? companions[0];
  const completedCount = profile.completed.length;
  const progress = Math.round((completedCount / missions.length) * 100);
  const companionColor = getCompanionColor(selectedCompanion, colors);

  return (
    <View style={[styles.screen, { backgroundColor: colors.cream }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 30, 44) },
        ]}
      >
        <TopBrand onParentPress={onParent} />
        <Animated.View entering={FadeInDown.duration(450)} style={styles.greetingRow}>
          <View style={styles.greetingCopy}>
            <Text style={[styles.helloText, { color: colors.mutedForeground }]}>Hi {profile.name}!</Text>
            <Text style={[styles.greetingTitle, { color: colors.navy }]}>Ready for today’s adventure?</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: companionColor }]}>
            <Ionicons name={selectedCompanion.icon} size={28} color={colors.primaryForeground} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(450)} style={[styles.progressCard, { backgroundColor: colors.navy }]}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={[styles.progressEyebrow, { color: colors.accent }]}>TODAY’S TRAIL</Text>
              <Text style={[styles.progressTitle, { color: colors.primaryForeground }]}>
                {completedCount === 3 ? 'Trail complete!' : `${3 - completedCount} missions to go`}
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="flame" size={18} color={colors.navy} />
              <Text style={[styles.streakText, { color: colors.navy }]}>{profile.streak} day streak</Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressCaption, { color: colors.secondary }]}>{completedCount} of 3 finished</Text>
            <Text style={[styles.progressCaption, { color: colors.accent }]}>{progress}%</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(130).duration(450)} style={styles.homeToolGrid}>
          <Pressable
            testID="button-focus-timer"
            onPress={onTimer}
            style={({ pressed }) => [styles.focusCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.blush }]}>
              <Ionicons name="timer-outline" size={21} color={colors.primary} />
            </View>
            <Text style={[styles.toolEyebrow, { color: colors.primary }]}>FOCUS WINDOW</Text>
            <Text style={[styles.toolTitle, { color: colors.navy }]}>{profile.dailyMinutes} min today</Text>
            <Text style={[styles.toolText, { color: colors.mutedForeground }]}>
              {profile.minutesUsedToday === 0 ? 'Start one calm mission' : `${profile.minutesUsedToday} min used`}
            </Text>
          </Pressable>
          <Pressable
            testID="button-level-rewards"
            onPress={onRewards}
            style={({ pressed }) => [styles.focusCard, { backgroundColor: colors.yellow, borderColor: colors.yellow, opacity: pressed ? 0.86 : 1 }]}
          >
            <View style={[styles.toolIcon, { backgroundColor: colors.navy }]}>
              <Ionicons name="trophy-outline" size={21} color={colors.accent} />
            </View>
            <Text style={[styles.toolEyebrow, { color: colors.navy }]}>LEVEL {profile.level}</Text>
            <Text style={[styles.toolTitle, { color: colors.navy }]}>{profile.totalStars} stars</Text>
            <Text style={[styles.toolText, { color: colors.navy }]}>See what you unlocked</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.missionHeader}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR DAILY MISSIONS</Text>
            <Text style={[styles.sectionTitleLarge, { color: colors.navy }]}>Choose your path</Text>
          </View>
          <View style={[styles.starCount, { backgroundColor: colors.yellow }]}>
            <Ionicons name="star" size={16} color={colors.navy} />
            <Text style={[styles.starCountText, { color: colors.navy }]}>{profile.completed.length * 3}</Text>
          </View>
        </View>

        <View style={styles.missionList}>
          {missions.map((mission, index) => {
            const completed = profile.completed.includes(mission.pillar);
            const pillarColor = getPillarColor(mission.pillar, colors);
            return (
              <Animated.View key={mission.pillar} entering={FadeInUp.delay(120 + index * 80).duration(450)}>
                <Pressable
                  testID={`mission-${mission.pillar}`}
                  onPress={() => onMission(mission)}
                  style={({ pressed }) => [
                    styles.missionCard,
                    { backgroundColor: colors.card, borderColor: completed ? colors.success : colors.border, opacity: pressed ? 0.86 : 1 },
                  ]}
                >
                  <View style={[styles.missionAccent, { backgroundColor: pillarColor }]} />
                  <View style={styles.missionCardBody}>
                    <View style={styles.missionCardTop}>
                      <PillarIcon mission={mission} size={20} />
                      <View style={styles.missionCardMeta}>
                        <Text style={[styles.missionLabel, { color: pillarColor }]}>{mission.label}</Text>
                        <View style={styles.timeRow}>
                          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{mission.time}</Text>
                        </View>
                      </View>
                      {completed ? (
                        <View style={[styles.doneMark, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={22} color={colors.mutedForeground} />
                      )}
                    </View>
                    <Text style={[styles.missionTitle, { color: colors.navy }]}>{mission.title}</Text>
                    <Text style={[styles.missionDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {mission.instructions}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <Pressable
          testID="button-play-together"
          onPress={onOffline}
          style={({ pressed }) => [styles.offlineBanner, { backgroundColor: colors.lavender, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}
        >
          <View style={[styles.offlineIcon, { backgroundColor: colors.create }]}>
            <Ionicons name="people-outline" size={23} color={colors.primaryForeground} />
          </View>
          <View style={styles.offlineCopy}>
            <Text style={[styles.offlineEyebrow, { color: colors.create }]}>NEXT: OFFLINE TOGETHER</Text>
            <Text style={[styles.offlineTitle, { color: colors.navy }]}>Put the phone down and play</Text>
            <Text style={[styles.offlineText, { color: colors.navy }]}>Pick a tiny parent-child activity after your mission.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.navy} />
        </Pressable>

        <View style={[styles.helperStrip, { backgroundColor: colors.mint }]}>
          <Image source={mascot} style={styles.helperImage} resizeMode="contain" />
          <View style={styles.helperCopy}>
            <Text style={[styles.helperTitle, { color: colors.navy }]}>Nova’s tip</Text>
            <Text style={[styles.helperText, { color: colors.navy }]}>There’s no perfect answer. Curious answers are the best ones.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MissionDetail({
  mission,
  profile,
  onBack,
  onComplete,
  initialState = 'writing',
}: {
  mission: Mission;
  profile: Profile;
  onBack: () => void;
  onComplete: (pillar: Pillar) => void;
  initialState?: 'writing' | 'thinking' | 'feedback';
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<'writing' | 'thinking' | 'feedback'>(initialState);
  const [showHint, setShowHint] = useState(false);
  const completed = profile.completed.includes(mission.pillar);
  const pillarColor = getPillarColor(mission.pillar, colors);

  const submit = () => {
    if (!answer.trim()) {
      setShowHint(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowHint(false);
    setState('thinking');
    setTimeout(() => {
      setState('feedback');
      if (!completed) onComplete(mission.pillar);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 900);
  };

  const feedback = useMemo(() => {
    if (mission.pillar === 'learn') {
      return 'You looked for the rule instead of just guessing — that is what real puzzle explorers do! Next time, try explaining your pattern with a tiny example.';
    }
    if (mission.pillar === 'create') {
      return 'Your idea has a brilliant twist, and I love how you made the character feel real! Next time, try adding what a teammate says when the funny problem happens.';
    }
    return 'You noticed how a small action can make someone feel seen. That is a powerful kind of superpower! Next time, try asking how your kind act changed their day.';
  }, [mission.pillar]);

  if (state === 'thinking') {
    return (
      <View style={[styles.screen, styles.centeredScreen, { backgroundColor: colors.cream, paddingTop: insets.top }]}>
        <Animated.View entering={ZoomIn.duration(400)} style={[styles.thinkingHalo, { backgroundColor: colors.sky }]}>
          <Image source={mascot} style={styles.thinkingMascot} resizeMode="contain" />
        </Animated.View>
        <ActivityIndicator size="small" color={colors.primary} style={styles.thinkingSpinner} />
        <Text style={[styles.thinkingTitle, { color: colors.navy }]}>Nova is cheering you on...</Text>
        <Text style={[styles.thinkingCopy, { color: colors.mutedForeground }]}>Finding the brightest part of your answer.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.cream }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.detailContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 16), paddingBottom: Math.max(insets.bottom + 28, 40) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable testID="button-back" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={[styles.backText, { color: colors.navy }]}>Back to trail</Text>
        </Pressable>

        {state === 'feedback' ? (
          <Animated.View entering={FadeInUp.duration(480)}>
            <View style={[styles.feedbackHero, { backgroundColor: colors.navy }]}>
              <Animated.View entering={ZoomIn.delay(150).duration(500)} style={[styles.feedbackBadge, { backgroundColor: colors.yellow }]}>
                <Ionicons name="star" size={30} color={colors.navy} />
              </Animated.View>
              <Text style={[styles.feedbackEyebrow, { color: colors.accent }]}>MISSION COMPLETE</Text>
              <Text style={[styles.feedbackTitle, { color: colors.primaryForeground }]}>You made it happen!</Text>
              <Text style={[styles.feedbackCopy, { color: colors.secondary }]}>{feedback}</Text>
            </View>
            <View style={[styles.badgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.badgeIcon, { backgroundColor: pillarColor }]}>
                <Ionicons name="ribbon-outline" size={26} color={colors.primaryForeground} />
              </View>
              <View style={styles.badgeCopy}>
                <Text style={[styles.badgeEyebrow, { color: pillarColor }]}>NEW BADGE</Text>
                <Text style={[styles.badgeTitle, { color: colors.navy }]}>
                  {mission.pillar === 'learn' ? 'Pattern Finder' : mission.pillar === 'create' ? 'Story Spark' : 'Kindness Captain'}
                </Text>
                <Text style={[styles.badgeDescription, { color: colors.mutedForeground }]}>You earned 3 stars for this mission.</Text>
              </View>
              <Ionicons name="checkmark-circle" size={25} color={colors.success} />
            </View>
            <PrimaryButton label="Back to my trail" onPress={onBack} icon="map-outline" />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(450)}>
            <View style={[styles.detailPillar, { backgroundColor: pillarColor }]}>
              <PillarIcon mission={mission} size={24} />
              <Text style={[styles.detailPillarText, { color: colors.primaryForeground }]}>{mission.label} MISSION</Text>
              <View style={[styles.detailTime, { backgroundColor: colors.primaryForeground }]}>
                <Ionicons name="time-outline" size={14} color={pillarColor} />
                <Text style={[styles.detailTimeText, { color: pillarColor }]}>{mission.time}</Text>
              </View>
            </View>
            <Text style={[styles.detailTitle, { color: colors.navy }]}>{mission.title}</Text>
            <Text style={[styles.detailInstructions, { color: colors.mutedForeground }]}>{mission.instructions}</Text>
            <View style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.promptHeading}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={[styles.promptTitle, { color: colors.navy }]}>Your answer</Text>
              </View>
              <TextInput
                testID="input-answer"
                value={answer}
                onChangeText={setAnswer}
                placeholder="Type your brilliant idea here..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
                style={[styles.answerInput, { color: colors.navy, backgroundColor: colors.cream, borderColor: showHint ? colors.destructive : colors.border }]}
                maxLength={500}
              />
              <View style={styles.inputFooter}>
                <Text style={[styles.inputHint, { color: showHint ? colors.destructive : colors.mutedForeground }]}>
                  {showHint ? 'Add a little answer first — your idea is waiting!' : 'There are no wrong ways to be curious.'}
                </Text>
                <Text style={[styles.characterCount, { color: colors.mutedForeground }]}>{answer.length}/500</Text>
              </View>
            </View>
            <PrimaryButton label="I’m done!" onPress={submit} icon="sparkles" />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TimerScreen({
  profile,
  onBack,
  onSave,
}: {
  profile: Profile;
  onBack: () => void;
  onSave: (secondsLeft: number, minutesUsed: number) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(profile.timerSecondsLeft || 15 * 60);
  const [running, setRunning] = useState(false);
  const initialSeconds = profile.timerSecondsLeft || 15 * 60;

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const interval = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [seconds, running]);

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const used = Math.min(profile.dailyMinutes, profile.minutesUsedToday + Math.max(0, Math.ceil((initialSeconds - seconds) / 60)));
  const saveAndBack = () => {
    onSave(seconds, used);
    onBack();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.cream }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.timerContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 28, 40) },
        ]}
      >
        <Pressable testID="button-timer-back" onPress={saveAndBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={[styles.backText, { color: colors.navy }]}>Back to trail</Text>
        </Pressable>
        <View style={styles.timerHeading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>THE KIDVENTURE TIMER</Text>
          <Text style={[styles.timerTitle, { color: colors.navy }]}>A little focus. A lot of life.</Text>
          <Text style={[styles.timerCopy, { color: colors.mutedForeground }]}>Use this window for one mission. When it ends, the best part happens away from the screen.</Text>
        </View>
        <View style={[styles.timerDial, { backgroundColor: colors.navy, borderColor: colors.accent }]}>
          <View style={[styles.timerDialInner, { backgroundColor: colors.cream }]}>
            <Ionicons name={running ? 'pulse-outline' : 'timer-outline'} size={26} color={colors.primary} />
            <Text style={[styles.timerDigits, { color: colors.navy }]}>{minutes}:{secs}</Text>
            <Text style={[styles.timerStatus, { color: colors.mutedForeground }]}>{seconds === 0 ? 'Window complete' : running ? 'Mission in focus' : 'Ready when you are'}</Text>
          </View>
        </View>
        <View style={[styles.budgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.budgetTop}>
            <Text style={[styles.budgetTitle, { color: colors.navy }]}>Today’s screen-time promise</Text>
            <Text style={[styles.budgetValue, { color: colors.primary }]}>{used}/{profile.dailyMinutes} min</Text>
          </View>
          <View style={[styles.scoreTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.scoreFill, { backgroundColor: colors.primary, width: `${Math.min(100, (used / profile.dailyMinutes) * 100)}%` }]} />
          </View>
          <Text style={[styles.budgetNote, { color: colors.mutedForeground }]}>The goal is not more screen time. It is better time.</Text>
        </View>
        <View style={styles.timerActions}>
          <PrimaryButton
            label={seconds === 0 ? 'Window complete' : running ? 'Pause focus' : 'Start focus'}
            onPress={() => {
              if (seconds > 0) {
                setRunning((value) => !value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            disabled={seconds === 0}
            icon={seconds === 0 ? 'checkmark' : running ? 'pause' : 'play'}
          />
          <Pressable
            testID="button-reset-timer"
            onPress={() => {
              setRunning(false);
              setSeconds(15 * 60);
            }}
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.navy} />
            <Text style={[styles.secondaryButtonText, { color: colors.navy }]}>Reset to 15 min</Text>
          </Pressable>
        </View>
        <View style={[styles.timerTip, { backgroundColor: colors.yellow }]}>
          <Ionicons name="sunny-outline" size={22} color={colors.navy} />
          <Text style={[styles.timerTipText, { color: colors.navy }]}>Try ending with: “Show me, don’t just tell me.” Then do it together.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function RewardsScreen({
  profile,
  onBack,
  onParent,
}: {
  profile: Profile;
  onBack: () => void;
  onParent: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: colors.cream }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 30, 44) },
        ]}
      >
        <Pressable testID="button-rewards-back" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={[styles.backText, { color: colors.navy }]}>Back to trail</Text>
        </Pressable>
        <View style={styles.rewardsHero}>
          <View style={[styles.rewardsOrb, { backgroundColor: colors.yellow }]}>
            <Ionicons name="trophy" size={38} color={colors.navy} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR REWARD TRAIL</Text>
          <Text style={[styles.greetingTitle, { color: colors.navy }]}>Earn moments, not things.</Text>
          <Text style={[styles.rewardsCopy, { color: colors.mutedForeground }]}>Each level unlocks a parent-approved experience. Stars are a nudge to notice your growth, not a reason to stay online.</Text>
        </View>
        <View style={[styles.rewardConsentBanner, { backgroundColor: profile.rewardsConsent ? colors.mint : colors.blush, borderColor: colors.border }]}>
          <Ionicons name={profile.rewardsConsent ? 'shield-checkmark-outline' : 'lock-closed-outline'} size={23} color={profile.rewardsConsent ? colors.success : colors.destructive} />
          <View style={styles.rewardConsentCopy}>
            <Text style={[styles.rewardConsentTitle, { color: colors.navy }]}>{profile.rewardsConsent ? 'Rewards are parent-approved' : 'Rewards are waiting for a grown-up'}</Text>
            <Text style={[styles.rewardConsentText, { color: colors.mutedForeground }]}>
              {profile.rewardsConsent ? `Your family chose: ${profile.rewardName}.` : 'Ask a grown-up to choose what feels meaningful for your family.'}
            </Text>
          </View>
        </View>
        <View style={styles.levelList}>
          {levelRewards.map((reward) => {
            const reached = profile.totalStars >= reward.stars;
            const unlocked = reached && profile.rewardsConsent;
            return (
              <View key={reward.level} style={[styles.levelRow, { backgroundColor: unlocked ? colors.card : colors.muted, borderColor: unlocked ? colors.success : colors.border, opacity: unlocked || reward.level <= profile.level ? 1 : 0.68 }]}>
                <View style={[styles.levelNumber, { backgroundColor: unlocked ? colors.yellow : colors.mutedForeground }]}>
                  <Text style={[styles.levelNumberText, { color: colors.navy }]}>{reward.level}</Text>
                </View>
                <View style={styles.levelCopy}>
                  <View style={styles.levelTitleRow}>
                    <Text style={[styles.levelTitle, { color: colors.navy }]}>{reward.title}</Text>
                    {unlocked ? <Ionicons name="checkmark-circle" size={19} color={colors.success} /> : <Ionicons name="lock-closed-outline" size={17} color={colors.mutedForeground} />}
                  </View>
                  <Text style={[styles.levelDetail, { color: colors.mutedForeground }]}>{reward.detail}</Text>
                  <Text style={[styles.levelStars, { color: colors.primary }]}>{reward.stars === 0 ? 'Start here' : `${reward.stars} stars needed`}</Text>
                </View>
                <Ionicons name={reward.icon} size={25} color={unlocked ? colors.primary : colors.mutedForeground} />
              </View>
            );
          })}
        </View>
        {!profile.rewardsConsent ? <PrimaryButton label="Open grown-up controls" onPress={onParent} icon="people-outline" /> : null}
      </ScrollView>
    </View>
  );
}

function OfflineActivityScreen({
  profile,
  onBack,
  onComplete,
}: {
  profile: Profile;
  onBack: () => void;
  onComplete: (activityId: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(offlineActivities[0].id);
  const selected = offlineActivities.find((activity) => activity.id === selectedId) ?? offlineActivities[0];
  const completed = profile.offlineActivitiesCompleted.includes(selected.id);
  return (
    <View style={[styles.screen, { backgroundColor: colors.cream }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 30, 44) },
        ]}
      >
        <Pressable testID="button-offline-back" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={[styles.backText, { color: colors.navy }]}>Back to trail</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.create }]}>SCREEN-FREE ADVENTURES</Text>
        <Text style={[styles.offlinePageTitle, { color: colors.navy }]}>Play the next part together.</Text>
        <Text style={[styles.offlinePageCopy, { color: colors.mutedForeground }]}>KidVenture ends with a handoff: a question, a small activity, and time with a real person.</Text>
        <View style={styles.offlineList}>
          {offlineActivities.map((activity) => {
            const isSelected = activity.id === selectedId;
            const isDone = profile.offlineActivitiesCompleted.includes(activity.id);
            const color = colors[activity.color as keyof ReturnType<typeof useColors>] as string;
            return (
              <Pressable
                key={activity.id}
                testID={`offline-${activity.id}`}
                onPress={() => setSelectedId(activity.id)}
                style={[styles.offlineChoice, { backgroundColor: isSelected ? colors.card : colors.background, borderColor: isSelected ? color : colors.border }]}
              >
                <View style={[styles.offlineChoiceIcon, { backgroundColor: color }]}>
                  <Ionicons name={activity.icon} size={22} color={colors.primaryForeground} />
                </View>
                <View style={styles.offlineChoiceCopy}>
                  <Text style={[styles.offlineChoiceTitle, { color: colors.navy }]}>{activity.title}</Text>
                  <Text style={[styles.offlineChoiceText, { color: colors.mutedForeground }]}>{activity.subtitle}</Text>
                  <Text style={[styles.offlineChoiceMinutes, { color }]}>{activity.minutes} min · {isDone ? 'Done together' : 'Pick this one'}</Text>
                </View>
                <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={21} color={isSelected ? color : colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.promptHeading}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.create} />
            <Text style={[styles.promptTitle, { color: colors.navy }]}>Ask each other</Text>
          </View>
          <Text style={[styles.offlinePrompt, { color: colors.navy }]}>{selected.prompt}</Text>
        </View>
        <PrimaryButton
          label={completed ? 'Activity completed' : 'We did it together'}
          onPress={() => onComplete(selected.id)}
          disabled={completed}
          icon={completed ? 'checkmark' : 'people-outline'}
        />
        <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>No photo, score, or upload needed. The memory is the reward.</Text>
      </ScrollView>
    </View>
  );
}

function ParentDashboard({
  profile,
  onBack,
  onSaveSettings,
  onSignOut,
}: {
  profile: Profile;
  onBack: () => void;
  onSaveSettings: (settings: Partial<Profile>) => void;
  onSignOut: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const selectedCompanion = companions.find((item) => item.id === profile.companion) ?? companions[0];
  const insights = [
    profile.completed.includes('create') ? 'Connected physical details to a creative story idea.' : 'Creative confidence is ready for its first spark.',
    profile.completed.includes('learn') ? 'Looked for patterns and explained a thinking process.' : 'A short puzzle is waiting to stretch curiosity.',
    profile.completed.includes('connect') ? 'Noticed how a small kind action affects someone else.' : 'Kindness missions build confidence one action at a time.',
  ];
  const badges = [
    { label: 'Pattern Finder', icon: 'bulb-outline' as const, earned: profile.completed.includes('learn'), color: colors.learn },
    { label: 'Story Spark', icon: 'color-wand-outline' as const, earned: profile.completed.includes('create'), color: colors.create },
    { label: 'Kindness Captain', icon: 'heart-outline' as const, earned: profile.completed.includes('connect'), color: colors.connect },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.cream }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 18), paddingBottom: Math.max(insets.bottom + 30, 44) },
        ]}
      >
        <Pressable testID="button-parent-back" onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={[styles.backText, { color: colors.navy }]}>Back to {profile.name}’s trail</Text>
        </Pressable>
        <View style={styles.parentHeader}>
          <View style={styles.greetingCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>GROWN-UP VIEW</Text>
            <Text style={[styles.greetingTitle, { color: colors.navy }]}>A little window into {profile.name}’s week.</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: getCompanionColor(selectedCompanion, colors) }]}>
            <Ionicons name="bar-chart-outline" size={26} color={colors.primaryForeground} />
          </View>
        </View>

        <View style={[styles.insightLead, { backgroundColor: colors.mint }]}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <Text style={[styles.insightLeadText, { color: colors.navy }]}>
            {profile.completed.length === 0
              ? 'The first mission is ready whenever your explorer is.'
              : `${profile.name} has completed ${profile.completed.length} mission${profile.completed.length === 1 ? '' : 's'} and earned ${profile.completed.length * 3} stars.`}
          </Text>
        </View>

        <Text style={[styles.sectionTitleLarge, { color: colors.navy }]}>Family guardrails</Text>
        <View style={[styles.guardrailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.guardrailHeader}>
            <View style={[styles.guardrailIcon, { backgroundColor: colors.blush }]}>
              <Ionicons name="timer-outline" size={21} color={colors.primary} />
            </View>
            <View style={styles.guardrailCopy}>
              <Text style={[styles.guardrailTitle, { color: colors.navy }]}>Daily focus window</Text>
              <Text style={[styles.guardrailText, { color: colors.mutedForeground }]}>Keep the promise short and predictable.</Text>
            </View>
          </View>
          <View style={styles.limitRow}>
            {[15, 20, 30].map((minutes) => (
              <Pressable
                key={minutes}
                testID={`parent-limit-${minutes}`}
                onPress={() => onSaveSettings({ dailyMinutes: minutes })}
                style={[styles.limitChoice, { backgroundColor: profile.dailyMinutes === minutes ? colors.navy : colors.cream, borderColor: profile.dailyMinutes === minutes ? colors.navy : colors.border }]}
              >
                <Text style={[styles.limitChoiceText, { color: profile.dailyMinutes === minutes ? colors.primaryForeground : colors.navy }]}>{minutes} min</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.consentRow, { borderTopColor: colors.border }]}>
            <View style={[styles.guardrailIconSmall, { backgroundColor: profile.rewardsConsent ? colors.mint : colors.muted }]}>
              <Ionicons name={profile.rewardsConsent ? 'gift-outline' : 'lock-closed-outline'} size={18} color={profile.rewardsConsent ? colors.success : colors.mutedForeground} />
            </View>
            <View style={styles.guardrailCopy}>
              <Text style={[styles.guardrailTitle, { color: colors.navy }]}>Unlock experience rewards</Text>
              <Text style={[styles.guardrailText, { color: colors.mutedForeground }]}>Only you decide what each level leads to.</Text>
            </View>
            <Pressable
              testID="button-toggle-rewards-consent"
              onPress={() => onSaveSettings({ rewardsConsent: !profile.rewardsConsent })}
              style={[styles.toggle, { backgroundColor: profile.rewardsConsent ? colors.success : colors.muted }]}
            >
              <View style={[styles.toggleKnob, { backgroundColor: colors.card, alignSelf: profile.rewardsConsent ? 'flex-end' : 'flex-start' }]} />
            </Pressable>
          </View>
          <TextInput
            testID="input-reward-name"
            value={profile.rewardName}
            onChangeText={(rewardName) => onSaveSettings({ rewardName })}
            placeholder="e.g. choose Saturday breakfast"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.rewardInput, { backgroundColor: colors.cream, color: colors.navy, borderColor: colors.border }]}
            maxLength={42}
          />
        </View>

        <Text style={[styles.sectionTitleLarge, { color: colors.navy }]}>Growing across three paths</Text>
        <View style={styles.scoreList}>
          {missions.map((mission) => {
            const score = profile.scores[mission.pillar];
            const pillarColor = getPillarColor(mission.pillar, colors);
            return (
              <View key={mission.pillar} style={[styles.scoreRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.scoreIcon, { backgroundColor: pillarColor }]}>
                  <Ionicons name={mission.icon} size={20} color={colors.primaryForeground} />
                </View>
                <View style={styles.scoreDetails}>
                  <View style={styles.scoreTopLine}>
                    <Text style={[styles.scoreLabel, { color: colors.navy }]}>{mission.label}</Text>
                    <Text style={[styles.scoreValue, { color: pillarColor }]}>{score ? 'Growing' : 'Ready to begin'}</Text>
                  </View>
                  <View style={[styles.scoreTrack, { backgroundColor: colors.muted }]}>
                    <View style={[styles.scoreFill, { backgroundColor: pillarColor, width: `${score}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitleLarge, { color: colors.navy }]}>Recent insights</Text>
        <View style={styles.insightList}>
          {insights.map((insight, index) => (
            <View key={insight} style={[styles.insightRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.insightDot, { backgroundColor: [colors.learn, colors.create, colors.connect][index] }]} />
              <Text style={[styles.insightText, { color: colors.navy }]}>{insight}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitleLarge, { color: colors.navy }]}>Badge shelf</Text>
        <View style={styles.badgeShelf}>
          {badges.map((badge) => (
            <View key={badge.label} style={[styles.shelfBadge, { backgroundColor: badge.earned ? colors.card : colors.muted, borderColor: badge.earned ? badge.color : colors.border, opacity: badge.earned ? 1 : 0.64 }]}>
              <View style={[styles.shelfBadgeIcon, { backgroundColor: badge.earned ? badge.color : colors.mutedForeground }]}>
                <Ionicons name={badge.icon} size={21} color={colors.primaryForeground} />
              </View>
              <Text style={[styles.shelfBadgeLabel, { color: colors.navy }]}>{badge.label}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.weeklyNote, { backgroundColor: colors.lavender }]}>
          <Ionicons name="mail-open-outline" size={23} color={colors.create} />
          <View style={styles.weeklyCopy}>
            <Text style={[styles.weeklyTitle, { color: colors.navy }]}>Weekly note</Text>
            <Text style={[styles.weeklyText, { color: colors.navy }]}>Keep asking “what do you think?” It gives growing ideas room to become bigger.</Text>
          </View>
        </View>
        <Pressable testID="button-sign-out" onPress={onSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Log out of this family account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function KidVentureHome() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const [screen, setScreen] = useState<Screen>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(ACCOUNT_KEY)])
      .then(([storedProfile, storedAccount]) => {
        if (storedAccount) {
          setAccount(JSON.parse(storedAccount) as Account);
          setAuthMode('login');
        }
        if (storedProfile) {
          setProfile(normalizeProfile(JSON.parse(storedProfile) as Partial<Profile>));
          setScreen('home');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = (nextProfile: Profile) => {
    const normalized = normalizeProfile(nextProfile);
    setProfile(normalized);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  };

  const startAdventure = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({ ...profile, completed: [], scores: { learn: 0, create: 0, connect: 0 }, streak: 1, totalStars: 0, level: 1, minutesUsedToday: 0 });
    setScreen('home');
  };

  const completeMission = (pillar: Pillar) => {
    const isNew = !profile.completed.includes(pillar);
    const nextProfile: Profile = {
      ...profile,
      completed: isNew ? [...profile.completed, pillar] : profile.completed,
      scores: { ...profile.scores, [pillar]: 100 },
      streak: Math.max(profile.streak, 1),
      totalStars: profile.totalStars + (isNew ? 3 : 0),
    };
    updateProfile(nextProfile);
  };

  const completeOfflineActivity = (activityId: string) => {
    if (profile.offlineActivitiesCompleted.includes(activityId)) return;
    updateProfile({
      ...profile,
      offlineActivitiesCompleted: [...profile.offlineActivitiesCompleted, activityId],
      totalStars: profile.totalStars + 2,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveTimer = (secondsLeft: number, minutesUsed: number) => {
    updateProfile({ ...profile, timerSecondsLeft: secondsLeft, timerRunning: false, minutesUsedToday: minutesUsed });
  };

  const handleAuth = (nextAccount: Account) => {
    if (authMode === 'register') {
      const nextProfile = normalizeProfile({ ...initialProfile, name: nextAccount.childName });
      setAccount(nextAccount);
      updateProfile(nextProfile);
      AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
      setScreen('onboarding');
      return true;
    }
    if (account && account.email === nextAccount.email && account.passcode === nextAccount.passcode) {
      setScreen('home');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return false;
  };

  const signOut = () => {
    setAccount(null);
    setProfile(initialProfile);
    setScreen('auth');
    setAuthMode('login');
    AsyncStorage.multiRemove([ACCOUNT_KEY, STORAGE_KEY]);
  };

  const demoProfile: Profile = {
    name: 'Aarav',
    age: 9,
    companion: 'nova',
    interests: ['Dinosaurs', 'Football', 'Drawing'],
    completed: ['learn', 'create'],
    scores: { learn: 76, create: 100, connect: 0 },
    streak: 4,
    totalStars: 9,
    level: 2,
    dailyMinutes: 20,
    minutesUsedToday: 8,
    rewardsConsent: true,
    rewardName: 'choose Saturday breakfast',
    timerSecondsLeft: 12 * 60,
    timerRunning: false,
    offlineActivitiesCompleted: ['kitchen-lab'],
  };

  if (demo === 'onboarding') {
    return <Onboarding profile={{ ...initialProfile, name: 'Aarav', interests: ['Dinosaurs', 'Football', 'Drawing'] }} setProfile={() => undefined} onStart={() => undefined} />;
  }
  if (demo === 'home') {
    return <Home profile={demoProfile} onMission={() => undefined} onParent={() => undefined} onTimer={() => undefined} onRewards={() => undefined} onOffline={() => undefined} />;
  }
  if (demo === 'mission') {
    return <MissionDetail mission={missions[1]} profile={demoProfile} onBack={() => undefined} onComplete={() => undefined} />;
  }
  if (demo === 'feedback') {
    return <MissionDetail mission={missions[1]} profile={demoProfile} onBack={() => undefined} onComplete={() => undefined} initialState="feedback" />;
  }
  if (demo === 'parent') {
    return <ParentDashboard profile={{ ...demoProfile, completed: ['learn', 'create', 'connect'], scores: { learn: 76, create: 100, connect: 63 }, streak: 5 }} onBack={() => undefined} onSaveSettings={() => undefined} onSignOut={() => undefined} />;
  }
  if (demo === 'timer') {
    return <TimerScreen profile={demoProfile} onBack={() => undefined} onSave={() => undefined} />;
  }
  if (demo === 'rewards') {
    return <RewardsScreen profile={demoProfile} onBack={() => undefined} onParent={() => undefined} />;
  }
  if (demo === 'offline') {
    return <OfflineActivityScreen profile={demoProfile} onBack={() => undefined} onComplete={() => undefined} />;
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centeredScreen, { backgroundColor: '#fff9f0' }]}>
        <Image source={mascot} style={styles.loadingMascot} resizeMode="contain" />
        <ActivityIndicator size="small" color="#ff7a45" />
        <Text style={[styles.loadingText, { color: '#18324b' }]}>Packing your adventure...</Text>
      </View>
    );
  }

  if (screen === 'auth') {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={handleAuth} />;
  }
  if (screen === 'onboarding') {
    return <Onboarding profile={profile} setProfile={setProfile} onStart={startAdventure} />;
  }
  if (screen === 'mission' && selectedMission) {
    return (
      <MissionDetail
        mission={selectedMission}
        profile={profile}
        onBack={() => {
          setSelectedMission(null);
          setScreen('home');
        }}
        onComplete={completeMission}
      />
    );
  }
  if (screen === 'parent') {
    return (
      <ParentDashboard
        profile={profile}
        onBack={() => setScreen('home')}
        onSaveSettings={(settings) => updateProfile({ ...profile, ...settings })}
        onSignOut={signOut}
      />
    );
  }
  if (screen === 'timer') {
    return <TimerScreen profile={profile} onBack={() => setScreen('home')} onSave={saveTimer} />;
  }
  if (screen === 'rewards') {
    return <RewardsScreen profile={profile} onBack={() => setScreen('home')} onParent={() => setScreen('parent')} />;
  }
  if (screen === 'offline') {
    return <OfflineActivityScreen profile={profile} onBack={() => setScreen('home')} onComplete={completeOfflineActivity} />;
  }
  return (
    <Home
      profile={profile}
      onMission={(mission) => {
        setSelectedMission(mission);
        setScreen('mission');
      }}
      onParent={() => setScreen('parent')}
      onTimer={() => setScreen('timer')}
      onRewards={() => setScreen('rewards')}
      onOffline={() => setScreen('offline')}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centeredScreen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  onboardingContent: { paddingHorizontal: 20 },
  homeContent: { paddingHorizontal: 20 },
  detailContent: { paddingHorizontal: 20 },
  topBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  brandTagline: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 1 },
  parentButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1 },
  parentButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  welcomeBlock: { alignItems: 'center', marginBottom: 24 },
  mascotHalo: { width: 172, height: 158, borderRadius: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mascotImage: { width: 148, height: 148 },
  starBubble: { position: 'absolute', right: 8, top: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4, marginBottom: 7 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 32, letterSpacing: -0.8, textAlign: 'center', maxWidth: 340 },
  welcomeCopy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340, marginTop: 10 },
  formSection: { marginBottom: 24 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.3, marginBottom: 11 },
  selectionCount: { fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 11 },
  nameInput: { minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontFamily: 'Inter_500Medium', fontSize: 16 },
  ageRow: { flexDirection: 'row', gap: 10 },
  ageChoice: { flex: 1, minHeight: 64, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ageNumber: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  ageLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  companionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  companionCard: { width: '31.7%', minHeight: 118, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, position: 'relative' },
  companionIcon: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  companionName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  companionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2, textAlign: 'center' },
  selectedCheck: { position: 'absolute', right: 5, top: 5, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  interestChip: { width: '48.4%', minHeight: 45, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  interestLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  primaryButton: { minHeight: 58, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginTop: 4 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  privacyNote: { fontFamily: 'Inter_400Regular', textAlign: 'center', fontSize: 11, marginTop: 11 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  helloText: { fontFamily: 'Inter_500Medium', fontSize: 15, marginBottom: 4 },
  greetingTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 29, letterSpacing: -0.7 },
  avatarCircle: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressCard: { borderRadius: 24, padding: 20, marginBottom: 28 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  progressTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  streakBadge: { borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 9 },
  streakText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  progressTrack: { height: 9, borderRadius: 5, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: 9, borderRadius: 5 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressCaption: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  missionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitleLarge: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, marginBottom: 14 },
  starCount: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 14 },
  starCountText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  missionList: { gap: 12 },
  missionCard: { minHeight: 154, borderRadius: 22, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  missionAccent: { width: 7 },
  missionCardBody: { flex: 1, padding: 16 },
  missionCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pillarIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  missionCardMeta: { flex: 1, marginLeft: 10 },
  missionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, marginBottom: 3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  doneMark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  missionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 21, marginBottom: 5 },
  missionDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  helperStrip: { marginTop: 22, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center' },
  helperImage: { width: 68, height: 68, marginRight: 10 },
  helperCopy: { flex: 1 },
  helperTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 },
  helperText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 40, marginBottom: 19 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  detailPillar: { minHeight: 62, borderRadius: 19, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailPillarText: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.2, flex: 1 },
  detailTime: { borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8 },
  detailTimeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 36, letterSpacing: -1, marginTop: 20 },
  detailInstructions: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 22 },
  promptCard: { borderRadius: 22, borderWidth: 1, padding: 15, marginBottom: 14 },
  promptHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  promptTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  answerInput: { minHeight: 190, borderRadius: 16, borderWidth: 1, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23 },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  inputHint: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  characterCount: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  thinkingHalo: { width: 178, height: 178, borderRadius: 89, alignItems: 'center', justifyContent: 'center' },
  thinkingMascot: { width: 160, height: 160 },
  thinkingSpinner: { marginTop: 28 },
  thinkingTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center', marginTop: 12 },
  thinkingCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 7 },
  feedbackHero: { borderRadius: 26, padding: 22, alignItems: 'center', marginBottom: 14 },
  feedbackBadge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  feedbackEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 7 },
  feedbackTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.6, textAlign: 'center' },
  feedbackCopy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 11 },
  badgeCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  badgeIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badgeCopy: { flex: 1 },
  badgeEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3, marginBottom: 3 },
  badgeTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  badgeDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  loadingMascot: { width: 154, height: 154, marginBottom: 14 },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 10 },
  parentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  insightLead: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 20, padding: 16, marginBottom: 25 },
  insightLeadText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  scoreList: { gap: 10, marginBottom: 27 },
  scoreRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 12 },
  scoreIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  scoreDetails: { flex: 1 },
  scoreTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  scoreLabel: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  scoreValue: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  scoreTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: 7, borderRadius: 4 },
  insightList: { gap: 9, marginBottom: 27 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 17, borderWidth: 1, padding: 14 },
  insightDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  insightText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  badgeShelf: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  shelfBadge: { flex: 1, minHeight: 106, borderRadius: 17, borderWidth: 1, padding: 9, alignItems: 'center', justifyContent: 'center' },
  shelfBadgeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  shelfBadgeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 13, textAlign: 'center' },
  weeklyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 19, padding: 15 },
  weeklyCopy: { flex: 1 },
  weeklyTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 4 },
  weeklyText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  authContent: { paddingHorizontal: 20 },
  authHero: { alignItems: 'center', marginBottom: 22 },
  authMascotHalo: { width: 132, height: 124, borderRadius: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  authMascot: { width: 116, height: 116 },
  authTitle: { fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 32, letterSpacing: -0.7, textAlign: 'center', maxWidth: 340 },
  authCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 335, marginTop: 9 },
  authCard: { borderRadius: 23, borderWidth: 1, padding: 16 },
  authTabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  authTab: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  authTabText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  authField: { marginBottom: 13 },
  authLabel: { fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 7 },
  authError: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 5 },
  promiseCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 22 },
  promiseIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  promiseCopy: { flex: 1 },
  promiseTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 3 },
  promiseText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  homeToolGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  focusCard: { flex: 1, minHeight: 142, borderRadius: 20, borderWidth: 1, padding: 13 },
  toolIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  toolEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.05, marginBottom: 4 },
  toolTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  toolText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 14, marginTop: 22 },
  offlineIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  offlineCopy: { flex: 1, paddingRight: 8 },
  offlineEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, marginBottom: 4 },
  offlineTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 },
  offlineText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  timerContent: { paddingHorizontal: 20 },
  timerHeading: { alignItems: 'center', marginBottom: 20 },
  timerTitle: { fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 32, letterSpacing: -0.7, textAlign: 'center' },
  timerCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9, maxWidth: 340 },
  timerDial: { width: 246, height: 246, borderRadius: 123, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderWidth: 9, marginBottom: 22 },
  timerDialInner: { width: 214, height: 214, borderRadius: 107, alignItems: 'center', justifyContent: 'center' },
  timerDigits: { fontFamily: 'Inter_700Bold', fontSize: 48, letterSpacing: -1.5, marginTop: 6 },
  timerStatus: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 },
  budgetCard: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 14 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  budgetValue: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  budgetNote: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 9 },
  timerActions: { gap: 10 },
  secondaryButton: { minHeight: 50, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  timerTip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 14, marginTop: 18 },
  timerTipText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18 },
  rewardsHero: { alignItems: 'center', marginBottom: 19 },
  rewardsOrb: { width: 80, height: 80, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  rewardsCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  rewardConsentBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 17 },
  rewardConsentCopy: { flex: 1, marginLeft: 10 },
  rewardConsentTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 3 },
  rewardConsentText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  levelList: { gap: 10, marginBottom: 16 },
  levelRow: { minHeight: 80, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  levelNumber: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  levelNumberText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  levelCopy: { flex: 1 },
  levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  levelTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  levelDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  levelStars: { fontFamily: 'Inter_700Bold', fontSize: 10, marginTop: 4 },
  offlinePageTitle: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 34, letterSpacing: -0.8 },
  offlinePageCopy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 20 },
  offlineList: { gap: 10, marginBottom: 14 },
  offlineChoice: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 12 },
  offlineChoiceIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  offlineChoiceCopy: { flex: 1 },
  offlineChoiceTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  offlineChoiceText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  offlineChoiceMinutes: { fontFamily: 'Inter_700Bold', fontSize: 10, marginTop: 4 },
  offlinePrompt: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 22 },
  guardrailCard: { borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 26 },
  guardrailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  guardrailIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  guardrailIconSmall: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  guardrailCopy: { flex: 1 },
  guardrailTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 3 },
  guardrailText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  limitRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  limitChoice: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  limitChoiceText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  consentRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 13, marginBottom: 13 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  rewardInput: { minHeight: 44, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 12 },
  signOutButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13 },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});