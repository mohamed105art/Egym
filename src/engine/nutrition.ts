import { tr } from './i18n';
import { FoodItem, Lang, MealBlock, UserProfile } from '../types/app';

export interface BiometricTargets {
  bmi: number;
  bmr: number;
  tdee: number;
  targetKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface MacroPieSlice {
  key: 'protein' | 'carbs' | 'fat';
  name: string;
  grams: number;
  kcal: number;
  pct: number;
  color: string;
}

export function calculateBiometrics(profile: UserProfile): BiometricTargets {
  const sexOffset = profile.sex === 'female' ? -161 : 5;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const tdee = bmr * profile.activityFactor;

  let defaultDelta = 0;
  if (profile.goalMode === 'lean_bulk') defaultDelta = 280;
  else if (profile.goalMode === 'fat_loss') defaultDelta = -420;

  const appliedDelta = profile.caloricDelta !== 0 ? profile.caloricDelta : defaultDelta;
  const targetKcal = Math.max(1350, Math.round(tdee + appliedDelta));

  const clampedProteinPerKg = Math.max(1.4, Math.min(2.4, profile.proteinPerKg));
  const proteinG = Math.round(profile.weightKg * clampedProteinPerKg);
  const fatMultiplier = profile.goalMode === 'fat_loss' ? 0.75 : profile.goalMode === 'lean_bulk' ? 0.95 : 0.85;
  const fatG = Math.round(profile.weightKg * fatMultiplier);
  const remainingKcal = Math.max(200, targetKcal - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingKcal / 4);
  const bmi = Number((profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1));

  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const totalMacroKcal = Math.max(1, proteinKcal + carbsKcal + fatKcal);

  const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
  const fatPct = Math.round((fatKcal / totalMacroKcal) * 100);
  const carbsPct = Math.max(0, 100 - proteinPct - fatPct);

  return {
    bmi,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal,
    proteinG,
    fatG,
    carbsG,
    proteinKcal,
    carbsKcal,
    fatKcal,
    proteinPct,
    carbsPct,
    fatPct,
  };
}

export function buildMacroPieData(targets: BiometricTargets, lang: Lang): MacroPieSlice[] {
  return [
    {
      key: 'protein',
      name: tr(lang, 'البروتين (Protein)', 'Protéines', 'Protein'),
      grams: targets.proteinG,
      kcal: targets.proteinKcal,
      pct: targets.proteinPct,
      color: '#14b8a6', // Teal Emerald
    },
    {
      key: 'carbs',
      name: tr(lang, 'الكربوهيدرات (Carbs)', 'Glucides', 'Carbohydrates'),
      grams: targets.carbsG,
      kcal: targets.carbsKcal,
      pct: targets.carbsPct,
      color: '#38bdf8', // Royal Sky Blue
    },
    {
      key: 'fat',
      name: tr(lang, 'الدهون الصحية (Fats)', 'Lipides', 'Healthy Fats'),
      grams: targets.fatG,
      kcal: targets.fatKcal,
      pct: targets.fatPct,
      color: '#818cf8', // Soft Indigo
    },
  ];
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function calculateMealsTotals(meals: MealBlock[], foodDb: FoodItem[]): MacroTotals {
  const byId = new Map(foodDb.map((f) => [f.id, f]));
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const meal of meals) {
    for (const item of meal.items) {
      const food = byId.get(item.foodId);
      if (!food) continue;
      const ratio = item.grams / 100;
      kcal += food.kcal * ratio;
      protein += food.p * ratio;
      carbs += food.c * ratio;
      fat += food.f * ratio;
    }
  }

  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export interface GroceryListItem {
  food: FoodItem;
  weeklyLoggedGrams: number;
  weeklyRawGroceryGrams: number;
  formattedRawAmount: string;
}

export function buildWeeklyGroceryList(
  customMeals: { training: MealBlock[]; rest: MealBlock[] },
  foodDb: FoodItem[],
  trainingDaysPerWeek = 3
): GroceryListItem[] {
  const restDaysPerWeek = Math.max(0, 7 - trainingDaysPerWeek);
  const totalsByFoodId = new Map<string, number>();

  for (const meal of customMeals.training) {
    for (const item of meal.items) {
      totalsByFoodId.set(item.foodId, (totalsByFoodId.get(item.foodId) || 0) + item.grams * trainingDaysPerWeek);
    }
  }
  for (const meal of customMeals.rest) {
    for (const item of meal.items) {
      totalsByFoodId.set(item.foodId, (totalsByFoodId.get(item.foodId) || 0) + item.grams * restDaysPerWeek);
    }
  }

  const byId = new Map(foodDb.map((f) => [f.id, f]));
  const items: GroceryListItem[] = [];

  for (const [foodId, loggedGrams] of totalsByFoodId.entries()) {
    const food = byId.get(foodId);
    if (!food || loggedGrams <= 0) continue;
    const rawGrams = Math.round(loggedGrams * food.rawFactor);
    const formattedRawAmount = rawGrams >= 1000 ? `${(rawGrams / 1000).toFixed(2)} kg` : `${rawGrams} g`;
    items.push({
      food,
      weeklyLoggedGrams: Math.round(loggedGrams),
      weeklyRawGroceryGrams: rawGrams,
      formattedRawAmount,
    });
  }

  return items;
}
