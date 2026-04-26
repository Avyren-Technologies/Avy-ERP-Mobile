/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';

import {
  useCreateSafetyInduction,
  useDeleteSafetyInduction,
  useUpdateSafetyInduction,
} from '@/features/company-admin/api/use-visitor-mutations';
import { useSafetyInductions } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface InductionItem {
  id: string;
  name: string;
  type: string; // VIDEO | SLIDES | QUESTIONNAIRE | DECLARATION
  contentUrl: string | null;
  questions: unknown;
  declarationText: string | null;
  passingScore: number | null;
  durationSeconds: number | null;
  validityDays: number | null;
  isActive: boolean;
}

// ============ TYPE CONFIG ============

const INDUCTION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  VIDEO: { label: 'Video', bg: colors.info[50], text: colors.info[700] },
  SLIDES: { label: 'Slides', bg: colors.accent[50], text: colors.accent[700] },
  QUESTIONNAIRE: { label: 'Questionnaire', bg: colors.warning[50], text: colors.warning[700] },
  DECLARATION: { label: 'Declaration', bg: colors.primary[50], text: colors.primary[700] },
};

// ============ URL HELPERS ============

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
}

// ============ PREVIEW MODAL ============

function PreviewModal({
  visible,
  onClose,
  induction,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly induction: InductionItem | null;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  if (!induction) return null;

  const handleOpenUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showErrorMessage('Cannot open this URL on your device.');
      }
    } catch {
      showErrorMessage('Failed to open URL.');
    }
  };

  const typeCfg = INDUCTION_TYPE_CONFIG[induction.type] ?? { label: induction.type, bg: colors.neutral[100], text: colors.neutral[500] };

  const renderContent = () => {
    const url = induction.contentUrl ?? '';

    if (induction.type === 'VIDEO' && url) {
      const isYT = isYouTubeUrl(url);
      const isVim = isVimeoUrl(url);
      const sourceLabel = isYT ? 'YouTube Video' : isVim ? 'Vimeo Video' : 'Video File';

      return (
        <View style={previewStyles.contentSection}>
          <View style={[previewStyles.iconWrap, { backgroundColor: colors.info[50] }]}>
            <Svg width={32} height={32} viewBox="0 0 24 24">
              <Path d="M15 12l-6 4V8l6 4z" fill={colors.info[600]} />
              <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={colors.info[600]} strokeWidth="1.5" fill="none" />
            </Svg>
          </View>
          <Text className="mt-3 font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">{sourceLabel}</Text>
          <Text className="mt-1 font-inter text-xs text-neutral-400 dark:text-neutral-500 text-center" numberOfLines={2}>{url}</Text>
          <Pressable onPress={() => handleOpenUrl(url)} style={previewStyles.openBtn}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="font-inter text-sm font-bold text-white">Open Video</Text>
          </Pressable>
        </View>
      );
    }

    if (induction.type === 'SLIDES' && url) {
      return (
        <View style={previewStyles.contentSection}>
          <View style={[previewStyles.iconWrap, { backgroundColor: colors.accent[50] }]}>
            <Svg width={32} height={32} viewBox="0 0 24 24">
              <Path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke={colors.accent[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </Svg>
          </View>
          <Text className="mt-3 font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Slides Content</Text>
          <Text className="mt-1 font-inter text-xs text-neutral-400 dark:text-neutral-500 text-center" numberOfLines={2}>{url}</Text>
          <Pressable onPress={() => handleOpenUrl(url)} style={[previewStyles.openBtn, { backgroundColor: colors.accent[600] }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="font-inter text-sm font-bold text-white">Open Slides</Text>
          </Pressable>
        </View>
      );
    }

    if (induction.type === 'QUESTIONNAIRE') {
      const rawQ = induction.questions ?? induction.contentUrl;
      let parsed: any[] | null = null;
      if (typeof rawQ === 'string') {
        try { parsed = JSON.parse(rawQ); } catch { parsed = null; }
      } else if (Array.isArray(rawQ)) {
        parsed = rawQ;
      }

      if (parsed && parsed.length > 0) {
        return (
          <View style={previewStyles.contentSection}>
            <Text className="font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Questionnaire ({parsed.length} question{parsed.length !== 1 ? 's' : ''})
            </Text>
            <ScrollView style={previewStyles.scrollContent} nestedScrollEnabled showsVerticalScrollIndicator>
              {parsed.map((q: any, idx: number) => (
                <View key={idx} style={[previewStyles.codeBlock, { marginBottom: 12 }]}>
                  <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white mb-2">
                    {idx + 1}. {q.question}
                  </Text>
                  {(q.options ?? []).map((opt: string, oIdx: number) => (
                    <View key={oIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: q.correctAnswer === oIdx ? colors.success[50] : 'transparent', marginBottom: 2 }}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: q.correctAnswer === oIdx ? colors.success[500] : colors.neutral[300], justifyContent: 'center', alignItems: 'center' }}>
                        {q.correctAnswer === oIdx && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success[500] }} />}
                      </View>
                      <Text className={`font-inter text-sm ${q.correctAnswer === oIdx ? 'font-semibold text-success-700' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        {opt}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        );
      }

      return (
        <View style={previewStyles.contentSection}>
          <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">No questionnaire data available.</Text>
        </View>
      );
    }

    if (induction.type === 'DECLARATION') {
      const content = induction.declarationText ?? induction.contentUrl ?? '';
      return (
        <View style={previewStyles.contentSection}>
          <Text className="font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Declaration Text</Text>
          <ScrollView style={previewStyles.scrollContent} nestedScrollEnabled showsVerticalScrollIndicator>
            <View style={previewStyles.codeBlock}>
              <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300">
                {content || 'No declaration text available.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={previewStyles.contentSection}>
        <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">No preview available for this induction.</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.white }}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />

        <View style={[formStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={formStyles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white" numberOfLines={1}>{induction.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[previewStyles.typeBadge, { backgroundColor: typeCfg.bg }]}>
                <Text className="font-inter text-[10px] font-bold" style={{ color: typeCfg.text }}>{typeCfg.label}</Text>
              </View>
              <View style={[previewStyles.typeBadge, { backgroundColor: induction.isActive ? colors.success[50] : colors.neutral[100] }]}>
                <Text className={`font-inter text-[10px] font-bold ${induction.isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                  {induction.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 40 }}>
          {/* Meta chips */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {induction.passingScore != null && (
              <View style={previewStyles.metaChip}>
                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">Pass: {induction.passingScore}%</Text>
              </View>
            )}
            {induction.durationSeconds != null && (
              <View style={previewStyles.metaChip}>
                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">Duration: {induction.durationSeconds}s</Text>
              </View>
            )}
            {induction.validityDays != null && (
              <View style={previewStyles.metaChip}>
                <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">Validity: {induction.validityDays} days</Text>
              </View>
            )}
          </View>

          {renderContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============ FORM MODAL ============

function InductionFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSaving,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly initialData: InductionItem | null;
  readonly isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [inductionType, setInductionType] = React.useState('VIDEO');
  const [contentUrl, setContentUrl] = React.useState('');
  const [passingScore, setPassingScore] = React.useState('');
  const [durationSeconds, setDurationSeconds] = React.useState('');
  const [validityDays, setValidityDays] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Questionnaire state
  const [questions, setQuestions] = React.useState<{ question: string; options: string[]; correctAnswer: number }[]>([]);

  React.useEffect(() => {
    if (visible) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setInductionType(initialData.type || 'VIDEO');
        setContentUrl(initialData.contentUrl ?? '');
        setPassingScore(initialData.passingScore != null ? String(initialData.passingScore) : '');
        setDurationSeconds(initialData.durationSeconds != null ? String(initialData.durationSeconds) : '');
        setValidityDays(initialData.validityDays != null ? String(initialData.validityDays) : '');
        setIsActive(initialData.isActive);
        // Parse questions
        if (initialData.type === 'QUESTIONNAIRE' && initialData.questions) {
          try {
            const parsed = typeof initialData.questions === 'string' ? JSON.parse(initialData.questions) : initialData.questions;
            if (Array.isArray(parsed)) setQuestions(parsed);
            else setQuestions([]);
          } catch { setQuestions([]); }
        } else {
          setQuestions([]);
        }
      } else {
        setName(''); setInductionType('VIDEO'); setContentUrl(''); setPassingScore('');
        setDurationSeconds(''); setValidityDays(''); setIsActive(true); setQuestions([]);
      }
    }
  }, [visible, initialData]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: '', options: ['', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (idx: number, field: string, value: unknown) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if ((inductionType === 'VIDEO' || inductionType === 'SLIDES') && !contentUrl.trim()) e.contentUrl = 'Content URL is required';
    if (inductionType === 'QUESTIONNAIRE' && questions.length === 0) e.questions = 'Add at least one question';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload: Record<string, unknown> = {
      name: name.trim(),
      type: inductionType,
      passingScore: passingScore.trim() ? Number(passingScore) : undefined,
      durationSeconds: durationSeconds.trim() ? Number(durationSeconds) : undefined,
      validityDays: validityDays.trim() ? Number(validityDays) : undefined,
    };
    if (inductionType === 'VIDEO' || inductionType === 'SLIDES') {
      payload.contentUrl = contentUrl.trim() || undefined;
    }
    if (inductionType === 'QUESTIONNAIRE') {
      payload.questions = questions.filter(q => q.question.trim());
    }
    if (inductionType === 'DECLARATION') {
      payload.contentUrl = contentUrl.trim() || undefined; // declaration text stored as contentUrl
    }
    onSave(payload);
  };

  const TYPES = ['VIDEO', 'SLIDES', 'QUESTIONNAIRE', 'DECLARATION'];

  return (
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.white }}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />

        <View style={[formStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={formStyles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{initialData ? 'Edit Induction' : 'New Induction'}</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "Safety Orientation"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} />
              </View>
              {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TYPES.map(t => {
                  const selected = t === inductionType;
                  return (
                    <Pressable key={t} onPress={() => setInductionType(t)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{t.replace(/_/g, ' ')}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Type-specific content fields */}
            {(inductionType === 'VIDEO' || inductionType === 'SLIDES') && (
              <View style={formStyles.fieldWrap}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                  {inductionType === 'VIDEO' ? 'Video URL' : 'Slides URL'} <Text className="text-danger-500">*</Text>
                </Text>
                <View style={[formStyles.inputWrap, !!errors.contentUrl && { borderColor: colors.danger[300] }]}>
                  <TextInput
                    style={[formStyles.textInput, isDark && { color: colors.white }]}
                    placeholder={inductionType === 'VIDEO' ? 'https://youtube.com/watch?v=... or direct URL' : 'https://docs.google.com/presentation/...'}
                    placeholderTextColor={colors.neutral[400]}
                    value={contentUrl}
                    onChangeText={(v) => { setContentUrl(v); if (errors.contentUrl) setErrors(prev => ({ ...prev, contentUrl: '' })); }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
                {!!errors.contentUrl && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.contentUrl}</Text>}
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                  {inductionType === 'VIDEO' ? 'Supports YouTube, Vimeo, or direct video URLs' : 'Paste a link to your presentation'}
                </Text>
              </View>
            )}

            {inductionType === 'DECLARATION' && (
              <View style={formStyles.fieldWrap}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Declaration Text</Text>
                <View style={[formStyles.inputWrap, { height: 120 }]}>
                  <TextInput
                    style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]}
                    placeholder="Enter the declaration text visitors must acknowledge..."
                    placeholderTextColor={colors.neutral[400]}
                    value={contentUrl}
                    onChangeText={setContentUrl}
                    multiline
                  />
                </View>
              </View>
            )}

            {inductionType === 'QUESTIONNAIRE' && (
              <View style={formStyles.fieldWrap}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                    Questions <Text className="text-danger-500">*</Text>
                  </Text>
                  <Pressable onPress={addQuestion} style={qStyles.addBtn}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </Svg>
                    <Text className="font-inter text-xs font-bold text-primary-600 ml-1">Add Question</Text>
                  </Pressable>
                </View>
                {!!errors.questions && <Text className="mb-2 font-inter text-[10px] text-danger-500 font-medium">{errors.questions}</Text>}

                {questions.map((q, qIdx) => (
                  <View key={qIdx} style={qStyles.questionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-300">Question {qIdx + 1}</Text>
                      <Pressable onPress={() => removeQuestion(qIdx)} hitSlop={8}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                          <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                        </Svg>
                      </Pressable>
                    </View>

                    <View style={[formStyles.inputWrap, { marginBottom: 8 }]}>
                      <TextInput
                        style={[formStyles.textInput, isDark && { color: colors.white }]}
                        placeholder="Enter question..."
                        placeholderTextColor={colors.neutral[400]}
                        value={q.question}
                        onChangeText={(v) => updateQuestion(qIdx, 'question', v)}
                      />
                    </View>

                    <Text className="mb-1 font-inter text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase">Options (tap to mark correct)</Text>
                    {q.options.map((opt, oIdx) => (
                      <Pressable key={oIdx} onPress={() => updateQuestion(qIdx, 'correctAnswer', oIdx)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <View style={[qStyles.radioOuter, q.correctAnswer === oIdx && qStyles.radioOuterActive]}>
                          {q.correctAnswer === oIdx && <View style={qStyles.radioInner} />}
                        </View>
                        <View style={[formStyles.inputWrap, { flex: 1, height: 40 }]}>
                          <TextInput
                            style={[formStyles.textInput, isDark && { color: colors.white }, { fontSize: 13 }]}
                            placeholder={`Option ${oIdx + 1}`}
                            placeholderTextColor={colors.neutral[400]}
                            value={opt}
                            onChangeText={(v) => updateOption(qIdx, oIdx, v)}
                          />
                        </View>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => addOption(qIdx)} style={qStyles.addOptionBtn}>
                      <Text className="font-inter text-[10px] font-semibold text-primary-600">+ Add Option</Text>
                    </Pressable>
                  </View>
                ))}

                {questions.length === 0 && (
                  <View style={qStyles.emptyState}>
                    <Text className="font-inter text-sm text-neutral-400 text-center">No questions added yet. Tap "Add Question" to start building your questionnaire.</Text>
                  </View>
                )}
              </View>
            )}

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Passing Score (%)</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="e.g. 80" placeholderTextColor={colors.neutral[400]} value={passingScore} onChangeText={setPassingScore} keyboardType="number-pad" />
              </View>
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Duration (seconds)</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="e.g. 120" placeholderTextColor={colors.neutral[400]} value={durationSeconds} onChangeText={setDurationSeconds} keyboardType="number-pad" />
              </View>
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Validity (days)</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="e.g. 90" placeholderTextColor={colors.neutral[400]} value={validityDays} onChangeText={setValidityDays} keyboardType="number-pad" />
              </View>
            </View>

            {/* Active Toggle */}
            <Pressable onPress={() => setIsActive(!isActive)} style={formStyles.toggleRow}>
              <Text className="font-inter text-sm text-primary-950 dark:text-white">Active</Text>
              <View style={[formStyles.toggleTrack, isActive && formStyles.toggleTrackActive]}>
                <View style={[formStyles.toggleThumb, isActive && formStyles.toggleThumbActive]} />
              </View>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Pressable onPress={onClose} style={formStyles.cancelBtn}>
                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={isSaving} style={[formStyles.saveBtn, isSaving && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'UPDATE' : 'CREATE'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============ INDUCTION CARD ============

function InductionCard({
  item,
  index,
  onEdit,
  onDelete,
  onPreview,
}: {
  readonly item: InductionItem;
  readonly index: number;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onPreview: () => void;
}) {
  const typeCfg = INDUCTION_TYPE_CONFIG[item.type] ?? { label: item.type, bg: colors.neutral[100], text: colors.neutral[500] };

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <Pressable onPress={onEdit} style={({ pressed }) => [cardStyles.card, pressed && cardStyles.cardPressed]}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={onPreview} hitSlop={8} style={cardStyles.previewBtn}>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
                <Path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke={colors.accent[600]} strokeWidth="1.8" fill="none" />
              </Svg>
              <Text className="font-inter text-[10px] font-bold text-accent-600">Preview</Text>
            </Pressable>
            <View style={[cardStyles.statusBadge, { backgroundColor: item.isActive ? colors.success[50] : colors.neutral[100] }]}>
              <View style={[cardStyles.statusDot, { backgroundColor: item.isActive ? colors.success[500] : colors.neutral[400] }]} />
              <Text className={`font-inter text-[10px] font-bold ${item.isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          <View style={[cardStyles.metaChip, { backgroundColor: typeCfg.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: typeCfg.text }}>{typeCfg.label}</Text>
          </View>
          {item.passingScore != null ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Pass: {item.passingScore}%</Text>
            </View>
          ) : null}
          {item.durationSeconds != null ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.durationSeconds}s</Text>
            </View>
          ) : null}
          {item.validityDays != null ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.validityDays} days</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function SafetyInductionsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [formVisible, setFormVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InductionItem | null>(null);
  const [previewItem, setPreviewItem] = React.useState<InductionItem | null>(null);

  const { data: response, isLoading, error, refetch, isFetching } = useSafetyInductions();
  const createMutation = useCreateSafetyInduction();
  const updateMutation = useUpdateSafetyInduction();
  const deleteMutation = useDeleteSafetyInduction();

  const items: InductionItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((i: any) => ({
      id: i.id ?? '',
      name: i.name ?? '',
      type: i.type ?? 'VIDEO',
      contentUrl: i.contentUrl ?? null,
      questions: i.questions ?? null,
      declarationText: i.declarationText ?? null,
      passingScore: i.passingScore ?? null,
      durationSeconds: i.durationSeconds ?? null,
      validityDays: i.validityDays ?? null,
      isActive: i.isActive !== false,
    }));
  }, [response]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
  }, [items, search]);

  const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
  const handleEdit = (item: InductionItem) => { setEditingItem(item); setFormVisible(true); };

  const handleDelete = (item: InductionItem) => {
    showConfirm({
      title: 'Delete Induction',
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(item.id, {
        onSuccess: () => showSuccess('Induction deleted'),
      }),
    });
  };

  const handleSave = (data: Record<string, unknown>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => { setFormVisible(false); showSuccess('Induction updated'); } });
    } else {
      createMutation.mutate(data, { onSuccess: () => { setFormVisible(false); showSuccess('Induction created'); } });
    }
  };

  const renderItem = ({ item, index }: { readonly item: InductionItem; readonly index: number }) => (
    <InductionCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onPreview={() => setPreviewItem(item)} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Safety Inductions</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} induction{items.length !== 1 ? 's' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or type..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No inductions match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No inductions" message="Create your first safety induction." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Safety Inductions" onMenuPress={toggle} />

      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />

      <FAB onPress={handleAdd} />

      <InductionFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />

      <PreviewModal visible={!!previewItem} onClose={() => setPreviewItem(null)} induction={previewItem} />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  listContent: { paddingHorizontal: 24 },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: colors.primary[50] },
  cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary[600] },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbActive: { alignSelf: 'flex-end' as const },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

const qStyles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  questionCard: { backgroundColor: colors.neutral[50], borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[200] },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: colors.success[500] },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[500] },
  addOptionBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, marginTop: 2 },
  emptyState: { backgroundColor: colors.neutral[50], borderRadius: 14, padding: 24, borderWidth: 1, borderColor: colors.neutral[200], borderStyle: 'dashed' },
});

const previewStyles = StyleSheet.create({
  contentSection: { alignItems: 'center', paddingVertical: 16 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary[600], borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 20, shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  scrollContent: { maxHeight: 300, width: '100%' },
  codeBlock: { backgroundColor: colors.neutral[50], borderRadius: 12, padding: 16, width: '100%' },
});
