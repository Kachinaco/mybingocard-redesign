export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff7ed] to-[#7c5cff]/10">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#7c5cff] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#6b6459]">Loading your bingo card...</p>
      </div>
    </div>
  );
}
