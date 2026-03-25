"use client";

interface ThemedCardWrapperProps {
  theme?: string;
  title: string;
  children: React.ReactNode;
}

const themes: Record<string, {
  outerBg: string;
  borderStyle: string;
  titleClass: string;
  cornerEmoji?: string;
  footerText?: string;
  glow?: string;
}> = {
  "hannah-montana": {
    outerBg: "bg-gradient-to-br from-pink-400 via-purple-500 to-pink-500",
    borderStyle: "border-4 border-pink-300 shadow-[0_0_30px_rgba(236,72,153,0.4)]",
    titleClass: "font-[--font-satisfy] text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-white to-purple-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
    cornerEmoji: "\u2728",
    footerText: "You get the best of both worlds!",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.4),0_0_120px_rgba(236,72,153,0.2)]",
  },
};

export default function ThemedCardWrapper({ theme, title, children }: ThemedCardWrapperProps) {
  if (!theme || !themes[theme]) {
    return <>{children}</>;
  }

  const t = themes[theme];

  return (
    <div className={`rounded-3xl p-1.5 md:p-2 ${t.outerBg} ${t.glow || ""}`}>
      {/* Decorative header */}
      <div className="text-center pt-4 pb-2 md:pt-6 md:pb-3 relative">
        {t.cornerEmoji && (
          <>
            <span className="absolute top-2 left-3 text-xl md:text-2xl animate-pulse">{t.cornerEmoji}</span>
            <span className="absolute top-2 right-3 text-xl md:text-2xl animate-pulse">{t.cornerEmoji}</span>
          </>
        )}
        <h2 className={t.titleClass} style={{ fontFamily: "var(--font-satisfy), cursive" }}>
          {title}
        </h2>
        {t.footerText && (
          <p className="text-pink-100 text-xs md:text-sm mt-1 italic opacity-80">
            {t.footerText}
          </p>
        )}
      </div>

      {/* Card content with themed border */}
      <div className={`rounded-2xl overflow-hidden ${t.borderStyle}`}>
        {children}
      </div>

      {/* Decorative footer */}
      <div className="text-center py-2 md:py-3">
        {t.cornerEmoji && (
          <span className="text-sm md:text-base opacity-60">
            {t.cornerEmoji} {t.cornerEmoji} {t.cornerEmoji}
          </span>
        )}
      </div>
    </div>
  );
}
