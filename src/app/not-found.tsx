import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#060d1a] text-white">
      <h2 className="text-3xl font-bold mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-zinc-400 mb-6">Halaman yang Anda tuju tidak tersedia di sistem NEXT Arena.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

