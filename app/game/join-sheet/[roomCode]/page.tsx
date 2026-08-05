import { notFound } from "next/navigation";
import { getGameRoom } from "@/lib/db/games";

export default async function JoinSheetPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  const room = await getGameRoom(roomCode.toUpperCase());

  if (!room) {
    notFound();
  }

  const gameTitle = room.title || "Bingo Game";
  const joinUrl = `https://mybingocard.com/game/join?code=${encodeURIComponent(room.roomCode)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(joinUrl)}`;

  return (
    <main className="min-h-screen bg-[#2ec4b6]/10 px-4 py-8 text-[#33312e] print:bg-white print:px-0 print:py-0">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-[#2ec4b6] bg-white p-8 text-center shadow-2xl print:min-h-screen print:max-w-none print:border-[#a39a88] print:shadow-none sm:p-12">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2ec4b6]">
          Scan to join the bingo game
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-[#33312e] sm:text-5xl">
          {gameTitle}
        </h1>
        <p className="mt-3 text-lg font-semibold text-[#33312e]">
          Each player gets a unique card. No app needed.
        </p>

        <img
          src={qrCodeUrl}
          alt={`QR code for ${gameTitle}`}
          className="mt-8 h-80 w-80 rounded-2xl border border-[#2ec4b6]/15 bg-white p-4"
        />

        <div className="mt-8 font-mono text-5xl font-black tracking-[0.24em] text-[#2ec4b6] sm:text-6xl">
          {room.roomCode}
        </div>
        <div className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-[#2ec4b6]">
          Room Code
        </div>
        <div className="mt-6 max-w-full break-all text-sm font-semibold text-[#6b6459]">
          {joinUrl}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          <button
            id="print-join-sheet"
            type="button"
            className="rounded-xl bg-[#2ec4b6] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2ec4b6]"
          >
            Print
          </button>
          <a
            href={`/game/host/${room.roomCode}`}
            className="rounded-xl bg-[#fff7ed] px-5 py-3 text-sm font-black text-[#33312e] transition hover:bg-[#a39a88]"
          >
            Back to host
          </a>
        </div>
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.addEventListener("load",function(){document.getElementById("print-join-sheet")?.addEventListener("click",function(){window.print()});setTimeout(function(){try{window.print()}catch(error){}},350)});',
        }}
      />
    </main>
  );
}
