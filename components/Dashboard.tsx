
import React, { useRef, useState, useEffect } from 'react';
import { VideoAnalysis } from '../types';
import { 
  Clock, 
  Target, 
  Layers, 
  Info, 
  CheckCircle2, 
  Zap, 
  Monitor, 
  FileText,
  Video,
  ExternalLink,
  Cpu,
  PlayCircle,
  BarChart3,
  Activity,
  Volume2,
  VolumeX,
  Share2,
  Smartphone,
  Mic,
  AlertCircle
} from 'lucide-react';
import AnalysisCard from './AnalysisCard';
import { geminiService } from '../services/gemini';
import LiveAssistant from './LiveAssistant';

interface DashboardProps {
  data: VideoAnalysis;
  videoUrl?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ data, videoUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeScene, setActiveScene] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const videoId = videoUrl ? getYoutubeId(videoUrl) : null;

  const handleSeek = (seconds: number, index: number) => {
    setActiveScene(index);
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }), '*');
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({
        event: 'command',
        func: 'playVideo',
        args: []
      }), '*');
    }
  };

  const playNarration = async () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      const base64 = await geminiService.generateNarration(data.contentSummary);
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
    } catch (error) {
      console.error("Error en TTS:", error);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative pb-20">
      
      {/* Botón Asistente Flotante */}
      <div className="fixed bottom-8 right-8 z-[100]">
        {showLiveAssistant && (
          <div className="mb-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <LiveAssistant data={data} onClose={() => setShowLiveAssistant(false)} />
          </div>
        )}
        <button 
          onClick={() => setShowLiveAssistant(!showLiveAssistant)}
          className={`p-6 rounded-full shadow-2xl transition-all duration-500 ${
            showLiveAssistant ? 'bg-red-600 rotate-90 scale-90' : 'bg-indigo-600 hover:scale-110 ring-4 ring-indigo-500/20'
          }`}
        >
          {showLiveAssistant ? <VolumeX className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </button>
      </div>

      {/* Header Info */}
      <div className="lg:col-span-12 bg-slate-900/40 border border-white/5 p-8 md:p-12 rounded-[3rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 backdrop-blur-3xl shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Neural Insight Active
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">{data.title}</h2>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-800/50 rounded-xl text-slate-300 text-xs font-bold border border-white/5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> {data.duration}
            </div>
            <div className="px-4 py-2 bg-indigo-500/10 rounded-xl text-indigo-400 text-xs font-bold border border-indigo-500/20 flex items-center gap-2 uppercase">
              <Zap className="w-4 h-4" /> Pro Mode
            </div>
          </div>
        </div>
      </div>

      {/* Media & Timeline */}
      <div className="lg:col-span-6 space-y-8">
        {videoId ? (
          <div className="relative group rounded-[3rem] overflow-hidden border border-white/5 bg-black shadow-2xl aspect-video ring-1 ring-white/10">
            <iframe
              ref={iframeRef}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&autoplay=0&rel=0&modestbranding=1`}
              title="Analizador Visual"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        ) : (
          <div className="aspect-video bg-slate-900 rounded-[3rem] flex flex-col items-center justify-center border border-white/5 text-slate-600 gap-4">
            <AlertCircle className="w-12 h-12" />
            <p className="font-black uppercase tracking-widest text-[10px]">Video no detectable</p>
          </div>
        )}
        
        <AnalysisCard title="Navegación Narrativa" icon={<PlayCircle className="w-5 h-5 text-indigo-400" />}>
          <div className="relative pl-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            <div className="absolute left-[13px] top-0 bottom-0 w-[2px] bg-slate-800/50 rounded-full" />
            {data.sceneBreakdown?.map((scene, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSeek(scene.seconds, idx)}
                className={`w-full text-left group relative flex flex-col gap-3 p-5 rounded-3xl transition-all duration-500 ${
                  activeScene === idx 
                    ? 'bg-indigo-500/10 border border-indigo-500/30' 
                    : 'hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className={`absolute left-[-2.1rem] top-7 w-4 h-4 rounded-full border-[3px] transition-all duration-700 z-20 ${
                  activeScene === idx ? 'bg-indigo-500 border-white scale-125' : 'bg-slate-900 border-slate-700'
                }`} />
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-black font-mono px-3 py-1 rounded-lg ${
                    activeScene === idx ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400'
                  }`}>
                    {scene.time}
                  </span>
                  {scene.tag && <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{scene.tag}</span>}
                </div>
                <p className={`text-sm leading-relaxed transition-all ${
                  activeScene === idx ? 'text-white font-bold' : 'text-slate-400 font-medium'
                }`}>
                  {scene.description}
                </p>
              </button>
            ))}
          </div>
        </AnalysisCard>
      </div>

      {/* Main Analysis */}
      <div className="lg:col-span-6 space-y-8">
        <div className="bg-slate-900/40 border border-white/5 p-10 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-black text-2xl text-white tracking-tight uppercase">Resumen Ejecutivo</h3>
            </div>
            <button 
              onClick={playNarration}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isPlayingAudio ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isPlayingAudio ? 'Voz Activa' : 'Escuchar Análisis'}
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed text-xl md:text-2xl font-medium italic border-l-[6px] border-indigo-500/50 pl-8 py-4">
            "{data.contentSummary}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnalysisCard title="Métricas Visuales" icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}>
            <div className="space-y-6">
              {[
                { label: 'Complejidad', val: data.technicalDetails?.visualComplexity || 80 },
                { label: 'Densidad', val: data.technicalDetails?.informationDensity || 70 }
              ].map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                    <span>{m.label}</span>
                    <span className="text-white">{m.val}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${m.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </AnalysisCard>

          <AnalysisCard title="Estilo IA" icon={<Zap className="w-5 h-5 text-yellow-400" />}>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {data.animations.map((anim, idx) => (
                  <span key={idx} className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {anim}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed italic font-medium">{data.visualStyle}</p>
            </div>
          </AnalysisCard>
        </div>

        <AnalysisCard title="Grounding Factual" icon={<Info className="w-5 h-5 text-blue-400" />}>
          <div className="space-y-3">
            {data.sources.length > 0 ? data.sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 text-slate-400 rounded-2xl hover:bg-white hover:text-slate-950 transition-all group"
              >
                <span className="text-[11px] font-black truncate max-w-[300px]">{source.title}</span>
                <ExternalLink className="w-4 h-4 group-hover:scale-110" />
              </a>
            )) : (
              <p className="text-xs text-slate-600 italic">Análisis realizado exclusivamente con datos de la API de YouTube.</p>
            )}
          </div>
        </AnalysisCard>
      </div>
    </div>
  );
};

export default Dashboard;
