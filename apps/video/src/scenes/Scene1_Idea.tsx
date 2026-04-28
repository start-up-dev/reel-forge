import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { Typewriter } from "../components/Typewriter";
import { Wand2 } from "lucide-react";

export const Scene1_Idea: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = spring({ frame, fps, config: { damping: 200 } });
  
  // Faster button scale trigger
  const buttonScale = spring({ 
    frame: frame - 40, 
    fps, 
    config: { stiffness: 150, damping: 10 } 
  });

  return (
    <AbsoluteFill className="p-16 flex flex-col items-center justify-center bg-bg-surface" style={{ opacity }}>
      <div className="max-w-xl w-full space-y-8">
        <div className="space-y-2 text-center">
            <div className="text-accent-primary font-bold text-[10px] uppercase tracking-widest">Step 01 — Your Idea</div>
            <h2 className="text-4xl font-[800] text-text-primary tracking-tight leading-tight">
                One idea in.<br />Finished video out.
            </h2>
        </div>
        
        <div className="bg-bg-elevated p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Faint dot grid from spec */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="text-xl text-text-primary min-h-[60px] font-medium relative z-10">
            <Typewriter 
              text="Hidden coffee shops of Tokyo documentary." 
              speed={1.2} // Faster typing
            />
            {frame % 20 < 10 && <span className="w-0.5 h-6 bg-accent-primary ml-1 inline-block align-middle" />}
          </div>
        </div>
        
        <div className="flex justify-center">
          <div 
            className="bg-accent-primary text-white px-10 py-4 rounded-full font-bold flex items-center gap-3 shadow-xl shadow-accent-primary/30"
            style={{ transform: `scale(${buttonScale})` }}
          >
            <Wand2 size={22} />
            Generate Script
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
