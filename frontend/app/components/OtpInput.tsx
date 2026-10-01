'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  // Countdown
  showCountdown?: boolean;
  countdownSeconds?: number;
  onResend?: () => void;
  resendLabel?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  showCountdown = false,
  countdownSeconds = 60,
  onResend,
  resendLabel = 'Resend SMS Code',
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Countdown timer state
  const [timer, setTimer] = useState<number>(countdownSeconds);
  const [timerActive, setTimerActive] = useState<boolean>(showCountdown);

  // Start countdown on mount or when reset
  useEffect(() => {
    if (!showCountdown) return;
    setTimer(countdownSeconds);
    setTimerActive(true);
  }, [countdownSeconds, showCountdown]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  // Focus first empty box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (disabled) return;
      const digit = char.replace(/[^0-9]/g, '');
      if (!digit) return;

      // Build new value
      const arr = value.split('');
      arr[index] = digit;
      const newVal = arr.join('').slice(0, length);
      onChange(newVal);

      // Auto-advance to next box
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all boxes filled
      if (newVal.length === length && onComplete) {
        onComplete(newVal);
      }
    },
    [value, onChange, onComplete, length, disabled]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const arr = value.split('');
        if (arr[index]) {
          arr[index] = '';
          onChange(arr.join(''));
        } else if (index > 0) {
          arr[index - 1] = '';
          onChange(arr.join(''));
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange, length, disabled]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      if (disabled) return;
      const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
      if (pasteData) {
        onChange(pasteData);
        const nextFocus = Math.min(pasteData.length, length - 1);
        inputRefs.current[nextFocus]?.focus();
        if (pasteData.length === length && onComplete) {
          onComplete(pasteData);
        }
      }
    },
    [onChange, onComplete, length, disabled]
  );

  const handleResend = () => {
    if (timerActive || !onResend) return;
    onResend();
    setTimer(countdownSeconds);
    setTimerActive(true);
  };

  // Countdown display helpers
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = showCountdown ? (timer / countdownSeconds) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* 6 Animated Individual OTP Boxes */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {Array.from({ length }).map((_, index) => {
          const isFilled = !!value[index];
          const isFocused = focusedIndex === index;

          return (
            <div key={index} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                disabled={disabled}
                value={value[index] || ''}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={() => setFocusedIndex(index)}
                className={`
                  w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-xl sm:text-2xl font-mono font-black
                  outline-none transition-all duration-300 ease-out border-2
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                  ${
                    isFilled
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md shadow-emerald-500/15 scale-105'
                      : isFocused
                      ? 'bg-white border-slate-900 text-slate-900 shadow-lg ring-4 ring-slate-900/10 scale-105'
                      : 'bg-white/80 border-slate-200 text-slate-400 shadow-sm hover:border-slate-300'
                  }
                `}
              />

              {/* Bottom accent bar on filled boxes */}
              {isFilled && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-500 animate-in fade-in zoom-in duration-300" />
              )}

              {/* Pulse ring animation on focused empty box */}
              {isFocused && !isFilled && (
                <div className="absolute inset-0 rounded-xl border-2 border-slate-900/20 animate-pulse pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Countdown Timer & Resend Row */}
      {showCountdown && (
        <div className="flex items-center justify-between px-1">
          {/* Circular Countdown */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              {/* Background circle */}
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-200"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${progress * 0.9425} 94.25`}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-linear ${
                    timer > 15 ? 'text-emerald-500' : timer > 5 ? 'text-amber-500' : 'text-rose-500'
                  }`}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-black font-mono ${
                timer > 15 ? 'text-emerald-700' : timer > 5 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {timer}
              </span>
            </div>

            <div className="text-xs font-medium">
              {timerActive ? (
                <span className="text-slate-500">
                  Code expires in <strong className={`font-mono ${
                    timer > 15 ? 'text-emerald-700' : timer > 5 ? 'text-amber-600' : 'text-rose-600'
                  }`}>{timerDisplay}</strong>
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Code expired
                </span>
              )}
            </div>
          </div>

          {/* Resend Button */}
          {onResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={timerActive || disabled}
              className={`flex items-center gap-1 text-xs font-bold transition-all ${
                timerActive
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-emerald-700 hover:text-emerald-800 hover:underline active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${!timerActive ? 'animate-spin-slow' : ''}`} />
              {resendLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
