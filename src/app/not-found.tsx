import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#09090b] text-white">
      <h2 className="text-3xl font-bold mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-zinc-400 mb-6">Halaman yang Anda tuju tidak tersedia di sistem NEXT Arena.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

