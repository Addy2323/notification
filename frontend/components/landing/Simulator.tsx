'use client';

import React, { useState, useEffect, useRef } from 'react';

export function Simulator() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [driverActionText, setDriverActionText] = useState<string>('Tap: “Start Ride to Sinza”');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stepDuration = (step: number) => {
    return step === 1 ? 4200 : step === 2 ? 3800 : 4500;
  };

  const jumpToStep = (step: number) => {
    setCurrentStep(step);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    const duration = stepDuration(currentStep) / speedMultiplier;
    timerRef.current = setTimeout(() => {
      setCurrentStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isPlaying, speedMultiplier]);

  const toggleDriverAction = () => {
    if (driverActionText.includes('Start')) {
      setDriverActionText('Tap: “I Have Arrived at Sinza”');
    } else {
      setDriverActionText('Tap: “Handover Complete (TZS 65k)”');
      jumpToStep(3);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-24" id="simulation">
      <div className="relative bg-surface-container rounded-3xl p-6 lg:p-10 shadow-xl overflow-hidden border border-outline-variant/30">
        {/* Header bar with badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-8 gap-4 border-b border-surface-variant/70">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-bold">Live System Sync</span>
              <span className="px-2.5 py-1 rounded-md bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold">Zero App Installs</span>
              <span className="px-2.5 py-1 rounded-md bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold">Instant GSM Delivery Link</span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider hidden sm:inline-block">Real-Time SMS Synchronization</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-extrabold tracking-tight">
              Experience the Live 3-Phone Dispatch Simulation
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">
              Witness how a single dispatch click triggers real-time zero-friction updates across merchant, rider, and recipient.
            </p>
          </div>

          {/* Interactive Controls (Play, Pause, Speed, Restart) */}
          <div className="flex items-center gap-3 shrink-0 bg-surface-container-lowest px-4 py-2.5 rounded-2xl shadow-sm border border-surface-variant">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-label-md font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-base">{isPlaying ? 'pause' : 'play_arrow'}</span>
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 1.8 : 1)}
              className={`px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant text-label-sm font-code-tracking transition-all font-bold ${
                speedMultiplier > 1 ? 'text-primary' : ''
              }`}
            >
              Speed: {speedMultiplier === 1 ? '1x' : '1.8x'}
            </button>
            <button
              onClick={() => jumpToStep(1)}
              className="p-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant transition-all"
              title="Replay from Step 1"
            >
              <span className="material-symbols-outlined text-lg">replay</span>
            </button>
            <div className="h-4 w-px bg-surface-variant"></div>
            <div className="flex items-center gap-1.5 text-tertiary text-xs font-bold font-code-tracking">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
              LIVE
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="py-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            {/* Step 1 Button */}
            <button
              onClick={() => jumpToStep(1)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-left group ${
                currentStep === 1
                  ? 'border-primary bg-primary/10 text-on-surface shadow-sm'
                  : 'border-transparent bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 1 ? 'bg-primary text-on-primary' : 'bg-surface-dim text-on-surface-variant'
              }`}>
                1
              </div>
              <div className="truncate">
                <p className={`font-label-md text-xs font-bold truncate ${currentStep === 1 ? 'text-primary' : 'text-on-surface'}`}>
                  1. Merchant Dispatches
                </p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block">Assign courier &amp; push order</p>
              </div>
            </button>

            {/* Step 2 Button */}
            <button
              onClick={() => jumpToStep(2)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-left group ${
                currentStep === 2
                  ? 'border-secondary bg-secondary/10 text-on-surface shadow-sm'
                  : 'border-transparent bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 2 ? 'bg-secondary text-on-secondary' : 'bg-surface-dim text-on-surface-variant'
              }`}>
                2
              </div>
              <div className="truncate">
                <p className="font-label-md text-xs font-bold text-on-surface truncate">2. Driver Receives SMS</p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block">No-install web link activated</p>
              </div>
            </button>

            {/* Step 3 Button */}
            <button
              onClick={() => jumpToStep(3)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-left group ${
                currentStep === 3
                  ? 'border-tertiary bg-tertiary/10 text-on-surface shadow-sm'
                  : 'border-transparent bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 3 ? 'bg-tertiary text-on-tertiary' : 'bg-surface-dim text-on-surface-variant'
              }`}>
                3
              </div>
              <div className="truncate">
                <p className="font-label-md text-xs font-bold text-on-surface truncate">3. Customer Instant Alert</p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block">Live GPS tracking + WhatsApp card</p>
              </div>
            </button>
          </div>
        </div>

        {/* THREE PHONES CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start pt-2">
          {/* PHONE 1: Merchant Web Dispatch */}
          <div className={`transition-all duration-500 rounded-[2.5rem] p-2 sm:p-2.5 bg-zinc-900 shadow-2xl ${
            currentStep === 1
              ? 'ring-4 ring-primary ring-offset-4 ring-offset-surface-container opacity-100'
              : 'ring-2 ring-transparent opacity-85'
          }`}>
            <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden flex flex-col h-[580px] border border-zinc-700 shadow-inner relative">
              {/* Device Status Bar */}
              <div className="bg-zinc-900 text-white px-5 pt-2.5 pb-2 flex items-center justify-between text-xs select-none">
                <span className="font-code-tracking text-[11px] font-bold">09:41</span>
                <div className="w-20 h-4 bg-zinc-800 rounded-full flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-900/60"></span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-code-tracking text-[10px] text-zinc-300">Vodacom TZ</span>
                  <span className="material-symbols-outlined text-[13px]">wifi</span>
                  <span className="material-symbols-outlined text-[13px]">battery_full</span>
                </div>
              </div>

              {/* Merchant App Header */}
              <div className="bg-surface-container-low px-4 py-2.5 border-b border-surface-variant flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                    ZC
                  </div>
                  <div>
                    <p className="font-label-md text-xs font-bold leading-tight">Zanzibar Crafts</p>
                    <p className="text-[10px] text-on-surface-variant">Merchant Console</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-code-tracking text-[10px] font-bold">#LM-84912</span>
              </div>

              {/* Order Details */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left">
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-variant space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium">Customer:</span>
                    <span className="font-bold text-on-surface">Neema Mwamba</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium">Recipient Phone:</span>
                    <span className="font-code-tracking text-xs font-bold text-primary">+255 712 901 844</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium">Amount Due:</span>
                    <span className="font-code-tracking text-xs font-bold text-tertiary">TZS 65,000 (COD)</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-surface-container">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5">location_on</span>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px] text-on-surface">Pickup: Zanzibar Crafts Flagship</p>
                      <p className="text-[10px] text-on-surface-variant">Makumbusho Village Walk, Shop #14</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-surface-container">
                    <span className="material-symbols-outlined text-sm text-primary mt-0.5">near_me</span>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px] text-on-surface">Dropoff: Sinza Kijiweni</p>
                      <p className="text-[10px] text-on-surface-variant">Near TotalEnergies, blue iron gate behind grocery</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
                    Assign Courier / Boda Rider
                  </label>
                  <div className="p-2.5 rounded-xl border border-primary/50 bg-primary-fixed/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                        JH
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface">Juma Hassan</p>
                        <p className="font-code-tracking text-[11px] text-primary font-bold">
                          +255 754 892 104
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-tertiary text-sm">verified</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">Motorbike: Bajaj Boxer #MC-449</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => jumpToStep(2)}
                    className={`w-full py-3 px-3 rounded-xl text-on-tertiary font-label-md text-xs font-bold shadow-lg shadow-tertiary/30 hover:bg-tertiary-container transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      currentStep === 1 ? 'bg-tertiary animate-pulse' : 'bg-tertiary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">send_to_mobile</span>
                    <span>DISPATCH TO JUMA (SMS SENT)</span>
                  </button>
                  <p className="text-center text-[10px] text-tertiary font-bold mt-1.5 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-xs">done_all</span>
                    <span>Encrypted Dispatch Link Generated</span>
                  </p>
                </div>
              </div>

              <div className="bg-surface-container py-2 text-center border-t border-surface-variant">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Phone 1: Merchant Web Console</span>
              </div>
            </div>
          </div>

          {/* PHONE 2: Driver Mobile / SMS App */}
          <div className={`transition-all duration-500 rounded-[2.5rem] p-2 sm:p-2.5 bg-zinc-900 shadow-2xl ${
            currentStep === 2
              ? 'ring-4 ring-secondary ring-offset-4 ring-offset-surface-container opacity-100'
              : 'ring-2 ring-transparent opacity-85'
          }`}>
            <div className="bg-zinc-950 text-white rounded-[2rem] overflow-hidden flex flex-col h-[580px] border border-zinc-700 shadow-inner relative">
              {/* Status Bar */}
              <div className="bg-zinc-900 text-zinc-300 px-5 pt-2.5 pb-2 flex items-center justify-between text-xs select-none">
                <span className="font-code-tracking text-[11px] font-bold">09:41</span>
                <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-code-tracking text-[10px] text-zinc-400">Airtel TZ 4G</span>
                  <span className="material-symbols-outlined text-[13px]">signal_cellular_4_bar</span>
                  <span className="material-symbols-outlined text-[13px]">battery_std</span>
                </div>
              </div>

              {/* Native SMS Header */}
              <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-zinc-400 text-sm">arrow_back_ios</span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary-fixed">
                    <span className="material-symbols-outlined text-base">moped</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-xs text-white">LUMO-DISPATCH</p>
                      <span className="material-symbols-outlined text-tertiary-fixed text-[13px]">verified</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Official SMS Gateway</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-zinc-400 text-sm">info</span>
              </div>

              {/* SMS Message Thread */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left text-xs bg-zinc-950 font-body-sm">
                <div className="text-center my-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-[10px] text-zinc-400 font-code-tracking">Today 09:41 AM</span>
                </div>

                <div className="bg-zinc-800 text-zinc-100 p-3 rounded-2xl rounded-tl-sm space-y-2 border border-zinc-700/70 shadow-sm transition-all">
                  <p className="font-bold text-primary-fixed text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    <span>Agizo Jipya / New Dispatch: #LM-84912</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    Habari <strong>Juma Hassan</strong>, Zanzibar Crafts imekupangia oda ya kupeleka <strong className="text-white">Sinza Kijiweni</strong>. COD: <strong className="text-tertiary-fixed">TZS 65,000</strong>.
                  </p>

                  <a
                    className="block p-2.5 rounded-xl bg-zinc-900 border border-primary/40 hover:border-primary transition-colors text-left space-y-1"
                    href="#simulation"
                    onClick={(e) => { e.preventDefault(); jumpToStep(3); }}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-primary-fixed font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">open_in_browser</span> BONYEZA HAPA KUANZA
                      </span>
                      <span className="text-zinc-500 font-code-tracking">0.8 MB</span>
                    </div>
                    <p className="font-code-tracking text-xs font-bold text-white underline decoration-primary decoration-1">
                      https://lumo.to/d/tz-91a
                    </p>
                    <p className="text-[10px] text-zinc-400">Hakuna kupakua App. Fungua kwa Chrome/Browser papo hapo.</p>
                  </a>
                </div>

                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] text-zinc-500 uppercase font-code-tracking">Driver 1-Tap Actions:</p>
                  <button
                    onClick={toggleDriverAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary-container transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">near_me</span>
                    <span>{driverActionText}</span>
                  </button>
                </div>

                <div className={`justify-end ${currentStep >= 2 ? 'flex' : 'hidden'}`}>
                  <div className="bg-tertiary text-white px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] max-w-[80%] font-medium">
                    Nimepokea, naondoka sasa hivi kuelekea Sinza 🛵💨
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
                <input className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-full flex-1 border-none focus:ring-0 placeholder:text-zinc-500" disabled placeholder="Driver reply via SMS or Web..." />
                <button className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">mic</span>
                </button>
              </div>

              <div className="bg-zinc-900 py-2 text-center border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Phone 2: Driver Mobile (SMS / Web)</span>
              </div>
            </div>
          </div>

          {/* PHONE 3: Customer Phone / SMS Alert */}
          <div className={`transition-all duration-500 rounded-[2.5rem] p-2 sm:p-2.5 bg-zinc-900 shadow-2xl ${
            currentStep === 3
              ? 'ring-4 ring-tertiary ring-offset-4 ring-offset-surface-container opacity-100'
              : 'ring-2 ring-transparent opacity-85'
          }`}>
            <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden flex flex-col h-[580px] border border-zinc-700 shadow-inner relative text-on-surface">
              {/* Device Status Bar */}
              <div className="bg-zinc-900 text-zinc-200 px-5 pt-2.5 pb-2 flex items-center justify-between text-xs select-none">
                <span className="font-code-tracking text-[11px] font-bold">09:41</span>
                <div className="w-20 h-4 bg-zinc-800 rounded-full flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-code-tracking text-[10px] text-zinc-300">Vodacom 5G</span>
                  <span className="material-symbols-outlined text-[13px]">network_cell</span>
                  <span className="material-symbols-outlined text-[13px]">battery_charging_full</span>
                </div>
              </div>

              {/* SMS Header */}
              <div className="bg-surface-container-low px-4 py-2.5 border-b border-surface-variant flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-xs">
                    <span className="material-symbols-outlined text-base">storefront</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-xs text-on-surface">Zanzibar Crafts</p>
                      <span className="material-symbols-outlined text-tertiary text-xs">verified</span>
                    </div>
                    <p className="text-[10px] text-tertiary font-bold">Verified Sender ID</p>
                  </div>
                </div>
                <a className="p-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface" href="tel:+255754892104" title="Call Driver">
                  <span className="material-symbols-outlined text-sm text-tertiary">call</span>
                </a>
              </div>

              {/* Customer Message Body */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left text-xs bg-surface-container-low">
                <div className="text-center my-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] text-on-surface-variant font-code-tracking">Today 09:41 AM</span>
                </div>

                <div className="p-3 rounded-2xl rounded-tl-sm bg-surface-container-lowest border border-outline-variant/40 space-y-2.5 shadow-sm">
                  <p className="font-bold text-xs text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">mark_email_read</span>
                    <span>Oda Yako Iko Njiani! / Your Order is on the Way</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-on-surface">
                    Habari <strong>Neema</strong>, mzigo wako kutoka Zanzibar Crafts umekabidhiwa kwa dereva wetu:
                  </p>

                  <div className="p-2.5 rounded-xl bg-surface-container space-y-1.5 border border-surface-variant">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                          JH
                        </div>
                        <div>
                          <p className="font-bold text-xs text-on-surface">Juma Hassan</p>
                          <p className="text-[10px] text-on-surface-variant">Bajaj Boxer • MC-449</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded-md shadow-sm">
                        <span className="material-symbols-outlined text-primary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="font-bold text-xs text-on-surface">4.9</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <a className="flex-1 py-1.5 px-2 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-variant flex items-center justify-center gap-1 text-[11px] font-semibold" href="tel:+255754892104">
                        <span className="material-symbols-outlined text-xs text-tertiary">call</span>
                        <span>Piga Simu</span>
                      </a>
                      <a className="flex-1 py-1.5 px-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container flex items-center justify-center gap-1 text-[11px] font-semibold" href="#simulation">
                        <span className="material-symbols-outlined text-xs">map</span>
                        <span>Live Map</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-container text-[11px]">
                    <p className="text-on-surface-variant text-[10px]">Fuata safari kwa ramani (Live ETA ~12 mins):</p>
                    <p className="font-code-tracking text-xs font-bold text-primary underline">
                      lumo.to/t/neema-92a
                    </p>
                  </div>
                </div>

                <div className={`flex justify-end pt-1 ${currentStep === 3 ? 'opacity-100 animate-pulse' : 'opacity-40'}`}>
                  <div className="bg-primary text-on-primary px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] max-w-[85%] font-medium shadow-sm">
                    Asante sana! Nipo geti la bluu Sinza Kijiweni 🏡
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-surface-container border-t border-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-sm">chat</span>
                <input className="bg-surface-container-lowest text-on-surface text-xs px-3 py-1.5 rounded-full flex-1 border border-outline-variant focus:ring-0 placeholder:text-on-surface-variant" disabled placeholder="Reply to Zanzibar Crafts..." />
                <button className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span>
                </button>
              </div>

              <div className="bg-surface-container py-2 text-center border-t border-surface-variant">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Phone 3: Customer Instant Alert</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 rounded-2xl bg-surface-container-lowest border border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </span>
            <div>
              <p className="font-headline-sm text-sm font-bold text-on-surface">The GSM-First African Reality</p>
              <p className="text-xs text-on-surface-variant">No Play Store logins. No 80MB apps. Works on basic smartphones, 3G/4G, and handles COD reconciliation right out of the box.</p>
            </div>
          </div>
          <a className="shrink-0 px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-variant font-label-md text-xs font-bold transition-colors" href="#how-it-works">
            Learn Technical Architecture →
          </a>
        </div>
      </div>
    </section>
  );
}
