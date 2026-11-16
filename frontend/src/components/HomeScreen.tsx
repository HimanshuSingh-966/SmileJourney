import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from './native';
import { AssessmentImage } from './AssessmentImage';
import { useApp } from '../context/AppContext';
import type { FindingItem, MilestoneItem } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    userName,
    ritualDay,
    harmonyScore,
    findings,
    assessments,
    currentAssessment,
    setActiveScreen,
    milestones,
    isInstalled,
    installPWA,
    setShowInstallGuide,
    showToast,
    currentUser,
    openAuthModal,
    historyError,
  } = useApp();

  const handleInstallClick = () => {
    installPWA();
  };

  const activeAssessment = currentAssessment ?? (assessments.length > 0 ? assessments[0] : null);
  const latestMilestone = milestones.length > 0 ? milestones[0] : null;
  const hasScans = Boolean(activeAssessment) || milestones.length > 0 || findings.length > 0;

  const rawScore = activeAssessment
    ? activeAssessment.score
    : latestMilestone
    ? latestMilestone.score
    : findings.length > 0
    ? harmonyScore
    : null;
  const hasValidScore =
    typeof rawScore === 'number' && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= 100;
  const displayScore = hasValidScore ? rawScore : 0;
  const primaryFindingDescription = findings.find(
    (f: FindingItem) => typeof f.description === 'string' && f.description.trim().length > 0
  )?.description;

  const displayName = currentUser?.displayName || userName.trim() || 'Radiant Friend';

  // Calculate real progression delta if at least 2 milestones exist
  const scoreDelta =
    milestones.length >= 2
      ? milestones[0].score - milestones[milestones.length - 1].score
      : 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="flex flex-col w-full">
        {/* Top Reassuring Greeting & Warm Wellness Header */}
        <View className="px-4 pt-4 pb-2 flex flex-col gap-1">
          <View className="flex flex-row items-center justify-between">
            <View className="inline-flex flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#206a50]/10 dark:bg-[#206a50]/20 text-[#206a50] dark:text-[#8dd5b5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#206a50] dark:bg-[#8dd5b5] animate-pulse"></span>
              <Text className="text-[11px] font-medium text-[#206a50] dark:text-[#8dd5b5]">
                Cloud Synced
              </Text>
            </View>
            <View className="flex flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] text-[11px] shadow-xs">
              <span className="material-symbols-outlined text-[14px] text-[#206a50] dark:text-[#8dd5b5]">
                cloud_done
              </span>
              <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">Firebase Cloud Vault</Text>
            </View>
          </View>

          <View className="mt-2 flex flex-col">
            <Text className="text-[12px] tracking-wider uppercase text-[#877367] dark:text-[#a89f97] font-semibold">
              {ritualDay > 0 ? `Ritual Day ${ritualDay}` : 'Day 0 · Ready for Baseline'}
            </Text>
            <Text className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1f1b18] dark:text-[#f7eee9] tracking-tight mt-0.5">
              Good day, {displayName}
            </Text>
            <Text className="text-sm text-[#544339] dark:text-[#b5a499] mt-0.5">
              Embrace your radiant self today with intentional, gentle care.
            </Text>
          </View>
        </View>

        {/* Guest Explorer Prompt if not logged in */}
        {!currentUser && (
          <View className="px-4 py-1.5">
            <View className="rounded-2xl bg-gradient-to-r from-[#ffdcc6]/60 to-[#fbf2ed] dark:from-[#3a281e] dark:to-[#24201d] p-3 flex flex-row items-center justify-between gap-3 border border-[#dac2b4]/30 dark:border-[#38332e]">
              <View className="flex flex-col flex-1 min-w-0">
                <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                  Guest Explorer Preview
                </Text>
                <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                  Create an account to lock in your baseline &amp; sync across devices.
                </Text>
              </View>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="px-3 py-1.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                Sign Up
              </button>
            </View>
          </View>
        )}

        {/* Explicit Firestore History Read Error Banner */}
        {historyError && (
          <View className="px-4 py-1.5">
            <View className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3.5 flex flex-row items-start gap-2.5">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px] shrink-0 mt-0.5">
                error
              </span>
              <View className="flex flex-col flex-1 min-w-0">
                <Text className="text-xs font-bold text-red-900 dark:text-red-200">
                  Unable to Load Smile History
                </Text>
                <Text className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed mt-0.5">
                  {historyError}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Hero Primary Assessment Card */}
        <View className="px-4 py-2">
          <View className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffffff] via-[#fbf2ed] to-[#ffdcc6]/30 dark:from-[#24201d] dark:via-[#2a2622] dark:to-[#38332e] p-5 shadow-sm border border-[#dac2b4]/30 dark:border-[#38332e]">
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#e08744]/15 dark:bg-[#e08744]/10 blur-2xl"></div>

            <View className="relative z-10 flex flex-col gap-3">
              <View className="flex flex-row items-start justify-between gap-2">
                <View className="flex flex-col gap-1 flex-1">
                  <View className="flex flex-row items-center gap-1.5 text-[#934b08] dark:text-[#ffb785]">
                    <span className="material-symbols-outlined text-[16px] text-[#934b08] dark:text-[#ffb785]">
                      wb_sunny
                    </span>
                    <Text className="text-[12px] font-semibold text-[#934b08] dark:text-[#ffb785]">
                      {hasScans ? 'Check-In Window' : 'Baseline Intake Window'}
                    </Text>
                  </View>
                  <Text className="font-editorial text-xl text-[#1f1b18] dark:text-[#f7eee9] font-semibold leading-tight">
                    {hasScans ? 'Ready for your next check-in?' : 'Begin with your baseline scan'}
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-2xl bg-[#e08744]/20 flex items-center justify-center text-[#934b08] dark:text-[#ffb785] shrink-0">
                  <span className="material-symbols-outlined text-[22px]">center_focus_weak</span>
                </View>
              </View>

              <Text className="text-sm text-[#544339] dark:text-[#b5a499]">
                {hasScans
                  ? 'Capture your soft alignment & gentle enamel glow in natural light.'
                  : 'Capture your authentic smile in natural light to generate your private baseline.'}
              </Text>

              <View className="flex flex-col gap-2 pt-1">
                <TouchableOpacity
                  onPress={() => setActiveScreen('scan')}
                  className="w-full py-3.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center justify-center gap-2 transition-all cursor-pointer"
                  accessibilityLabel={hasScans ? 'Take New Smile Assessment' : 'Take Baseline Scan'}
                >
                  <span className="material-symbols-outlined text-[20px] text-white">photo_camera</span>
                  <Text className="text-sm font-semibold text-white">
                    {hasScans ? 'Take New Smile Assessment' : 'Take Baseline Smile Assessment'}
                  </Text>
                </TouchableOpacity>

                <View className="flex flex-row items-center justify-center gap-1.5 text-[#877367] dark:text-[#a89f97]">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  <Text className="text-[11px] text-[#877367] dark:text-[#a89f97]">
                    {hasScans
                      ? milestones.length > 0
                        ? `Last logged ${milestones[0].date} · Takes 90 seconds`
                        : 'Latest assessment recorded · Takes 90 seconds'
                      : 'No scans recorded yet · Takes 90 seconds'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* PWA Offline / Home-Screen Callout Bar */}
        <View className="px-4 py-1">
          <View className="p-3.5 rounded-2xl bg-[#206a50]/10 dark:bg-[#206a50]/20 flex flex-row items-center justify-between gap-3 shadow-xs border border-[#206a50]/10 dark:border-[#206a50]/20">
            <View className="flex flex-row items-center gap-3 min-w-0 flex-1">
              <View className="w-9 h-9 rounded-full bg-[#a9f2d0] dark:bg-[#1b4a38] flex items-center justify-center shrink-0 text-[#206a50] dark:text-[#8dd5b5]">
                <span className="material-symbols-outlined text-[20px]">
                  {isInstalled ? 'verified' : 'add_to_home_screen'}
                </span>
              </View>
              <View className="min-w-0 flex flex-col flex-1">
                <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                  {isInstalled ? 'Running Standalone App' : 'Add to Mobile Home Screen'}
                </Text>
                <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] truncate">
                  {isInstalled
                    ? 'Cloud vaults active with fast launcher access'
                    : '1-tap access on Android, OPPO App Drawer & iPhone'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleInstallClick}
              disabled={isInstalled}
              className={`px-3.5 py-1.5 rounded-full font-semibold text-[12px] shrink-0 transition-all ${
                isInstalled
                  ? 'bg-[#f5ece7] dark:bg-[#2d2925] text-[#206a50] dark:text-[#8dd5b5]'
                  : 'bg-[#206a50] text-white hover:opacity-90 cursor-pointer shadow-xs'
              }`}
              accessibilityLabel={isInstalled ? 'Installed as App' : 'Install SmileJourneyAI'}
            >
              <Text
                className={`text-[12px] font-semibold ${
                  isInstalled ? 'text-[#206a50] dark:text-[#8dd5b5]' : 'text-white'
                }`}
              >
                {isInstalled ? 'Active PWA ✓' : 'Add to Home'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Smile Health Snapshot Card */}
        <View className="px-4 py-2">
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-4">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[20px]">
                  temp_preferences_custom
                </span>
                <View className="flex flex-col">
                  <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold">
                    Prototype Summary Score
                  </Text>
                  <Text className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                    Experimental · Not Clinically Validated
                  </Text>
                </View>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-[#ffdead] dark:bg-[#4a3410] text-[#604100] dark:text-[#fabc4d]">
                <Text className="text-[11px] font-semibold text-[#604100] dark:text-[#fabc4d]">
                  {hasScans ? 'Active Journey' : 'Intake Pending'}
                </Text>
              </View>
            </View>

            {hasScans ? (
              <View className="flex flex-row items-center gap-4 bg-[#fbf2ed] dark:bg-[#2a2622] p-4 rounded-2xl">
                {/* Radial Score Visualizer */}
                <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#eae1dc] dark:text-[#38332e]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-[#e08744]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${hasValidScore ? displayScore : 0}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <Text className="font-editorial text-2xl font-bold text-[#1f1b18] dark:text-[#f7eee9] leading-none">
                      {hasValidScore ? displayScore : '—'}
                    </Text>
                    <Text className="text-[11px] text-[#877367] dark:text-[#a89f97] leading-none mt-0.5">
                      /100
                    </Text>
                  </div>
                </div>

                <View className="flex flex-col gap-1 min-w-0 flex-1">
                  <View className="flex flex-row items-center gap-1 text-[#206a50] dark:text-[#8dd5b5]">
                    <span className="material-symbols-outlined text-[16px]">eco</span>
                    <Text className="text-[13px] font-semibold text-[#206a50] dark:text-[#8dd5b5]">
                      {hasValidScore
                        ? displayScore >= 80
                          ? 'Prototype Score ≥ 80'
                          : 'Prototype Score < 80'
                        : 'Score pending or unavailable'}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={2}
                    className="text-[12px] text-[#544339] dark:text-[#b5a499] leading-relaxed"
                  >
                    {primaryFindingDescription || 'Assessment details are unavailable.'}
                  </Text>
                  <View className="flex flex-row items-center gap-2 pt-1 text-[11px] text-[#877367] dark:text-[#a89f97]">
                    {milestones.length >= 2 ? (
                      <Text className="text-[11px] text-[#206a50] dark:text-[#8dd5b5] font-semibold">
                        {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts experimental diff
                      </Text>
                    ) : (
                      <Text className="text-[11px] text-[#877367] dark:text-[#a89f97]">
                        Baseline Recorded
                      </Text>
                    )}
                    <span>•</span>
                    <Text className="text-[11px] text-[#206a50] dark:text-[#8dd5b5] font-semibold">
                      {findings.length > 0
                        ? `${findings.filter((f: FindingItem) => f.severity === 'none').length} No Visible Issues`
                        : 'Details unavailable'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="flex flex-col items-center justify-center py-6 px-4 bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl text-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#dac2b4] dark:border-[#4a423b] flex items-center justify-center text-[#877367]">
                  <span className="material-symbols-outlined text-2xl">sentiment_satisfied</span>
                </div>
                <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  No Scan on Record Yet
                </Text>
                <Text className="text-xs text-[#544339] dark:text-[#b5a499] max-w-xs">
                  Take your first photo check-in to receive a smile assessment from your connected backend model.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveScreen('scan')}
                  className="mt-2 px-4 py-2 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold"
                  accessibilityLabel="Start Assessment"
                >
                  <Text className="text-xs font-semibold text-white">Start Baseline Scan</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasScans && (
              <View className="flex flex-row items-center justify-between pt-1">
                <View className="flex flex-row items-center gap-1.5 text-[#877367] dark:text-[#a89f97]">
                  <span className="material-symbols-outlined text-[16px] text-[#7e5700] dark:text-[#fabc4d]">
                    verified_user
                  </span>
                  <Text className="text-[11px] text-[#877367] dark:text-[#a89f97]">
                    Backend Model Analysis
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveScreen('report')}
                  className="px-4 py-2 rounded-full bg-[#f0e6e1] dark:bg-[#38332e] hover:bg-[#eae1dc] dark:hover:bg-[#433c36] text-[#1f1b18] dark:text-[#f7eee9] flex flex-row items-center gap-1 transition-colors"
                  accessibilityLabel="View Full Report"
                >
                  <Text className="text-[13px] font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    View Full Report
                  </Text>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Progress Summary Widget: Photo Milestones */}
        <View className="px-4 py-2">
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-4">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-col">
                <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold">
                  Smile Journey Milestones
                </Text>
                <Text className="text-xs text-[#544339] dark:text-[#b5a499]">
                  {milestones.length === 0
                    ? '0 archival checkpoints captured'
                    : `${milestones.length} archival checkpoint${milestones.length > 1 ? 's' : ''} captured`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveScreen('progress')}
                className="p-2 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499]"
                accessibilityLabel="Calendar view"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              </TouchableOpacity>
            </View>

            {/* Real Photo Thumbnail Gallery Track */}
            {milestones.length > 0 ? (
              <View className="flex flex-row gap-3 overflow-x-auto pb-1 no-scrollbar">
                {milestones.map((item: MilestoneItem) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveScreen('progress')}
                    className="flex flex-col gap-1.5 w-24 shrink-0 group text-left cursor-pointer"
                    accessibilityLabel={`View milestone ${item.dayLabel}`}
                  >
                    <View className="relative w-24 h-28 rounded-2xl overflow-hidden bg-[#f5ece7] dark:bg-[#2d2925] border border-[#dac2b4]/20 dark:border-[#38332e] shadow-xs group-hover:shadow-md transition-shadow">
                      <AssessmentImage
                        photoObjectKey={item.isLegacy ? undefined : item.photoObjectKey}
                        assessmentId={item.isLegacy ? undefined : item.assessmentId}
                        source={
                          !item.photoObjectKey && item.photoUrl ? { uri: item.photoUrl } : undefined
                        }
                        alt={item.altText}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-white">{item.score}</Text>
                      </div>
                    </View>
                    <View className="flex flex-col px-0.5">
                      <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                        {item.dayLabel}
                      </Text>
                      <Text className="text-[10px] text-[#877367] dark:text-[#a89f97] truncate">
                        {item.date}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="py-6 px-4 bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[#877367] text-3xl">photo_library</span>
                <Text className="text-xs text-[#544339] dark:text-[#b5a499]">
                  No photos logged yet. Take your first morning scan to begin your visual timeline.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveScreen('scan')}
                  className="mt-1 px-4 py-2 rounded-full bg-[#f0e6e1] dark:bg-[#38332e] hover:bg-[#eae1dc] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold flex flex-row items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">photo_camera</span>
                  <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Log First Smile Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* View Full Timeline Button */}
            <TouchableOpacity
              onPress={() => setActiveScreen('progress')}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] dark:hover:bg-[#332e29] flex flex-row items-center justify-center gap-1.5 text-[#934b08] dark:text-[#ffb785] transition-colors"
              accessibilityLabel="View Photo Timeline & Morph"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera_back</span>
              <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                View Photo Timeline &amp; Morph
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mindful Wellness Tip Card */}
        <View className="px-4 py-2">
          <View className="bg-[#fbf2ed] dark:bg-[#2a2622] rounded-3xl p-5 border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center gap-2 text-[#934b08] dark:text-[#ffb785]">
              <span className="material-symbols-outlined text-[20px]">spa</span>
              <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Mindful Care Tip
              </Text>
            </View>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              When taking check-in photos, keep your head level and relax your jaw muscles. Natural morning light facing a window offers the most accurate, gentle reflection without harsh shadows.
            </Text>
          </View>
        </View>

        {/* Gentle Sanctuary Disclaimer */}
        <View className="px-6 py-2 text-center">
          <Text className="text-[11px] text-[#877367] dark:text-[#a89f97] leading-relaxed">
            SmileJourneyAI is a mindful personal companion for aesthetic tracking. It does not replace professional diagnosis by an in-person licensed dental provider.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
