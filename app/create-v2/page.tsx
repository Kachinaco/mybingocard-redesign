"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// --- Configuration & Themes ---

const THEMES = [
  { name: "Amethyst", primary: "#7c3aed", secondary: "#4f46e5", bg: "#ffffff", text: "#1e293b", cardBg: "#f5f3ff", accent: "#ddd6fe" },
  { name: "Ocean", primary: "#0284c7", secondary: "#0369a1", bg: "#ffffff", text: "#0f172a", cardBg: "#f0f9ff", accent: "#bae6fd" },
  { name: "Emerald", primary: "#059669", secondary: "#047857", bg: "#ffffff", text: "#064e3b", cardBg: "#ecfdf5", accent: "#a7f3d0" },
  { name: "Rose", primary: "#e11d48", secondary: "#be123c", bg: "#ffffff", text: "#4c0519", cardBg: "#fff1f2", accent: "#fecdd3" },
  { name: "Amber", primary: "#d97706", secondary: "#b45309", bg: "#ffffff", text: "#451a03", cardBg: "#fffbeb", accent: "#fde68a" },
  { name: "Midnight", primary: "#475569", secondary: "#1e293b", bg: "#0f172a", text: "#f8fafc", cardBg: "#1e293b", accent: "#334155" },
];

const SIZES = [
  { label: "3x3", value: 3 },
  { label: "4x4", value: 4 },
  { label: "5x5", value: 5 },
];

const MAGIC_PRESETS = [
  {
    label: "💼 Office Bingo",
    title: "Office Meeting Bingo",
    items: "Can you hear me?\nSynergy\nCircle back\nHard stop\nScreen freeze\nLoud typing\nChild in background\n'You're on mute'\nAwkward silence\nNext slide please\nWifi issues\nEcho noise\nReply All\nBathroom break\nCoffee refill\nOvertime\nDeadline missed\nPrinter broken\nBlue screen\nPassword reset"
  },
  {
    label: "🎉 Party Night",
    title: "House Party Bingo",
    items: "Spilled drink\nWrong music\nPizza arrives\nStranger walks in\nDog barks\nGlass breaks\nSomeone singing\nSelfie group\nLost keys\nChips bowl empty\nComplaint about noise\nDancing on table\nSleeping on couch\nForgot name\nArgument\nCouple kissing\nPhone charger needed\nOut of ice\nUber called\nWifi password asked"
  },
  {
    label: "📚 School Vocab",
    title: "Classroom Bingo",
    items: "Pop quiz\nForgot homework\nLate arrival\nChalk breaks\nProjector fails\nFire drill\nFunny noise\nRecess rain\nTeacher jokes\nLost pencil\nNote passing\nSleeping in class\nAnswer out loud\nBathroom pass\nSubstitute teacher\nBook report\nScience experiment\nBus late\nLunch trade\nHomework extension"
  }
];

// --- Components ---

const BingoCell = ({ content, isFree, theme, size }: { content: string; isFree: boolean; theme: typeof THEMES[0]; size: number }) => {
  const isDark = theme.name === "Midnight";
  const fontSize = size === 5 ? "10px" : size === 4 ? "12px" : "14px";
  
  return (
    <div
      style={{
        aspectRatio: "1/1",
        backgroundColor: isFree ? theme.primary : (isDark ? "#334155" : "#ffffff"),
        color: isFree ? "#ffffff" : theme.text,
        border: `1px solid ${isDark ? "#475569" : "#e2e8f0"}`,
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "6px",
        fontSize: fontSize,
        fontWeight: isFree ? "700" : "500",
        lineHeight: "1.25",
        wordBreak: "break-word",
        hyphens: "auto",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
        transition: "all 0.2s ease",
      }}
    >
      {isFree ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "14px" }}>★</span>
          <span style={{ fontSize: "9px", letterSpacing: "1px" }}>FREE</span>
        </div>
      ) : (
        content || <span style={{ opacity: 0.15 }}>•</span>
      )}
    </div>
  );
};

