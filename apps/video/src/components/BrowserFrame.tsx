import React from "react";

export const BrowserFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-[1280px] h-[720px] bg-bg-surface rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      {/* Browser Bar */}
      <div className="h-12 bg-bg-elevated border-b border-white/10 flex items-center px-4 gap-4">
        {/* Window Controls */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        
        {/* Address Bar */}
        <div className="flex-1 bg-black/20 rounded-md h-8 flex items-center px-3 border border-white/5">
          <span className="text-text-muted text-sm">reelforge.ai</span>
        </div>
      </div>
      
      {/* Viewport */}
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
};
