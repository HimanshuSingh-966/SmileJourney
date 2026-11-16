import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from './native';
import { useApp } from '../context/AppContext';
import type { ConsultationQuestion } from '../types';

export const SpecialistScreen: React.FC = () => {
  const {
    findings,
    questions,
    toggleQuestion,
    addCustomQuestion,
    currentAssessment,
    setActiveScreen,
    showToast,
  } = useApp();

  const [newQuestionText, setNewQuestionText] = useState('');
  const hasAssessment = findings.length > 0 || Boolean(currentAssessment);
  const specialistRec = currentAssessment?.specialist_recommendation;

  const handleOpenProviderSearch = () => {
    // Provide a genuine search query instead of fabricated local counts
    const query = encodeURIComponent('licensed dentist orthodontist near me');
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Opening local provider search in your browser.');
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    addCustomQuestion(newQuestionText);
    setNewQuestionText('');
  };

  const checkedCount = questions.filter((q: ConsultationQuestion) => q.checked).length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="px-4 sm:px-5 py-4 flex flex-col gap-5">
        {/* Screen Narrative Lead */}
        <View className="flex flex-col gap-1.5 pt-1">
          <View className="self-start inline-flex flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#a9f2d0]/50 dark:bg-[#1b4a38]/50 text-[#277056] dark:text-[#a9f2d0]">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            <Text className="text-[11px] font-semibold tracking-wide uppercase text-[#277056] dark:text-[#a9f2d0]">
              Care Pathway Guidance
            </Text>
          </View>
          <Text className="font-editorial text-2xl text-[#1f1b18] dark:text-[#f7eee9] font-semibold leading-tight">
            Specialist Disciplines &amp; Consultation
          </Text>
          <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
            Prepare for your in-person dental consultation with structured questions and discipline guidance.
          </Text>
        </View>

        {/* Screening Disclaimer */}
        <View className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/50 dark:border-amber-700/40 flex flex-row items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-lg shrink-0 mt-0.5">
            info
          </span>
          <Text className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
            Specialist recommendations are educational suggestions based on screening observations. Only a licensed practitioner can assess clinical eligibility and treatment timelines.
          </Text>
        </View>

        {/* Dynamic Backend Recommendation Card */}
        {hasAssessment && specialistRec ? (
          <View className="relative rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-[#24201d] border border-[#dac2b4]/30 dark:border-[#38332e] p-5 flex flex-col gap-4">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-col">
                <Text className="text-[11px] uppercase tracking-wider text-[#934b08] dark:text-[#ffb785] font-bold">
                  Backend Recommended Discipline
                </Text>
                <Text className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9] mt-0.5">
                  {specialistRec.primarySpecialist || specialistRec.discipline || 'Specialist Evaluation'}
                  {specialistRec.coSpecialist ? ` & ${specialistRec.coSpecialist}` : ''}
                </Text>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-[#206a50]/10 dark:bg-[#206a50]/20 text-[#206a50] dark:text-[#8dd5b5] flex flex-row items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#206a50]"></span>
                <Text className="text-[11px] font-bold text-[#206a50] dark:text-[#8dd5b5]">
                  AI Suggested
                </Text>
              </View>
            </View>

            {specialistRec.notes && (
              <View className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-1.5">
                <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                  Model Observation
                </Text>
                <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
                  {specialistRec.notes}
                </Text>
              </View>
            )}

            {Array.isArray(specialistRec.reasons) && specialistRec.reasons.length > 0 && (
              <View className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-1.5">
                <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                  Factors Highlighted in Scan
                </Text>
                <ul className="list-disc pl-4 text-xs text-[#544339] dark:text-[#b5a499] flex flex-col gap-1">
                  {specialistRec.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </View>
            )}
          </View>
        ) : hasAssessment ? (
          /* Assessment completed but no specific specialist recommendation returned */
          <View className="rounded-3xl bg-white dark:bg-[#24201d] p-5 border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center gap-2 text-[#877367] dark:text-[#a89f97]">
              <span className="material-symbols-outlined text-lg">medical_services</span>
              <Text className="text-xs font-bold uppercase tracking-wider text-[#877367] dark:text-[#a89f97]">
                Specialist Matching
              </Text>
            </View>
            <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              General Dental Consultation
            </Text>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              The backend assessment did not return a tailored specialist sub-discipline for this scan. We recommend starting with a comprehensive check-up from a general dentist, who can refer you if necessary.
            </Text>
          </View>
        ) : (
          /* No assessment performed yet */
          <View className="rounded-3xl bg-white dark:bg-[#24201d] p-5 border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] flex items-center justify-center text-[#934b08] dark:text-[#ffb785]">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <View className="flex flex-col gap-1 max-w-sm">
              <Text className="font-editorial text-lg font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Smile Scan Recommended
              </Text>
              <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
                Take a smile scan with your camera to request an assessment from your connected backend model.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveScreen('scan')}
              className="mt-1 px-5 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold cursor-pointer"
            >
              <Text className="text-xs font-semibold text-white">Open Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* The 3 Core Disciplines Educational Cards */}
        <View className="flex flex-col gap-3">
          <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold px-1">
            Understanding Provider Disciplines
          </Text>

          {/* Orthodontist */}
          <View className="bg-white dark:bg-[#24201d] rounded-2xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-xl">
                  dentistry
                </span>
                <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Orthodontist
                </Text>
              </View>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] font-semibold">
                Arch Alignment
              </span>
            </View>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Specializes in correcting tooth crowding, spacing, bite relationship, and gentle arch alignment using clear aligners or braces.
            </Text>
          </View>

          {/* Cosmetic Dentist */}
          <View className="bg-white dark:bg-[#24201d] rounded-2xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-xl">
                  auto_fix_high
                </span>
                <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Cosmetic Dentist
                </Text>
              </View>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#a9f2d0] dark:bg-[#1b4a38] text-[#206a50] dark:text-[#8dd5b5] font-semibold">
                Aesthetics &amp; Shade
              </span>
            </View>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Focuses on enamel shade brightening, composite edge bonding, ceramic veneers, and proportion balance.
            </Text>
          </View>

          {/* Periodontist */}
          <View className="bg-white dark:bg-[#24201d] rounded-2xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#877367] text-xl">spa</span>
                <Text className="text-sm font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Periodontist
                </Text>
              </View>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#877367] font-semibold">
                Gingival Frame
              </span>
            </View>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Diagnoses and supports the gums, connective bone foundation, and aesthetic gum line balance.
            </Text>
          </View>
        </View>

        {/* Interactive Consultation Checklist */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3.5">
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-col">
              <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Consultation Checklist
              </Text>
              <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                {checkedCount} selected for your in-person visit
              </Text>
            </View>
            <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-xl">
              checklist
            </span>
          </View>

          {/* Add custom question input */}
          <View className="flex flex-row items-center gap-2">
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              placeholder="Add your own question..."
              className="flex-1 bg-[#fbf2ed] dark:bg-[#2a2622] rounded-xl px-3 py-2 text-xs text-[#1f1b18] dark:text-[#f7eee9] border border-[#dac2b4]/30 dark:border-[#38332e] outline-none focus:ring-1 focus:ring-[#e08744]"
            />
            <TouchableOpacity
              onPress={handleAddQuestion}
              className="px-3 py-2 rounded-xl bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold cursor-pointer shrink-0"
            >
              <Text className="text-xs font-semibold text-white">Add</Text>
            </TouchableOpacity>
          </View>

          {/* List of Questions */}
          {questions.length > 0 ? (
            <View className="flex flex-col gap-2 pt-1">
              {questions.map((q: ConsultationQuestion) => (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => toggleQuestion(q.id)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-row items-start gap-3 cursor-pointer ${
                    q.checked
                      ? 'bg-[#fbf2ed] dark:bg-[#2a2622] border-[#e08744]/40'
                      : 'bg-white dark:bg-[#24201d] border-[#dac2b4]/30 dark:border-[#38332e] opacity-75'
                  }`}
                  accessibilityLabel={`Toggle question ${q.question}`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                      q.checked ? 'text-[#e08744]' : 'text-[#877367]'
                    }`}
                  >
                    {q.checked ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <View className="flex flex-col min-w-0 flex-1">
                    <Text className="text-xs font-medium text-[#1f1b18] dark:text-[#f7eee9]">
                      {q.question}
                    </Text>
                    <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] mt-0.5">
                      {q.explanation}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-[#877367] py-2">
              No questions added yet. Add a custom question above to take with you to your appointment.
            </Text>
          )}
        </View>

        {/* Find Specialists CTA - Genuine External Directory Action */}
        <TouchableOpacity
          onPress={handleOpenProviderSearch}
          className="w-full py-3.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center justify-center gap-2 transition-all cursor-pointer"
          accessibilityLabel="Find Local Specialists on Maps"
        >
          <span className="material-symbols-outlined text-[20px] text-white">near_me</span>
          <Text className="text-sm font-semibold text-white">
            Find Licensed Providers Near Me
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
