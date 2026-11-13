import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from './native';
import { useApp } from '../context/AppContext';
import { calculateProgressDelta } from '../utils/smileAnalytics';
import type { MilestoneItem } from '../types';

export const ProgressScreen: React.FC = () => {
  const {
    milestones,
    selectHistoricalAssessment,
    setActiveScreen,
    malformedAssessments,
    malformedLegacyMilestones,
    historyLoading,
  } = useApp();
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'interactive-slider'>('side-by-side');

  const hasMultiple = milestones.length >= 2;
  const hasSingle = milestones.length === 1;

  const baselineItem = milestones.length > 0 ? milestones[milestones.length - 1] : null;
  const latestItem = milestones.length > 0 ? milestones[0] : null;

  const progressDelta =
    baselineItem && latestItem
      ? calculateProgressDelta(baselineItem.score, latestItem.score, 14)
      : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="px-4 pt-1 pb-4 flex flex-col gap-4">
        {/* Top Privacy & Encrypted Sync Indicator */}
        <View className="flex flex-row items-center justify-between px-3 py-2 bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e]">
          <View className="flex flex-row items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#206a50] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#206a50]"></span>
            </span>
            <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
              Encrypted &amp; stored in your private Firebase vault
            </Text>
          </View>
          <View className="flex flex-row items-center gap-1 text-[#206a50] dark:text-[#8dd5b5]">
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_done
            </span>
            <Text className="text-[11px] font-semibold text-[#206a50] dark:text-[#8dd5b5]">
              Firebase Cloud Vault
            </Text>
          </View>
        </View>

        {/* History Loading State */}
        {historyLoading && (
          <View className="px-3 py-2.5 bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl flex flex-row items-center gap-2 border border-[#dac2b4]/30">
            <span className="material-symbols-outlined text-base animate-spin text-[#934b08] dark:text-[#ffb785]">
              sync
            </span>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499]">
              Loading verified assessment history...
            </Text>
          </View>
        )}

        {/* Malformed Documents Alert */}
        {malformedAssessments.length > 0 && (
          <View className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl p-3.5 flex flex-col gap-1.5 shadow-xs">
            <View className="flex flex-row items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-base">
                warning
              </span>
              <Text className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                {malformedAssessments.length} Assessment Record{malformedAssessments.length > 1 ? 's' : ''} Could Not Be Loaded
              </Text>
            </View>
            <Text className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Some saved assessment documents did not pass strict data validation (e.g. missing canonical findings, invalid score, document ID mismatch, or unavailable photo URL). To ensure report integrity, they cannot be displayed. Valid records remain accessible below.
            </Text>
            <View className="flex flex-col gap-1 mt-1">
              {malformedAssessments.map((item) => (
                <View
                  key={item.id}
                  className="bg-white/70 dark:bg-black/30 px-2.5 py-1 rounded border border-amber-200/60 dark:border-amber-800/50"
                >
                  <Text className="text-[10px] text-amber-950 dark:text-amber-200 font-mono">
                    Doc ID {item.id}: {item.errors[0]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Malformed Legacy Scans Alert */}
        {malformedLegacyMilestones.length > 0 && (
          <View className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl p-3.5 flex flex-col gap-1.5 shadow-xs">
            <View className="flex flex-row items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-base">
                history_toggle_off
              </span>
              <Text className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                Notice: Some older scans could not be loaded
              </Text>
            </View>
            <Text className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              {malformedLegacyMilestones.length} older scan record{malformedLegacyMilestones.length > 1 ? 's' : ''} could not be loaded because they contain missing or corrupted data (such as missing score, invalid photo URL, or unparseable date). Valid records remain accessible below.
            </Text>
            <View className="flex flex-col gap-1 mt-1">
              {malformedLegacyMilestones.map((item) => (
                <View
                  key={item.id}
                  className="bg-white/70 dark:bg-black/30 px-2.5 py-1 rounded border border-amber-200/60 dark:border-amber-800/50"
                >
                  <Text className="text-[10px] text-amber-950 dark:text-amber-200 font-mono">
                    Legacy Scan {item.id}: {item.errors.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Header / Context Title */}
        <View className="flex flex-row items-end justify-between px-1">
          <View className="flex flex-col">
            <Text className="text-[11px] text-[#934b08] dark:text-[#ffb785] tracking-widest uppercase font-semibold">
              Visual Progress Log
            </Text>
            <Text className="font-editorial text-2xl text-[#1f1b18] dark:text-[#f7eee9] font-semibold">
              Your Authentic Journey
            </Text>
          </View>
          <View className="flex flex-row items-center gap-1.5 bg-[#f5ece7] dark:bg-[#2d2925] px-2.5 py-1 rounded-full text-[#206a50] dark:text-[#8dd5b5]">
            <span className="material-symbols-outlined text-[16px]">photo_library</span>
            <Text className="text-[11px] font-semibold text-[#206a50] dark:text-[#8dd5b5]">
              {milestones.length} Recorded {milestones.length === 1 ? 'Scan' : 'Scans'}
            </Text>
          </View>
        </View>

        {/* Comparison Section */}
        {hasMultiple && baselineItem && latestItem ? (
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-col">
                <View className="flex flex-row items-center gap-2">
                  <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[20px]">
                    compare
                  </span>
                  <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Milestone Matchup
                  </Text>
                </View>
                <Text className="text-[10px] text-amber-800 dark:text-amber-400">
                  Experimental prototype comparison · Not clinically validated
                </Text>
              </View>
              <View className="flex flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) =>
                      prev === 'side-by-side' ? 'interactive-slider' : 'side-by-side'
                    )
                  }
                  className="text-[11px] text-[#877367] hover:text-[#934b08] underline cursor-pointer"
                >
                  {viewMode === 'side-by-side' ? 'Try Overlay' : 'Side-by-Side'}
                </button>
                <View className="px-2.5 py-0.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] border border-[#dac2b4]/40">
                  <Text className="text-[11px] font-semibold text-[#544339] dark:text-[#b5a499]">
                    {progressDelta && progressDelta.ptsDelta >= 0
                      ? `+${progressDelta.ptsDelta} pts diff (experimental)`
                      : `${progressDelta?.ptsDelta} pts diff (experimental)`}
                  </Text>
                </View>
              </View>
            </View>

            {viewMode === 'side-by-side' ? (
              /* Side-by-side Dual Cards using real user photos */
              <View className="grid grid-cols-2 gap-2.5">
                {/* Baseline Cell */}
                <View className="flex flex-col gap-2">
                  <View className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-[#f5ece7] dark:bg-[#2d2925] shadow-xs group">
                    <Image
                      source={{ uri: baselineItem.photoUrl }}
                      alt={baselineItem.altText}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                      <Text className="text-xs text-white font-bold tracking-wide">
                        {baselineItem.date}
                      </Text>
                      <Text className="text-[10px] text-white/80">{baselineItem.dayLabel}</Text>
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 dark:bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full shadow-xs">
                      <Text className="text-[11px] text-[#1f1b18] dark:text-[#f7eee9] font-bold">
                        Score {baselineItem.score}
                      </Text>
                    </div>
                  </View>
                  <View className="flex flex-col px-1">
                    <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                      {baselineItem.title}
                    </Text>
                    <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-tight truncate">
                      {baselineItem.description}
                    </Text>
                  </View>
                </View>

                {/* Latest Checkpoint Cell */}
                <View className="flex flex-col gap-2">
                  <View className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-[#f5ece7] dark:bg-[#2d2925] shadow-xs group">
                    <Image
                      source={{ uri: latestItem.photoUrl }}
                      alt={latestItem.altText}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                      <Text className="text-xs text-white font-bold tracking-wide">
                        {latestItem.date}
                      </Text>
                      <Text className="text-[10px] text-white/80">{latestItem.dayLabel}</Text>
                    </div>
                    <div className="absolute top-2 left-2 bg-[#a9f2d0] dark:bg-[#1b4a38] px-2 py-0.5 rounded-full shadow-xs">
                      <Text className="text-[11px] text-[#206a50] dark:text-[#8dd5b5] font-bold">
                        Score {latestItem.score}
                      </Text>
                    </div>
                  </View>
                  <View className="flex flex-col px-1">
                    <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                      {latestItem.title}
                    </Text>
                    <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-tight truncate">
                      {latestItem.description}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Interactive Split-Screen Overlay Slider */
              <View className="flex flex-col gap-3">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#f5ece7] dark:bg-[#2d2925] select-none shadow-inner border border-[#dac2b4]/30 dark:border-[#38332e]">
                  {/* Latest Image (Underneath) */}
                  <img
                    src={latestItem.photoUrl}
                    alt="Latest checkpoint"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Baseline Image (Clipped Overlay) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={baselineItem.photoUrl}
                      alt="Baseline intake"
                      className="absolute inset-0 w-full h-full object-cover max-w-none"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 flex items-center justify-center pointer-events-none"
                    style={{ left: `calc(${sliderPosition}% - 2px)` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-white text-[#934b08] shadow-md flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">unfold_more</span>
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 z-30 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-semibold">
                    Baseline ({baselineItem.date})
                  </div>
                  <div className="absolute top-2 right-2 z-30 bg-[#206a50]/80 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-semibold">
                    Latest ({latestItem.date})
                  </div>
                </div>

                <div className="flex flex-col gap-1 px-1">
                  <div className="flex items-center justify-between text-[11px] text-[#877367] dark:text-[#a89f97]">
                    <span>Drag slider to compare alignment</span>
                    <span>{sliderPosition}% Split</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="w-full accent-[#e08744] cursor-ew-resize"
                  />
                </div>
              </View>
            )}
          </View>
        ) : hasSingle && baselineItem ? (
          /* Single Baseline Checkpoint Banner */
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
            <View className="flex flex-row items-center gap-2">
              <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[22px]">
                check_circle
              </span>
              <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Baseline Checkpoint Secured
              </Text>
            </View>

            <View className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-[#f5ece7] dark:bg-[#2d2925] border border-[#dac2b4]/20">
              <Image
                source={{ uri: baselineItem.photoUrl }}
                alt="Baseline Smile Capture"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white">
                <span className="text-xs font-semibold">{baselineItem.date}</span>
                <span>•</span>
                <span className="text-xs">Score {baselineItem.score}</span>
              </div>
            </View>

            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Your baseline smile capture is securely stored. Capture a second check-in in a few days or weeks to unlock the before-and-after side-by-side comparison and interactive overlay morph slider.
            </Text>

            <TouchableOpacity
              onPress={() => setActiveScreen('scan')}
              className="mt-1 py-2.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white flex flex-row items-center justify-center gap-2 self-start cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-white">photo_camera</span>
              <Text className="text-xs font-semibold text-white">Capture Second Check-In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Zero Photos Empty State */
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-6 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] flex items-center justify-center text-[#934b08] dark:text-[#ffb785]">
              <span className="material-symbols-outlined text-3xl">photo_library</span>
            </div>
            <View className="flex flex-col gap-1 max-w-xs">
              <Text className="font-editorial text-lg font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                {malformedAssessments.length > 0 || malformedLegacyMilestones.length > 0
                  ? 'Records Unavailable'
                  : 'No Archival Photos Yet'}
              </Text>
              <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
                {malformedAssessments.length > 0 || malformedLegacyMilestones.length > 0
                  ? 'Some saved records in your vault did not pass validation. Please take a new scan with your connected backend.'
                  : 'Your photo timeline, comparison slider, and structural progression will be recorded here privately.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveScreen('scan')}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold flex flex-row items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-white">photo_camera</span>
              <Text className="text-xs font-semibold text-white">Take Baseline Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Captured Milestones Timeline List */}
        {milestones.length > 0 && (
          <View className="flex flex-col gap-3">
            <View className="flex flex-row items-center justify-between px-1">
              <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold">
                Captured Milestones
              </Text>
              <Text className="text-xs text-[#877367] dark:text-[#a89f97]">
                {milestones.length} Recorded
              </Text>
            </View>

            {milestones.map((item: MilestoneItem) => (
              <View
                key={item.id}
                className="bg-white dark:bg-[#24201d] rounded-2xl p-3.5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-row gap-3 items-center justify-between"
              >
                <View className="flex flex-row items-center gap-3 min-w-0 flex-1">
                  <View className="relative w-14 h-16 rounded-xl overflow-hidden bg-[#f5ece7] dark:bg-[#2d2925] shrink-0 border border-[#dac2b4]/20">
                    <Image
                      source={{ uri: item.photoUrl }}
                      alt={item.altText}
                      className="w-full h-full object-cover"
                    />
                  </View>
                  <View className="flex flex-col min-w-0 flex-1">
                    <View className="flex flex-row items-center gap-2 flex-wrap">
                      <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                        {item.title}
                      </Text>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#a9f2d0]/60 dark:bg-[#1b4a38]/60 text-[#206a50] dark:text-[#8dd5b5] font-bold">
                        Score {item.score}
                      </span>
                      {item.isLegacy ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                          Historical Record
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                          Verified Assessment
                        </span>
                      )}
                    </View>
                    <Text className="text-[11px] text-[#877367] dark:text-[#a89f97] mt-0.5">
                      {item.date} · {item.dayLabel}
                    </Text>
                    <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] truncate mt-0.5">
                      {item.description}
                    </Text>
                  </View>
                </View>

                {/* Full report view button for verified assessments only; legacy milestones remain photo/score checkpoints */}
                {item.hasFullReport !== false && !item.isLegacy ? (
                  <TouchableOpacity
                    onPress={() => selectHistoricalAssessment(item.id)}
                    className="px-2.5 py-1.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] hover:bg-[#ebdcd3] text-[#206a50] dark:text-[#8dd5b5] flex flex-row items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    accessibilityLabel="View full assessment report"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <Text className="text-[11px] font-semibold text-[#206a50] dark:text-[#8dd5b5]">
                      View
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/60 text-stone-500 dark:text-stone-400 flex flex-row items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                    <Text className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                      Photo Log
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action Button: Log Today's Smile Photo */}
        <TouchableOpacity
          onPress={() => setActiveScreen('scan')}
          className="w-full py-3.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center justify-center gap-2 transition-all cursor-pointer"
          accessibilityLabel="Log Smile Photo"
        >
          <span className="material-symbols-outlined text-[20px] text-white">photo_camera</span>
          <Text className="text-sm font-semibold text-white">Log Today's Smile Photo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
