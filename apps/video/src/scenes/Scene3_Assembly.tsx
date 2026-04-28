import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { CheckCircle2, Zap } from "lucide-react";

export const Scene3_Assembly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hyper-speed progress
  const progress = interpolate(frame, [0, 60], [0, 100], {
    extrapolateRight: "clamp",
  });

  const videoReveal = spring({
    frame: frame - 50,
    fps,
    config: { stiffness: 120, damping: 12 },
  });

  return (
    <AbsoluteFill className="bg-bg-surface flex flex-col items-center justify-center p-12 space-y-12">
      {/* Assembly Status - Spec-aligned */}
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-success/10 border border-accent-success/30 text-accent-success text-[10px] font-bold uppercase tracking-widest">
                <Zap size={10} /> Fully Automated
            </div>
            <h3 className="text-3xl font-[800] text-text-primary tracking-tight">Forging Your Reel</h3>
        </div>

        <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-text-muted uppercase tracking-widest">Assembling Masterpiece</span>
                <span className="text-accent-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-4 w-full bg-bg-elevated rounded-full overflow-hidden border border-white/5 p-1">
                <div 
                    className="h-full bg-accent-primary rounded-full shadow-[0_0_30px_rgba(245,92,42,0.6)]" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
      </div>

      {/* Vertical Video Reveal */}
      <div 
        className="w-[300px] h-[540px] bg-black rounded-[32px] border-[6px] border-bg-elevated shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden relative"
        style={{ 
          transform: `translateY(${interpolate(videoReveal, [0, 1], [100, 0])}px) scale(${interpolate(videoReveal, [0, 1], [0.8, 1])}) rotate(${interpolate(videoReveal, [0, 1], [-2, 0])}deg)`,
          opacity: videoReveal
        }}
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=300&h=540&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10" />
        
        {/* Subtitle Spec: Bold Pop */}
        <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
            <div className="text-center scale-110">
                <p className="text-white text-3xl font-black italic uppercase leading-none drop-shadow-2xl">
                    Hidden <span className="text-accent-warning">Coffee</span> Shops
                </p>
            </div>
        </div>

        {/* Final Success Badge */}
        <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
            style={{ 
                transform: `translate(-50%, -50%) scale(${spring({ frame: frame - 100, fps, config: { stiffness: 200 } })})`,
                opacity: spring({ frame: frame - 100, fps })
            }}
        >
            <div className="bg-accent-success text-white p-4 rounded-full shadow-2xl">
                <CheckCircle2 size={48} />
            </div>
        </div>
      </div>

      {/* Spec CTA Reveal */}
      <div 
        className="text-center space-y-4"
        style={{ opacity: spring({ frame: frame - 120, fps }) }}
      >
        <div className="bg-accent-primary text-white px-12 py-5 rounded-full font-black text-xl shadow-2xl shadow-accent-primary/40">
            Start for $5 →
        </div>
        <p className="text-text-muted text-xs font-medium">3 video credits · Secured by Stripe</p>
      </div>
    </AbsoluteFill>
  );
};
