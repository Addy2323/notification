'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ProfileDropdown() {
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((data) => {
        setUser(data.user);
        setMerchant(data.merchant);
      })
      .catch(console.error);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const res = await fetch(`${API_BASE}/auth/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success && data.data.avatar_url) {
        setUser((prev: any) => ({ ...prev, avatar_url: data.data.avatar_url }));
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-0.5 rounded-full hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-600 relative group">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-5 border-b border-slate-100 flex items-center gap-4 relative">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center relative">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
                <div 
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                  <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                {user.name} 
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{user.email || 'No email provided'}</p>
              <div className="mt-1.5 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-md inline-block uppercase">
                {user.role}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50/50 space-y-3">
             <div className="space-y-1">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Details</span>
               <div className="text-sm font-semibold text-slate-800">{merchant?.business_name || 'Personal Workspace'}</div>
               <div className="text-xs text-slate-500">{user.phone}</div>
             </div>
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-white">
            <button 
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              onClick={() => {
                fetchApi('/auth/logout', { method: 'POST' }).finally(() => {
                  window.location.href = '/';
                });
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
