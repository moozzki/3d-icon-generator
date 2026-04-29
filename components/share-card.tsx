"use client";

import React, { forwardRef } from "react";

interface ShareCardProps {
  imageUrl: string;
  style: string;
  position: string;
  userName?: string; // newly added prop
}

const STYLE_LABELS: Record<string, { label: string; emoji: string }> = {
  plastic:   { label: "Plastic",   emoji: "🫧" },
  clay:      { label: "Clay",      emoji: "🏺" },
  glass:     { label: "Glass",     emoji: "🧊" },
  plush:     { label: "Plush",     emoji: "🧸" },
  toy_block: { label: "Toy Block", emoji: "🧱" },
  metallic:  { label: "Metallic",  emoji: "⚙️" },
};

/**
 * ShareCard — Instagram Story share card (1080×1920)
 *
 * IMPORTANT: This component uses ONLY inline styles.
 * Tailwind utility classes that reference CSS variables (--primary, --foreground, etc.)
 * are NOT used here because html-to-image clones the DOM into an SVG foreignObject
 * and CSS custom properties / external stylesheets do NOT resolve there.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ imageUrl, style, position, userName }, ref) => {
    const styleInfo = STYLE_LABELS[style] ?? { label: style, emoji: "✨" };
    const positionLabel = position.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const PRIMARY    = "#4949FF";
    const PRIMARY_FG = "#ffffff";

    return (
      <div
        ref={ref}
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121212", 
          fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        {/* Main Glassmorphism Card Container */}
        <div
          style={{
            width: "980px",
            height: "1820px",
            borderRadius: "72px",
            background: "rgba(255, 255, 255, 0.08)", 
            backdropFilter: "blur(60px)",
            border: "2px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px",
            gap: "56px",
          }}
        >
          {/* Image Area - Strictly 1:1 Square */}
          <div
            style={{
              width: "900px",
              height: "900px",
              borderRadius: "56px",
              overflow: "hidden",
              position: "relative",
              background: "transparent",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Generated 3D icon"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Lower Content Section - 1 Column Stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              flex: 1, 
            }}
          >
            {/* Title Badge Dynamic Vibrant */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.3)", 
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "20px 48px",
                borderRadius: "999px",
                fontSize: "40px",
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "0.5px",
                marginBottom: "64px",
                whiteSpace: "nowrap",
                backdropFilter: "blur(10px)",
              }}
            >
               {userName || "Crafted on Audora"}
            </div>

            {/* Information List (Vertical & Separated) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: "32px",
              }}
            >
              {/* Style Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  paddingBottom: "32px",
                  borderBottom: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                 <span style={{ color: "#a1a1aa", fontSize: "44px", fontWeight: 500 }}>Style</span>
                 <span style={{ color: "#ffffff", fontSize: "44px", fontWeight: 700 }}>{styleInfo.emoji} {styleInfo.label}</span>
              </div>
              
              {/* Position Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  paddingBottom: "32px",
                  borderBottom: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                 <span style={{ color: "#a1a1aa", fontSize: "44px", fontWeight: 500 }}>Position</span>
                 <span style={{ color: "#ffffff", fontSize: "44px", fontWeight: 700 }}>📐 {positionLabel}</span>
              </div>
            </div>

            {/* Spacer pushes CTA/Logo to absolute bottom comfortably */}
            <div style={{ flex: 1 }} />

            {/* CTA Button (No icon) */}
            <div
              style={{
                background: PRIMARY,
                color: PRIMARY_FG,
                borderRadius: "999px",
                padding: "40px 0",
                width: "100%", 
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 16px 48px rgba(73,73,255,0.5)",
                marginBottom: "40px", 
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "56px", fontWeight: 800, letterSpacing: "-1px" }}>
                Made with Audora
              </span>
            </div>

            {/* Watermark Logo & Domain */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                height: "60px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/audora-square-logo.png"
                alt="Audora"
                style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "contain",
                  borderRadius: "16px",
                }}
              />
              <span
                style={{
                  fontSize: "40px",
                  fontWeight: 600,
                  color: "#a1a1aa",
                  letterSpacing: "1px",
                }}
              >
                useaudora.com
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
