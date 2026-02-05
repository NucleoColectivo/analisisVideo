
import React, { useState, useEffect } from 'react';
import { geminiService } from './services/gemini';
import { AnalysisState, VideoAnalysis } from './types';
import Dashboard from './components/Dashboard';
import { 
  Video, 
  Zap, 
  AlertCircle, 
  Cpu, 
  Sparkles, 
  Key, 
  ArrowRight,
  ShieldCheck,
  Lock
} from 'lucide-react';

const App: React.FC = () => {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=1wJhhg7dXII');
  const [activeUrl, setActiveUrl] = useState('');
  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);
  const [state, setState] = useState<AnalysisState>({
    loading: false,
    error: null,
    data: null,
    thinking: ''
  });

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        setIsKeySelected(true); // Fallback si no estamos en entorno Studio
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true); // Asumimos éxito según directrices
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setState(prev => ({ ...prev, loading: true, error: null, data: null }));
    setActiveUrl(url);
    
    try {
      const analysis = await geminiService.analyzeVideo(url);
      setState({ loading: false, error: null, data: analysis, thinking: '' });
    } catch (err: any) {
      console.error(err);
      if (err.message === "ENTITY_NOT_FOUND") {
        setIsKeySelected(false);
        setState({ loading: false, error: "Error de configuración de proyecto. Por favor, selecciona una clave API válida.", data: null, thinking: '' });
      } else {
        const msg = err.message === "QUOTA_EXCEEDED" 
          ? "Cuota agotada. Usa una API Key de un proyecto con facturación para análisis ilimitados."
          : "Error en el análisis neuronal. Intenta de nuevo.";
        setState({ loading: false, error: msg, data: null, thinking: '' });
      }
    }
  };

  if (isKeySelected === false) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 text-slate-200">
        <div className="max-w-xl w-full bg-slate-900/40 border border-white/5 p-12 rounded-[3rem] text-center space-y-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
          <div className="w-24 h-24 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-indigo-500/30 group-hover:scale-110 transition-transform duration-700">
            <Lock className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tight">Acceso Restringido</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              Para utilizar las capacidades de <span className="text-white font-bold">Gemini 3 Pro</span> en este entorno, es necesario vincular tu propia clave API de un proyecto con facturación.
            </p>
          </div>
          <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 text-left space-y-3">
             <div className="flex items-center gap-3 text-xs font-bold text-emerald-400">
               <ShieldCheck className="w-4 h-4" /> Facturación requerida
             </div>
             <p className="text-[11px] text-slate-500 leading-normal">
               Visita <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 underline">la documentación de facturación</a> para más detalles sobre cómo habilitar el uso ilimitado.
             </p>
          </div>
          <button 
            onClick={handleSelectKey}
            className="w-full py-6 bg-white text-slate-950 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5"
          >
            Configurar API Key <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      <nav className="border-b border-white/5 bg-[#070b14]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white uppercase">VisionQuest AI</span>
          </div>
          <button 
            onClick={handleSelectKey}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
          >
            <Key className="w-3.5 h-3.5" /> Clave Activa
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        <div className="text-center mb-20 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <Sparkles className="w-3 h-3" /> Motor Neuronal Gemini 3
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
            Inteligencia de Video <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">para Firebase Studio</span>
          </h1>
        </div>

        <div className="max-w-3xl mx-auto mb-20">
          <form onSubmit={handleAnalyze} className="relative p-1.5 bg-slate-800/40 rounded-[2.5rem] border border-white/5 shadow-2xl focus-within:ring-2 ring-indigo-500/20 transition-all">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega el enlace de YouTube aquí..."
              className="w-full pl-8 pr-40 py-6 bg-transparent rounded-[2rem] text-white focus:outline-none font-medium"
            />
            <button
              type="submit"
              disabled={state.loading}
              className="absolute right-2.5 top-2.5 bottom-2.5 px-8 bg-indigo-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
            >
              {state.loading ? 'ANALIZANDO...' : 'ANALIZAR'}
            </button>
          </form>
          {state.error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4" /> {state.error}
            </div>
          )}
        </div>

        {state.loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Sincronizando con la red neuronal...</p>
          </div>
        )}

        {state.data && <Dashboard data={state.data} videoUrl={activeUrl} />}
      </main>
    </div>
  );
};

export default App;
