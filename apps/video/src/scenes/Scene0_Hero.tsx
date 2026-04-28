import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

export const Scene0_Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 12 } });
  const subtitleSpring = spring({ frame: frame - 15, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill className="bg-bg-base flex flex-col items-center justify-center p-20 text-center overflow-hidden">
      {/* Radial Glow from spec */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
            background: 'radial-gradient(ellipse 800px 500px at 50% 40%, rgba(245,92,42,0.12), transparent)'
        }}
      />
      
      <div className="space-y-6 z-10">
        <div 
            className="text-accent-primary font-bold text-xs tracking-[0.15em] border-l border-accent-primary pl-3 uppercase inline-block mx-auto"
            style={{ opacity: titleSpring }}
        >
            Your Idea → Finished Video in 10 Minutes
        </div>
        
        <h1 
            className="text-7xl font-[900] text-text-primary leading-[0.95] tracking-tight"
            style={{ transform: `scale(${interpolate(titleSpring, [0, 1], [0.9, 1])})`, opacity: titleSpring }}
        >
            Stop Making<br />
            <span className="relative">
                Videos
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent-primary" viewBox="0 0 200 12">
                    <path 
                        d="M2 10C30 3 80 3 198 10" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                        style={{ 
                            strokeDasharray: 200, 
                            strokeDashoffset: interpolate(frame, [10, 40], [200, 0], { extrapolateRight: 'clamp' }) 
                        }}
                    />
                </svg>
            </span> by Hand.
        </h1>

        <p 
            className="text-text-secondary text-xl max-w-lg mx-auto"
            style={{ opacity: subtitleSpring, transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)` }}
        >
            One pipeline. Four platforms.<br />
            Under 10 minutes of your time.
        </p>
      </div>

      {/* Proof Strip Preview */}
      <div 
        className="absolute bottom-10 left-0 w-full bg-bg-surface py-6 border-y border-white/5 flex justify-center gap-12"
        style={{ transform: `translateY(${interpolate(frame, [40, 60], [100, 0], { extrapolateLeft: 'clamp' }) }px)` }}
      >
        <div className="text-center">
            <div className="text-3xl font-extrabold text-text-primary">5+</div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Videos / Day</div>
        </div>
        <div className="text-center">
            <div className="text-3xl font-extrabold text-text-primary">7</div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Visual Styles</div>
        </div>
        <div className="text-center">
            <div className="text-3xl font-extrabold text-text-primary">10m</div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Active Effort</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
