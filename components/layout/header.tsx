"use client";

import Link from "next/link";
import { Plus, Search, UserCheck } from "lucide-react";

export function Header({ ownerEmail }: { ownerEmail?: string }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices, clients, quotes..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Actions */}
        <Link
          href="/quotations/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Quote
        </Link>

        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Invoice
        </Link>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        {/* Owner Profile Badge */}
        <div className="flex items-center gap-2 pl-1">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
            QL
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1">
              Owner <UserCheck className="h-3 w-3 text-emerald-600 inline" />
            </span>
            <span className="block text-[11px] text-slate-400 leading-tight">
              {ownerEmail || "owner@qorvalabs.com"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
