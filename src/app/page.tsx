import Downloader from "@/components/Downloader";

export default function Home() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-[250px] w-[250px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <Downloader />

    </main>
  );
}
