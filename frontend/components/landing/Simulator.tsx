'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';

export function Simulator() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [driverActionIndex, setDriverActionIndex] = useState<number>(0);

  const driverActions = [
    { label: t("public.driver_action_start"), step: 2 },
    { label: t("public.driver_action_nearby"), step: 2 },
    { label: t("public.driver_action_delivered"), step: 3 },
  ];

  const toggleDriverAction = () => {
    const next = (driverActionIndex + 1) % driverActions.length;
    setDriverActionIndex(next);
    jumpToStep(driverActions[next].step);
  };

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

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-24" id="simulation">
      <div className="relative bg-surface-container rounded-3xl p-6 lg:p-10 shadow-xl overflow-hidden border border-outline-variant/30">
        {/* Header bar with badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-8 gap-4 border-b border-surface-variant/70">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-bold"><T k="public.live_system_sync" /></span>
              <span className="px-2.5 py-1 rounded-md bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold"><T k="public.zero_app_installs" /></span>
              <span className="px-2.5 py-1 rounded-md bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold"><T k="public.instant_gsm_delivery_link" /></span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider hidden sm:inline-block"><T k="public.real_time_sms_synchronization" /></span>
            </div>
            <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-extrabold tracking-tight">{' '}<T k="public.experience_the_live_3_phone_dispatch_simulation" />{' '}</h2>
            <p className="font-body-md text-on-surface-variant mt-1">{' '}<T k="public.witness_how_a_single_dispatch_click_triggers_real_time_zero_friction_updates_across_m" />{' '}</p>
          </div>

          {/* Interactive Controls (Play, Pause, Speed, Restart) */}
          <div className="flex items-center gap-3 shrink-0 bg-surface-container-lowest px-4 py-2.5 rounded-2xl shadow-sm border border-surface-variant">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-label-md font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-base">{isPlaying ? 'pause' : 'play_arrow'}</span>
              <span>{isPlaying ? t("public.pause") : t("public.play")}</span>
            </button>
            <button
              onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 1.8 : 1)}
              className={`px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant text-label-sm font-code-tracking transition-all font-bold ${
                speedMultiplier > 1 ? 'text-primary' : ''
              }`}
            >{' '}<T k="public.speed" />{' '}{speedMultiplier === 1 ? '1x' : '1.8x'}
            </button>
            <button
              onClick={() => jumpToStep(1)}
              className="p-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant transition-all"
              title={t("public.replay_from_step_1")}
            >
              <span className="material-symbols-outlined text-lg">replay</span>
            </button>
            <div className="h-4 w-px bg-surface-variant"></div>
            <div className="flex items-center gap-1.5 text-tertiary text-xs font-bold font-code-tracking">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-ping"></span>{' '}<T k="public.live" />{' '}</div>
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
                <p className={`font-label-md text-xs font-bold truncate ${currentStep === 1 ? 'text-primary' : 'text-on-surface'}`}>{' '}<T k="public.1_merchant_dispatches" />{' '}</p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block"><T k="public.assign_courier_amp_push_order" /></p>
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
                <p className="font-label-md text-xs font-bold text-on-surface truncate"><T k="public.2_driver_receives_sms" /></p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block"><T k="public.no_install_web_link_activated" /></p>
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
                <p className="font-label-md text-xs font-bold text-on-surface truncate"><T k="public.3_customer_instant_alert" /></p>
                <p className="text-[11px] text-on-surface-variant truncate hidden sm:block"><T k="public.live_gps_tracking_whatsapp_card" /></p>
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
                    <p className="text-[10px] text-on-surface-variant"><T k="public.merchant_console" /></p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-code-tracking text-[10px] font-bold">#LM-84912</span>
              </div>

              {/* Order Details */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left">
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-variant space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium"><T k="public.customer" /></span>
                    <span className="font-bold text-on-surface">Neema Mwamba</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium"><T k="public.recipient_phone" /></span>
                    <span className="font-code-tracking text-xs font-bold text-primary">+255 712 901 844</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium"><T k="public.amount_due" /></span>
                    <span className="font-code-tracking text-xs font-bold text-tertiary">TZS 65,000 (COD)</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-surface-container">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5">location_on</span>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px] text-on-surface"><T k="public.pickup_zanzibar_crafts_flagship" /></p>
                      <p className="text-[10px] text-on-surface-variant">Makumbusho Village Walk, Shop #14</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-surface-container">
                    <span className="material-symbols-outlined text-sm text-primary mt-0.5">near_me</span>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px] text-on-surface"><T k="public.dropoff_sinza_kijiweni" /></p>
                      <p className="text-[10px] text-on-surface-variant"><T k="public.near_totalenergies_blue_iron_gate_behind_grocery" /></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">{' '}<T k="public.assign_courier_boda_rider" />{' '}</label>
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
                    <span className="material-symbols-outlined text-tertiary text-sm"><T k="public.verified" /></span>
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
                    <span><T k="public.dispatch_to_juma_sms_sent" /></span>
                  </button>
                  <p className="text-center text-[10px] text-tertiary font-bold mt-1.5 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-xs">done_all</span>
                    <span><T k="public.encrypted_dispatch_link_generated" /></span>
                  </p>
                </div>
              </div>

              <div className="bg-surface-container py-2 text-center border-t border-surface-variant">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider"><T k="public.phone_1_merchant_web_console" /></span>
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
                      <span className="material-symbols-outlined text-tertiary-fixed text-[13px]"><T k="public.verified" /></span>
                    </div>
                    <p className="text-[10px] text-zinc-400"><T k="public.official_sms_gateway" /></p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-zinc-400 text-sm">info</span>
              </div>

              {/* SMS Message Thread */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left text-xs bg-zinc-950 font-body-sm">
                <div className="text-center my-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-[10px] text-zinc-400 font-code-tracking"><T k="public.today_09_41_am" /></span>
                </div>

                <div className="bg-zinc-800 text-zinc-100 p-3 rounded-2xl rounded-tl-sm space-y-2 border border-zinc-700/70 shadow-sm transition-all">
                  <p className="font-bold text-primary-fixed text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    <span>Agizo Jipya / New Dispatch: #LM-84912</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-300">{' '}<T k="public.legacy_hello" />{' '}<strong>Juma Hassan</strong><T k="public.legacy_zanzibar_crafts_has_assigned_you_a_delivery" />{' '}<strong className="text-white">Sinza Kijiweni</strong><T k="public.cod" />{' '}<strong className="text-tertiary-fixed">TZS 65,000</strong>.
                  </p>

                  <a
                    className="block p-2.5 rounded-xl bg-zinc-900 border border-primary/40 hover:border-primary transition-colors text-left space-y-1"
                    href="#simulation"
                    onClick={(e) => { e.preventDefault(); jumpToStep(3); }}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-primary-fixed font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">open_in_browser</span>{' '}<T k="public.legacy_tap_here_to_start" />{' '}</span>
                      <span className="text-zinc-500 font-code-tracking">0.8 MB</span>
                    </div>
                    <p className="font-code-tracking text-xs font-bold text-white underline decoration-primary decoration-1">
                      https://lumo.to/d/tz-91a
                    </p>
                    <p className="text-[10px] text-zinc-400"><T k="public.legacy_no_app_download_open_instantly_in_chrome_or_your_browser" /></p>
                  </a>
                </div>

                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] text-zinc-500 uppercase font-code-tracking"><T k="public.driver_1_tap_actions" /></p>
                  <button
                    onClick={toggleDriverAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary-container transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">near_me</span>
                    <span>{driverActions[driverActionIndex].label}</span>
                  </button>
                </div>

                <div className={`justify-end ${currentStep >= 2 ? 'flex' : 'hidden'}`}>
                  <div className="bg-tertiary text-white px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] max-w-[80%] font-medium">{' '}<T k="public.legacy_received_i_am_leaving_now_for_sinza" />{' '}</div>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
                <input className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-full flex-1 border-none focus:ring-0 placeholder:text-zinc-500" disabled placeholder={t("public.driver_reply_via_sms_or_web")} />
                <button className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">mic</span>
                </button>
              </div>

              <div className="bg-zinc-900 py-2 text-center border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider"><T k="public.phone_2_driver_mobile_sms_web" /></span>
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
                      <span className="material-symbols-outlined text-tertiary text-xs"><T k="public.verified" /></span>
                    </div>
                    <p className="text-[10px] text-tertiary font-bold"><T k="public.verified_sender_id" /></p>
                  </div>
                </div>
                <a className="p-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface" href="tel:+255754892104" title={t("public.call_driver")}>
                  <span className="material-symbols-outlined text-sm text-tertiary">call</span>
                </a>
              </div>

              {/* Customer Message Body */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-left text-xs bg-surface-container-low">
                <div className="text-center my-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] text-on-surface-variant font-code-tracking"><T k="public.today_09_41_am" /></span>
                </div>

                <div className="p-3 rounded-2xl rounded-tl-sm bg-surface-container-lowest border border-outline-variant/40 space-y-2.5 shadow-sm">
                  <p className="font-bold text-xs text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">mark_email_read</span>
                    <span><T k="public.legacy_your_order_is_on_the_way" /></span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-on-surface">{' '}<T k="public.legacy_hello" />{' '}<strong>Neema</strong><T k="public.legacy_your_package_from_zanzibar_crafts_has_been_handed_to_our_driver" />{' '}</p>

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
                        <span><T k="public.legacy_call" /></span>
                      </a>
                      <a className="flex-1 py-1.5 px-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container flex items-center justify-center gap-1 text-[11px] font-semibold" href="#simulation">
                        <span className="material-symbols-outlined text-xs">map</span>
                        <span><T k="public.live_map" /></span>
                      </a>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-container text-[11px]">
                    <p className="text-on-surface-variant text-[10px]"><T k="public.legacy_follow_the_trip_on_the_map_live_eta_12_mins" /></p>
                    <p className="font-code-tracking text-xs font-bold text-primary underline">
                      lumo.to/t/neema-92a
                    </p>
                  </div>
                </div>

                <div className={`flex justify-end pt-1 ${currentStep === 3 ? 'opacity-100 animate-pulse' : 'opacity-40'}`}>
                  <div className="bg-primary text-on-primary px-3 py-1.5 rounded-2xl rounded-tr-sm text-[11px] max-w-[85%] font-medium shadow-sm">{' '}<T k="public.legacy_thank_you_i_am_at_the_blue_gate_in_sinza_kijiweni" />{' '}</div>
                </div>
              </div>

              <div className="p-2.5 bg-surface-container border-t border-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-sm">chat</span>
                <input className="bg-surface-container-lowest text-on-surface text-xs px-3 py-1.5 rounded-full flex-1 border border-outline-variant focus:ring-0 placeholder:text-on-surface-variant" disabled placeholder={t("public.reply_to_zanzibar_crafts")} />
                <button className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xs">arrow_upward</span>
                </button>
              </div>

              <div className="bg-surface-container py-2 text-center border-t border-surface-variant">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider"><T k="public.phone_3_customer_instant_alert" /></span>
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
              <p className="font-headline-sm text-sm font-bold text-on-surface"><T k="public.the_gsm_first_african_reality" /></p>
              <p className="text-xs text-on-surface-variant"><T k="public.no_play_store_logins_no_80mb_apps_works_on_basic_smartphones_3g_4g_and_handles_cod_re" /></p>
            </div>
          </div>
          <a className="shrink-0 px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-variant font-label-md text-xs font-bold transition-colors" href="#how-it-works">{' '}<T k="public.learn_technical_architecture" />{' '}</a>
        </div>
      </div>
    </section>
  );
}
