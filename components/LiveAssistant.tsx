
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { X, Mic, Volume2, Activity, Zap } from 'lucide-react';
import { VideoAnalysis } from '../types';

interface LiveAssistantProps {
  data: VideoAnalysis;
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ data, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let nextStartTime = 0;
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = outputAudioContext;
    const sources = new Set<AudioBufferSourceNode>();

    // Manual implementation of base64 decoding for raw audio bytes
    const decode = (base64: string) => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    };

    // Manual implementation of base64 encoding to safely handle audio data
    const encode = (bytes: Uint8Array) => {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Manual decoding of PCM audio data as per Gemini API requirements
    const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
    };

    // Helper to create the correct PCM blob structure for Gemini Live API
    const createBlob = (data: Float32Array) => {
      const l = data.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
      }
      return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      };
    };

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: async () => {
          setIsConnecting(false);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // CRITICAL: Initiate sendRealtimeInput only after sessionPromise resolves
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          } catch (err) {
            console.error("Microphone access error:", err);
          }
        },
        onmessage: async (msg) => {
          // Process model's audio output stream
          const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const buffer = await decodeAudioData(decode(audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
              sources.delete(source);
            });

            source.start(nextStartTime);
            nextStartTime += buffer.duration;
            sources.add(source);
          }

          // Handle interruption to clear audio queue
          const interrupted = msg.serverContent?.interrupted;
          if (interrupted) {
            for (const source of sources.values()) {
              source.stop();
              sources.delete(source);
            }
            nextStartTime = 0;
          }

          if (msg.serverContent?.outputTranscription) {
             setTranscription(prev => prev + ' ' + msg.serverContent.outputTranscription.text);
          }
        },
        onerror: (e) => console.error("Live Assistant Session Error:", e),
        onclose: () => console.log("Live Assistant Session Closed")
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        systemInstruction: `Eres VisionQuest AI. Tienes el contexto del video analizado: "${data.title}". Resumen: "${data.contentSummary}". Ayuda al usuario con dudas técnicas, narrativas o de estilo sobre este video de forma profesional y concisa en español.`
      }
    });

    sessionRef.current = sessionPromise;

    return () => {
      sessionPromise.then(s => s.close());
      inputAudioContext.close();
      outputAudioContext.close();
    };
  }, [data]);

  return (
    <div className="w-[380px] bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden backdrop-blur-3xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h4 className="text-white font-black text-sm uppercase">Neural Assistant</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">Live Conversation</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="h-48 bg-slate-950/50 rounded-3xl mb-6 flex flex-col items-center justify-center border border-white/5 relative overflow-hidden p-6 text-center">
        {isConnecting ? (
          <div className="flex flex-col items-center gap-4">
            <Zap className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500 uppercase font-black">Sincronizando Voz...</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-4 h-8 items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="w-1 bg-indigo-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
            <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
              {transcription || "Habla ahora para preguntar sobre el video..."}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950 p-4 rounded-2xl border border-white/5">
        <Volume2 className="w-4 h-4 text-indigo-400" />
        Escuchando y respondiendo en tiempo real
      </div>
    </div>
  );
};

export default LiveAssistant;
