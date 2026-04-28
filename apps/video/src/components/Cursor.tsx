import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const Cursor: React.FC<{ x?: number; y?: number }> = ({ x = 960, y = 540 }) => {
  return (
    <div 
      className="absolute z-50"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.5V20.5L9.5 16.5L12 21.5L14.5 20.5L12 15.5H18.5L5.5 3.5Z" fill="white" stroke="black" strokeWidth="2" />
      </svg>
    </div>
  );
};
