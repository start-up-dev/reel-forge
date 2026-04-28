import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, Sequence, interpolate } from "remotion";
import { Mic2, CheckCircle2 } from "lucide-react";

const SCENES = [
  { time: "0:00", text: "In the neon-lit alleys of Tokyo, coffee isn't just a drink." },
  { time: "0:15", text: "It's an art form. Welcome to the hidden gems of Shimokitazawa." },
];

const STYLES = ["Cinematic", "Cartoon", "Mascot", "2D Animation", "Motion Graphics", "Whiteboard", "Stock Footage"];

export const Scene2_Script: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill className="bg-bg-surface flex flex-row h-full">
      {/* Sidebar: Styles */}
      <div className="w-72 border-r border-white/5 bg-bg-elevated/30 p-8 space-y-8">
        <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-4">Visual Style</h3>
            <div className="flex flex-wrap gap-2">
                {STYLES.map((style, i) => (
                    <div 
                        key={style}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                            i === 0 ? 'bg-accent-primary text-white border-accent-primary' : 'bg-black/40 text-text-muted border-white/10'
                        }`}
                        style={{
                            transform: `scale(${spring({ frame: frame - (i * 3), fps, config: { stiffness: 200 } })})`
                        }}
                    >
                        {style}
                    </div>
                ))}
            </div>
        </div>

        <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-4">Voice</h3>
            <div className="p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                        <Mic2 size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-text-primary">Liam (Pro)</span>
                </div>
                <CheckCircle2 size={16} className="text-accent-primary" />
            </div>
        </div>
      </div>

      {/* Main: Script */}
      <div className="flex-1 p-12 overflow-hidden">
        <div className="max-w-xl space-y-6">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-[800] text-text-primary tracking-tight">AI Script</h2>
            <div className="text-[10px] font-bold bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 px-3 py-1 rounded-full uppercase tracking-widest">
                Hook-First Content
            </div>
          </div>
          
          {SCENES.map((scene, i) => {
            const sceneSpring = spring({
              frame: frame - (i * 10), // Faster stagger
              fps,
              config: { stiffness: 100 }
            });

            return (
              <div 
                key={i}
                className="bg-bg-elevated p-6 rounded-2xl border border-white/5 flex gap-6"
                style={{ 
                  transform: `translateX(${interpolate(sceneSpring, [0, 1], [30, 0])}px)`,
                  opacity: sceneSpring
                }}
              >
                <div className="text-accent-primary font-mono text-xs font-bold pt-1">{scene.time}</div>
                <p className="text-text-primary font-medium text-lg leading-snug">{scene.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
