import React, { useState } from 'react';
import {
  AlertCircle,
  Calculator,
  ExternalLink,
  Minus,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  ShoppingBasket,
  Utensils,
} from 'lucide-react';
import { MOROCCAN_FOOD_DB, PRESET_MEAL_PLANS, SUPPLEMENTS_DB } from '../data/nutrition';
import { tr, trText } from '../engine/i18n';
import {
  buildWeeklyGroceryList,
  calculateBiometrics,
  calculateMealsTotals,
} from '../engine/nutrition';
import { AppState, GoalMode, MealBlock, NutriSubTab } from '../types/app';

interface NutritionViewProps {
  state: AppState;
  onSetNutriSubTab: (tab: NutriSubTab) => void;
  onUpdateProfile: (patch: Partial<AppState['profile']>) => void;
  onSetMealPreset: (preset: 'training' | 'rest') => void;
  onUpdateMeals: (preset: 'training' | 'rest', meals: MealBlock[]) => void;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  state,
  onSetNutriSubTab,
  onUpdateProfile,
  onSetMealPreset,
  onUpdateMeals,
}) => {
  const { lang, nutriSubTab, profile, activeMealPreset, customMeals } = state;
  const targets = calculateBiometrics(profile);
  const currentMeals = customMeals[activeMealPreset] || PRESET_MEAL_PLANS[activeMealPreset];
  const dayTotals = calculateMealsTotals(currentMeals, MOROCCAN_FOOD_DB);
  const byFoodId = new Map(MOROCCAN_FOOD_DB.map((f) => [f.id, f]));

  const [foodSearch, setFoodSearch] = useState('');
  const [addFoodSelection, setAddFoodSelection] = useState<Record<number, string>>({});

  const trainingDays = state.volumeSettings.includeOptionalDayD ? 4 : 3;
  const groceryList = buildWeeklyGroceryList(customMeals, MOROCCAN_FOOD_DB, trainingDays);

  const subTabs: { id: NutriSubTab; label: string; icon: React.ReactNode; activeClass: string }[] = [
    {
      id: 'calc',
      label: tr(lang, 'حاسبة السعرات والماكرو', 'Calculateur & Macros', 'Calorie & Macro Calc'),
      icon: <Calculator className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20',
    },
    {
      id: 'meals',
      label: tr(lang, 'الوجبات اليومية', 'Repas du Jour', 'Daily Meals'),
      icon: <Utensils className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20',
    },
    {
      id: 'foods',
      label: tr(lang, 'قائمة التسوق والأغذية', 'Courses & Aliments', 'Grocery & Foods'),
      icon: <ShoppingBasket className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20',
    },
    {
      id: 'supps',
      label: tr(lang, 'دليل المكملات', 'Suppléments', 'Supplements'),
      icon: <Pill className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20',
    },
  ];

  const updateItemGrams = (mealIdx: number, itemIdx: number, grams: number) => {
    const nextMeals = currentMeals.map((m, mI) =>
      mI !== mealIdx
        ? m
        : {
            ...m,
            items: m.items
              .map((it, iI) => (iI === itemIdx ? { ...it, grams: Math.max(0, Math.round(grams)) } : it))
              .filter((it) => it.grams > 0),
          }
    );
    onUpdateMeals(activeMealPreset, nextMeals);
  };

  const addFoodToMeal = (mealIdx: number) => {
    const foodId = addFoodSelection[mealIdx] || MOROCCAN_FOOD_DB[0].id;
    const nextMeals = currentMeals.map((m, mI) =>
      mI !== mealIdx ? m : { ...m, items: [...m.items, { foodId, grams: 100 }] }
    );
    onUpdateMeals(activeMealPreset, nextMeals);
  };

  const filteredFoods = MOROCCAN_FOOD_DB.filter((f) => {
    const q = foodSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      f.name.ar.toLowerCase().includes(q) ||
      f.name.fr.toLowerCase().includes(q) ||
      f.name.en.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-amber-100 dark:border-slate-800 shadow-sm no-print">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetNutriSubTab(t.id)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
              nutriSubTab === t.id
                ? t.activeClass
                : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50/70 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. CALCULATOR */}
      {nutriSubTab === 'calc' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {tr(lang, 'حاسبة الاحتياج اليومي الذكية (السعرات والماكرو)', 'Calculateur Intelligent de Calories & Macros', 'Smart Calorie & Macro Calculator')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSetNutriSubTab('meals')}
                className="px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs font-extrabold hover:bg-orange-500 hover:text-white transition"
              >
                {tr(lang, 'انتقل إلى الوجبات اليومية ←', 'Voir les repas →', 'Go to Daily Meals →')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'العمر', 'Âge', 'Age')}</label>
                <input
                  type="number"
                  min={15}
                  max={90}
                  value={profile.age}
                  onChange={(e) => onUpdateProfile({ age: Math.max(15, Math.min(90, Number(e.target.value) || 25)) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الطول (سم)', 'Taille (cm)', 'Height (cm)')}</label>
                <input
                  type="number"
                  min={130}
                  max={230}
                  value={profile.heightCm}
                  onChange={(e) => onUpdateProfile({ heightCm: Math.max(130, Math.min(230, Number(e.target.value) || 175)) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الوزن (كغ)', 'Poids (kg)', 'Weight (kg)')}</label>
                <input
                  type="number"
                  step="0.5"
                  min={35}
                  max={220}
                  value={profile.weightKg}
                  onChange={(e) => onUpdateProfile({ weightKg: Math.max(35, Math.min(220, Number(e.target.value) || 75)) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold mono-num"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'الجنس', 'Sexe', 'Sex')}</label>
                <select
                  value={profile.sex}
                  onChange={(e) => onUpdateProfile({ sex: e.target.value as 'male' | 'female' })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="male">{tr(lang, 'ذكر', 'Homme', 'Male')}</option>
                  <option value="female">{tr(lang, 'أنثى', 'Femme', 'Female')}</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{tr(lang, 'النشاط اليومي', 'Activité', 'Activity')}</label>
                <select
                  value={profile.activityFactor}
                  onChange={(e) => onUpdateProfile({ activityFactor: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value={1.35}>1.35 ({tr(lang, 'مكتبي + 3 حصص', 'Sédentaire + 3j', 'Desk + 3d')})</option>
                  <option value={1.5}>1.50 ({tr(lang, 'نشاط متوسط', 'Modéré', 'Moderate')})</option>
                  <option value={1.65}>1.65 ({tr(lang, 'نشط يومياً', 'Actif', 'Active')})</option>
                  <option value={1.8}>1.80 ({tr(lang, 'مرتفع جداً', 'Très actif', 'Very High')})</option>
                </select>
              </div>
            </div>

            {/* Goal Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {(
                [
                  {
                    id: 'recomp',
                    label: tr(lang, 'تثبيت وبناء متوازن (Recomp)', 'Recomposition (Maintien)', 'Body Recomposition'),
                    delta: 0,
                    activeCls: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-sm',
                  },
                  {
                    id: 'lean_bulk',
                    label: tr(lang, 'زيادة عضلية صافية (+220 سعرة)', 'Prise de masse propre (+220)', 'Lean Bulk (+220 kcal)'),
                    delta: 220,
                    activeCls: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm',
                  },
                  {
                    id: 'fat_loss',
                    label: tr(lang, 'تنشيف وخسارة دهون (-380 سعرة)', 'Sèche contrôlée (-380)', 'Fat Loss (-380 kcal)'),
                    delta: -380,
                    activeCls: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-rose-500 shadow-sm',
                  },
                ] as { id: GoalMode; label: string; delta: number; activeCls: string }[]
              ).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onUpdateProfile({ goalMode: g.id, caloricDelta: g.delta })}
                  className={`p-3 rounded-2xl border font-extrabold text-start transition ${
                    profile.goalMode === g.id
                      ? g.activeCls
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-orange-400'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Sliders for Protein & Fine Delta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>{tr(lang, 'كمية البروتين اليومية (1.4–2.2 غ/كغ):', 'Protéines (1.4–2.2 g/kg) :', 'Protein Target (1.4–2.2 g/kg):')}</span>
                  <span className="mono-num text-rose-600 dark:text-rose-400 font-extrabold">{profile.proteinPerKg.toFixed(1)} g/kg</span>
                </label>
                <input
                  type="range"
                  min={1.4}
                  max={2.2}
                  step={0.1}
                  value={profile.proteinPerKg}
                  onChange={(e) => onUpdateProfile({ proteinPerKg: Number(e.target.value) })}
                  className="w-full accent-rose-500 mt-1"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>{tr(lang, 'تعديل الفائض / العجز الحراري:', 'Ajustement calorique :', 'Caloric Delta Adjustment:')}</span>
                  <span className="mono-num text-orange-600 dark:text-orange-400 font-extrabold">{profile.caloricDelta >= 0 ? `+${profile.caloricDelta}` : profile.caloricDelta} kcal</span>
                </label>
                <input
                  type="range"
                  min={-600}
                  max={450}
                  step={20}
                  value={profile.caloricDelta}
                  onChange={(e) => onUpdateProfile({ caloricDelta: Number(e.target.value) })}
                  className="w-full accent-orange-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Colorful Output Targets Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'BMR', val: `${targets.bmr}`, unit: 'kcal', cardBg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800', accent: 'text-slate-900 dark:text-slate-100' },
              { label: 'TDEE', val: `${targets.tdee}`, unit: 'kcal', cardBg: 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50', accent: 'text-sky-600 dark:text-sky-400' },
              { label: tr(lang, 'الهدف اليومي', 'Cible Kcal', 'Target'), val: `${targets.targetKcal}`, unit: 'kcal', cardBg: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50', accent: 'text-orange-600 dark:text-orange-400' },
              { label: tr(lang, 'بروتين', 'Protéines', 'Protein'), val: `${targets.proteinG}g`, unit: `${Math.round((targets.proteinG * 4 / targets.targetKcal) * 100)}%`, cardBg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50', accent: 'text-rose-600 dark:text-rose-400' },
              { label: tr(lang, 'كربوهيدرات', 'Glucides', 'Carbs'), val: `${targets.carbsG}g`, unit: `${Math.round((targets.carbsG * 4 / targets.targetKcal) * 100)}%`, cardBg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50', accent: 'text-amber-600 dark:text-amber-400' },
              { label: tr(lang, 'دهون صحية', 'Lipides', 'Fats'), val: `${targets.fatG}g`, unit: `BMI ${targets.bmi}`, cardBg: 'bg-violet-50/80 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50', accent: 'text-violet-600 dark:text-violet-400' },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-2xl border p-3.5 text-center shadow-xs ${c.cardBg}`}
              >
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">{c.label}</span>
                <span className={`text-xl font-extrabold mono-num mt-0.5 block ${c.accent}`}>{c.val}</span>
                <span className="text-[10px] font-semibold mono-num text-slate-500 dark:text-slate-400">{c.unit}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {tr(
                lang,
                'نصيحة عملية: هذه الأرقام نقطة بداية ممتازة؛ راقب متوسط وزنك كل أسبوعين وعدّل السعرات بـ ±150 سعرة حسب هدفك.',
                'Conseil pratique : surveillez votre poids sur 2 semaines et ajustez de ±150 kcal.',
                'Practical tip: track your 2-week weight trend and adjust by ±150 kcal as needed.'
              )}
            </span>
          </div>
        </div>
      )}

      {/* 2. DAILY MEALS */}
      {nutriSubTab === 'meals' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-orange-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {tr(lang, 'جدول الوجبات اليومية التفاعلي', 'Planificateur de Repas Quotidien', 'Interactive Daily Meal Planner')}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSetMealPreset('training')}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold border transition ${
                    activeMealPreset === 'training'
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {tr(lang, 'يوم تدريب', 'Jour Entraînement', 'Training Day')}
                </button>
                <button
                  type="button"
                  onClick={() => onSetMealPreset('rest')}
                  className={`px-3.5 py-1.5 rounded-xl font-extrabold border transition ${
                    activeMealPreset === 'rest'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {tr(lang, 'يوم راحة', 'Jour Repos', 'Rest Day')}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateMeals(activeMealPreset, JSON.parse(JSON.stringify(PRESET_MEAL_PLANS[activeMealPreset])))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-rose-50 hover:text-rose-600 transition"
                  title={tr(lang, 'إعادة للقالب الافتراضي', 'Réinitialiser', 'Reset preset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Totals vs Target Bars with Lively Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              {[
                { label: tr(lang, 'السعرات', 'Calories', 'Calories'), cur: dayTotals.kcal, tgt: targets.targetKcal, unit: 'kcal', barCls: 'bg-gradient-to-r from-orange-500 to-amber-500' },
                { label: tr(lang, 'البروتين', 'Protéines', 'Protein'), cur: dayTotals.protein, tgt: targets.proteinG, unit: 'g', barCls: 'bg-gradient-to-r from-rose-500 to-pink-500' },
                { label: tr(lang, 'الكربوهيدرات', 'Glucides', 'Carbs'), cur: dayTotals.carbs, tgt: targets.carbsG, unit: 'g', barCls: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
                { label: tr(lang, 'الدهون', 'Lipides', 'Fat'), cur: dayTotals.fat, tgt: targets.fatG, unit: 'g', barCls: 'bg-gradient-to-r from-violet-500 to-indigo-500' },
              ].map((m) => {
                const pct = Math.min(100, Math.round((m.cur / Math.max(1, m.tgt)) * 100));
                return (
                  <div key={m.label} className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-400">{m.label}</span>
                      <span className="mono-num text-slate-900 dark:text-slate-100">
                        {m.cur} / {m.tgt}{m.unit}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full ${m.barCls}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meal Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentMeals.map((meal, mealIdx) => {
              const mealTotals = calculateMealsTotals([meal], MOROCCAN_FOOD_DB);
              const badgeColors = [
                'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40',
                'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
                'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
                'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
              ];
              return (
                <div
                  key={`MEAL_${mealIdx}`}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {trText(lang, meal.title)}
                    </h4>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold mono-num ${badgeColors[mealIdx % badgeColors.length]}`}>
                      {mealTotals.kcal} kcal · P {mealTotals.protein}g
                    </span>
                  </div>

                  <div className="space-y-2">
                    {meal.items.map((item, itemIdx) => {
                      const food = byFoodId.get(item.foodId);
                      if (!food) return null;
                      const ratio = item.grams / 100;
                      return (
                        <div
                          key={`${item.foodId}_${itemIdx}`}
                          className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {trText(lang, food.name)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num">
                              {trText(lang, food.stateLabel)} · {Math.round(food.kcal * ratio)} kcal · P {(food.p * ratio).toFixed(0)}g · C {(food.c * ratio).toFixed(0)}g · F {(food.f * ratio).toFixed(0)}g
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemGrams(mealIdx, itemIdx, item.grams - 10)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-orange-400"
                              aria-label="Decrease 10g"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-14 text-center font-extrabold mono-num text-slate-900 dark:text-slate-100">
                              {item.grams}g
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemGrams(mealIdx, itemIdx, item.grams + 10)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-orange-400"
                              aria-label="Increase 10g"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Add Food */}
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <select
                      aria-label="Add food to meal"
                      value={addFoodSelection[mealIdx] || MOROCCAN_FOOD_DB[0].id}
                      onChange={(e) => setAddFoodSelection((prev) => ({ ...prev, [mealIdx]: e.target.value }))}
                      className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold"
                    >
                      {MOROCCAN_FOOD_DB.map((f) => (
                        <option key={f.id} value={f.id}>
                          {trText(lang, f.name)} ({trText(lang, f.stateLabel)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addFoodToMeal(mealIdx)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold hover:from-orange-600 hover:to-rose-600 transition shrink-0 shadow-sm"
                    >
                      +100g
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MOROCCAN FOOD DB + 7-DAY PRINTABLE GROCERY LIST */}
      {nutriSubTab === 'foods' && (
        <div className="space-y-4">
          {/* 7-Day Grocery List */}
          <div className="rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {tr(lang, `قائمة التسوق الأسبوعية الجاهزة (${trainingDays} تدريب + ${7 - trainingDays} راحة)`, `Liste de Courses 7 Jours (${trainingDays} entraînement)`, `7-Day Printable Grocery List (${trainingDays}T / ${7 - trainingDays}R)`)}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tr(
                      lang,
                      'تم تحويل الأوزان المطبوخة (كالدجاج والأرز والعدس) تلقائياً إلى الوزن الخام المطلوب للشراء.',
                      'Les portions cuites sont converties automatiquement en poids brut à acheter.',
                      'Cooked logged portions are automatically converted into raw shopping weights.'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-500 transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr(lang, 'طباعة القائمة', 'Imprimer', 'Print List')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {groceryList.map((item) => (
                <div
                  key={`GROC_${item.food.id}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {trText(lang, item.food.name)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mono-num">
                      {tr(lang, 'المستهلك:', 'Consommé:', 'Logged:')} {item.weeklyLoggedGrams}g ({trText(lang, item.food.stateLabel)})
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-extrabold mono-num">
                    {item.formattedRawAmount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 22-Food Reference Table */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm no-print">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, `جدول الأغذية المغربية والمتوسطية (${MOROCCAN_FOOD_DB.length} عنصراً لكل 100 غرام)`, `Base Alimentaire Marocaine (${MOROCCAN_FOOD_DB.length} aliments)`, `Moroccan & Mediterranean Food Reference (${MOROCCAN_FOOD_DB.length} items / 100g)`)}
              </h3>
              <input
                type="search"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder={tr(lang, 'ابحث عن طعام...', 'Rechercher aliment...', 'Search food...')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-2 text-start">{tr(lang, 'الغذاء', 'Aliment', 'Food')}</th>
                    <th className="py-2 px-2 text-start">{tr(lang, 'الحالة', 'État', 'State')}</th>
                    <th className="py-2 px-2 text-start">Kcal</th>
                    <th className="py-2 px-2 text-start">P (g)</th>
                    <th className="py-2 px-2 text-start">C (g)</th>
                    <th className="py-2 px-2 text-start">F (g)</th>
                    <th className="py-2 px-2 text-start">{tr(lang, 'المصدر', 'Source', 'Source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFoods.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="py-2 px-2 font-bold text-slate-900 dark:text-slate-100">{trText(lang, f.name)}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{trText(lang, f.stateLabel)}</td>
                      <td className="py-2 px-2 font-mono font-bold text-orange-600 dark:text-orange-400">{f.kcal}</td>
                      <td className="py-2 px-2 font-mono font-bold text-rose-600 dark:text-rose-400">{f.p}</td>
                      <td className="py-2 px-2 font-mono text-amber-700 dark:text-amber-300">{f.c}</td>
                      <td className="py-2 px-2 font-mono text-violet-600 dark:text-violet-400">{f.f}</td>
                      <td className="py-2 px-2 text-[11px] text-slate-500 dark:text-slate-400">{f.sourceDb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. NON-COMMERCIAL SUPPLEMENTS GUIDE */}
      {nutriSubTab === 'supps' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 p-3 text-xs text-sky-900 dark:text-sky-200">
            {tr(
              lang,
              'ملاحظة موضوعية: الغذاء الطبيعي المتكامل، التمرين المنتظم، والنوم الجيد تصنع 95%+ من النتائج. المكملات التالية اختيارية تماماً.',
              'Note objective : Alimentation, entraînement et sommeil assurent l’essentiel des résultats. Les compléments sont optionnels.',
              'Whole food, consistent training, and sleep drive 95%+ of results. Supplements below are strictly optional.'
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SUPPLEMENTS_DB.map((sup) => (
              <div
                key={sup.id}
                className="rounded-3xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-sky-500" />
                      {trText(lang, sup.name)}
                    </h4>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{sup.evidenceGrade}</span>
                  </div>
                  <a
                    href={sup.refUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold hover:underline"
                  >
                    <span>PMC</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, sup.roleNote)}</p>
                <div className="rounded-xl bg-sky-50/70 dark:bg-slate-950 border border-sky-200/70 dark:border-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100">
                  {tr(lang, 'الجرعة المرجعية:', 'Dosage indicatif :', 'Reference Dose:')} {trText(lang, sup.doseFormula(profile.weightKg))}
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>{tr(lang, 'احتياطات السلامة:', 'Précautions :', 'Safety Cautions:')}</strong> {trText(lang, sup.cautions)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
