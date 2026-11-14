import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  ExternalLink,
  Minus,
  PieChart as PieChartIcon,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  ShoppingBasket,
  Utensils,
} from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { MOROCCAN_FOOD_DB, PRESET_MEAL_PLANS, SUPPLEMENTS_DB } from '../data/nutrition';
import { tr, trText } from '../engine/i18n';
import {
  buildMacroPieData,
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
  const targets = useMemo(() => calculateBiometrics(profile), [profile]);
  const pieData = useMemo(() => buildMacroPieData(targets, lang), [targets, lang]);

  const currentMeals = customMeals[activeMealPreset] || PRESET_MEAL_PLANS[activeMealPreset];
  const dayTotals = calculateMealsTotals(currentMeals, MOROCCAN_FOOD_DB);
  const byFoodId = new Map(MOROCCAN_FOOD_DB.map((f) => [f.id, f]));

  const [foodSearch, setFoodSearch] = useState('');
  const [addFoodSelection, setAddFoodSelection] = useState<Record<number, string>>({});

  const trainingDays = state.volumeSettings.includeOptionalDayD ? 4 : 3;
  const groceryList = buildWeeklyGroceryList(customMeals, MOROCCAN_FOOD_DB, trainingDays);

  const subTabs: { id: NutriSubTab; label: string; icon: React.ReactNode; activeCls: string }[] = [
    {
      id: 'calc',
      label: tr(lang, 'حاسبة السعرات والماكرو (مع المخطط الدائري)', 'Calculateur & Camembert Macros', 'Macro Calculator & Pie Chart'),
      icon: <Calculator className="w-4 h-4 shrink-0" />,
      activeCls: 'bg-teal-600 text-white',
    },
    {
      id: 'meals',
      label: tr(lang, 'الوجبات اليومية', 'Repas du Jour', 'Daily Meals'),
      icon: <Utensils className="w-4 h-4 shrink-0" />,
      activeCls: 'bg-sky-600 text-white',
    },
    {
      id: 'foods',
      label: tr(lang, 'قائمة التسوق والأغذية', 'Courses & Aliments', 'Grocery & Foods'),
      icon: <ShoppingBasket className="w-4 h-4 shrink-0" />,
      activeCls: 'bg-emerald-600 text-white',
    },
    {
      id: 'supps',
      label: tr(lang, 'دليل المكملات', 'Suppléments', 'Supplements'),
      icon: <Pill className="w-4 h-4 shrink-0" />,
      activeCls: 'bg-indigo-600 text-white',
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-[#131C31] p-2 rounded-2xl border border-slate-200 dark:border-[#24324F] no-print">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetNutriSubTab(t.id)}
            className={`flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              nutriSubTab === t.id
                ? t.activeCls
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B1120]'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. INTEGRATED AUTOMATIC CALORIE & MACRO CALCULATOR + RECHARTS PIE CHART */}
      {nutriSubTab === 'calc' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (7 cols): Automatic Calculator Controls (Weight + Goal: Bulk / Cut / Recomp) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {tr(
                        lang,
                        'حاسبة السعرات والماكروز التلقائية (حسب الوزن والهدف)',
                        'Calculateur Automatique Calories & Macros (Poids & Objectif)',
                        'Automatic Calorie & Macro Calculator (Weight & Goal)'
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {tr(
                        lang,
                        'عدّل وزنك واختر هدفك (تضخيم / تنشيف / تثبيت) ليتم تحديث السعرات وتوزيع الماكروز فوراً.',
                        'Ajustez votre poids et votre objectif (Prise de masse / Sèche / Maintien) pour un calcul instantané.',
                        'Adjust your weight and goal (Bulk / Cut / Recomp) for instant calorie and macro calibration.'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSetNutriSubTab('meals')}
                  className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] text-sky-600 dark:text-sky-300 text-xs font-extrabold whitespace-nowrap hover:bg-sky-600 hover:text-white transition cursor-pointer"
                >
                  {tr(lang, 'الوجبات اليومية ←', 'Voir les repas →', 'Daily Meals →')}
                </button>
              </div>

              {/* Primary Quick Controls: Weight Stepper + Goal Mode (Bulk / Cut / Recomp) */}
              <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3">
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                      {tr(lang, 'الوزن الحالي (كغ)', 'Poids Actuel (kg)', 'Current Weight (kg)')}
                    </label>
                    <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProfile({
                            weightKg: Math.max(35, Number((profile.weightKg - 0.5).toFixed(1))),
                          })
                        }
                        className="w-9 h-9 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1A2642] border border-slate-300 dark:border-[#24324F] flex items-center justify-center transition cursor-pointer"
                        aria-label="Decrease weight"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min={35}
                        max={220}
                        value={profile.weightKg}
                        onChange={(e) =>
                          onUpdateProfile({
                            weightKg: Math.max(35, Math.min(220, Number(e.target.value) || 75)),
                          })
                        }
                        className="h-9 w-full text-center rounded-xl border border-slate-300 dark:border-[#24324F] bg-white dark:bg-[#131C31] font-extrabold text-sm mono-num text-teal-600 dark:text-teal-300 focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProfile({
                            weightKg: Math.min(220, Number((profile.weightKg + 0.5).toFixed(1))),
                          })
                        }
                        className="w-9 h-9 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1A2642] border border-slate-300 dark:border-[#24324F] flex items-center justify-center transition cursor-pointer"
                        aria-label="Increase weight"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>{tr(lang, 'شريط ضبط الوزن السريع', 'Curseur de poids rapide', 'Quick Weight Slider')}</span>
                      <span className="mono-num text-teal-600 dark:text-teal-300 font-extrabold">{profile.weightKg} kg (BMI {targets.bmi})</span>
                    </div>
                    <input
                      type="range"
                      min={45}
                      max={140}
                      step={0.5}
                      value={profile.weightKg}
                      onChange={(e) => onUpdateProfile({ weightKg: Number(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>

                {/* 3 Goal Buttons: Lean Bulk (تضخيم) / Fat Loss (تنشيف) / Recomp (تثبيت وبناء) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    {tr(lang, 'اختر الهدف التدريبي والغذائي:', 'Choisissez votre objectif :', 'Select Your Nutrition Goal:')}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {(
                      [
                        {
                          id: 'lean_bulk',
                          title: tr(lang, 'تضخيم عضلي صافٍ (Bulk)', 'Prise de Masse (Bulk)', 'Lean Bulk (Surplus)'),
                          sub: tr(lang, '+280 سعرة لبناء الكتلة', '+280 kcal surplus', '+280 kcal muscle gain'),
                          delta: 280,
                          activeCls: 'bg-teal-600 text-white border-teal-500',
                        },
                        {
                          id: 'fat_loss',
                          title: tr(lang, 'تنشيف وخسارة دهون (Cut)', 'Sèche & Perte de Gras (Cut)', 'Fat Loss / Cutting'),
                          sub: tr(lang, '-420 سعرة مع حفظ العضل', '-420 kcal déficit', '-420 kcal lean cut'),
                          delta: -420,
                          activeCls: 'bg-sky-600 text-white border-sky-500',
                        },
                        {
                          id: 'recomp',
                          title: tr(lang, 'إعادة تركيب وتثبيت (Recomp)', 'Recomposition (Maintien)', 'Body Recomposition'),
                          sub: tr(lang, 'توازن حراري (0 سعرة)', 'Équilibre calorique', 'Maintenance calories'),
                          delta: 0,
                          activeCls: 'bg-indigo-600 text-white border-indigo-500',
                        },
                      ] as { id: GoalMode; title: string; sub: string; delta: number; activeCls: string }[]
                    ).map((g) => {
                      const active = profile.goalMode === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => onUpdateProfile({ goalMode: g.id, caloricDelta: g.delta })}
                          className={`p-3 rounded-xl border text-start transition cursor-pointer ${
                            active
                              ? g.activeCls
                              : 'bg-white dark:bg-[#131C31] text-slate-800 dark:text-white border-slate-200 dark:border-[#24324F] hover:border-teal-500/60'
                          }`}
                        >
                          <div className="font-extrabold truncate">{g.title}</div>
                          <div className={`text-[11px] truncate mt-0.5 ${active ? 'text-white/90' : 'text-slate-500 dark:text-slate-300'}`}>
                            {g.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Secondary Biometric Inputs (Age, Height, Sex, Activity) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'العمر', 'Âge', 'Age')}</label>
                  <input
                    type="number"
                    min={15}
                    max={90}
                    value={profile.age}
                    onChange={(e) => onUpdateProfile({ age: Math.max(15, Math.min(90, Number(e.target.value) || 25)) })}
                    className="w-full h-9 px-2.5 text-center rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'الطول (سم)', 'Taille (cm)', 'Height (cm)')}</label>
                  <input
                    type="number"
                    min={130}
                    max={230}
                    value={profile.heightCm}
                    onChange={(e) => onUpdateProfile({ heightCm: Math.max(130, Math.min(230, Number(e.target.value) || 175)) })}
                    className="w-full h-9 px-2.5 text-center rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'الجنس', 'Sexe', 'Sex')}</label>
                  <select
                    value={profile.sex}
                    onChange={(e) => onUpdateProfile({ sex: e.target.value as 'male' | 'female' })}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-bold"
                  >
                    <option value="male">{tr(lang, 'ذكر', 'Homme', 'Male')}</option>
                    <option value="female">{tr(lang, 'أنثى', 'Femme', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">{tr(lang, 'النشاط اليومي', 'Activité', 'Activity')}</label>
                  <select
                    value={profile.activityFactor}
                    onChange={(e) => onUpdateProfile({ activityFactor: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-bold"
                  >
                    <option value={1.35}>1.35 ({tr(lang, 'مكتبي + 3 حصص', 'Sédentaire + 3j', 'Desk + 3d')})</option>
                    <option value={1.5}>1.50 ({tr(lang, 'نشاط متوسط', 'Modéré', 'Moderate')})</option>
                    <option value={1.65}>1.65 ({tr(lang, 'نشط يومياً', 'Actif', 'Active')})</option>
                    <option value={1.8}>1.80 ({tr(lang, 'مرتفع جداً', 'Très actif', 'Very High')})</option>
                  </select>
                </div>
              </div>

              {/* Fine-Tune Sliders for Protein g/kg & Caloric Delta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>{tr(lang, 'معامل البروتين (1.4–2.2 غ/كغ):', 'Protéines (1.4–2.2 g/kg) :', 'Protein Factor (1.4–2.2 g/kg):')}</span>
                    <span className="mono-num text-teal-600 dark:text-teal-300 font-extrabold">{profile.proteinPerKg.toFixed(1)} g/kg</span>
                  </label>
                  <input
                    type="range"
                    min={1.4}
                    max={2.2}
                    step={0.1}
                    value={profile.proteinPerKg}
                    onChange={(e) => onUpdateProfile({ proteinPerKg: Number(e.target.value) })}
                    className="w-full accent-teal-500 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>{tr(lang, 'تعديل الفائض / العجز الحراري:', 'Ajustement calorique :', 'Caloric Delta Adjustment:')}</span>
                    <span className="mono-num text-amber-600 dark:text-amber-300 font-extrabold">{profile.caloricDelta >= 0 ? `+${profile.caloricDelta}` : profile.caloricDelta} kcal</span>
                  </label>
                  <input
                    type="range"
                    min={-600}
                    max={500}
                    step={20}
                    value={profile.caloricDelta}
                    onChange={(e) => onUpdateProfile({ caloricDelta: Number(e.target.value) })}
                    className="w-full accent-amber-500 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Interactive Recharts Macro Distribution Pie Chart + Breakdown — Solid Dark #131C31 Card */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      {tr(lang, 'توزيع القيم الغذائية اليومية (الماكروز)', 'Répartition des Macronutriments', 'Daily Macro Distribution Pie Chart')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {tr(lang, 'نسبة السعرات والغرامات لكل عنصر غذائي', 'Proportion calorique et grammes par macro', 'Caloric share & daily grams per macronutrient')}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 text-xs font-extrabold mono-num">
                  {targets.targetKcal} kcal
                </span>
              </div>

              {/* Recharts Donut / Pie Chart inside Solid Dark #0B1120 Box */}
              <div className="relative h-56 w-full rounded-xl bg-slate-900 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="kcal"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={80}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {pieData.map((slice) => (
                        <Cell key={slice.key} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0B1120',
                        borderColor: '#24324F',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                      formatter={(_val, _name, item) => {
                        const s = item?.payload;
                        if (!s) return [''];
                        return [`${s.grams}g (${s.kcal} kcal · ${s.pct}%)`, s.name];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#F8FAFC' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Label inside Donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {tr(lang, 'الهدف اليومي', 'Cible / Jour', 'Daily Target')}
                  </span>
                  <span className="text-lg font-extrabold mono-num text-white">
                    {targets.targetKcal}
                  </span>
                  <span className="text-[10px] font-bold text-teal-400 mono-num">kcal</span>
                </div>
              </div>

              {/* 3 Macro Breakdown Rows */}
              <div className="space-y-2 text-xs">
                {pieData.map((slice) => (
                  <div
                    key={slice.key}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate">
                          {slice.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-300 mono-num">
                          {slice.kcal} kcal · {slice.pct}% {tr(lang, 'من إجمالي الطاقة', 'de l’énergie totale', 'of total energy')}
                        </div>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1 rounded-lg font-extrabold text-sm mono-num text-slate-950"
                      style={{ backgroundColor: slice.color }}
                    >
                      {slice.grams}g
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Biometric Strip (6 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'BMR', val: `${targets.bmr}`, unit: tr(lang, 'سعرة أساسية', 'kcal base', 'kcal base'), textCls: 'text-slate-900 dark:text-white' },
              { label: 'TDEE', val: `${targets.tdee}`, unit: tr(lang, 'سعرة الصيانة', 'kcal maintien', 'maintenance'), textCls: 'text-slate-900 dark:text-white' },
              { label: tr(lang, 'السعرات المستهدفة', 'Cible Kcal', 'Target Kcal'), val: `${targets.targetKcal}`, unit: 'kcal / day', highlight: true, textCls: 'text-amber-600 dark:text-amber-300' },
              { label: tr(lang, 'البروتين اليومي', 'Protéines', 'Daily Protein'), val: `${targets.proteinG}g`, unit: `${targets.proteinPct}% (${targets.proteinKcal} kcal)`, textCls: 'text-teal-600 dark:text-teal-300' },
              { label: tr(lang, 'الكربوهيدرات', 'Glucides', 'Daily Carbs'), val: `${targets.carbsG}g`, unit: `${targets.carbsPct}% (${targets.carbsKcal} kcal)`, textCls: 'text-sky-600 dark:text-sky-300' },
              { label: tr(lang, 'الدهون الصحية', 'Lipides', 'Healthy Fats'), val: `${targets.fatG}g`, unit: `${targets.fatPct}% (${targets.fatKcal} kcal)`, textCls: 'text-indigo-600 dark:text-indigo-300' },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-2xl border p-3.5 text-center ${
                  c.highlight
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#24324F]'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block truncate">{c.label}</span>
                <span className={`text-xl font-extrabold mono-num mt-0.5 block ${c.textCls}`}>
                  {c.val}
                </span>
                <span className="text-[10px] font-semibold mono-num text-slate-500 dark:text-slate-400 block truncate">{c.unit}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] p-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <AlertCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <span>
              {tr(
                lang,
                'نصيحة عملية: هذه الأرقام تُحسب تلقائياً بمعادلة Mifflin-St Jeor؛ راقب متوسط وزنك كل أسبوعين وعدّل السعرات بـ ±150 سعرة حسب استجابة جسمك.',
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
          <div className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {tr(lang, 'جدول الوجبات اليومية التفاعلي', 'Planificateur de Repas Quotidien', 'Interactive Daily Meal Planner')}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onSetMealPreset('training')}
                  className={`h-9 px-3.5 rounded-xl font-extrabold border whitespace-nowrap transition cursor-pointer ${
                    activeMealPreset === 'training'
                      ? 'bg-teal-600 text-white border-teal-500'
                      : 'bg-slate-50 dark:bg-[#0B1120] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24324F]'
                  }`}
                >
                  {tr(lang, 'يوم تدريب', 'Jour Entraînement', 'Training Day')}
                </button>
                <button
                  type="button"
                  onClick={() => onSetMealPreset('rest')}
                  className={`h-9 px-3.5 rounded-xl font-extrabold border whitespace-nowrap transition cursor-pointer ${
                    activeMealPreset === 'rest'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-50 dark:bg-[#0B1120] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24324F]'
                  }`}
                >
                  {tr(lang, 'يوم راحة', 'Jour Repos', 'Rest Day')}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateMeals(activeMealPreset, JSON.parse(JSON.stringify(PRESET_MEAL_PLANS[activeMealPreset])))}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:border-teal-500 border border-slate-200 dark:border-[#24324F] transition cursor-pointer"
                  title={tr(lang, 'إعادة للقالب الافتراضي', 'Réinitialiser', 'Reset preset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Totals vs Target Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              {[
                { label: tr(lang, 'السعرات', 'Calories', 'Calories'), cur: dayTotals.kcal, tgt: targets.targetKcal, unit: 'kcal', barCls: 'bg-amber-500' },
                { label: tr(lang, 'البروتين', 'Protéines', 'Protein'), cur: dayTotals.protein, tgt: targets.proteinG, unit: 'g', barCls: 'bg-teal-500' },
                { label: tr(lang, 'الكربوهيدرات', 'Glucides', 'Carbs'), cur: dayTotals.carbs, tgt: targets.carbsG, unit: 'g', barCls: 'bg-sky-500' },
                { label: tr(lang, 'الدهون', 'Lipides', 'Fat'), cur: dayTotals.fat, tgt: targets.fatG, unit: 'g', barCls: 'bg-indigo-500' },
              ].map((m) => {
                const pct = Math.min(100, Math.round((m.cur / Math.max(1, m.tgt)) * 100));
                return (
                  <div key={m.label} className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-3 space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-300">{m.label}</span>
                      <span className="mono-num text-slate-900 dark:text-white">
                        {m.cur} / {m.tgt}{m.unit}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#1A2642] overflow-hidden">
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
              return (
                <div
                  key={`MEAL_${mealIdx}`}
                  className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {trText(lang, meal.title)}
                    </h4>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold mono-num bg-teal-500/15 text-teal-600 dark:text-teal-300">
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
                          className="grid grid-cols-[1fr_auto] items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {trText(lang, food.name)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-300 mono-num truncate">
                              {trText(lang, food.stateLabel)} · <span className="text-amber-500 font-bold">{Math.round(food.kcal * ratio)} kcal</span> · <span className="text-teal-400">P {(food.p * ratio).toFixed(0)}g</span> · <span className="text-sky-400">C {(food.c * ratio).toFixed(0)}g</span> · <span className="text-indigo-400">F {(food.f * ratio).toFixed(0)}g</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-[2.25rem_3.75rem_2.25rem] items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemGrams(mealIdx, itemIdx, item.grams - 10)}
                              className="w-9 h-9 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1A2642] border border-slate-300 dark:border-[#24324F] flex items-center justify-center transition cursor-pointer"
                              aria-label="Decrease 10g"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-center font-extrabold mono-num text-slate-900 dark:text-white">
                              {item.grams}g
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemGrams(mealIdx, itemIdx, item.grams + 10)}
                              className="w-9 h-9 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1A2642] border border-slate-300 dark:border-[#24324F] flex items-center justify-center transition cursor-pointer"
                              aria-label="Increase 10g"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Add Food */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-1 text-xs">
                    <select
                      aria-label="Add food to meal"
                      value={addFoodSelection[mealIdx] || MOROCCAN_FOOD_DB[0].id}
                      onChange={(e) => setAddFoodSelection((prev) => ({ ...prev, [mealIdx]: e.target.value }))}
                      className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-semibold min-w-0"
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
                      className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold whitespace-nowrap transition shrink-0 cursor-pointer"
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
          <div className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {tr(lang, `قائمة التسوق الأسبوعية الجاهزة (${trainingDays} تدريب + ${7 - trainingDays} راحة)`, `Liste de Courses 7 Jours (${trainingDays} entraînement)`, `7-Day Printable Grocery List (${trainingDays}T / ${7 - trainingDays}R)`)}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
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
                className="no-print inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr(lang, 'طباعة القائمة', 'Imprimer', 'Print List')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {groceryList.map((item) => (
                <div
                  key={`GROC_${item.food.id}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F]"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {trText(lang, item.food.name)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-300 mono-num">
                      {tr(lang, 'المستهلك:', 'Consommé:', 'Logged:')} {item.weeklyLoggedGrams}g ({trText(lang, item.food.stateLabel)})
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 font-extrabold mono-num">
                    {item.formattedRawAmount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {tr(lang, `جدول الأغذية المغربية والمتوسطية (${MOROCCAN_FOOD_DB.length} عنصراً لكل 100 غرام)`, `Base Alimentaire Marocaine (${MOROCCAN_FOOD_DB.length} aliments)`, `Moroccan & Mediterranean Food Reference (${MOROCCAN_FOOD_DB.length} items / 100g)`)}
              </h3>
              <input
                type="search"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder={tr(lang, 'ابحث عن طعام...', 'Rechercher aliment...', 'Search food...')}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#24324F] bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#24324F] text-slate-500 dark:text-slate-300">
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
                    <tr key={f.id} className="border-b border-slate-100 dark:border-[#24324F]/60">
                      <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">{trText(lang, f.name)}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{trText(lang, f.stateLabel)}</td>
                      <td className="py-2 px-2 font-mono font-bold text-amber-600 dark:text-amber-300">{f.kcal}</td>
                      <td className="py-2 px-2 font-mono font-bold text-teal-600 dark:text-teal-300">{f.p}</td>
                      <td className="py-2 px-2 font-mono text-sky-600 dark:text-sky-300">{f.c}</td>
                      <td className="py-2 px-2 font-mono text-indigo-600 dark:text-indigo-300">{f.f}</td>
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
          <div className="rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] p-3 text-xs text-slate-700 dark:text-slate-200">
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
                className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      {trText(lang, sup.name)}
                    </h4>
                    <span className="text-[11px] font-bold text-teal-600 dark:text-teal-300">{sup.evidenceGrade}</span>
                  </div>
                  <a
                    href={sup.refUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-300 font-bold hover:underline"
                  >
                    <span>PMC</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{trText(lang, sup.roleNote)}</p>
                <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-2.5 font-bold text-slate-900 dark:text-white">
                  {tr(lang, 'الجرعة المرجعية:', 'Dosage indicatif :', 'Reference Dose:')} {trText(lang, sup.doseFormula(profile.weightKg))}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-300">
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
