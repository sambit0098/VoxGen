import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Download, Volume2, Loader2, Trash2, 
  Settings, Sparkles, X, ChevronRight, Mic2,
  User, UserPlus, Baby, Headphones, Plus
} from 'lucide-react';

// Enhanced Voice List categorized by persona
const VOICES = [
  { id: 'Zephyr', name: 'Zephyr', category: 'Boy', description: 'Energetic & Youthful', icon: <Baby size={18}/> },
  { id: 'Kore', name: 'Kore', category: 'Female', description: 'Professional & Clear', icon: <User size={18}/> },
  { id: 'Charon', name: 'Charon', category: 'Male', description: 'Deep & Resonant', icon: <User size={18}/> },
  { id: 'Puck', name: 'Puck', category: 'Girl', description: 'Bright & Playful', icon: <Baby size={18}/> },
  { id: 'Leda', name: 'Leda', category: 'Female', description: 'Warm & Calming', icon: <User size={18}/> },
  { id: 'Orus', name: 'Orus', category: 'Male', description: 'Authoritative', icon: <User size={18}/> },
  { id: 'Aoede', name: 'Aoede', category: 'Female', description: 'Melodic & Sweet', icon: <User size={18}/> },
  { id: 'Fenrir', name: 'Fenrir', category: 'Male', description: 'Strong & Steady', icon: <User size={18}/> }
];

