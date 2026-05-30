"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import { playDingSound, playBingoSound, playDabSound, playUndabSound } from "@/lib/sounds";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { trackClientActivity } from "@/lib/activity-client";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";
import {
  checkWinByGrid,
  formatCalledItemLabel,
  formatClassicCellLabel,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
  type BingoVariant,
  type WinCondition,
} from "@/lib/classic-bingo";

type CallMode = "random" | "manual" | "auto" | "sequential";

interface Player {
  playerId: string;
  playerName: string;
  hasBingo: boolean;
  markedCount: number;
}

interface GameWinner {
  playerId: string;
  playerName: string;
  verificationCode?: string;
}

interface GameState {
  status: "waiting" | "active" | "finished";
  calledItems: string[];
  players: Player[];
  winnerId?: string;
  winnerName?: string;
  wordListCount: number;
  settings?: { callMode: CallMode; winCondition: WinCondition; allowMultipleWinners: boolean; autoCallInterval?: number };
  winners?: GameWinner[];
  rows?: number;
  columns?: number;
  bingoVariant?: BingoVariant;
}

interface HostPlayerData {
  playerId: string;
  playerName: string;
  cells: string[];
  marked: number[];
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function calledItemLabel(item: string, variant: BingoVariant) {
  if (variant !== "custom") return formatCalledItemLabel(item, variant);
  return getCellDisplayText(item) || "Image square";
}

export default function HostGamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calling, setCalling] = useState(false);
  const [lastCalledItem, setLastCalledItem] = useState<string | null>(null);
  const [showCalledAnimation, setShowCalledAnimation] = useState(false);
  const [autoCalling, setAutoCalling] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5);
  const [copied, setCopied] = useState(false);
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [title, setTitle] = useState("");
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Host play-along state
  const [playAlong, setPlayAlong] = useState(true);
  const [hostPlayer, setHostPlayer] = useState<HostPlayerData | null>(null);
  const [hostMarked, setHostMarked] = useState<Set<number>>(new Set());
  const [hostHasBingo, setHostHasBingo] = useState(false);
  const [claimingBingo, setClaimingBingo] = useState(false);
  const [size, setSize] = useState(5);
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(5);
  const [bingoVariant, setBingoVariant] = useState<BingoVariant>("custom");
  const [freeSpace, setFreeSpace] = useState(true);
  const [cardStyle, setCardStyle] = useState<any>({});

  // Game settings state
  const [callMode, setCallMode] = useState<CallMode>("random");
  const [winCondition, setWinCondition] = useState<WinCondition>("standard");
  const [allowMultipleWinners, setAllowMultipleWinners] = useState(false);
  const [wordList, setWordList] = useState<string[]>([]);

  const getFreeSpaceIndex = useCallback(() => {
    return getFreeSpaceIndexForGrid({ freeSpace, rows, columns, bingoVariant });
  }, [freeSpace, rows, columns, bingoVariant]);

  const checkBingoWin = useCallback(
    (markedSet: Set<number>): boolean => {
      return checkWinByGrid(
        Array.from(markedSet),
        hostPlayer?.cells || [],
        rows,
        columns,
        winCondition,
        bingoVariant
      );
    },
    [hostPlayer?.cells, rows, columns, winCondition, bingoVariant]
  );

  // Persist a setting change to the server
  const saveSettings = (updates: Record<string, any>) => {
    fetch(`/api/game/${roomCode}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", settings: updates }),
    }).catch(() => {});
  };

  // Connect to SSE stream + fetch room info + recover host player
  useEffect(() => {
    const es = new EventSource(`/api/game/${roomCode}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.type === "connected") return;
        if (data.rows) setRows(data.rows);
        if (data.columns) setColumns(data.columns);
        if (data.bingoVariant) setBingoVariant(normalizeBingoVariant(data.bingoVariant));

        setGameState((prev) => {
          if (prev && data.calledItems.length > prev.calledItems.length) {
            const newItem = data.calledItems[data.calledItems.length - 1];
            setLastCalledItem(newItem);
            setShowCalledAnimation(true);
            playDingSound();
            setTimeout(() => setShowCalledAnimation(false), 2000);
          }

          // Play bingo sound for new winners
          const prevWinners = prev?.winners?.length || 0;
          const newWinners = data.winners?.length || 0;
          if (newWinners > prevWinners) {
            playBingoSound();
          } else if (data.winnerName && (!prev || !prev.winnerName)) {
            playBingoSound();
          }

          return data;
        });
        setLoading(false);
      } catch {}
    };

    es.onerror = () => {
      setError("Connection lost. Reconnecting...");
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          es.close();
        }
      }, 3000);
    };

    // Fetch initial room info
    fetch(`/api/game/${roomCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.room) {
          const nextVariant = normalizeBingoVariant(data.room.bingoVariant);
          setTitle(data.room.title);
          setSize(data.room.size || 5);
          setRows(data.room.rows || data.room.size || 5);
          setColumns(data.room.columns || data.room.size || 5);
          setBingoVariant(nextVariant);
          setFreeSpace(data.room.freeSpace !== false);
          setCardStyle(data.room.style || {});
          setWordList(data.room.wordList || []);
          if (data.room.calledItems?.length > 0) {
            setLastCalledItem(data.room.calledItems[data.room.calledItems.length - 1]);
          }
          // Load persisted settings
          if (data.room.settings) {
            setCallMode(data.room.settings.callMode || "random");
            setWinCondition(data.room.settings.winCondition || "standard");
            setAllowMultipleWinners(data.room.settings.allowMultipleWinners || false);
            if (data.room.settings.autoCallInterval) {
              setAutoInterval(data.room.settings.autoCallInterval);
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Recover host player data from sessionStorage
    try {
      const stored = getBrowserStorageItem("sessionStorage", `host-game-${roomCode}`);
      if (stored) {
        const data = JSON.parse(stored) as HostPlayerData;
        setHostPlayer(data);
        setHostMarked(new Set(data.marked || []));
        fetch(`/api/game/${roomCode}/bingo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "state", playerId: data.playerId }),
        })
          .then((r) => r.json())
          .then((state) => {
            if (state.cells) {
              const recovered: HostPlayerData = {
                ...data,
                cells: state.cells,
                marked: state.marked || [],
              };
              setHostPlayer(recovered);
              setHostMarked(new Set(state.marked || []));
              setHostHasBingo(state.hasBingo || false);
              setBrowserStorageItem("sessionStorage", `host-game-${roomCode}`, JSON.stringify(recovered));
            }
          })
          .catch(() => {});
      }
    } catch {}

    return () => {
      es.close();
    };
  }, [roomCode]);

  // Auto-caller
  useEffect(() => {
    if (autoCalling && gameState?.status === "active") {
      autoTimerRef.current = setTimeout(() => {
        callNextItem();
      }, autoInterval * 1000);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [autoCalling, gameState?.calledItems?.length, autoInterval, gameState?.status]);

  // Auto-start calling when callMode is "auto" and game becomes active
  useEffect(() => {
    if (callMode === "auto" && gameState?.status === "active" && !autoCalling) {
      setAutoCalling(true);
    }
  }, [callMode, gameState?.status]);

  const startGame = async () => {
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", playAlong }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start");
      } else if (data.hostPlayer) {
        const hp: HostPlayerData = {
          playerId: data.hostPlayer.playerId,
          playerName: data.hostPlayer.playerName,
          cells: data.hostPlayer.cells,
          marked: data.hostPlayer.marked || [],
        };
        setHostPlayer(hp);
        setHostMarked(new Set(hp.marked));
        setBrowserStorageItem("sessionStorage", `host-game-${roomCode}`, JSON.stringify(hp));
      }
    } catch {
      setError("Failed to start game");
    }
  };

  const callNextItem = useCallback(async () => {
    if (calling) return;
    setCalling(true);
    try {
      const action = callMode === "sequential" ? "sequential" : "random";
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("No more items")) {
          setAutoCalling(false);
        }
        setError(data.error || "Failed to call");
      }
    } catch {
      setError("Failed to call item");
    } finally {
      setCalling(false);
    }
  }, [calling, roomCode, callMode]);

  const callSpecificItem = async (item: string) => {
    if (calling) return;
    setCalling(true);
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call", item }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to call item");
      }
    } catch {
      setError("Failed to call item");
    } finally {
      setCalling(false);
    }
  };

  const endGameManually = async () => {
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to end game");
      }
    } catch {
      setError("Failed to end game");
    }
  };

  const toggleHostCell = async (index: number) => {
    if (!hostPlayer || gameState?.status !== "active") return;
    const freeIdx = getFreeSpaceIndex();
    if (freeSpace && index === freeIdx) return;

    const cellValue = hostPlayer.cells[index] as string;
    if (isBlankClassicCell(cellValue, bingoVariant)) return;
    const calledSet = new Set(gameState?.calledItems || []);

    if (!hostMarked.has(index) && !calledSet.has(cellValue)) return;

    const newMarked = new Set(hostMarked);
    const isMarking = !newMarked.has(index);

    if (isMarking) {
      newMarked.add(index);
      playDabSound();
    } else {
      newMarked.delete(index);
      playUndabSound();
    }

    setHostMarked(newMarked);

    const updated = { ...hostPlayer, marked: Array.from(newMarked) };
    setBrowserStorageItem("sessionStorage", `host-game-${roomCode}`, JSON.stringify(updated));

    fetch(`/api/game/${roomCode}/bingo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: isMarking ? "mark" : "unmark",
        playerId: hostPlayer.playerId,
        cellIndex: index,
      }),
    }).catch(() => {});

    if (checkBingoWin(newMarked) && !hostHasBingo) {
      setHostHasBingo(true);
    }
  };

  const claimHostBingo = async () => {
    if (!hostPlayer || claimingBingo) return;
    setClaimingBingo(true);

    try {
      const res = await fetch(`/api/game/${roomCode}/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          playerId: hostPlayer.playerId,
        }),
      });

      const data = await res.json();
      if (data.valid) {
        playBingoSound();
      } else {
        setError("Bingo claim invalid - make sure all marked items have been called!");
        setHostHasBingo(false);
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Failed to claim bingo");
    } finally {
      setClaimingBingo(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(joinUrl);
    trackClientActivity("game_room_link_copied", { roomCode });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = async () => {
    const titleText = `Join my bingo game: ${title || roomCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: titleText,
          text: `Use room code ${roomCode}`,
          url: joinUrl,
        });
        trackClientActivity("game_room_native_shared", { roomCode });
        return;
      }
    } catch {}
    copyRoomLink();
  };

  const openQrSheet = () => {
    setShowQrSheet(true);
    trackClientActivity("game_room_qr_opened", { roomCode });
  };

  const printJoinSheet = () => {
    if (!roomCode) return;

    const printUrl = `/game/join-sheet/${encodeURIComponent(roomCode)}`;
    const printWindow = window.open(printUrl, "_blank", "width=720,height=900");
    if (!printWindow) {
      copyRoomLink();
      setError("Pop-up blocked. Invite link copied instead.");
      return;
    }

    trackClientActivity("game_join_sheet_printed", { roomCode });
  };

  const exportCalledList = () => {
    if (!gameState?.calledItems.length) return;

    const rows = [
      ["Room Code", roomCode],
      ["Game", title || "Bingo Game"],
      ["Exported At", new Date().toISOString()],
      [],
      ["Call #", "Item"],
      ...gameState.calledItems.map((item, index) => [String(index + 1), calledItemLabel(item, bingoVariant)]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (title || "bingo-game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bingo-game";
    link.href = url;
    link.download = `${safeTitle}-${roomCode}-called-list.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    trackClientActivity("game_called_list_exported", {
      roomCode,
      calledItemCount: gameState.calledItems.length,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-slate-500">Loading game room...</p>
        </div>
      </div>
    );
  }

  const remaining = gameState ? (gameState.wordListCount - gameState.calledItems.length) : 0;
  const freeIdx = getFreeSpaceIndex();
  const calledSet = new Set(gameState?.calledItems || []);
  const totalCells = rows * columns;
  const isHostWinner = gameState?.winnerName && hostPlayer && gameState.winnerId === hostPlayer.playerId;
  const winners = gameState?.winners || [];
  const canHostClaimBingo = hostHasBingo && gameState?.status === "active" && (allowMultipleWinners || !gameState?.winnerName);
  const uncalledItems = wordList.filter(w => !calledSet.has(w));
  const playerCount = gameState?.players.length || 0;
  const canStartGame = playAlong || playerCount > 0;
  const startButtonLabel = canStartGame ? "Start game" : "Waiting for players...";
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/game/join?code=${roomCode}` : "";
  const qrCodeUrl = joinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}` : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <Confetti active={!!gameState?.winnerName || winners.length > 0} />

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
            MyBingoCard
          </Link>
          <div className="flex items-center gap-3">
            <SoundToggle />
            <span
              role="status"
              aria-label="Host status"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 select-none pointer-events-none opacity-60"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Hosting
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {showQrSheet && qrCodeUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl">
              <div className="flex items-center justify-between gap-4 text-left">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Scan to join</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{title || "Bingo Game"}</h2>
                </div>
                <button
                  onClick={() => setShowQrSheet(false)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-500 transition hover:bg-slate-200"
                  aria-label="Close QR display"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <img src={qrCodeUrl} alt="Join game QR code" className="mx-auto h-72 w-72 rounded-2xl bg-white p-3 shadow-sm" />
                <div className="mt-5 font-mono text-5xl font-black tracking-[0.25em] text-emerald-700">{roomCode}</div>
                <p className="mt-2 text-sm font-bold text-emerald-800">Each player gets a unique card. No app needed.</p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={copyRoomLink}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  {copied ? "Copied" : "Copy invite"}
                </button>
                <button
                  onClick={printJoinSheet}
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Print join sheet
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {/* Room Info Bar */}
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <div>
                <h1 className="text-xl font-black text-slate-950">{title || "Bingo Game"}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    gameState?.status === "waiting" ? "bg-emerald-100 text-emerald-800" :
                    gameState?.status === "active" ? "bg-green-600 text-white" :
                    "bg-slate-200 text-slate-700"
                  }`}>
                    {gameState?.status === "waiting" ? "Waiting room" :
                     gameState?.status === "active" ? "Live now" : "Game over"}
                  </span>
                  <span className="text-sm font-semibold text-emerald-900">{playerCount} player{playerCount === 1 ? "" : "s"}</span>
                  {gameState?.status === "active" && (
                    <span className="text-xs font-semibold text-emerald-700">
                      {winCondition === "four_corners" ? "Four Corners" :
                       winCondition === "blackout" ? "Blackout" :
                       winCondition === "one_line" ? "One Line" :
                       winCondition === "two_lines" ? "Two Lines" :
                       winCondition === "full_house" ? "Full House" : "Standard"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-center shadow-sm">
                  <div className="font-mono text-4xl font-black tracking-[0.25em] text-emerald-700 sm:text-5xl">{roomCode}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Room Code</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    onClick={copyRoomLink}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    {copied ? "Copied" : "Copy invite"}
                  </button>
                  <button
                    onClick={shareRoom}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                  >
                    Share
                  </button>
                  <button
                    onClick={openQrSheet}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                  >
                    Show QR
                  </button>
                  <button
                    onClick={printJoinSheet}
                    className="rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                  >
                    Print join sheet
                  </button>
                  {gameState?.status === "waiting" && (
                    <button
                      onClick={startGame}
                      disabled={!canStartGame}
                      className="col-span-2 rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-auto"
                    >
                      {startButtonLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="rounded-2xl border border-emerald-200 bg-white p-3 text-center shadow-sm">
                <button onClick={openQrSheet} className="block transition hover:scale-[1.02]" aria-label="Show larger join QR code">
                  <img src={qrCodeUrl} alt="Join game QR code" className="h-36 w-36 rounded-lg" />
                </button>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Scan to join</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">No app needed</p>
              </div>
            )}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bingo Caller Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Call Display / Waiting / Finished */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              {gameState?.status === "waiting" && (
                <div className="py-4">
                  <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Room ready</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">Friends join with the code above</h2>
                    <p className="mt-2 text-sm font-semibold text-emerald-800">
                      {canStartGame ? "Press Start game when everyone is in." : "A friend needs to join first, or turn on play along below."}
                    </p>
                  </div>

                  {/* Game Settings */}
                  <details className="max-w-lg mx-auto mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700">Game settings</summary>
                    <div className="mt-4 space-y-4">
                    {/* Call Mode */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How to call items</div>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["random", "Random"],
                          ["manual", "Manual Pick"],
                          ["auto", "Auto-Call"],
                          ["sequential", "In Order"],
                        ] as [CallMode, string][]).map(([mode, label]) => (
                          <button
                            key={mode}
                            onClick={() => { setCallMode(mode); saveSettings({ callMode: mode }); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              callMode === mode
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {callMode === "auto" && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Interval:</span>
                          <select
                            value={autoInterval}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAutoInterval(val);
                              saveSettings({ autoCallInterval: val });
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value={3}>3 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={8}>8 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={15}>15 seconds</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Win Condition */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Win condition</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(bingoVariant === "classic90"
                          ? ([
                              ["one_line", "1 Line"],
                              ["two_lines", "2 Lines"],
                              ["full_house", "Full House"],
                            ] as [WinCondition, string][])
                          : ([
                              ["standard", "Standard"],
                              ["four_corners", "4 Corners"],
                              ["blackout", "Blackout"],
                            ] as [WinCondition, string][])
                        ).map(([cond, label]) => (
                          <button
                            key={cond}
                            onClick={() => { setWinCondition(cond); saveSettings({ winCondition: cond }); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              winCondition === cond
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {winCondition === "standard" && "Row, column, or diagonal"}
                        {winCondition === "four_corners" && "All four corner cells"}
                        {winCondition === "blackout" && "Every cell on the card"}
                        {winCondition === "one_line" && "Any completed row on a 90-ball ticket"}
                        {winCondition === "two_lines" && "Any two completed rows on a 90-ball ticket"}
                        {winCondition === "full_house" && "All 15 numbers on a 90-ball ticket"}
                      </p>
                    </div>

                    {/* Multiple Winners + Play Along */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 flex items-center gap-2 cursor-pointer bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-emerald-300 transition">
                        <input
                          type="checkbox"
                          checked={allowMultipleWinners}
                          onChange={(e) => { setAllowMultipleWinners(e.target.checked); saveSettings({ allowMultipleWinners: e.target.checked }); }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Allow multiple winners</span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 cursor-pointer bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-emerald-300 transition">
                        <input
                          type="checkbox"
                          checked={playAlong}
                          onChange={(e) => setPlayAlong(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">I want to play too</span>
                      </label>
                    </div>
                    </div>
                  </details>
                </div>
              )}

              {gameState?.status === "active" && (
                <div>
                  {/* Current called item */}
                  <div className={`text-center mb-6 transition-all duration-300 ${showCalledAnimation ? "scale-110" : ""}`}>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Current Call</div>
                    {lastCalledItem ? (
                      <div className={`inline-block px-8 py-6 bg-emerald-600 text-white rounded-2xl shadow-lg transition-all duration-500 ${showCalledAnimation ? "animate-bounce shadow-xl shadow-emerald-200" : ""}`}>
                        <div className="text-3xl font-black">
                          {isImageCell(lastCalledItem!) ? (
                            <span className="flex flex-col items-center gap-1">
                              <img src={parseImageCell(lastCalledItem!)?.imageUrl} alt="" className="w-20 h-20 object-contain" />
                              {getCellDisplayText(lastCalledItem!) && <span className="text-lg">{getCellDisplayText(lastCalledItem!)}</span>}
                            </span>
                          ) : formatCalledItemLabel(lastCalledItem!, bingoVariant)}
                        </div>
                        <div className="text-emerald-100 text-sm mt-1">
                          Call #{gameState.calledItems.length} of {gameState.wordListCount}
                        </div>
                      </div>
                    ) : (
                      <div className="inline-block px-8 py-6 bg-slate-100 text-slate-400 rounded-2xl">
                        <div className="text-2xl font-bold">
                          {callMode === "manual" ? "Pick an item below" : "Press Call to begin"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call controls — varies by mode */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                    {/* Random + Sequential: Call Next button */}
                    {(callMode === "random" || callMode === "sequential") && (
                      <button
                        onClick={callNextItem}
                        disabled={calling || remaining === 0}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 hover:shadow-lg transition font-bold disabled:opacity-50"
                      >
                        {calling ? "Calling..." : remaining === 0 ? "All Called!" : "Call Next"}
                      </button>
                    )}

                    {/* Auto mode: pause/resume + interval */}
                    {callMode === "auto" && (
                      <>
                        <button
                          onClick={() => setAutoCalling(!autoCalling)}
                          className={`px-6 py-3 rounded-xl font-bold transition ${
                            autoCalling
                              ? "bg-amber-500 text-white hover:bg-amber-600"
                              : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg"
                          }`}
                        >
                          {autoCalling ? "Pause" : "Resume"}
                        </button>
                        <select
                          value={autoInterval}
                          onChange={(e) => setAutoInterval(Number(e.target.value))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value={3}>3s</option>
                          <option value={5}>5s</option>
                          <option value={8}>8s</option>
                          <option value={10}>10s</option>
                          <option value={15}>15s</option>
                        </select>
                        {autoCalling && (
                          <span className="text-sm text-green-600 font-medium animate-pulse">Auto-calling...</span>
                        )}
                      </>
                    )}

                    {/* Random mode: also show auto-call toggle */}
                    {callMode === "random" && (
                      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                        <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Auto-Call</label>
                        <button
                          onClick={() => {
                            const newValue = !autoCalling;
                            setAutoCalling(newValue);
                            trackClientActivity("game_auto_call_toggled", {
                              enabled: newValue,
                              interval_seconds: autoInterval,
                              roomCode,
                            });
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${autoCalling ? "bg-green-500" : "bg-slate-300"}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoCalling ? "translate-x-6" : "translate-x-0.5"}`} />
                        </button>
                        {autoCalling && (
                          <select
                            value={autoInterval}
                            onChange={(e) => setAutoInterval(Number(e.target.value))}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value={3}>3s</option>
                            <option value={5}>5s</option>
                            <option value={8}>8s</option>
                            <option value={10}>10s</option>
                            <option value={15}>15s</option>
                          </select>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-slate-500">
                      {remaining} remaining
                    </div>

                    {/* End Game button for multiple winners mode */}
                    {allowMultipleWinners && winners.length > 0 && (
                      <button
                        onClick={endGameManually}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold text-sm"
                      >
                        End Game
                      </button>
                    )}
                  </div>

                  {/* Manual Pick Grid */}
                  {callMode === "manual" && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Tap an item to call it ({uncalledItems.length} remaining)
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        {uncalledItems.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => callSpecificItem(item)}
                            disabled={calling}
                            className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 hover:border-indigo-400 transition disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {isImageCell(item) ? (
                              <>
                                <img src={parseImageCell(item)?.imageUrl} alt="" className="w-6 h-6 object-contain" />
                                {getCellDisplayText(item) && <span>{getCellDisplayText(item)}</span>}
                              </>
                            ) : formatCalledItemLabel(item, bingoVariant)}
                          </button>
                        ))}
                        {uncalledItems.length === 0 && (
                          <p className="text-sm text-slate-400">All items have been called!</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {gameState?.status === "finished" && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏆</div>
                  {winners.length > 1 ? (
                    <>
                      <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                        Winners!
                      </h2>
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {winners.map((w, i) => (
                          <span key={i} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl font-bold text-sm">
                            {w.playerId === hostPlayer?.playerId ? "You" : w.playerName}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                      {isHostWinner ? "You Win!" : `${gameState.winnerName || "Game"} Wins!`}
                    </h2>
                  )}
                  <p className="text-slate-500 mb-6">
                    After {gameState.calledItems.length} calls
                  </p>
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              )}
            </div>

            {/* Host Bingo Claim Button */}
            {canHostClaimBingo && (
              <button
                onClick={claimHostBingo}
                disabled={claimingBingo}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:shadow-xl transition-all animate-pulse disabled:opacity-50"
              >
                {claimingBingo ? "Checking..." : "BINGO! Tap to claim!"}
              </button>
            )}

            {/* Host's Bingo Card (Play Along) */}
            {hostPlayer && gameState?.status !== "waiting" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700">Your Card</h3>
                  <p className="text-xs text-slate-400">
                    {hostMarked.size}/{totalCells} marked
                  </p>
                </div>
                <div
                  className="grid gap-1.5 max-w-md mx-auto"
                  style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                  {hostPlayer.cells.map((cell, index) => {
                    const isFreeSpace = freeSpace && index === freeIdx;
                    const isBlank90 = isBlankClassicCell(cell, bingoVariant);
                    const isMarked = hostMarked.has(index);
                    const isCalled = calledSet.has(cell);
                    const canMark = gameState?.status === "active" && (isCalled || isMarked) && !isFreeSpace && !isBlank90;

                    return (
                      <button
                        key={index}
                        onClick={() => toggleHostCell(index)}
                        disabled={!canMark && !isFreeSpace}
                        className={`
                          aspect-square flex items-center justify-center text-center rounded-lg font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden p-1
                          ${isFreeSpace
                            ? "bg-emerald-600 text-white shadow-md cursor-default"
                            : isMarked
                              ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                              : isCalled
                                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300 animate-pulse"
                                : "bg-slate-50 text-slate-500 border border-slate-200 opacity-60"
                          }
                        `}
                        style={{
                          fontSize: size === 3 ? "0.75rem" : size === 4 ? "0.65rem" : "0.6rem",
                          fontFamily: cardStyle.fontFamily || "inherit",
                        }}
                      >
                        {isBlank90 ? (
                          <span className="sr-only">Blank</span>
                        ) : isFreeSpace ? (
                          <span className="font-black text-xs">FREE</span>
                        ) : isMarked ? (
                          <span className="flex flex-col items-center gap-0.5">
                            <span className="text-base leading-none">&#10003;</span>
                            {isImageCell(cell) ? (
                              <img src={parseImageCell(cell)?.imageUrl} alt="" className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                            ) : (
                              <span className="opacity-60 line-through leading-tight break-words text-center text-[0.5em]">{formatClassicCellLabel(cell, bingoVariant)}</span>
                            )}
                          </span>
                        ) : isImageCell(cell) ? (
                          <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-0.5">
                            <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                            {getCellDisplayText(cell) && <span className="text-[0.5em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                          </span>
                        ) : (
                          <span className="break-words leading-tight text-center line-clamp-3">{formatClassicCellLabel(cell, bingoVariant)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
	                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${(hostMarked.size / totalCells) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Called Items History */}
            {gameState && gameState.calledItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-slate-700">
                    Called Items ({gameState.calledItems.length})
                  </h3>
                  <button
                    onClick={exportCalledList}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Export called list
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {[...gameState.calledItems].reverse().map((item, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1 ${
                        i === 0
	                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isImageCell(item) ? (
                        <>
                          <img src={parseImageCell(item)?.imageUrl} alt="" className="w-6 h-6 object-contain" />
                          {getCellDisplayText(item) && <span>{getCellDisplayText(item)}</span>}
                        </>
                      ) : formatCalledItemLabel(item, bingoVariant)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Players Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sticky top-20">
              {winners.length > 0 && (
                <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-yellow-700">Winner verification</p>
                  <p className="mt-1 text-xs font-semibold text-yellow-800">Ask winners for this code before awarding a prize.</p>
                  <div className="mt-3 space-y-2">
                    {winners.map((winner) => (
                      <div key={winner.playerId} className="rounded-xl bg-white p-3 shadow-sm">
                        <div className="text-sm font-bold text-slate-800">{winner.playerName}</div>
                        <div className="mt-1 font-mono text-lg font-black tracking-[0.16em] text-yellow-700">
                          {winner.verificationCode || "LEGACY"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-bold text-slate-700 mb-3">
                Players ({gameState?.players.length || 0})
              </h3>

              {!gameState?.players.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-slate-400 text-sm">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {gameState.players.map((player) => (
                    <div
                      key={player.playerId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        player.hasBingo
                          ? "border-yellow-300 bg-yellow-50"
                          : player.playerId === hostPlayer?.playerId
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          player.hasBingo
                            ? "bg-yellow-400 text-yellow-900"
                            : player.playerId === hostPlayer?.playerId
                              ? "bg-emerald-200 text-emerald-700"
                              : "bg-emerald-100 text-emerald-600"
                        }`}>
                          {player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{player.playerName}</span>
                      </div>
                      <div className="text-right">
                        {player.hasBingo ? (
                          <span className="text-xs font-bold text-yellow-600">BINGO!</span>
                        ) : (
                          <span className="text-xs text-slate-400">{player.markedCount} marked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
