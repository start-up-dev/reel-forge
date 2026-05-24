"use client";

import { useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Check } from "lucide-react";

const REEL_LIKES = [
  "2.4K", "18K", "892", "5.1K", "341", "12K",
  "2.8K", "9.3K", "4.7K", "1.1K", "6.2K", "3.5K",
];
const REEL_COMMENTS = [
  "128", "842", "67", "234", "48", "391",
  "156", "507", "213", "89", "312", "178",
];

type ReelVideo = {
  videoUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  creatorName: string;
  hook: string;
};

export function VideoReelFrame({
  video,
  index,
}: {
  video: ReelVideo;
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const likes = REEL_LIKES[index % REEL_LIKES.length];
  const comments = REEL_COMMENTS[index % REEL_COMMENTS.length];
  const initials = video.creatorName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      ref={containerRef}
      className="group relative w-[210px] sm:w-[235px] md:w-[258px]"
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${video.accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Phone shell */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#18181b] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:-translate-y-4 group-hover:scale-[1.02] group-hover:shadow-[0_60px_120px_rgba(0,0,0,0.9)] group-hover:border-[#27272a]">
        {/* Notch */}
        <div className="flex justify-center pt-2 pb-1.5">
          <div className="h-1.5 w-14 rounded-full bg-[#27272a] group-hover:bg-[#3f3f46] transition-colors" />
        </div>

        {/*
         * Screen wrapper — overlays are positioned here, NOT inside
         * the video's overflow-hidden child, to avoid the iOS Safari
         * bug where nested overflow-hidden+border-radius clips absolute
         * children incorrectly on real devices.
         */}
        <div className="relative mx-1 mb-1 h-[370px] sm:h-[415px] md:h-[456px]">
          {/* Video layer — own overflow-hidden for rounded corners */}
          <div className="absolute inset-0 overflow-hidden rounded-[1rem]">
            {/* Gradient always rendered as base — visible while video is loading */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${video.gradientFrom}, ${video.gradientTo})`,
              }}
            />
            {/* Video sits on top; loads only when scrolled into view */}
            {video.videoUrl && (
              <video
                ref={videoRef}
                src={video.videoUrl}
                muted
                loop
                playsInline
                preload="none"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent via-[38%] to-black/90" />
            {/* Right-side fade so engagement icons always read */}
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/55 to-transparent" />
          </div>

          {/* ── Right engagement column ── */}
          <div
            className="absolute right-2.5 z-20 flex flex-col items-center gap-3"
            style={{ bottom: "100px" }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <Heart className="w-6 h-6 text-white drop-shadow-lg" />
              <span className="text-white text-[9px] font-bold drop-shadow">
                {likes}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle className="w-6 h-6 text-white drop-shadow-lg" />
              <span className="text-white text-[9px] font-bold drop-shadow">
                {comments}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Share2 className="w-6 h-6 text-white drop-shadow-lg" />
              <span className="text-white text-[9px] font-bold drop-shadow">
                Share
              </span>
            </div>
            <Bookmark className="w-6 h-6 text-white drop-shadow-lg" />
          </div>

          {/* ── Bottom creator info + caption ── */}
          <div className="absolute bottom-0 left-0 right-[46px] z-20 px-3 pb-3">
            {/* Creator row */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 border border-white/20"
                style={{ background: video.accentColor }}
              >
                {initials}
              </div>
              <span className="text-white font-black text-[10px] drop-shadow leading-none truncate">
                {video.creatorName}
              </span>
              <div className="w-3.5 h-3.5 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
                <Check className="w-2 h-2 text-white stroke-[3]" />
              </div>
            </div>
            {/* Caption */}
            <p className="text-white text-[10px] leading-snug mb-2 line-clamp-2 drop-shadow">
              {video.hook}{" "}
              <span className="text-white/50">... more</span>
            </p>
            {/* Comment input */}
            <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-2.5 py-1.5 border border-white/15">
              <span className="text-white/50 text-[9px] flex-1 leading-none">
                Add a comment
              </span>
              <span className="text-white/40 text-[10px] leading-none">😊</span>
              <span className="text-white/40 text-[8px] font-black leading-none">
                GIF
              </span>
            </div>
          </div>
        </div>

        {/* Bottom home indicator */}
        <div className="flex justify-center py-2 bg-black">
          <div className="h-1 w-16 rounded-full bg-[#27272a]" />
        </div>
      </div>
    </div>
  );
}
