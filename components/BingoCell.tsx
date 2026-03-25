"use client";

import { isImageCell, parseImageCell } from "@/lib/cellContent";

interface BingoCellProps {
  cell: string;
  style?: {
    textColor?: string;
    fontSize?: string;
    fontFamily?: string;
    borderColor?: string;
    backgroundColor?: string;
  };
  size?: 3 | 4 | 5;
  marked?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Shared cell renderer that handles both text and image cells.
 * Used across card view, share view, multiplayer, and dashboard previews.
 */
export default function BingoCell({
  cell,
  style = {},
  size = 5,
  marked = false,
  onClick,
  className = "",
}: BingoCellProps) {
  const imageData = parseImageCell(cell);
  const effectiveFontSize = size === 5 ? "12px" : (style.fontSize || "16px");

  return (
    <div
      onClick={onClick}
      className={`w-full h-full flex flex-col items-center justify-center border border-opacity-50 rounded-lg md:rounded-xl p-1.5 text-center break-words overflow-hidden shadow-sm relative ${
        onClick ? "cursor-pointer" : ""
      } ${marked ? "ring-2 ring-[#007AFF]" : ""} ${className}`}
      style={{
        color: style.textColor,
        fontSize: effectiveFontSize,
        fontFamily: style.fontFamily,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
      }}
    >
      {imageData ? (
        <>
          <img
            src={imageData.imageUrl}
            alt={imageData.label || "Bingo cell image"}
            className="max-w-full max-h-[70%] object-contain"
            loading="lazy"
          />
          {imageData.label && (
            <span
              className="mt-0.5 text-[10px] md:text-xs font-medium leading-tight line-clamp-2 w-full"
              style={{ color: style.textColor }}
            >
              {imageData.label}
            </span>
          )}
        </>
      ) : (
        cell || <span className="text-gray-300 italic text-xs">Empty</span>
      )}

      {/* Marked overlay */}
      {marked && (
        <div className="absolute inset-0 bg-[#007AFF]/10 rounded-lg md:rounded-xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#007AFF] drop-shadow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
