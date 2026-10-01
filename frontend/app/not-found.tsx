import Link from 'next/link';
import { PackageX, ArrowLeft, Search, Home, HelpCircle, PhoneCall } from 'lucide-react';
import { constructMetadata } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Page Not Found | LUMO Track',
  description: 'The requested page or delivery tracking link could not be found on LUMO Track.',
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <PackageX className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase font-mono bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Error 404
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Page Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The delivery tracking page, feature route, or resource you requested could not be found or may have expired.
          </p>
        </div>

        {/* Quick Navigation Links */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-left text-xs font-medium">
          <Link
            href="/"
            className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-slate-300 hover:text-white transition-all group"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Homepage</span>
          </Link>

          <Link
            href="/delivery-tracking"
            className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-slate-300 hover:text-white transition-all group"
          >
            <Search className="w-4 h-4 text-amber-400" />
            <span>Tracking Info</span>
          </Link>

          <Link
            href="/how-it-works"
            className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-slate-300 hover:text-white transition-all group"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How It Works</span>
          </Link>

          <Link
            href="/contact"
            className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-slate-300 hover:text-white transition-all group"
          >
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>Support</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to LUMO Track Home
          </Link>
          <span className="text-[10px] text-slate-600 font-mono">LUMO v2.5</span>
        </div>
      </div>
    </div>
  );
}
