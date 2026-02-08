
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  ChevronRight, 
  RotateCcw, 
  Palette, 
  Info,
  Maximize2,
  Heart, 
  Share2,
  MapPin,
  Briefcase,
  Check,
  ArrowLeft,
  Shirt,
  Search,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Pocket,
  Wind as WindIcon,
  ShoppingBag
} from 'lucide-react';
import { fetchWeather, analyzeStyle, getOutfitRecommendations } from './services/gemini';
import { AppStep, UserPhoto, StyleAnalysis, OutfitRecommendation, StylePreferences } from './types';

const STANDARD_COLORS = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Albâtre', hex: '#FFFFFF' },
  { name: 'Marine', hex: '#000080' },
  { name: 'Ardoise', hex: '#4A4E52' },
  { name: 'Gris Perle', hex: '#D3D3D3' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Chameau', hex: '#C19A6B' },
  { name: 'Olive', hex: '#556B2F' },
  { name: 'Bordeaux', hex: '#800020' },
];

const SEASON_THEMES = {
  spring: { light: '#f0fdf4', middle: '#dcfce7', dark: '#bbf7d0' },
  summer: { light: '#fffbeb', middle: '#fef3c7', dark: '#fde68a' },
  autumn: { light: '#fff7ed', middle: '#ffedd5', dark: '#fed7aa' },
  winter: { light: '#f0f9ff', middle: '#e0f2fe', dark: '#bae6fd' },
};

const STEPS: AppStep[] = ['location', 'occasion', 'closet', 'analyzing', 'result', 'wardrobe'];

const SeasonalParticles: React.FC<{ season: 'spring' | 'summer' | 'autumn' | 'winter' | null, currentStep: AppStep }> = ({ season, currentStep }) => {
  if (!season || currentStep === 'wardrobe') return null;

  const particles = Array.from({ length: 30 });

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden opacity-70 select-none">
      <style>{`
        @keyframes seasonal-drift {
          0% { transform: translateX(-10vw) translateY(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.9; }
          80% { opacity: 0.9; }
          100% { transform: translateX(110vw) translateY(15vh) rotate(360deg); opacity: 0; }
        }
        @keyframes seasonal-float-up {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-130vh) translateX(80px) rotate(180deg); opacity: 0; }
        }
        @keyframes seasonal-sway-fall {
          0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translateY(50vh) translateX(70px) rotate(180deg); }
          80% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(-40px) rotate(360deg); opacity: 0; }
        }
        @keyframes seasonal-snow-pure {
          0% { transform: translateY(-10vh) translateX(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(20px); opacity: 0; }
        }
        .particle { position: absolute; pointer-events: none; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
      `}</style>
      {particles.map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const delay = `${i * 0.8}s`;
        const duration = `${10 + Math.random() * 12}s`;
        const size = `${24 + Math.random() * 20}px`;

        let icon = '';
        let animation = '';

        switch(season) {
          case 'spring':
            icon = '🍃';
            animation = `seasonal-drift ${duration} infinite linear`;
            break;
          case 'summer':
            icon = '🌸';
            animation = `seasonal-float-up ${duration} infinite ease-out`;
            break;
          case 'autumn':
            icon = '🍂';
            animation = `seasonal-sway-fall ${duration} infinite linear`;
            break;
          case 'winter':
            icon = '❄️';
            animation = `seasonal-snow-pure ${duration} infinite linear`;
            break;
        }

        return (
          <span 
            key={`${season}-${i}`} 
            className="particle" 
            style={{ 
              left, 
              fontSize: size,
              animation, 
              animationDelay: delay,
              top: season === 'summer' ? 'auto' : '-10%',
              bottom: season === 'summer' ? '-10%' : 'auto'
            }}
          >
            {icon}
          </span>
        );
      })}
    </div>
  );
};

