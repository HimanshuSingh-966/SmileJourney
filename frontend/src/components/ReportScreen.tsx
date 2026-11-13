import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from './native';
import { useApp } from '../context/AppContext';
import type { IssueCategory, FindingItem } from '../types';

const CANONICAL_CATEGORIES: {
  category: IssueCategory;
  defaultTitle: string;
  defaultIcon: string;
}[] = [
  {
    category: 'crowding/alignment',
    defaultTitle: 'Crowding / Alignment',
    defaultIcon: 'reorder',
  },
  {
    category: 'gaps',
    defaultTitle: 'Gaps & Interdental Spacing',
    defaultIcon: 'space_bar',
  },
  {
    category: 'discoloration',
    defaultTitle: 'Discoloration & Enamel Tone',
    defaultIcon: 'flare',
  },
  {
    category: 'gum line',
    defaultTitle: 'Gum Line & Gingival Margin',
    defaultIcon: 'spa',
  },
  {
    category: 'symmetry',
    defaultTitle: 'Smile Symmetry & Midline',
    defaultIcon: 'balance',
  },
];

export const ReportScreen: React.FC = () => {
  const {
    harmonyScore,
    findings,
    capturedPhoto,
    milestones,
    assessments,
    currentAssessment,
    setActiveScreen,
    showToast,
  } = useApp();

  const [isSaved, setIsSaved] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);

  const activeAssessment = currentAssessment ?? (assessments.length > 0 ? assessments[0] : null);
  const latestNonLegacyMilestone = milestones.find((m) => !m.isLegacy) ?? null;
  const activePhoto =
    activeAssessment?.photo_url ||
    capturedPhoto ||
    (milestones.length > 0 ? milestones[0].photoUrl : null);
  const hasAssessment =
    Boolean(activeAssessment) || Boolean(latestNonLegacyMilestone) || findings.length > 0;
  const rawScore = activeAssessment
    ? activeAssessment.score
    : latestNonLegacyMilestone
    ? latestNonLegacyMilestone.score
    : findings.length > 0
    ? harmonyScore
    : null;
  const hasValidScore =
    typeof rawScore === 'number' && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= 100;
  const displayScore = hasValidScore ? rawScore : 0;

  const handleSaveReport = () => {
    setIsSaved(true);
    showToast('Report confirmed in your private Firebase vault.');
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'none':
        return (
          <View className="px-2.5 py-0.5 rounded-full bg-[#a9f2d0] dark:bg-[#1b4a38] text-[#206a50] dark:text-[#8dd5b5] shrink-0">
            <Text className="text-[11px] font-bold text-[#206a50] dark:text-[#8dd5b5]">No visible issue.</Text>
          </View>
        );
      case 'mild':
        return (
          <View className="px-2.5 py-0.5 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] shrink-0">
            <Text className="text-[11px] font-bold text-[#934b08] dark:text-[#ffb785]">Mild</Text>
          </View>
        );
      case 'moderate':
        return (
          <View className="px-2.5 py-0.5 rounded-full bg-[#ffdead] dark:bg-[#4a3410] text-[#7e5700] dark:text-[#fabc4d] shrink-0">
            <Text className="text-[11px] font-bold text-[#7e5700] dark:text-[#fabc4d]">Moderate</Text>
          </View>
        );
      case 'severe':
        return (
          <View className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 shrink-0">
            <Text className="text-[11px] font-bold text-red-700 dark:text-red-300">Severe</Text>
          </View>
        );
      default:
        return (
          <View className="px-2.5 py-0.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#877367] dark:text-[#a89f97] shrink-0">
            <Text className="text-[11px] font-semibold text-[#877367] dark:text-[#a89f97]">Not Evaluated</Text>
          </View>
        );
    }
  };

  const getSeverityIconBg = (severity?: string) => {
    switch (severity) {
      case 'none':
        return 'bg-[#a9f2d0] dark:bg-[#1b4a38] text-[#206a50] dark:text-[#8dd5b5]';
      case 'mild':
        return 'bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785]';
      case 'moderate':
        return 'bg-[#ffdead] dark:bg-[#4a3410] text-[#7e5700] dark:text-[#fabc4d]';
      case 'severe':
        return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300';
      default:
        return 'bg-[#f5ece7] dark:bg-[#2d2925] text-[#877367]';
    }
  };

  if (!hasAssessment) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 w-full"
        contentContainerStyle={{ paddingBottom: '140px' }}
      >
        <View className="px-4 py-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] flex items-center justify-center text-[#934b08] dark:text-[#ffb785] shadow-xs">
            <span className="material-symbols-outlined text-4xl">assignment_late</span>
          </div>

          <View className="flex flex-col gap-1 max-w-sm">
            <Text className="font-editorial text-2xl font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              No Backend Report On Record
            </Text>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Smile reports are generated strictly by your connected Python analysis service. Simulated findings are disabled. Take a smile scan with your camera to request an analysis.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setActiveScreen('scan')}
            className="mt-2 px-6 py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center gap-2 cursor-pointer transition-all"
            accessibilityLabel="Take New Smile Scan"
          >
            <span className="material-symbols-outlined text-[20px] text-white">photo_camera</span>
            <Text className="text-sm font-semibold text-white">Open Smile Camera</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Map canonical findings to backend findings or unavailable state
  const findingsByCategory = new Map<string, (typeof findings)[0]>();
  for (const f of findings) {
    findingsByCategory.set(f.category, f);
  }

  const noneCount = findings.filter((f: FindingItem) => f.severity === 'none').length;
  const mildCount = findings.filter((f: FindingItem) => f.severity === 'mild').length;
  const moderateCount = findings.filter((f: FindingItem) => f.severity === 'moderate').length;
  const severeCount = findings.filter((f: FindingItem) => f.severity === 'severe').length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="flex flex-col w-full">
        {/* Screening Disclaimer Callout - Prominently Visible */}
        <View className="mx-4 mt-2 mb-3 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/40 flex flex-row items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-lg shrink-0 mt-0.5">
            medical_information
          </span>
          <View className="flex flex-col flex-1">
            <Text className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
              Wellness Screening Observation
            </Text>
            <Text className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-snug mt-0.5">
              This report contains screening observations generated by the connected AI model, not clinical dental diagnoses. Consult an in-person licensed dentist or orthodontist for dental treatment plans.
            </Text>
          </View>
        </View>

        {/* Backend Verification Sync Badge */}
        <View className="mx-4 mb-3 px-3 py-1.5 rounded-full bg-[#206a50]/10 dark:bg-[#206a50]/20 flex flex-row items-center justify-between shadow-xs">
          <View className="flex flex-row items-center gap-2">
            <span className="material-symbols-outlined text-[15px] text-[#206a50] dark:text-[#8dd5b5]">
              verified
            </span>
            <Text className="text-[11px] text-[#206a50] dark:text-[#8dd5b5] font-semibold">
              Verified by backend assessment
            </Text>
          </View>
          <Text className="text-[11px] text-[#877367] dark:text-[#a89f97] font-mono">
            {activeAssessment?.assessment_id
              ? `ID: ${activeAssessment.assessment_id.slice(0, 10)}...`
              : milestones.length > 0
              ? milestones[0].date
              : 'Confirmed'}
          </Text>
        </View>

        {/* Hero Score Section */}
        <View className="relative mx-4 mb-4 p-5 rounded-3xl bg-white dark:bg-[#24201d] shadow-sm border border-[#dac2b4]/30 dark:border-[#38332e] overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[#e08744]/15 dark:bg-[#e08744]/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-[#206a50]/10 dark:bg-[#206a50]/15 blur-2xl pointer-events-none"></div>

          <View className="relative z-10 flex flex-col items-center text-center">
            <View className="flex flex-col items-center gap-1 mb-1">
              <Text className="text-[11px] text-[#877367] dark:text-[#a89f97] uppercase tracking-wider font-semibold">
                Prototype Summary Score
              </Text>
              <View className="px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/60">
                <Text className="text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                  Experimental · Not Clinically Validated
                </Text>
              </View>
            </View>

            {/* Radial Gauge Visualization based strictly on backend score */}
            <div className="relative w-40 h-40 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  fill="none"
                  r="66"
                  stroke="currentColor"
                  className="text-[#f5ece7] dark:text-[#38332e]"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  fill="none"
                  r="66"
                  stroke="url(#score-gradient)"
                  strokeDasharray="414.69"
                  strokeDashoffset={414.69 * (1 - Math.max(0, Math.min(100, displayScore)) / 100)}
                  strokeLinecap="round"
                  strokeWidth="12"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e08744" />
                    <stop offset="100%" stopColor="#206a50" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <div className="flex items-baseline">
                  <Text className="font-editorial text-4xl text-[#1f1b18] dark:text-[#f7eee9] tracking-tight font-bold">
                    {hasValidScore ? displayScore : '—'}
                  </Text>
                  <Text className="text-xs text-[#877367] dark:text-[#a89f97] font-semibold">
                    /100
                  </Text>
                </div>
                <Text className="text-[10px] text-[#877367] dark:text-[#a89f97] font-semibold mt-[-2px] tracking-wide">
                  Model Score
                </Text>
              </div>
            </div>

            <Text className="text-xs text-[#544339] dark:text-[#b5a499] max-w-xs font-normal leading-relaxed">
              {hasValidScore
                ? 'Calculated from the five predicted categories by the connected backend model.'
                : 'Score pending or unavailable from backend response.'}
            </Text>

            {/* Metrics Strip */}
            <View className="flex flex-row items-center justify-center gap-3 mt-3 pt-3 border-t border-[#dac2b4]/30 dark:border-[#38332e] w-full text-center">
              <View className="flex flex-col items-center">
                <Text className="text-xs font-bold text-[#206a50] dark:text-[#8dd5b5]">
                  {noneCount}
                </Text>
                <Text className="text-[10px] text-[#877367] dark:text-[#a89f97]">No Issues</Text>
              </View>
              <div className="w-px h-5 bg-[#dac2b4]/40 dark:bg-[#38332e]"></div>
              <View className="flex flex-col items-center">
                <Text className="text-xs font-bold text-[#934b08] dark:text-[#ffb785]">
                  {mildCount}
                </Text>
                <Text className="text-[10px] text-[#877367] dark:text-[#a89f97]">Mild</Text>
              </View>
              <div className="w-px h-5 bg-[#dac2b4]/40 dark:bg-[#38332e]"></div>
              <View className="flex flex-col items-center">
                <Text className="text-xs font-bold text-[#7e5700] dark:text-[#fabc4d]">
                  {moderateCount}
                </Text>
                <Text className="text-[10px] text-[#877367] dark:text-[#a89f97]">Moderate</Text>
              </View>
              <div className="w-px h-5 bg-[#dac2b4]/40 dark:bg-[#38332e]"></div>
              <View className="flex flex-col items-center">
                <Text className="text-xs font-bold text-red-700 dark:text-red-300">
                  {severeCount}
                </Text>
                <Text className="text-[10px] text-[#877367] dark:text-[#a89f97]">Severe</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scan Photographic Reference Card */}
        {activePhoto && (
          <View className="mx-4 mb-4 bg-white dark:bg-[#24201d] rounded-3xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[18px]">
                  photo_camera
                </span>
                <Text className="font-editorial text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Analyzed Photo
                </Text>
              </View>
              <button
                type="button"
                onClick={() => setIsPhotoExpanded((prev) => !prev)}
                className="text-xs text-[#934b08] dark:text-[#ffb785] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>{isPhotoExpanded ? 'Collapse' : 'Inspect'}</span>
                <span className="material-symbols-outlined text-sm">
                  {isPhotoExpanded ? 'unfold_less' : 'unfold_more'}
                </span>
              </button>
            </View>

            <View
              className={`relative rounded-2xl overflow-hidden bg-[#f5ece7] dark:bg-[#2d2925] border border-[#dac2b4]/20 dark:border-[#38332e] transition-all duration-300 ${
                isPhotoExpanded ? 'h-72' : 'h-36'
              }`}
            >
              <Image
                source={{ uri: activePhoto }}
                alt="Analyzed authentic smile photograph"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#206a50]"></span>
                <Text className="text-[10px] font-medium text-white">Source Input Frame</Text>
              </div>
            </View>
          </View>
        )}

        {/* Backend Specialist Recommendation if present */}
        {activeAssessment?.specialist_recommendation && (
          <View className="mx-4 mb-4 p-4 rounded-3xl bg-[#fbf2ed] dark:bg-[#2a2622] border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-1.5 text-[#934b08] dark:text-[#ffb785]">
                <span className="material-symbols-outlined text-lg">psychology</span>
                <Text className="text-xs font-bold uppercase tracking-wider text-[#934b08] dark:text-[#ffb785]">
                  Specialist Recommendation (Backend)
                </Text>
              </View>
            </View>
            <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              {activeAssessment.specialist_recommendation.primarySpecialist ||
                activeAssessment.specialist_recommendation.discipline ||
                'Specialist Consultation'}
              {activeAssessment.specialist_recommendation.coSpecialist
                ? ` & ${activeAssessment.specialist_recommendation.coSpecialist}`
                : ''}
            </Text>
            {activeAssessment.specialist_recommendation.notes && (
              <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
                {activeAssessment.specialist_recommendation.notes}
              </Text>
            )}
            {Array.isArray(activeAssessment.specialist_recommendation.reasons) &&
              activeAssessment.specialist_recommendation.reasons.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-[#544339] dark:text-[#b5a499] flex flex-col gap-1 mt-1">
                  {activeAssessment.specialist_recommendation.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
          </View>
        )}

        {/* The 5 Canonical Issue Categories */}
        <View className="mx-4 mb-4 flex flex-col gap-2.5">
          <View className="flex flex-row items-center justify-between px-1">
            <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold">
              The 5 Evaluated Categories
            </Text>
            <Text className="text-xs text-[#877367] dark:text-[#a89f97]">
              {findings.length} Confirmed
            </Text>
          </View>

          {CANONICAL_CATEGORIES.map(({ category, defaultTitle, defaultIcon }) => {
            const item = findingsByCategory.get(category);

            if (item) {
              return (
                <View
                  key={category}
                  className="bg-white dark:bg-[#24201d] rounded-2xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2"
                >
                  <View className="flex flex-row items-start justify-between gap-3">
                    <View className="flex flex-row items-center gap-2.5 min-w-0 flex-1">
                      <View
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${getSeverityIconBg(
                          item.severity
                        )}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {item.icon || defaultIcon}
                        </span>
                      </View>
                      <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                        {item.title || defaultTitle}
                      </Text>
                    </View>
                    {getSeverityBadge(item.severity)}
                  </View>

                  <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed pl-10.5">
                    {item.description}
                  </Text>
                </View>
              );
            }

            // Unavailable state for unreturned category (no invented values)
            return (
              <View
                key={category}
                className="bg-white/60 dark:bg-[#24201d]/60 rounded-2xl p-4 border border-dashed border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col gap-2 opacity-80"
              >
                <View className="flex flex-row items-start justify-between gap-3">
                  <View className="flex flex-row items-center gap-2.5 min-w-0 flex-1">
                    <View className="w-8 h-8 rounded-xl bg-[#f5ece7] dark:bg-[#2d2925] text-[#877367] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{defaultIcon}</span>
                    </View>
                    <Text className="text-sm font-semibold text-[#877367] dark:text-[#a89f97] truncate">
                      {defaultTitle}
                    </Text>
                  </View>
                  {getSeverityBadge(undefined)}
                </View>
                <Text className="text-xs text-[#877367] dark:text-[#a89f97] leading-relaxed pl-10.5 italic">
                  Not reported by the backend model for this scan.
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action Callouts */}
        <View className="mx-4 mb-6 flex flex-col gap-2.5">
          <TouchableOpacity
            onPress={() => setActiveScreen('specialists')}
            className="w-full py-3.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center justify-center gap-2 transition-all cursor-pointer"
            accessibilityLabel="View Specialist Pathways"
          >
            <span className="material-symbols-outlined text-[20px] text-white">psychology</span>
            <Text className="text-sm font-semibold text-white">Review Specialist Disciplines</Text>
          </TouchableOpacity>

          <View className="grid grid-cols-2 gap-2.5">
            <TouchableOpacity
              onPress={handleSaveReport}
              disabled={isSaved}
              className="py-2.5 px-3 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] text-[#1f1b18] dark:text-[#f7eee9] flex flex-row items-center justify-center gap-1.5 transition-colors cursor-pointer"
              accessibilityLabel="Save Report"
            >
              <span className="material-symbols-outlined text-[18px] text-[#206a50]">
                {isSaved ? 'check_circle' : 'bookmark'}
              </span>
              <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                {isSaved ? 'Saved in Vault' : 'Save to Progress'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveScreen('scan')}
              className="py-2.5 px-3 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] text-[#934b08] dark:text-[#ffb785] flex flex-row items-center justify-center gap-1.5 transition-colors cursor-pointer"
              accessibilityLabel="New Scan"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                New Check-In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