const BingoPreview = ({ 
  title, 
  items, 
  size, 
  theme, 
  freeSpace,
  seed,
  onShuffle,
  isMobile
}: { 
  title: string; 
  items: string[]; 
  size: number; 
  theme: typeof THEMES[0]; 
  freeSpace: boolean; 
  seed: number;
  onShuffle: () => void;
  isMobile: boolean;
}) => {
  const totalCells = size * size;
  const centerIndex = freeSpace ? Math.floor(totalCells / 2) : -1;
  
  const displayItems = useMemo(() => {
    let list = [...items];
    if (list.length > 0) {
      const _ = seed; 
      list.sort(() => Math.random() - 0.5);
    }
    
    const result = [];
    let itemIdx = 0;
    for (let i = 0; i < totalCells; i++) {
      if (i === centerIndex) {
        result.push({ content: "FREE", isFree: true });
      } else {
        result.push({ content: list[itemIdx % list.length] || "", isFree: false });
        itemIdx++;
      }
    }
    return result;
  }, [items, size, freeSpace, totalCells, centerIndex, seed]);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: theme.bg,
        borderRadius: isMobile ? "20px" : "28px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        border: `1px solid ${theme.name === "Midnight" ? "#334155" : "#f1f5f9"}`,
        transform: "translateZ(0)",
        position: "relative"
      }}
    >
      <button
        onClick={onShuffle}
        style={{
          position: "absolute",
          top: isMobile ? "12px" : "20px",
          right: isMobile ? "12px" : "20px",
          zIndex: 20,
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "white",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "all 0.2s"
        }}
      >
        <span>🔄</span> Shuffle
      </button>

      <div
        style={{
          background: `linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`,
          padding: isMobile ? "40px 16px 20px" : "32px 20px 24px",
          textAlign: "center",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: isMobile ? "18px" : "22px", fontWeight: "900", letterSpacing: "-0.5px", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {title || "My Bingo Card"}
        </h3>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
          {"BINGO".split("").slice(0, size).map((letter, i) => (
            <div
              key={i}
              style={{
                width: isMobile ? "30px" : "36px",
                height: isMobile ? "30px" : "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "14px" : "16px",
                fontWeight: "900",
                border: "1.5px solid rgba(255,255,255,0.3)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? "12px" : "20px",
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: isMobile ? "6px" : "10px",
          backgroundColor: theme.cardBg,
        }}
      >
        {displayItems.map((cell, idx) => (
          <BingoCell key={idx} content={cell.content} isFree={cell.isFree} theme={theme} size={size} />
        ))}
      </div>

      <div style={{ 
        padding: "16px", 
        textAlign: "center", 
        borderTop: `1px solid ${theme.name === "Midnight" ? "#475569" : "#f1f5f9"}`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px"
      }}>
        <div style={{ width: "16px", height: "16px", background: theme.primary, borderRadius: "4px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>🎯</div>
        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", letterSpacing: "1.5px" }}>
          MYBINGOCARD.COM
        </span>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function CreateV2() {
  const [title, setTitle] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [size, setSize] = useState(5);
  const [themeIdx, setThemeIdx] = useState(0);
  const [freeSpace, setFreeSpace] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items = useMemo(() => {
    return itemsText.split("\n").map(i => i.trim()).filter(i => i.length > 0);
  }, [itemsText]);

  const currentTheme = THEMES[themeIdx];
  const targetCount = size * size - (freeSpace ? 1 : 0);
  const completionRate = Math.min(100, (items.length / targetCount) * 100);
  const isTargetMet = items.length >= targetCount;

  if (!isMounted) return <div style={{ minHeight: "100vh", background: "#f8f7ff" }} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f7ff",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        color: "#1e293b",
        WebkitFontSmoothing: "antialiased",
        paddingBottom: isMobile ? "80px" : "0"
      }}
    >
      <nav
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #eef2f6",
          padding: isMobile ? "12px 20px" : "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: isMobile ? "32px" : "40px", 
            height: isMobile ? "32px" : "40px", 
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)", 
            borderRadius: "10px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            boxShadow: "0 8px 16px -4px rgba(124, 58, 237, 0.3)" 
          }}>
            <span style={{ fontSize: isMobile ? "18px" : "22px" }}>🎯</span>
          </div>
          <span style={{ fontWeight: "900", fontSize: isMobile ? "18px" : "20px", color: "#1e293b", letterSpacing: "-0.8px" }}>MyBingoCard</span>
        </Link>
        {!isMobile && (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Need help?</span>
            <button style={{ 
              padding: "10px 24px", 
              borderRadius: "12px", 
              border: "none", 
              background: "#7c3aed", 
              color: "white", 
              fontWeight: "700", 
              cursor: "pointer", 
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)"
            }}>
              Save Project
            </button>
          </div>
        )}
      </nav>

      <main
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: isMobile ? "24px 16px" : "48px 32px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 420px",
          gap: isMobile ? "32px" : "60px",
          alignItems: "flex-start",
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: isMobile ? "24px" : "32px" }}>
          <div style={{ 
            padding: isMobile ? "24px" : "40px", 
            borderRadius: isMobile ? "24px" : "32px", 
            backgroundColor: "#ffffff", 
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05)",
            border: "1px solid #f1f5f9"
          }}>
            <div style={{ marginBottom: isMobile ? "32px" : "40px" }}>
              <h1 style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "900", color: "#1e293b", margin: "0 0 12px 0", letterSpacing: "-1px" }}>Craft your board</h1>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>Bring your game to life with custom items and themes.</p>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Bingo Card Title</label>
              <input
                type="text"
                placeholder="e.g. Grandma's 80th Birthday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  height: "54px",
                  padding: "0 20px",
                  borderRadius: "14px",
                  border: "2px solid #f1f5f9",
                  backgroundColor: "#f8fafc",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1e293b",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", marginBottom: "12px", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <label style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>Card Items</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {MAGIC_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => { setTitle(p.title); setItemsText(p.items); }}
                        style={{
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#64748b",
                          cursor: "pointer",
                          minHeight: "32px"
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                placeholder={"Add items here (one per line)..."}
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: isMobile ? "200px" : "240px",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "2px solid #f1f5f9",
                  backgroundColor: "#f8fafc",
                  fontSize: "16px",
                  fontWeight: "500",
                  color: "#1e293b",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.6",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: isTargetMet ? "#10b981" : "#64748b" }}>
                   {items.length} / {targetCount} items
                </span>
                {isTargetMet && <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>Ready! 🎉</span>}
              </div>
              <div style={{ marginTop: "8px", height: "6px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${completionRate}%`, backgroundColor: isTargetMet ? "#10b981" : "#7c3aed", transition: "width 0.4s ease" }} />
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#94a3b8", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Select Dimensions</label>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "12px" }}>
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    style={{
                      padding: isMobile ? "12px 20px" : "20px",
                      borderRadius: "14px",
                      border: "2px solid",
                      borderColor: size === s.value ? "#7c3aed" : "#f1f5f9",
                      backgroundColor: size === s.value ? "#f5f3ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: isMobile ? "row" : "column",
                      justifyContent: isMobile ? "space-between" : "center",
                      alignItems: "center",
                      gap: "4px",
                      minHeight: "54px"
                    }}
                  >
                    <span style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: "900", color: size === s.value ? "#7c3aed" : "#1e293b" }}>{s.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: size === s.value ? "#7c3aed" : "#94a3b8" }}>{s.value * s.value} Slots</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#94a3b8", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1.5px" }}>Visual Theme</label>
              <div style={{ 
                display: isMobile ? "flex" : "grid",
                overflowX: isMobile ? "auto" : "visible",
                gridTemplateColumns: isMobile ? "none" : "repeat(6, 1fr)",
                gap: "12px",
                paddingBottom: isMobile ? "12px" : "0",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none"
              }}>
                {THEMES.map((t, idx) => (
                  <button
                    key={t.name}
                    onClick={() => setThemeIdx(idx)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      minWidth: isMobile ? "80px" : "auto"
                    }}
                  >
                    <div style={{
                      width: "100%",
                      aspectRatio: "3/4",
                      borderRadius: "10px",
                      border: `2px solid ${themeIdx === idx ? "#7c3aed" : "transparent"}`,
                      padding: "2px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    }}>
                      <div style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "7px",
                        backgroundColor: t.cardBg,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        <div style={{ height: "30%", background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />
                        <div style={{ flex: 1, padding: "2px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px" }}>
                          {[...Array(9)].map((_, i) => (
                            <div key={i} style={{ borderRadius: "1px", backgroundColor: i===4 ? t.primary : (t.name==="Midnight"?"#334155":"#ffffff"), opacity: 0.8 }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: themeIdx === idx ? "#7c3aed" : "#64748b" }}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "32px", padding: "16px", borderRadius: "16px", backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", minHeight: "44px" }}>
                <input
                  type="checkbox"
                  checked={freeSpace}
                  onChange={(e) => setFreeSpace(e.target.checked)}
                  style={{ width: "22px", height: "22px", accentColor: "#7c3aed" }}
                />
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>Free Space</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Add center wildcard</div>
                </div>
              </label>
            </div>

            <button
              style={{
                width: "100%",
                height: "64px",
                borderRadius: "18px",
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 15px 30px -10px rgba(124, 58, 237, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              Generate Cards <span style={{ fontSize: "20px" }}>→</span>
            </button>
          </div>
        </section>

        {!isMobile && (
          <aside style={{ position: "sticky", top: "116px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ 
              padding: "16px 24px", 
              borderRadius: "16px", 
              backgroundColor: "#ffffff", 
              border: "1px solid #f1f5f9", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981" }} />
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", letterSpacing: "0.5px" }}>LIVE PREVIEW</span>
              </div>
            </div>

            <BingoPreview
              title={title}
              items={items}
              size={size}
              theme={currentTheme!}
              freeSpace={freeSpace}
              seed={previewSeed}
              onShuffle={() => setPreviewSeed(prev => prev + 1)}
              isMobile={false}
            />
          </aside>
        )}

        {isMobile && (
          <div style={{ padding: "0 8px" }}>
             <BingoPreview
              title={title}
              items={items}
              size={size}
              theme={currentTheme!}
              freeSpace={freeSpace}
              seed={previewSeed}
              onShuffle={() => setPreviewSeed(prev => prev + 1)}
              isMobile={true}
            />
          </div>
        )}
      </main>

      {isMobile && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1001,
          width: "calc(100% - 32px)",
          maxWidth: "400px"
        }}>
          <button 
            onClick={() => {
              if (showMobilePreview) {
                setShowMobilePreview(false);
              } else {
                setShowMobilePreview(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }
            }}
            style={{
              width: "100%",
              height: "56px",
              backgroundColor: "#1e293b",
              color: "white",
              borderRadius: "28px",
              border: "none",
              fontWeight: "800",
              fontSize: "15px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <span>👁️</span> {showMobilePreview ? "Back to Editor" : "View Preview"}
          </button>
        </div>
      )}

      <footer style={{ padding: "40px 20px 100px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>
        © 2026 MyBingoCard. Built for fun.
      </footer>
    </div>
  );
}
