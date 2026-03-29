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
type MainTab = 'home' | 'pantry' | 'recipes' | 'shopping' | 'stats';

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
    familyMembers: [],
    goals: {
      calories: 2000,
      macros: { protein: 150, carbs: 50, fat: 140 }
    }
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

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
    setIsLoadingRecipes(true);
    try {
      const ingredientNames = inventory.map(i => i.name).join(',');
      const res = await fetch(`/api/recipes?diet=${preferences.diet}&ingredients=${encodeURIComponent(ingredientNames)}`);
      const data = await res.json();
      if (data.success) setRecipes(data.recipes);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setIsLoadingRecipes(false);
    }
  };


  // Pomocnicza funkcja do kompresji obrazu
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // Rozsądny rozmiar dla Gemini Vision
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Kompresja do JPEG 0.7 (znaczna redukcja rozmiaru przy zachowaniu detali dla AI)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleScan = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        
        // Kompresujemy przed wysyłką, aby uniknąć Payload Too Large (limit Vercel 4.5MB)
        const compressedBase64 = await compressImage(originalBase64);
        
        setCurrentStep('scan');
        setIsScanning(true);

        try {
          const res = await fetch("/api/scan", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: compressedBase64 })
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        
        // Kompresujemy również paragony
        const compressedBase64 = await compressImage(originalBase64);
        
        setIsScanning(true);
        setCurrentStep('scan');

        try {
          const res = await fetch("/api/receipt", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: compressedBase64 })
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

  const [editingItem, setEditingItem] = useState<string | null>(null);

  // --- UI COMPONENTS ---


  const MacroRing = ({ val, max, label, color, unit = "g" }: { val: number, max: number, label: string, color: string, unit?: string }) => {
    const percentage = Math.min((val / max) * 100, 100);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-100"
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              fill="transparent"
              strokeLinecap="round"
              className={color}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-gray-900 leading-none">{val}</span>
            <span className="text-[8px] font-bold text-gray-400 uppercase">{unit}</span>
          </div>
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
    );
  };

  const NutritionalDashboard = () => {
    // Przykładowe dane z aktualnego dnia planu
    const dailyData = {
      calories: 1780,
      protein: 125,
      carbs: 38,
      fat: 132
    };

    const goals = preferences.goals!;

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-end justify-between px-2">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Twoje Postępy</h2>
            <p className="text-slate-500 mt-1">Analiza Twojego odżywiania.</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-slate-600">Dzisiaj</span>
          </div>
        </div>

        {/* Główne podsumowanie kalorii */}
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">Pozostało Kalorii</p>
              <div className="flex items-baseline gap-3">
                <h3 className="text-7xl font-black tracking-tighter">{goals.calories - dailyData.calories}</h3>
                <span className="text-2xl font-medium text-white/40">kcal</span>
              </div>
              <div className="mt-10 flex items-center gap-4">
                <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dailyData.calories / goals.calories) * 100}%` }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50"
                  />
                </div>
                <span className="text-sm font-black text-white/60">{Math.round((dailyData.calories / goals.calories) * 100)}%</span>
              </div>
            </div>
            
            <div className="flex justify-around bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
              <MacroRing val={dailyData.protein} max={goals.macros.protein} label="Białko" color="text-blue-400" />
              <MacroRing val={dailyData.carbs} max={goals.macros.carbs} label="Węgle" color="text-amber-400" />
              <MacroRing val={dailyData.fat} max={goals.macros.fat} label="Tłuszcze" color="text-emerald-400" />
            </div>
          </div>
          <PieChart className="absolute -right-20 -bottom-20 w-96 h-96 text-white opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
        </section>

        {/* Szczegółowa analiza */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Nawodnienie', val: '1.2', target: '2.5', unit: 'L', icon: Heart, col: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Błonnik', val: '18', target: '30', unit: 'g', icon: Zap, col: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Cukry', val: '12', target: '25', unit: 'g', icon: AlertTriangle, col: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-8 rounded-[2.5rem] group hover:-translate-y-2 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.col} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{stat.val}</span>
                <span className="text-sm font-bold text-slate-400">/ {stat.target}{stat.unit}</span>
              </div>
              <div className="mt-6 h-2 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(parseFloat(stat.val) / parseFloat(stat.target)) * 100}%` }}
                  className={`h-full ${stat.col.replace('text', 'bg')} shadow-sm`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Insight AI */}
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[3rem] flex items-start gap-8 relative overflow-hidden group">
          <div className="bg-white p-5 rounded-3xl shadow-xl shadow-emerald-200/50 relative z-10 group-hover:scale-110 transition-transform">
            <ChefHat className="text-emerald-600 w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">Analiza Gemini: Twoje Makro</h4>
            <p className="text-slate-600 mt-2 leading-relaxed text-lg">
              Jesteś na dobrej drodze do celu Keto! Masz jeszcze spory zapas tłuszczy na kolację. 
              Sugeruję dodać awokado do wieczornego posiłku, aby domknąć bilans energetyczny.
            </p>
          </div>
          <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-100 opacity-50 rotate-12" />
        </div>
      </div>
    );
  };


  const Header = () => (
    <header className="glass-nav px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b-0">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {setCurrentStep('dashboard'); setActiveTab('home');}}>
        <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
          <Refrigerator className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Mądra Lodówka</h1>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">AI Kitchen Assistant</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {preferences.familyMode && (
          <div className="flex -space-x-2 mr-2">
            {['J', 'A', 'K'].map((initial, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                {initial}
              </div>
            ))}
          </div>
        )}
        <button className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-100 rounded-full transition-all border border-slate-200 bg-white">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">JD</div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">Jan</span>
        </button>
      </div>
    </header>
  );

  const Dashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Hero / Scanner CTA */}
      <section className="bg-emerald-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-emerald-200 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="badge-emerald bg-white/20 text-white border border-white/30 mb-6 inline-block">
            Technologia Gemini 2.5 Flash
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight leading-tight max-w-md">
            Twoja kuchnia w inteligentnym wydaniu.
          </h2>
          <p className="text-emerald-50 mb-10 max-w-sm text-lg leading-relaxed opacity-90">
            Zrób zdjęcie, a my zajmiemy się resztą. Przepisy, zapasy i makro w jednym miejscu.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleScan}
              className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
            >
              <Camera className="w-6 h-6" />
              Skanuj Lodówkę
            </button>
            <button 
              onClick={handleReceiptScan}
              className="bg-emerald-500/30 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-500/40 transition-all active:scale-95"
            >
              <FileText className="w-6 h-6" />
              Dodaj Paragon
            </button>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-1000" />
        <Refrigerator className="absolute -right-12 -bottom-12 w-80 h-80 text-white opacity-10 rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110 duration-1000" />
      </section>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { label: 'Makro', icon: PieChart, color: 'text-indigo-600', bg: 'bg-indigo-50', tab: 'stats' },
          { label: 'Zapasy', icon: Refrigerator, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'pantry' },
          { label: 'Zakupy', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'shopping' },
          { label: 'Przepisy', icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'home', step: 'plan' },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={() => {
              setActiveTab(item.tab as MainTab);
              if (item.step) setCurrentStep(item.step as AppStep);
            }}
            className="glass-card p-6 rounded-[2rem] hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col items-center gap-4 group"
          >
            <div className={`p-4 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
              <item.icon className="w-7 h-7" />
            </div>
            <span className="font-bold text-slate-700 tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Spoilage Alerts - Nowoczesny Carousel/List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="text-amber-600 w-5 h-5" />
            </div>
            Uratuj te produkty
          </h3>
          <button onClick={() => setActiveTab('pantry')} className="text-sm font-bold text-emerald-600 hover:underline">Zobacz wszystkie</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inventory.filter(i => (i.spoilageProbability || 0) > 30).slice(0, 2).map(item => (
            <div key={item.id} className="glass-card p-6 rounded-[2rem] flex items-center gap-6 group hover:border-amber-200 transition-all">
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                {item.name.includes('Mleko') ? '🥛' : item.name.includes('Pomidor') ? '🍅' : item.name.includes('Kurczak') ? '🍗' : '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                  <span className="badge-amber shrink-0">{item.spoilageProbability}%</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">{item.spoilageSuggestion}</p>
                <button className="text-emerald-600 text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  PRZEPIS AI <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  const StepScan = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 animate-in zoom-in duration-500">
      <div className="relative">
        <div className="w-56 h-56 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse shadow-inner">
          <Camera className="w-24 h-24 text-emerald-600 animate-float" />
        </div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="absolute -inset-6 border-2 border-dashed border-emerald-200 rounded-full"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
          className="absolute -inset-10 border border-dotted border-emerald-100 rounded-full"
        />
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">AI Gemini analizuje obraz...</h2>
        <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">Rozpoznaję produkty, sprawdzam daty ważności i szukam inspiracji kulinarnych.</p>
      </div>
      <div className="w-full max-w-xs bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="bg-emerald-600 h-full shadow-lg shadow-emerald-200"
        />
      </div>
    </div>
  );

  const StepEditInventory = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sprawdź listę</h2>
          <p className="text-slate-500 mt-1">AI rozpoznało następujące produkty:</p>
        </div>
        <span className="badge-emerald py-2 px-4 shadow-sm">
          {inventory.length} pozycji
        </span>
      </div>
      
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <div className="divide-y divide-slate-100">
          {inventory.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                  {item.name.includes('Mleko') ? '🥛' : item.name.includes('Pomidor') ? '🍅' : item.name.includes('Kurczak') ? '🍗' : '📦'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg tracking-tight">{item.name}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{item.quantity}</span>
                    <span className="text-slate-200">•</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {item.spoilageProbability !== undefined && item.spoilageProbability > 0 && (
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                    item.spoilageProbability > 50 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.spoilageProbability}% ryzyka
                  </span>
                )}
                <button className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full p-6 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors border-t border-slate-100">
          <Plus className="w-5 h-5" /> Dodaj brakujący produkt
        </button>
      </div>

      <button 
        onClick={() => setCurrentStep('preferences')}
        className="btn-primary w-full py-6 text-xl shadow-2xl flex items-center justify-center gap-4"
      >
        Wszystko się zgadza <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );

  const StepPreferences = () => (
    <div className="space-y-10 animate-in slide-in-from-right-8 duration-700">
      <div className="text-center px-4">
        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Twoje preferencje</h2>
        <p className="text-slate-500 mt-2 text-lg">AI dostosuje plan do Twojego stylu życia.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Family Mode Toggle */}
        <div className="glass-card p-8 rounded-[2.5rem] flex items-center justify-between group">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl transition-all ${preferences.familyMode ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg">Family Mode</p>
              <p className="text-sm text-slate-500">Wspólna spiżarnia i profile członków</p>
            </div>
          </div>
          <button 
            onClick={() => setPreferences({...preferences, familyMode: !preferences.familyMode})}
            className={`w-16 h-9 rounded-full relative transition-all duration-300 ${preferences.familyMode ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${preferences.familyMode ? 'right-1.5' : 'left-1.5'}`} />
          </button>
        </div>

        {/* Diet Selection */}
        <div className="glass-card p-8 rounded-[2.5rem]">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Wybierz dietę</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Standard', 'Keto', 'Wege', 'Low-Cal'].map(d => (
              <button 
                key={d}
                onClick={() => setPreferences({...preferences, diet: d})}
                className={`py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                  preferences.diet === d 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Exclusions */}
        <div className="glass-card p-8 rounded-[2.5rem]">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Czego nie lubimy? (AI unika)</label>
          <div className="flex flex-wrap gap-3">
            {['Szpinak', 'Cebula', 'Orzechy', 'Laktoza'].map(item => (
              <button key={item} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2 border border-slate-100 hover:border-rose-100 group">
                {item} <Plus className="w-4 h-4 rotate-45 group-hover:rotate-90 transition-transform" />
              </button>
            ))}
            <button className="px-5 py-2.5 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-sm font-bold hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center gap-2 hover:bg-emerald-50/30">
              Dodaj <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={generatePlan}
        className="btn-primary w-full py-6 text-xl shadow-2xl flex items-center justify-center gap-4 bg-slate-900 hover:bg-black shadow-slate-200"
      >
        Generuj Plan i Makro <Zap className="w-6 h-6 fill-current" />
      </button>
    </div>
  );

  const StepPlan = () => (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Twój Plan</h2>
          <p className="text-slate-500 mt-1">Dopasowany przez AI do Twojej lodówki.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary p-3 rounded-xl shadow-none"><Calendar className="w-5 h-5" /></button>
          <button className="btn-secondary p-3 rounded-xl shadow-none" onClick={() => setActiveTab('stats')}><PieChart className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Daily Macro Summary (Global) */}
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">Średnie dzienne Makro</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black tracking-tighter">1850</h3>
              <span className="text-xl font-medium text-white/40">kcal</span>
            </div>
          </div>
          <div className="flex gap-8">
            {[
              { label: 'Białko', val: '120g', col: 'text-blue-400' },
              { label: 'Węgle', val: '45g', col: 'text-amber-400' },
              { label: 'Tłuszcz', val: '140g', col: 'text-emerald-400' }
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className={`text-[10px] font-black ${m.col} uppercase tracking-widest mb-1`}>{m.label}</p>
                <p className="font-bold text-lg">{m.val}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000" />
      </div>

      <div className="space-y-12">
        {isLoadingRecipes ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-[2.5rem] p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-2 w-12 bg-slate-100 rounded" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  </div>
                  <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-44 bg-slate-50 rounded-2xl mb-5" />
                <div className="flex gap-2 mb-4">
                  <div className="h-4 w-12 bg-slate-100 rounded-lg" />
                  <div className="h-4 w-12 bg-slate-100 rounded-lg" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                  <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : mealPlan.length > 0 ? (
          mealPlan.map((day, i) => (
            <div key={i} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-slate-100" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">{day.day}</h3>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Śniadanie', recipe: day.breakfast, icon: '🍳' },
                  { label: 'Obiad', recipe: day.lunch, icon: '🥗' },
                  { label: 'Kolacja', recipe: day.dinner, icon: '🥘' }
                ].map((meal, j) => (
                  <div key={j} className="group/meal cursor-pointer glass-card rounded-[2.5rem] p-6 hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{meal.label}</span>
                        <h4 className="font-bold text-slate-900 group-hover/meal:text-emerald-700 transition-colors leading-tight h-12 overflow-hidden">{meal.recipe.title}</h4>
                      </div>
                      <span className="text-2xl">{meal.icon}</span>
                    </div>
                    
                    {meal.recipe.image && (
                      <div className="mb-5 rounded-2xl overflow-hidden h-44 w-full relative shadow-inner">
                        <img src={meal.recipe.image} alt={meal.recipe.title} className="w-full h-full object-cover group-hover/meal:scale-110 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                           <span className="text-[9px] font-black bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-slate-900 uppercase tracking-tighter">
                             {meal.recipe.match}% MATCH
                           </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-[9px] font-bold bg-blue-50 px-2 py-1 rounded-lg text-blue-700">B: {meal.recipe.macros?.protein}g</span>
                      <span className="text-[9px] font-bold bg-amber-50 px-2 py-1 rounded-lg text-amber-700">W: {meal.recipe.macros?.carbs}g</span>
                      <span className="text-[9px] font-bold bg-emerald-50 px-2 py-1 rounded-lg text-emerald-700">T: {meal.recipe.macros?.fat}g</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> {meal.recipe.time}
                      </div>
                      <button className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover/meal:bg-emerald-600 group-hover/meal:text-white transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 glass-card rounded-[3rem]">
            <ChefHat className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Brak wygenerowanego planu.</p>
            <button onClick={generatePlan} className="text-emerald-600 font-bold mt-2 hover:underline">Wygeneruj teraz</button>
          </div>
        )}
      </div>


      <div className="flex gap-6">
        <button className="btn-secondary flex-1 py-6 text-lg border-2 border-slate-100 shadow-none hover:bg-slate-50">
          Zmień plan
        </button>
        <button 
          onClick={() => setActiveTab('shopping')}
          className="btn-primary flex-1 py-6 text-lg shadow-2xl flex items-center justify-center gap-4"
        >
          Lista Zakupów <ShoppingCart className="w-6 h-6" />
        </button>
      </div>
    </div>
  );

  const PantryView = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Twoje Zapasy</h2>
          <p className="text-slate-500 mt-1">Zarządzaj tym, co masz w domu.</p>
        </div>
        <button className="btn-primary py-3 px-6 shadow-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> Dodaj
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
        {['Wszystko', 'Lodówka', 'Zamrażarka', 'Szafki', 'Przyprawy'].map(cat => (
          <button 
            key={cat}
            className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
              cat === 'Wszystko' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <div className="divide-y divide-slate-100">
          {inventory.map((item) => (
            <div key={item.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group relative">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110 ${
                  item.status === 'Przeterminowane' ? 'bg-rose-50' : 
                  item.status === 'Zaraz się zepsuje' ? 'bg-amber-50' : 'bg-white border border-slate-100'
                }`}>
                   {item.name.includes('Mleko') ? '🥛' : item.name.includes('Pomidor') ? '🍅' : item.name.includes('Kurczak') ? '🍗' : '📦'}
                </div>
                {editingItem === item.id ? (
                  <div className="flex flex-col gap-2">
                    <input 
                      autoFocus
                      className="font-bold text-xl tracking-tight bg-slate-50 border-b border-emerald-500 outline-none px-2 py-1 rounded-lg"
                      defaultValue={item.name}
                      onBlur={(e) => {
                        setInventory(inventory.map(i => i.id === item.id ? {...i, name: e.target.value} : i));
                        setEditingItem(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                    />
                    <div className="flex gap-2">
                      <input 
                        className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg w-20 outline-none"
                        defaultValue={item.quantity}
                        onBlur={(e) => setInventory(inventory.map(i => i.id === item.id ? {...i, quantity: e.target.value} : i))}
                      />
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditingItem(item.id)} className="cursor-pointer">
                    <h4 className="font-bold text-slate-900 text-xl tracking-tight flex items-center gap-2">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="badge-emerald py-1 px-3 lowercase tracking-normal">{item.quantity}</span>
                      <span className="text-slate-200">•</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-10">
                <div className="text-right hidden sm:block">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    (item.spoilageProbability || 0) > 50 ? 'text-rose-500' : 'text-slate-400'
                  }`}>
                    {item.spoilageProbability ? `${item.spoilageProbability}% RYZYKA` : item.status}
                  </p>
                  <p className="text-lg font-bold text-slate-900">{item.expiryDays} dni</p>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setInventory(inventory.filter(i => i.id !== item.id))}
                     className="p-3 bg-rose-50 text-rose-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 hover:text-rose-600"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                   <button className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                     <ChevronRight className="w-6 h-6" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );

  const ShoppingListView = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Lista Zakupów</h2>
          <p className="text-slate-500 mt-1">Uzupełnij brakujące produkty.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary p-3 rounded-xl shadow-none"><History className="w-6 h-6" /></button>
          <button className="btn-secondary p-3 rounded-xl shadow-none hover:text-rose-600"><Trash2 className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="space-y-10">
        {['Warzywa', 'Nabiał'].map(cat => (
          <div key={cat} className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-6">{cat}</h3>
            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="divide-y divide-slate-100">
                {shoppingList.filter(item => item.category === cat).map(item => (
                  <div key={item.id} className="p-8 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-6">
                      <div 
                        onClick={() => {
                          setShoppingList(shoppingList.map(s => s.id === item.id ? {...s, checked: !s.checked} : s))
                        }}
                        className={`w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                        item.checked ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-200' : 'border-slate-200 group-hover:border-emerald-400'
                      }`}>
                        {item.checked && <CheckCircle2 className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <span className={`font-bold text-xl tracking-tight transition-all ${item.checked ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                          {item.name}
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {item.priceEstimate && <span className="text-sm font-bold text-slate-400 tracking-tight">{item.priceEstimate}</span>}
                      {item.affiliateLink && (
                        <a href={item.affiliateLink} target="_blank" className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm">
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

      <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-emerald-200 flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10 flex items-center gap-8">
          <div className="bg-white/20 backdrop-blur-md p-5 rounded-[2rem] shadow-xl border border-white/20">
            <ShoppingCart className="text-white w-8 h-8" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">Zamów z dostawą</p>
            <p className="text-emerald-50 opacity-80 mt-1">Szybka dostawa z Twojego sklepu.</p>
          </div>
        </div>
        <button className="bg-white text-emerald-700 px-10 py-5 rounded-[2rem] font-bold shadow-2xl hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all relative z-10">
          ZAMÓW TERAZ
        </button>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000" />
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
        ) : activeTab === 'stats' ? (
          <NutritionalDashboard />
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
          { id: 'stats', icon: PieChart, label: 'Makro' },
          { id: 'voice_btn', icon: isVoiceListening ? Loader2 : Mic, label: 'Mów', special: true, isListening: isVoiceListening },
          { id: 'shopping', icon: ShoppingCart, label: 'Zakupy' },
          { id: 'pantry', icon: Utensils, label: 'Zapasy' },
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