const WeatherAnimation: React.FC<{ type: string }> = ({ type }) => {
  const baseClass = "w-32 h-32 flex items-center justify-center relative mx-auto";
  
  switch (type) {
    case 'sunny':
      return (
        <div className={baseClass}>
          <div className="absolute inset-0 bg-yellow-100 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <Sun className="w-20 h-20 text-yellow-400 animate-[spin_10s_linear_infinite]" />
        </div>
      );
    case 'raining':
      return (
        <div className={baseClass}>
          <CloudRain className="w-20 h-20 text-blue-400" />
          <div className="absolute flex space-x-4 pt-12">
            <div className="w-0.5 h-6 bg-blue-300 animate-bounce delay-75"></div>
            <div className="w-0.5 h-8 bg-blue-300 animate-bounce delay-150"></div>
          </div>
        </div>
      );
    case 'snowy':
      return (
        <div className={baseClass}>
          <Snowflake className="w-20 h-20 text-slate-300 animate-pulse" />
        </div>
      );
    case 'windy':
      return (
        <div className={baseClass}>
          <WindIcon className="w-20 h-20 text-stone-300 animate-pulse" />
        </div>
      );
    case 'cloudy':
    default:
      return (
        <div className={baseClass}>
          <Cloud className="w-20 h-20 text-stone-400 animate-pulse" />
        </div>
      );
  }
};

const Header: React.FC<{ currentStep: AppStep, onLogoClick?: () => void, onClosetClick?: () => void }> = ({ currentStep, onLogoClick, onClosetClick }) => {
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={onLogoClick}>
            <div className="w-10 h-10 bg-stone-950 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-stone-200 group-hover:rotate-0 transition-transform">
              <span className="text-white text-lg font-serif font-bold italic">M</span>
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black tracking-tighter text-stone-900 leading-none uppercase">MYOOTD</h1>
              <p className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">AI Couture Studio</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-8">
              {['Location', 'Occasion', 'Wardrobe', 'Review'].map((s, i) => (
                <div key={s} className="flex items-center space-x-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${i <= stepIndex ? 'text-stone-900' : 'text-stone-300'}`}>
                    {s}
                  </span>
                  {i < 3 && <div className={`w-1 h-1 rounded-full ${i < stepIndex ? 'bg-stone-900' : 'bg-stone-200'}`} />}
                </div>
              ))}
            </nav>
            <button 
              onClick={onClosetClick}
              className="bg-stone-950 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-all active:scale-95 flex items-center space-x-2"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Wardrobe</span>
            </button>
          </div>
        </div>
      </div>
      <div className="w-full h-0.5 bg-stone-50">
        <div 
          className="h-full bg-stone-950 transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
};

