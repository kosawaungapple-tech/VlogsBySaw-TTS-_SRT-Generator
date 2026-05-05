import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileVideo, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Flame,
  Layout,
  Maximize,
  Palette,
  FastForward,
  Type as Font,
  RefreshCw
} from 'lucide-react';

interface VideoStudioProps {
  isAdmin?: boolean;
}

export const VideoStudio: React.FC<VideoStudioProps> = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleText, setSubtitleText] = useState('');
  const [features, setFeatures] = useState({
    flip: true,
    crop: true,
    colorGrade: true,
    speed: true,
    burnIn: true
  });
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const toggleFeature = (feature: keyof typeof features) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  const handleProcess = async () => {
    if (!videoFile) {
      setStatus('error');
      setErrorMessage('ဗီဒီယိုဖိုင် အရင်ရွေးချယ်ပေးပါ');
      return;
    }

    setStatus('processing');
    setErrorMessage('');
    
    try {
      const activeFeatures = Object.entries(features)
        .filter(([, active]) => active)
        .map(([name]) => name)
        .join(',');

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('features', activeFeatures);
      formData.append('subtitleText', subtitleText);

      // Note: Using http://localhost:3001 as per specification
      // This usually refers to a local processing service
      const response = await fetch('http://localhost:3001/api/video/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setDownloadUrl(data.downloadUrl);
      } else {
        throw new Error(data.error || 'လုပ်ဆောင်မှု မအောင်မြင်ပါ');
      }
    } catch (err: unknown) {
      console.error('Processing error:', err);
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : 'Error တစ်ခုခုဖြစ်သွားပါသည်';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 text-amber-500 rounded-full border border-amber-400/20 text-xs font-black uppercase tracking-widest"
        >
          <Flame size={14} className="animate-pulse" />
          Movie Recap Suite
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Video <span className="text-amber-400">Processor</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Professional tools for copyright-bypass movie recapping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & Subtitles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer overflow-hidden rounded-[32px] border-2 border-dashed transition-all duration-500
              ${videoFile ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/10 hover:border-amber-400/30 bg-white/[0.02]'}
              p-12 text-center flex flex-col items-center justify-center gap-4
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/*" 
              className="hidden" 
            />
            {videoFile ? (
              <>
                <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/20">
                  <FileVideo size={32} className="text-black" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{videoFile.name}</p>
                  <p className="text-slate-500 text-sm">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                  className="mt-2 text-slate-500 hover:text-white text-xs underline"
                >
                  ဖိုင်ပြောင်းမည်
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-amber-400/20 transition-colors">
                  <Upload size={32} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">ဗီဒီယိုဖိုင် တင်မည်</p>
                  <p className="text-slate-500 text-sm">Drag and drop or click to upload</p>
                </div>
              </>
            )}
          </div>

          {/* Subtitle Input */}
          <div className="glass-card p-8 rounded-[32px] border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold">
              <Font size={20} className="text-amber-400" />
              <span>မြန်မာစာတန်းထိုး (Subtitle Text)</span>
            </div>
            <textarea
              value={subtitleText}
              onChange={(e) => setSubtitleText(e.target.value)}
              placeholder="Enter Myanmar subtitle text for burn-in..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-400/50 transition-all font-medium resize-none"
            />
          </div>
        </div>

        {/* Right Column: Features & Controls */}
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[32px] border border-white/5 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold mb-2">
              <Settings size={20} className="text-amber-400" />
              <span>Features</span>
            </div>
            
            <div className="space-y-4">
              <FeatureToggle 
                label="Flip/Mirror" 
                active={features.flip} 
                onClick={() => toggleFeature('flip')} 
                icon={<Layout size={18} />}
              />
              <FeatureToggle 
                label="Crop 3%" 
                active={features.crop} 
                onClick={() => toggleFeature('crop')} 
                icon={<Maximize size={18} />}
              />
              <FeatureToggle 
                label="Color Grade" 
                active={features.colorGrade} 
                onClick={() => toggleFeature('colorGrade')} 
                icon={<Palette size={18} />}
              />
              <FeatureToggle 
                label="Speed 1.05x" 
                active={features.speed} 
                onClick={() => toggleFeature('speed')} 
                icon={<FastForward size={18} />}
              />
              <FeatureToggle 
                label="Subtitle Burn-in" 
                active={features.burnIn} 
                onClick={() => toggleFeature('burnIn')} 
                icon={<Font size={18} />}
              />
            </div>

            <button 
              onClick={handleProcess}
              disabled={status === 'processing'}
              className={`
                w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3
                ${status === 'processing' 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-amber-400 text-black hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-400/20'}
              `}
            >
              {status === 'processing' ? (
                <RefreshCw className="animate-spin" size={24} />
              ) : (
                'Process လုပ်မည်'
              )}
            </button>
          </div>

          {/* Status Display Area */}
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`
                  p-6 rounded-[24px] border flex items-center gap-4
                  ${status === 'processing' ? 'bg-amber-400/5 border-amber-400/20 text-amber-400' : ''}
                  ${status === 'success' ? 'bg-emerald-400/5 border-emerald-400/20 text-emerald-400' : ''}
                  ${status === 'error' ? 'bg-rose-400/5 border-rose-400/20 text-rose-400' : ''}
                `}
              >
                {status === 'processing' && <RefreshCw className="animate-spin shrink-0" size={24} />}
                {status === 'success' && <CheckCircle className="shrink-0" size={24} />}
                {status === 'error' && <AlertCircle className="shrink-0" size={24} />}
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">
                    {status === 'processing' && '⏳ Processing နေတယ်... ခဏစောင့်ပါ'}
                    {status === 'success' && '✅ ပြီးပါပြီ!'}
                    {status === 'error' && `❌ Error: ${errorMessage}`}
                  </p>
                  {status === 'success' && downloadUrl && (
                    <a 
                      href={downloadUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all"
                    >
                      <Download size={14} />
                      Download Video
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

interface FeatureToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const FeatureToggle: React.FC<FeatureToggleProps> = ({ label, active, onClick, icon }) => (
  <div 
    onClick={onClick}
    className={`
      flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border
      ${active 
        ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' 
        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/[0.08]'}
    `}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${active ? 'bg-amber-400/20' : 'bg-white/5'}`}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    <div className={`
      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
      ${active ? 'border-amber-400 bg-amber-400' : 'border-slate-700 bg-transparent'}
    `}>
      {active && <CheckCircle size={14} className="text-black" />}
    </div>
  </div>
);
