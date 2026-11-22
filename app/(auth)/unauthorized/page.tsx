import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <h1 className="text-lg font-bold text-slate-900">
          403 - Unauthorized Access
        </h1>

        <p className="text-xs text-slate-500 leading-relaxed">
          Access to this business management system is exclusively restricted to the preconfigured owner of QORVA LABS LLP. Customers and unauthorized accounts are strictly barred from access.
        </p>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Owner Login
          </Link>
        </div>
      </div>
    </div>
  );
}
