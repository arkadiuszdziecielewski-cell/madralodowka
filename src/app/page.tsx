"use client";

import { useState, useEffect } from "react";
import { 
  Camera, 
  Refrigerator, 
  ChefHat, 
  ShoppingCart, 
  AlertTriangle,
  Plus,
  Search,
  User,
  Settings,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Utensils,
  History,
  Barcode,
  Calendar,
  Filter,
  Trash2,
  ChevronRight,
  Clock,
  Flame,
  Zap,
  Mic,
  FileText,
  Users,
  PieChart,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InventoryItem, Recipe, UserPreferences, MealPlanDay, ShoppingListItem, Category, Macros } from "@/lib/types";

type AppStep = 'dashboard' | 'scan' | 'edit_inventory' | 'preferences' | 'plan';
type MainTab = 'home' | 'pantry' | 'recipes' | 'shopping';

export default function Home() {
  // --- STATE ---
  const [currentStep, setCurrentStep] = useState<AppStep>('dashboard');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [isScanning, setIsScanning] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: "1", name: "Pomidory Maliniowe", quantity: "3 szt.", status: "Użyć wkrótce", expiryDays: 4, category: 'lodówka', spoilageProbability: 70, spoilageSuggestion: "Zrób sos pomidorowy" },
    { id: "2", name: "Pierś z Kurczaka", quantity: "500g", status: "Użyć wkrótce", expiryDays: 1, category: 'lodówka', spoilageProbability: 40, spoilageSuggestion: "Ugotuj dzisiaj" },
    { id: "3", name: "Jajka", quantity: "12 szt.", status: "Świeże", expiryDays: 12, category: 'lodówka', spoilageProbability: 5 },
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([
    { id: "s1", name: "Mleko 2%", quantity: "1L", category: "Nabiał", checked: false, priceEstimate: "3.50 zł", affiliateLink: "https://biedronka.pl" },
    { id: "s2", name: "Awokado", quantity: "2 szt.", category: "Warzywa", checked: false, priceEstimate: "8.00 zł" },
  ]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    peopleCount: 2,
    diet: "Keto",
    cookingTime: 30,
    dislikedIngredients: [],
    allergies: [],
    familyMode: false,
    familyMembers: []
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  // --- EFFECTS ---
  useEffect(() => {
    fetchRecipes();
  }, [preferences.diet]);

  // --- ACTIONS ---
  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`/api/recipes?diet=${preferences.diet}`);
      const data = await res.json();
      if (data.success) setRecipes(data.recipes);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    }
  };

  const handleScan = async () => {
    // 1. Wywołujemy systemowy aparat/galerię
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Preferuj tylną kamerę na mobile
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // 2. Konwersja do Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        // 3. Rozpoczynamy proces skanowania
        setCurrentStep('scan');
        setIsScanning(true);

        try {
          const res = await fetch("/api/scan", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image })
          });
          
          const data = await res.json();
          if (data.success) {
            setInventory(data.items);
            setTimeout(() => {
              setIsScanning(false);
              setCurrentStep('edit_inventory');
              triggerNotification(data.message);
            }, 1000);
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) {
          console.error("Error scanning:", err);
          setIsScanning(false);
          setCurrentStep('dashboard');
          triggerNotification("Błąd skanowania: " + err.message);
        }
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const handleReceiptScan = async () => {
    // Analogicznie dla paragonu
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        setIsScanning(true);
        setCurrentStep('scan');

        try {
          const res = await fetch("/api/receipt", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image })
          });
          
          const data = await res.json();
          if (data.success) {
            const newItems = data.items.map((item: any, i: number) => ({
              ...item,
              id: `r-${Date.now()}-${i}`,
              status: 'Świeże',
              expiryDays: 7,
              spoilageProbability: 0
            }));
            setInventory([...inventory, ...newItems]);
            
            setTimeout(() => {
              setIsScanning(false);
              setCurrentStep('edit_inventory');
              triggerNotification("Produkty z paragonu dodane!");
            }, 1000);
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) {
          console.error("Receipt Scan Error:", err);
          setIsScanning(false);
          setCurrentStep('dashboard');
          triggerNotification("Błąd paragonu: " + err.message);
        }
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const handleVoiceToggle = () => {
    setIsVoiceListening(!isVoiceListening);
    if (!isVoiceListening) {
      triggerNotification("Słucham... powiedz np. 'Dodaj 2 litry mleka'");
      setTimeout(() => setIsVoiceListening(false), 4000);
    }
  };

  const generatePlan = async () => {
    setCurrentStep('plan');
    try {
      const res = await fetch("/api/plan", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 3, diet: preferences.diet })
      });
      const data = await res.json();
      if (data.success) {
        setMealPlan(data.plan);
        triggerNotification("Plan posiłków i makro wygenerowane!");
      }
    } catch (err) {
      console.error("Error generating plan:", err);
    }
  };

  // --- UI COMPONENTS ---

  const Header = () => (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setCurrentStep('dashboard'); setActiveTab('home');}}>
        <div className="bg-primary-500 p-2 rounded-lg shadow-sm shadow-primary-200">
          <Refrigerator className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Mądra Lodówka</h1>
      </div>
      <div className="flex items-center gap-3">
        {preferences.familyMode && (
          <div className="flex -space-x-2 mr-2">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">J</div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-600">A</div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-600">K</div>
          </div>
        )}
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
          <Search className="w-5 h-5" />
        </button>
        <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden sm:block"></div>
        <button className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-50 rounded-full transition-colors border">
          <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">JD</div>
          <span className="text-sm font-semibold text-gray-700 hidden sm:inline">Jan</span>
        </button>
      </div>
    </header>
  );

  const Dashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero / Scanner CTA */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-[2rem] p-8 text-white shadow-xl shadow-primary-100 relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Co masz dziś w lodówce?</h2>
          <p className="text-primary-50 mb-8 max-w-md text-lg leading-relaxed opacity-90">
            Zrób zdjęcie wnętrza lub paragonu, a nasza AI rozpozna składniki i przewidzi ich trwałość.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleScan}
              className="bg-white text-primary-600 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-primary-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
            >
              <Camera className="w-6 h-6" />
              Skanuj Lodówkę
            </button>
            <button 
              onClick={handleReceiptScan}
              className="bg-primary-500/30 backdrop-blur-md text-white border border-white/20 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-primary-500/40 transition-all"
            >
              <FileText className="w-6 h-6" />
              Skanuj Paragon
            </button>
          </div>
        </div>
        <Refrigerator className="absolute -right-12 -bottom-12 w-80 h-80 text-white opacity-10 rotate-12 transition-transform group-hover:rotate-6 duration-700" />
      </section>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Zapasy', icon: Refrigerator, color: 'bg-blue-50 text-blue-600', tab: 'pantry' },
          { label: 'Przepisy', icon: ChefHat, color: 'bg-orange-50 text-orange-600', tab: 'recipes' },
          { label: 'Zakupy', icon: ShoppingCart, color: 'bg-green-50 text-green-600', tab: 'shopping' },
          { label: 'Rodzina', icon: Users, color: 'bg-purple-50 text-purple-600', tab: 'home' },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(item.tab as MainTab)}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center gap-3"
          >
            <div className={`p-3 rounded-2xl ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="font-bold text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Spoilage Alerts */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="text-amber-500 w-5 h-5" />
          Alerty Marnowania
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inventory.filter(i => (i.spoilageProbability || 0) > 30).map(item => (
            <div key={item.id} className="bg-white border-l-4 border-amber-500 p-5 rounded-2xl shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 p-2.5 rounded-xl">
                  <Flame className="text-amber-600 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      {item.spoilageProbability}% RYZYKA
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.spoilageSuggestion}</p>
                  <button className="text-primary-600 text-xs font-bold mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    ZOBACZ PRZEPIS <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const StepScan = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in zoom-in duration-300">
      <div className="relative">
        <div className="w-48 h-48 bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
          <Camera className="w-20 h-20 text-primary-600" />
        </div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute -inset-4 border-4 border-dashed border-primary-300 rounded-full"
        />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Gemini Flash analizuje dane...</h2>
        <p className="text-gray-500 mt-2">To potrwa tylko kilka sekund.</p>
      </div>
      <div className="w-full max-w-xs bg-gray-100 h-2 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.5 }}
          className="bg-primary-500 h-full"
        />
      </div>
    </div>
  );

  const StepEditInventory = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Rozpoznane produkty</h2>
        <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-bold">
          {inventory.length} POZYCJI
        </span>
      </div>
      
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {inventory.map((item) => (
            <div key={item.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                  {item.name.includes('Mleko') ? '🥛' : item.name.includes('Pomidor') ? '🍅' : item.name.includes('Kurczak') ? '🍗' : '📦'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{item.category}</span>
                    <span className="text-gray-200">•</span>
                    <span className="text-xs font-bold text-primary-600">{item.quantity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.spoilageProbability !== undefined && item.spoilageProbability > 0 && (
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                    item.spoilageProbability > 50 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.spoilageProbability}% RYZYKA
                  </span>
                )}
                <button className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={() => setCurrentStep('preferences')}
        className="w-full bg-primary-600 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-primary-700 shadow-xl shadow-primary-100 transition-all"
      >
        Wszystko się zgadza <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );

  const StepPreferences = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Ustawienia Planu</h2>
        <p className="text-gray-500 mt-2">AI Gemini Flash dostosuje przepisy do Twoich potrzeb.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Family Mode Toggle */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${preferences.familyMode ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Family Mode</p>
              <p className="text-xs text-gray-500">Wspólna spiżarnia i profile członków</p>
            </div>
          </div>
          <button 
            onClick={() => setPreferences({...preferences, familyMode: !preferences.familyMode})}
            className={`w-14 h-8 rounded-full relative transition-colors ${preferences.familyMode ? 'bg-primary-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${preferences.familyMode ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {/* Diet Selection */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Twoja dieta</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Standard', 'Keto', 'Wege', 'Niskokaloryczne'].map(d => (
              <button 
                key={d}
                onClick={() => setPreferences({...preferences, diet: d})}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  preferences.diet === d 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Exclusions */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Czego nie lubimy? (AI unika)</label>
          <div className="flex flex-wrap gap-2">
            {['Szpinak', 'Cebula', 'Orzechy', 'Laktoza'].map(item => (
              <button key={item} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-500 transition-colors flex items-center gap-2 border border-transparent hover:border-red-100">
                {item} <Plus className="w-3 h-3 rotate-45" />
              </button>
            ))}
            <button className="px-4 py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl text-sm font-bold hover:border-primary-300 hover:text-primary-500 transition-all flex items-center gap-2">
              Dodaj <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={generatePlan}
        className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-black shadow-xl transition-all"
      >
        Generuj Plan i Makroskładniki <Zap className="w-6 h-6" />
      </button>
    </div>
  );

  const StepPlan = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Twój Plan Posilków</h2>
        <div className="flex gap-2">
          <button className="p-2 bg-white border rounded-xl text-gray-400 hover:text-gray-900"><Calendar className="w-5 h-5" /></button>
          <button className="p-2 bg-white border rounded-xl text-gray-400 hover:text-gray-900"><PieChart className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Daily Macro Summary (Global) */}
      <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Średnie dzienne Makro</p>
          <p className="text-2xl font-bold">1850 <span className="text-sm font-normal text-white/50">kcal</span></p>
        </div>
        <div className="flex gap-4">
          {[
            { label: 'B', val: '120g', col: 'text-blue-400' },
            { label: 'W', val: '45g', col: 'text-orange-400' },
            { label: 'T', val: '140g', col: 'text-green-400' }
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className={`text-xs font-black ${m.col}`}>{m.label}</p>
              <p className="font-bold text-sm">{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {mealPlan.map((day, i) => (
          <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 group hover:border-primary-200 transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-8 bg-primary-500 rounded-full"></span>
                {day.day}
              </h3>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suma dnia</p>
                <p className="text-sm font-bold text-primary-600">1780 kcal</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Śniadanie', recipe: day.breakfast },
                { label: 'Obiad', recipe: day.lunch },
                { label: 'Kolacja', recipe: day.dinner }
              ].map((meal, j) => (
                <div key={j} className="group/meal cursor-pointer">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{meal.label}</p>
                  <div className="bg-gray-50 rounded-2xl p-4 group-hover/meal:bg-primary-50 transition-colors border border-transparent group-hover/meal:border-primary-100">
                    <h4 className="font-bold text-gray-900 group-hover/meal:text-primary-700 transition-colors leading-tight mb-2 h-10 overflow-hidden">{meal.recipe.title}</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded text-blue-600 border border-blue-100">B: {meal.recipe.macros?.protein}g</span>
                      <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded text-orange-600 border border-orange-100">W: {meal.recipe.macros?.carbs}g</span>
                      <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded text-green-600 border border-green-100">T: {meal.recipe.macros?.fat}g</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {meal.recipe.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button className="flex-1 bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-2xl font-bold hover:bg-gray-50 transition-all">
          Zmień plan
        </button>
        <button 
          onClick={() => setActiveTab('shopping')}
          className="flex-1 bg-primary-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary-700 shadow-xl shadow-primary-100 transition-all"
        >
          Lista Zakupów <ShoppingCart className="w-6 h-6" />
        </button>
      </div>
    </div>
  );

  const PantryView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Moje Zapasy</h2>
        <div className="flex gap-2">
          <button className="bg-primary-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg shadow-primary-100">
            <Plus className="w-5 h-5" /> Dodaj
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['Wszystko', 'Lodówka', 'Zamrażarka', 'Szafki', 'Przyprawy'].map(cat => (
          <button 
            key={cat}
            className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              cat === 'Wszystko' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border text-gray-500 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {inventory.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  item.status === 'Przeterminowane' ? 'bg-red-50' : 
                  item.status === 'Zaraz się zepsuje' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                   {item.name.includes('Mleko') ? '🥛' : item.name.includes('Pomidor') ? '🍅' : item.name.includes('Kurczak') ? '🍗' : '📦'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{item.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">{item.quantity}</span>
                    <span className="text-gray-200">•</span>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">{item.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className={`text-xs font-black uppercase tracking-tighter ${
                    (item.spoilageProbability || 0) > 50 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {item.spoilageProbability ? `${item.spoilageProbability}% RYZYKA` : item.status}
                  </p>
                  <p className="text-sm font-bold text-gray-900">{item.expiryDays} dni</p>
                </div>
                <button className="p-2 text-gray-300 group-hover:text-gray-900 transition-colors">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ShoppingListView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Lista Zakupów</h2>
        <div className="flex gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-900"><History className="w-6 h-6" /></button>
          <button className="p-2 text-gray-400 hover:text-gray-900"><Trash2 className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="space-y-8">
        {['Warzywa', 'Nabiał'].map(cat => (
          <div key={cat} className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-4">{cat}</h3>
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {shoppingList.filter(item => item.category === cat).map(item => (
                  <div key={item.id} className="p-6 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => {
                          setShoppingList(shoppingList.map(s => s.id === item.id ? {...s, checked: !s.checked} : s))
                        }}
                        className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                        item.checked ? 'bg-primary-500 border-primary-500' : 'border-gray-200 group-hover:border-primary-300'
                      }`}>
                        {item.checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <span className={`font-bold text-lg ${item.checked ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                          {item.name}
                        </span>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">{item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.priceEstimate && <span className="text-sm font-bold text-gray-400">{item.priceEstimate}</span>}
                      {item.affiliateLink && (
                        <a href={item.affiliateLink} target="_blank" className="bg-primary-50 text-primary-600 p-2 rounded-xl hover:bg-primary-100 transition-colors">
                          <ShoppingCart className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 p-6 rounded-[2rem] border border-primary-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm">
            <History className="text-primary-600 w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Zamów z Biedronki</p>
            <p className="text-xs text-gray-500">Prowizja uratuje 2 kg jedzenia</p>
          </div>
        </div>
        <button className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all">
          ZAMÓW
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50/50 pb-32">
      <Header />

      {/* Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 pointer-events-auto border border-white/10">
              <CheckCircle2 className="text-primary-400 w-5 h-5" />
              <span className="text-sm font-bold tracking-tight">{notificationMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        {currentStep !== 'dashboard' && activeTab === 'home' && (
          <div className="flex items-center justify-center gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
            {['scan', 'edit_inventory', 'preferences', 'plan'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shrink-0 ${
                  currentStep === step ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 scale-110' : 
                  ['scan', 'edit_inventory', 'preferences', 'plan'].indexOf(currentStep) > i ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {['scan', 'edit_inventory', 'preferences', 'plan'].indexOf(currentStep) > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                {i < 3 && <div className={`h-1 w-8 rounded-full shrink-0 ${['scan', 'edit_inventory', 'preferences', 'plan'].indexOf(currentStep) > i ? 'bg-primary-200' : 'bg-gray-100'}`}></div>}
              </div>
            ))}
          </div>
        )}

        {/* Content Router */}
        {activeTab === 'home' ? (
          <>
            {currentStep === 'dashboard' && <Dashboard />}
            {currentStep === 'scan' && <StepScan />}
            {currentStep === 'edit_inventory' && <StepEditInventory />}
            {currentStep === 'preferences' && <StepPreferences />}
            {currentStep === 'plan' && <StepPlan />}
          </>
        ) : activeTab === 'pantry' ? (
          <PantryView />
        ) : activeTab === 'shopping' ? (
          <ShoppingListView />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
            <Settings className="w-16 h-16 opacity-20" />
            <p className="font-bold text-lg">Moduł w przygotowaniu...</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-gray-100 flex justify-around items-center py-4 px-6 z-40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem]">
        {[
          { id: 'home', icon: Refrigerator, label: 'Start' },
          { id: 'pantry', icon: Utensils, label: 'Zapasy' },
          { id: 'voice_btn', icon: isVoiceListening ? Loader2 : Mic, label: 'Mów', special: true, isListening: isVoiceListening },
          { id: 'shopping', icon: ShoppingCart, label: 'Zakupy' },
          { id: 'recipes', icon: Heart, label: 'Profil' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => {
              if (item.special) handleVoiceToggle();
              else {
                setActiveTab(item.id as MainTab);
                setCurrentStep('dashboard');
              }
            }}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              item.special ? '-mt-16' : 
              activeTab === item.id ? 'text-primary-600 scale-110' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {item.special ? (
              <div className={`p-5 rounded-full shadow-2xl border-8 border-gray-50 active:scale-90 transition-all ${
                item.isListening ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-primary-600 shadow-primary-200'
              }`}>
                <item.icon className={`text-white w-7 h-7 ${item.isListening ? 'animate-spin' : ''}`} />
              </div>
            ) : (
              <item.icon className="w-6 h-6" />
            )}
            <span className={`text-[10px] font-black uppercase tracking-widest ${item.special ? 'mt-2' : ''}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </main>
  );
}