const WardrobeView: React.FC<{ 
  items: UserPhoto[], 
  onAddItem: (item: UserPhoto) => void,
  onDeleteItem: (id: string) => void,
  onSelectItem?: (item: UserPhoto) => void 
}> = ({ items, onAddItem, onDeleteItem, onSelectItem }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAddItem({
          id: Math.random().toString(36).substr(2, 9),
          url: reader.result as string,
          base64: (reader.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200 pb-12">
        <div className="space-y-4">
          <h2 className="text-6xl font-serif text-stone-900 tracking-tighter leading-none">My Wardrobe</h2>
          <p className="text-stone-400 text-sm font-light max-w-md">Your curated digital wardrobe, ready for AI synthesis and style exploration.</p>
        </div>
        <div className="relative group">
          <button className="bg-stone-950 text-white px-10 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-2xl hover:bg-stone-800 transition-all flex items-center space-x-3">
            <Plus className="w-4 h-4" />
            <span>Import Collection</span>
          </button>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 opacity-0 cursor-pointer" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {items.map((item) => (
          <div key={item.id} className="group relative aspect-[3/4] bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-2xl transition-all duration-700">
            <img src={item.url} className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-700" alt="Closet Item" />
            <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 space-x-3 backdrop-blur-[2px]">
              {onSelectItem && (
                <button 
                  onClick={() => onSelectItem(item)}
                  className="p-4 bg-white text-stone-950 rounded-full hover:scale-110 transition-transform shadow-lg"
                  title="Style this item"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => onDeleteItem(item.id!)}
                className="p-4 bg-rose-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                title="Delete item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-stone-200 rounded-[4rem] space-y-6">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
              <Shirt className="w-8 h-8 text-stone-200" />
            </div>
            <div className="space-y-2">
              <p className="text-stone-900 font-serif text-xl">Wardrobe is empty</p>
              <p className="text-stone-400 text-xs uppercase tracking-widest">Start uploading to begin your styling journey</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StepLocation: React.FC<{ 
  onNext: (loc: string, weather: any) => void 
}> = ({ onNext }) => {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkWeather = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const w = await fetchWeather(location);
      setWeather(w);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative z-10">
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-3 px-5 py-2.5 bg-stone-100 rounded-full text-stone-500">
          <MapPin className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Phase 01: Weather</span>
        </div>
        <h2 className="text-8xl font-serif text-stone-900 leading-[0.85] tracking-tighter">
          Select your <br /> <span className="italic font-normal text-stone-400">Atmosphere</span>
        </h2>
        <p className="text-stone-500 text-xl font-light leading-relaxed max-w-2xl">
          Our AI synchronizes with global weather patterns to ensure your aesthetic is as functional as it is refined.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start -mt-4">
        <div className="flex flex-col pt-24">
          <div className="relative group w-full">
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkWeather()}
              placeholder="Search city (e.g., Paris, Tokyo)"
              className="w-full bg-white border border-stone-200 rounded-[2.5rem] py-10 px-12 text-2xl text-stone-900 focus:ring-4 focus:ring-stone-950/5 outline-none shadow-xl transition-all font-serif italic"
            />
            <button 
              onClick={checkWeather}
              disabled={!location || loading}
              className="absolute right-5 top-5 bottom-5 px-10 bg-stone-950 text-white rounded-[1.8rem] font-bold uppercase tracking-widest text-[11px] hover:bg-stone-800 transition-all flex items-center space-x-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{loading ? 'Synthesizing' : 'SYNC WEATHER'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-12 px-10 pt-16">
            <div className="flex flex-col items-center space-y-4 opacity-20 hover:opacity-100 transition-opacity">
               <Pocket className="w-16 h-16" strokeWidth={1} />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">Outerwear</span>
            </div>
            <div className="flex flex-col items-center space-y-4 opacity-20 hover:opacity-100 transition-opacity">
               <ShoppingBag className="w-16 h-16" strokeWidth={1} />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">Accessories</span>
            </div>
            <div className="flex flex-col items-center space-y-4 opacity-20 hover:opacity-100 transition-opacity">
               <Shirt className="w-16 h-16" strokeWidth={1} />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">Base Layers</span>
            </div>
            <div className="flex flex-col items-center space-y-4 opacity-20 hover:opacity-100 transition-opacity">
               <WindIcon className="w-16 h-16" strokeWidth={1} />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">Atmosphere</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[4rem] border border-stone-100 min-h-[450px] shadow-2xl relative overflow-hidden group w-full">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-950/10 to-transparent" />
          {weather ? (
            <div className="text-center animate-in zoom-in duration-1000 flex flex-col items-center justify-center h-full space-y-8">
              <WeatherAnimation type={weather.type} />
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-stone-400">WEATHER SYNC SUCCESS</p>
                <div className="flex items-center justify-center space-x-6">
                  <h3 className="text-6xl font-serif text-stone-900 tracking-tighter">{weather.context}</h3>
                  <button 
                    onClick={() => onNext(location, weather)}
                    className="group bg-stone-950 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all active:scale-95"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                {weather.sources && (
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {weather.sources.map((chunk: any, i: number) => (
                      chunk.web && (
                        <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-[9px] uppercase font-bold text-stone-400 hover:text-stone-950 transition-colors">
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>SOURCE {i+1}</span>
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-8 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
              <div className="relative">
                <Cloud className="w-32 h-32 mx-auto text-stone-400" strokeWidth={1} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-stone-400 rounded-full animate-ping" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.5em] text-stone-500">AWAITING GEO-COORDINATION</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepOccasion: React.FC<{ 
  onBack: () => void, 
  onNext: (occ: 'Casual' | 'Formal' | 'Semi-formal') => void 
}> = ({ onBack, onNext }) => {
  const [occ, setOcc] = useState<'Casual' | 'Formal' | 'Semi-formal' | ''>('');

  const occasions = [
    { name: 'Casual', icon: <Shirt className="w-6 h-6" />, desc: 'Relaxed daily elegance' },
    { name: 'Formal', icon: <Maximize2 className="w-6 h-6" />, desc: 'Structured sophistication' },
    { name: 'Semi-formal', icon: <Briefcase className="w-6 h-6" />, desc: 'Modern professional edge' }
  ];

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-16 animate-in fade-in slide-in-from-right-10 duration-1000 relative z-10">
      <div className="space-y-6 text-center">
        <button onClick={onBack} className="flex items-center space-x-3 text-stone-400 mx-auto hover:text-stone-950 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Weather</span>
        </button>
        <div className="inline-flex items-center space-x-3 px-5 py-2.5 bg-stone-100 rounded-full text-stone-500">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Phase 02: Narrative</span>
        </div>
        <h2 className="text-8xl font-serif text-stone-900 leading-[0.85] tracking-tighter">
          Define the <br /> <span className="italic font-normal text-stone-400">Occasion</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {occasions.map((item) => (
          <button
            key={item.name}
            onClick={() => setOcc(item.name as any)}
            className={`group p-12 rounded-[3.5rem] border text-left transition-all relative overflow-hidden h-64 flex flex-col justify-end bg-white border-stone-100 text-stone-900 hover:border-stone-950/20 shadow-sm ${
              occ === item.name ? 'ring-4 ring-stone-950 ring-offset-4 scale-[1.02]' : ''
            }`}
          >
            <div className={`absolute top-10 left-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${occ === item.name ? 'bg-stone-950 text-white rotate-12' : 'bg-stone-50 text-stone-400'}`}>
              {item.icon}
            </div>
            <div className="space-y-2">
               <span className="text-3xl font-serif leading-none">{item.name}</span>
               <p className={`text-[10px] uppercase font-bold tracking-widest text-stone-300`}>{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-10">
        <button 
          onClick={() => onNext(occ as any)}
          disabled={!occ}
          className={`px-20 py-8 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center space-x-6 ${
            occ ? 'bg-stone-950 text-white hover:bg-stone-800 hover:scale-105' : 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
          }`}
        >
          <span>Open the Closet</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const StepCloset: React.FC<{ 
  wardrobe: UserPhoto[],
  onBack: () => void, 
  onNext: (photo: UserPhoto | null, color: string) => void 
}> = ({ wardrobe, onBack, onNext }) => {
  const [color, setColor] = useState(STANDARD_COLORS[0].hex);

  const handleSubmit = () => {
    onNext(null, color);
  };

  const canSynthesize = wardrobe.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-16 animate-in fade-in slide-in-from-right-10 duration-1000 relative z-10">
      <div className="space-y-6 text-center">
        <button onClick={onBack} className="flex items-center space-x-3 text-stone-400 mx-auto hover:text-stone-950 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">BACK TO NARRATIVE</span>
        </button>
        <div className="inline-flex items-center space-x-3 px-5 py-2.5 bg-stone-100 rounded-full text-stone-500">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Phase 03: Preference</span>
        </div>
        <h2 className="text-8xl font-serif text-stone-900 leading-[0.85] tracking-tighter">
          Select your <br /> <span className="italic font-normal text-stone-400">Foundation</span>
        </h2>
      </div>

      <div className="max-w-xl mx-auto space-y-10">
         <div className="bg-white p-12 rounded-[3.5rem] border border-stone-100 space-y-8 shadow-sm">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 text-center block">Accent Palette Target</label>
            <div className="grid grid-cols-3 gap-6">
              {STANDARD_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`aspect-square rounded-2xl border-4 transition-all flex items-center justify-center shadow-sm ${
                    color === c.hex ? 'border-stone-950 scale-110 shadow-xl' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className={`w-5 h-5 ${c.hex === '#FFFFFF' || c.hex === '#D3D3D3' || c.hex === '#F5F5DC' ? 'text-stone-900' : 'text-white'}`} />}
                </button>
              ))}
            </div>
         </div>

         <button 
          onClick={handleSubmit}
          disabled={!canSynthesize}
          className={`w-full py-10 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center space-x-6 ${
            canSynthesize ? 'bg-stone-950 text-white hover:bg-stone-800 hover:scale-105' : 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'
          }`}
        >
          <span>BEGIN STYLE SYNTHESIS</span>
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const AnalysisLoader: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    "Analyzing garment structure...",
    "Sampling texture & weave...",
    "Consulting digital trend archives...",
    "Matching seasonal color palettes...",
    "Optimizing for regional climate...",
    "Synthesizing the final lookbook..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-16 animate-in fade-in duration-1000 relative z-10">
      <div className="relative">
        <div className="w-56 h-56 border-[2px] border-stone-100 rounded-full animate-[spin_8s_linear_infinite] border-t-stone-950"></div>
        <div className="w-48 h-48 border-[2px] border-stone-100 rounded-full animate-[spin_12s_linear_infinite_reverse] border-b-stone-950 absolute top-4 left-4"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Sparkles className="w-16 h-16 text-stone-950 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-6">
        <h3 className="text-5xl font-serif text-stone-900 tracking-tighter italic">Fashion Synthesis in Progress</h3>
        <div className="h-8 flex items-center justify-center overflow-hidden">
          <p key={msgIndex} className="text-stone-400 text-xs font-black uppercase tracking-[0.5em] animate-in slide-in-from-bottom-4 duration-700">
            {messages[msgIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

const ResultView: React.FC<{ 
  photo: UserPhoto, 
  analysis: StyleAnalysis, 
  recommendations: OutfitRecommendation[],
  prefs: StylePreferences,
  onReset: () => void 
}> = ({ photo, analysis, recommendations, prefs, onReset }) => {
  return (
    <div className="space-y-24 animate-in fade-in slide-in-from-right-10 duration-1000 pb-32 relative z-10">
      <div className="flex flex-col md:flex-row items-end justify-between gap-10 pb-12 border-b border-stone-200">
        <div className="space-y-6">
          <button onClick={onReset} className="flex items-center space-x-3 text-stone-400 hover:text-stone-950 transition-colors text-[10px] font-black uppercase tracking-widest group">
            <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-180 transition-transform duration-500" />
            <span>New Consultation</span>
          </button>
          <h2 className="text-8xl font-serif text-stone-900 tracking-tighter leading-none">The <span className="italic font-normal text-stone-400">Lookbook</span></h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Generated for</p>
            <p className="text-xl font-serif">{prefs.location} • {prefs.occasion}</p>
          </div>
          <button className="bg-stone-950 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-stone-800 transition-all active:scale-95">
            Export Synthesis
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-20">
        <div className="lg:col-span-4 space-y-16">
          <div className="relative aspect-[3/4] rounded-[3.5rem] overflow-hidden shadow-2xl group border-[12px] border-white bg-white">
            <img src={photo.url} alt="Wardrobe Piece" className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-md rounded-3xl border border-stone-100 shadow-xl">
               <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Focal Item</p>
               <h4 className="text-xl font-serif">Original Curation</h4>
            </div>
          </div>

          <div className="space-y-10">
            <div className="p-12 bg-white rounded-[3.5rem] border border-stone-100 shadow-sm space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Technical Spec</h4>
              <div className="space-y-8">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1">Body Type Synergy</span>
                  <span className="text-lg font-serif">{analysis.bodyType}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1">Skin Tone Match</span>
                  <span className="text-lg font-serif">{analysis.skinTone}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1">Environmental Context</span>
                  <span className="text-lg font-serif">{analysis.weatherContext}</span>
                </div>
              </div>
            </div>

            <div className="p-12 bg-stone-950 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">The Color Story</h4>
              <div className="grid grid-cols-5 gap-3">
                {analysis.recommendedColors.map((color, i) => (
                  <div key={i} className="group relative aspect-[1/2]">
                    <div className="w-full h-full rounded-2xl border border-white/20 transition-transform group-hover:scale-110 duration-500" style={{ backgroundColor: color }} />
                    <span className="absolute -bottom-6 left-0 right-0 text-[8px] font-mono text-center text-white/30 group-hover:text-white transition-colors">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-20">
          <div className="space-y-12">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-stone-300">Style Ensembles</h3>
            <div className="grid gap-12">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="group bg-white rounded-[4rem] overflow-hidden border border-stone-100 flex flex-col md:flex-row shadow-sm hover:shadow-2xl transition-all duration-1000">
                  <div className="md:w-5/12 relative overflow-hidden aspect-[4/5]">
                    <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110" />
                    <div className="absolute top-8 left-8 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-900">Concept 0{idx+1}</p>
                    </div>
                  </div>
                  <div className="md:w-7/12 p-16 flex flex-col justify-center bg-white">
                    <div className="space-y-8">
                      <h4 className="text-5xl font-serif text-stone-950 tracking-tighter">{rec.title}</h4>
                      <p className="text-stone-500 font-light leading-relaxed text-lg italic">"{rec.description}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState<AppStep>('location');
  const [prefs, setPrefs] = useState<StylePreferences>({ location: '', occasion: 'Casual', preferredColor: '#000000' });
  const [weatherInfo, setWeatherInfo] = useState<any>(null);
  const [photo, setPhoto] = useState<UserPhoto | null>(null);
  const [wardrobe, setWardrobe] = useState<UserPhoto[]>([]);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('myootd_wardrobe');
    if (saved) {
      try {
        setWardrobe(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load wardrobe");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('myootd_wardrobe', JSON.stringify(wardrobe));
  }, [wardrobe]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleLocationNext = (loc: string, weather: any) => {
    setPrefs({ ...prefs, location: loc });
    setWeatherInfo(weather);
    setStep('occasion');
  };

  const handleOccasionNext = (occ: 'Casual' | 'Formal' | 'Semi-formal') => {
    setPrefs({ ...prefs, occasion: occ });
    setStep('closet');
  };

  const handleClosetNext = async (uploadedPhoto: UserPhoto | null, color: string) => {
    const photoToAnalyze = uploadedPhoto || wardrobe[0];
    
    if (!photoToAnalyze) {
      setError("Please add at least one item to your Wardrobe.");
      setStep('wardrobe');
      return;
    }

    setPhoto(photoToAnalyze);
    const updatedPrefs = { ...prefs, preferredColor: color };
    setPrefs(updatedPrefs);
    
    if (uploadedPhoto && !wardrobe.find(item => item.id === uploadedPhoto.id)) {
      setWardrobe(prev => [...prev, uploadedPhoto]);
    }

    setStep('analyzing');
    
    try {
      const result = await analyzeStyle(photoToAnalyze.base64, photoToAnalyze.mimeType, updatedPrefs, weatherInfo);
      setAnalysis(result);
      const recs = await getOutfitRecommendations(result, updatedPrefs);
      setRecommendations(recs);
      setStep('result');
    } catch (err: any) {
      setError(err.message || "Synthesis interrupted.");
      setStep('location');
    }
  };

  const addClosetItem = (item: UserPhoto) => {
    setWardrobe(prev => [...prev, item]);
  };

  const deleteClosetItem = (id: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  const selectItemForStyling = (item: UserPhoto) => {
    setPhoto(item);
    setStep('location'); 
  };

  const reset = () => {
    setStep('location');
    setPhoto(null);
    setAnalysis(null);
    setRecommendations([]);
    setError(null);
    setWeatherInfo(null); 
  };

  const getBackgroundColor = () => {
    if (step === 'location' || step === 'wardrobe' || !weatherInfo?.season) return '#faf9f6';
    
    const theme = SEASON_THEMES[weatherInfo.season as keyof typeof SEASON_THEMES];
    if (step === 'occasion') return theme.light;
    if (step === 'closet' || step === 'analyzing') return theme.middle;
    if (step === 'result') return theme.dark;
    return '#faf9f6';
  };

  return (
    <div 
      className="min-h-screen text-stone-900 selection:bg-stone-950 selection:text-white pb-10 transition-colors duration-1000 relative"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <Header 
        currentStep={step} 
        onLogoClick={reset} 
        onClosetClick={() => setStep('wardrobe')} 
      />
      
      <SeasonalParticles season={weatherInfo?.season || null} currentStep={step} />

      <main className="max-w-7xl mx-auto px-6 pt-40 pb-24 relative z-10">
        {error && (
          <div className="mb-12 p-8 bg-stone-950 text-white rounded-[2.5rem] flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center space-x-4">
               <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                 <Info className="w-5 h-5" />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-[10px] uppercase font-black tracking-widest px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">Dismiss</button>
          </div>
        )}

        {step === 'location' && <StepLocation onNext={handleLocationNext} />}
        {step === 'occasion' && <StepOccasion onBack={() => setStep('location')} onNext={handleOccasionNext} />}
        {step === 'closet' && <StepCloset wardrobe={wardrobe} onBack={() => setStep('occasion')} onNext={handleClosetNext} />}
        {step === 'wardrobe' && (
          <div className="bg-white rounded-[4rem] p-12 shadow-sm relative z-10">
            <WardrobeView 
              items={wardrobe} 
              onAddItem={addClosetItem} 
              onDeleteItem={deleteClosetItem}
              onSelectItem={selectItemForStyling}
            />
          </div>
        )}
        {step === 'analyzing' && <AnalysisLoader />}
        {step === 'result' && photo && analysis && (
          <ResultView photo={photo} analysis={analysis} recommendations={recommendations} prefs={prefs} onReset={reset} />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-stone-100 flex flex-col items-center space-y-6 relative z-10">
        <div className="flex items-center space-x-2 opacity-30">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">MYOOTD Couture Studio</span>
        </div>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-stone-300">Curating style through neural synthesis • 2025 Edition</p>
      </footer>
    </div>
  );
}
