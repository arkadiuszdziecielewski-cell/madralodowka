export type Category = 'lodówka' | 'zamrażarka' | 'szafki' | 'przyprawy';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
  status: 'Świeże' | 'Użyć wkrótce' | 'Zaraz się zepsuje' | 'Przeterminowane';
  expiryDays: number;
  category: Category;
  barcode?: string;
  spoilageProbability?: number; // 0-100%
  spoilageSuggestion?: string; // e.g. "zrób sos"
}

export interface Recipe {
  id: string;
  title: string;
  time: string;
  calories: string;
  macros: Macros; // B/W/T
  diet: string[];
  match: number;
  ingredients: string[];
  instructions: string[];
  difficulty: 'Łatwe' | 'Średnie' | 'Trudne';
  source?: 'AI' | 'Community';
  author?: string;
}

export interface FamilyMember {
  name: string;
  role: 'dorosły' | 'dziecko' | 'senior';
  dislikedIngredients: string[];
  allergies: string[];
  diet?: string;
}

export interface UserPreferences {
  peopleCount: number;
  diet: string;
  cookingTime: number; // in minutes
  dislikedIngredients: string[];
  allergies: string[];
  familyMode: boolean;
  familyMembers: FamilyMember[];
}

export interface MealPlanDay {
  day: string;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
  snacks?: Recipe;
  dailyTotalMacros?: Macros;
  dailyTotalCalories?: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  category: string; // aisle/category for sorting
  checked: boolean;
  priceEstimate?: string;
  affiliateLink?: string;
}
