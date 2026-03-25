"use client";

interface ThemedCardWrapperProps {
  theme?: string;
  title: string;
  children: React.ReactNode;
  /** "full" for card/share views, "mini" for dashboard/template previews */
  size?: "full" | "mini";
}

const themes: Record<string, {
  outerBg: string;
  borderStyle: string;
  borderStyleMini: string;
  cornerEmoji?: string;
  footerText?: string;
  glow?: string;
  logoUrl?: string;
  logoMaxWidth?: string;
}> = {
  "hannah-montana": {
    outerBg: "bg-gradient-to-br from-pink-400 via-purple-500 to-pink-500",
    borderStyle: "border-4 border-pink-300 shadow-[0_0_30px_rgba(236,72,153,0.4)]",
    borderStyleMini: "border-2 border-pink-300",
    cornerEmoji: "\u2728",
    footerText: "You get the best of both worlds!",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.4),0_0_120px_rgba(236,72,153,0.2)]",
    logoUrl: "/uploads/system/hannah-montana-logo-color.png",
    logoMaxWidth: "220px",
  },
};

export default function ThemedCardWrapper({ theme, title, children, size = "full" }: ThemedCardWrapperProps) {
  if (!theme || !themes[theme]) {
    return <>{children}</>;
  }

  const t = themes[theme];
  const isMini = size === "mini";

  if (isMini) {
    return (
      <div className={`rounded-xl p-1 ${t.outerBg}`}>
        {/* Mini logo */}
        {t.logoUrl && (
          <div className="text-center py-1.5 relative">
            {t.cornerEmoji && (
              <>
                <span className="absolute top-0.5 left-1 text-[8px] animate-pulse">{t.cornerEmoji}</span>
                <span className="absolute top-0.5 right-1 text-[8px] animate-pulse">{t.cornerEmoji}</span>
              </>
            )}
            <img
              src={t.logoUrl}
              alt={title}
              className="mx-auto drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              style={{ maxWidth: "80px", height: "auto" }}
              loading="lazy"
            />
          </div>
        )}
        <div className={`rounded-lg overflow-hidden ${t.borderStyleMini}`}>
          {children}
        </div>
        {t.cornerEmoji && (
          <div className="text-center py-0.5">
            <span className="text-[7px] opacity-50">{t.cornerEmoji}{t.cornerEmoji}{t.cornerEmoji}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-1.5 md:p-2 ${t.outerBg} ${t.glow || ""}`}>
      {/* Decorative header with logo */}
      <div className="text-center pt-4 pb-2 md:pt-6 md:pb-3 relative">
        {t.cornerEmoji && (
          <>
            <span className="absolute top-2 left-3 text-xl md:text-2xl animate-pulse">{t.cornerEmoji}</span>
            <span className="absolute top-2 right-3 text-xl md:text-2xl animate-pulse">{t.cornerEmoji}</span>
          </>
        )}
        {t.logoUrl ? (
          <img
            src={t.logoUrl}
            alt={title}
            className="mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            style={{ maxWidth: t.logoMaxWidth || "200px", height: "auto" }}
          />
        ) : (
          <h2
            className="text-3xl md:text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            style={{ fontFamily: "var(--font-satisfy), cursive" }}
          >
            {title}
          </h2>
        )}
        {t.footerText && (
          <p className="text-pink-100 text-xs md:text-sm mt-2 italic opacity-80">
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
