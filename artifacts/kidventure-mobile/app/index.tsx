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
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Pillar = 'learn' | 'create' | 'connect';
type Screen = 'onboarding' | 'home' | 'mission' | 'parent';

type Profile = {
  name: string;
  age: number;
  companion: string;
  interests: string[];
  completed: Pillar[];
  scores: Record<Pillar, number>;
  streak: number;
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
};

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
            Pick a buddy and three things you love. We’ll turn them into adventures made just for you.
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
            {[8, 9, 10].map((age) => {
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
}: {
  profile: Profile;
  onMission: (mission: Mission) => void;
  onParent: () => void;
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
}: {
  mission: Mission;
  profile: Profile;
  onBack: () => void;
  onComplete: (pillar: Pillar) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<'writing' | 'thinking' | 'feedback'>('writing');
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

function ParentDashboard({ profile, onBack }: { profile: Profile; onBack: () => void }) {
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
      </ScrollView>
    </View>
  );
}

export default function KidVentureHome() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setProfile(JSON.parse(stored) as Profile);
          setScreen('home');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = (nextProfile: Profile) => {
    setProfile(nextProfile);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
  };

  const startAdventure = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({ ...profile, completed: [], scores: { learn: 0, create: 0, connect: 0 }, streak: 1 });
    setScreen('home');
  };

  const completeMission = (pillar: Pillar) => {
    const nextProfile: Profile = {
      ...profile,
      completed: profile.completed.includes(pillar) ? profile.completed : [...profile.completed, pillar],
      scores: { ...profile.scores, [pillar]: 100 },
      streak: Math.max(profile.streak, 1),
    };
    updateProfile(nextProfile);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centeredScreen, { backgroundColor: '#fff9f0' }]}>
        <Image source={mascot} style={styles.loadingMascot} resizeMode="contain" />
        <ActivityIndicator size="small" color="#ff7a45" />
        <Text style={[styles.loadingText, { color: '#18324b' }]}>Packing your adventure...</Text>
      </View>
    );
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
    return <ParentDashboard profile={profile} onBack={() => setScreen('home')} />;
  }
  return (
    <Home
      profile={profile}
      onMission={(mission) => {
        setSelectedMission(mission);
        setScreen('mission');
      }}
      onParent={() => setScreen('parent')}
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
});