import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const Typewriter: React.FC<{ text: string; speed?: number; className?: string }> = ({ text, speed = 1, className }) => {
  const frame = useCurrentFrame();
  const charsShown = Math.floor(frame * speed);
  const textToShow = text.slice(0, charsShown);
  
  return <span className={className}>{textToShow}</span>;
};