const App = () => {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(VOICES[1].id);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState({ visible: false, x: 0, y: 0, selectedText: '' });
  
  const textAreaRef = useRef(null);

  // PCM to WAV Conversion Logic
  const pcmToWav = (pcmBase64, sampleRate = 24000) => {
    const byteCharacters = atob(pcmBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const buffer = byteArray.buffer;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + buffer.byteLength, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint16(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, buffer.byteLength, true);
    const blob = new Blob([wavHeader, buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const generateAudio = async (textToUse = text) => {
    if (!textToUse.trim()) return;
    setIsLoading(true);
    setError(null);
    setSelectionMenu({ ...selectionMenu, visible: false });
    
    const apiKey = ""; 

    const payload = {
      contents: [{ parts: [{ text: textToUse }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
      }
    };

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        if (!response.ok) throw new Error('API Error');
        const result = await response.json();
        const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!audioData) throw new Error('Empty Payload');
        
        const rateMatch = audioData.mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
        const url = pcmToWav(audioData.data, sampleRate);
        
        setAudioUrl(url);
        setHistory(prev => [{ 
          id: Date.now(), 
          text: textToUse.substring(0, 30) + '...', 
          url, 
          voice, 
          category: VOICES.find(v => v.id === voice).category 
        }, ...prev]);
      } catch (err) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        setError('Failed to synthesize.');
      }
    };

    await fetchWithRetry();
    setIsLoading(false);
  };

  // Handle Text Selection for the floating "Convert Voice" menu
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionMenu({
        visible: true,
        x: rect.left + window.scrollX + (rect.width / 2),
        y: rect.top + window.scrollY - 40,
        selectedText
      });
    } else {
      setSelectionMenu({ ...selectionMenu, visible: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#000] text-white font-sans selection:bg-blue-500/40 flex flex-col items-center justify-start overflow-hidden relative">
      {/* iPhone-style blurred background */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] bg-blue-600/20 blur-[140px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full" />

      {/* iOS Status Bar Spacer */}
      <div className="h-14 w-full" />

      <div className="relative z-10 w-full max-w-md px-5 flex flex-col h-[calc(100vh-3.5rem)]">
        
        {/* Header - Minimalist */}
        <header className="flex justify-between items-center py-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Mic2 size={16} className="text-black" />
            </div>
            <span className="font-semibold text-lg tracking-tight">VoxGen</span>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-xl border border-white/10 transition-all active:scale-90"
          >
            <Settings size={20} className="text-white/80" />
          </button>
        </header>

        {/* Floating Context Menu (Convert Voice) */}
        {selectionMenu.visible && (
          <div 
            className="fixed z-50 transform -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <button 
              onClick={() => generateAudio(selectionMenu.selectedText)}
              className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              <Sparkles size={12} />
              Convert Voice
            </button>
            <div className="w-3 h-3 bg-white rotate-45 mx-auto -mt-1.5 shadow-xl" />
          </div>
        )}

        {/* Main Text Area - iOS Frosted Glass */}
        <main className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 bg-white/[0.08] border border-white/10 rounded-[38px] backdrop-blur-[30px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder="Start typing..."
              className="w-full flex-1 p-8 bg-transparent focus:outline-none resize-none text-2xl font-light placeholder:text-white/20 leading-tight"
            />
            
            <div className="p-6 flex items-center justify-between">
              <button
                onClick={() => generateAudio()}
                disabled={isLoading || !text.trim()}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl font-bold transition-all ${
                  isLoading || !text.trim()
                    ? 'bg-white/5 text-white/20'
                    : 'bg-white text-black hover:opacity-90 active:scale-95'
                }`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Play fill="currentColor" size={18} />}
                {isLoading ? 'Synthesizing...' : 'Speak'}
              </button>

              {audioUrl && !isLoading && (
                <a 
                  href={audioUrl} 
                  download="voxgen.wav" 
                  className="ml-3 p-4 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center active:scale-90"
                >
                  <Download size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Recently Generated - Horizontal Scrolling List */}
          <div className="pb-8">
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Recent Activity</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {history.length === 0 ? (
                <div className="w-full py-4 bg-white/[0.03] rounded-3xl border border-dashed border-white/10 text-center text-white/20 text-xs">
                  No sessions yet
                </div>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => new Audio(item.url).play()}
                    className="flex-shrink-0 w-36 p-4 bg-white/[0.05] border border-white/5 rounded-[28px] backdrop-blur-md active:bg-white/10 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-2 group-active:scale-90 transition-transform">
                      <Play size={12} fill="currentColor" />
                    </div>
                    <p className="text-[11px] font-medium text-white/80 line-clamp-1">{item.text}</p>
                    <p className="text-[9px] text-white/30 mt-1">{item.category} • {item.voice}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Dynamic Preferences Drawer (iPhone style) */}
        {isSettingsOpen && (
          <div className="absolute inset-x-0 bottom-0 z-50 h-[85%] bg-[#1c1c1e] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" onClick={() => setIsSettingsOpen(false)} />
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold tracking-tight">Preferences</h2>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[70%] no-scrollbar px-1">
              {['Male', 'Female', 'Boy', 'Girl'].map(cat => (
                <section key={cat}>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 ml-2">{cat}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {VOICES.filter(v => v.category === cat).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setVoice(v.id); setIsSettingsOpen(false); }}
                        className={`flex items-center gap-4 p-4 rounded-3xl transition-all border ${
                          voice === v.id 
                          ? 'bg-white text-black border-white' 
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/10 active:scale-[0.98]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${voice === v.id ? 'bg-black/10' : 'bg-white/5'}`}>
                          {v.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm">{v.name}</p>
                          <p className={`text-[10px] ${voice === v.id ? 'text-black/60' : 'text-white/40'}`}>{v.description}</p>
                        </div>
                        {voice === v.id && <div className="w-2 h-2 rounded-full bg-black" />}
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              <div className="pt-8 pb-10">
                <button 
                  onClick={() => { setHistory([]); setIsSettingsOpen(false); }}
                  className="w-full p-4 rounded-3xl bg-red-500/10 text-red-400 border border-red-500/10 font-medium hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Clear Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Error Toast */}
        {error && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[90%] bg-red-500 text-white p-4 rounded-2xl text-center text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Home Indicator */}
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full" />
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slide-in-from-top-2 { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        
        .animate-in { animation: fade-in 0.3s ease-out; }
        .slide-in-from-bottom { animation: slide-in-from-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>
  );
};

export default App;

