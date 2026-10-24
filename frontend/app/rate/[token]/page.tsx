'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, CheckCircle, Package, Truck, Store, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { fetchApi } from '../../../lib/api';

interface RatingInfo {
  order_id: string;
  order_number: string;
  customer_name: string;
  merchant_name: string;
  merchant_logo?: string | null;
  driver_name?: string | null;
  product_name: string;
  status: string;
  delivered_at?: string;
  is_already_rated: boolean;
  existing_rating?: {
    rating: number;
    comment?: string | null;
    created_at: string;
  } | null;
}

const RATING_LABELS: Record<number, { title: string; subtitle: string; color: string; bg: string }> = {
  5: { title: '5 — Excellent', subtitle: 'Fast, professional, and perfect delivery!', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  4: { title: '4 — Good', subtitle: 'Good service with minor room for improvement.', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  3: { title: '3 — Average', subtitle: 'Satisfactory delivery, but could be better.', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  2: { title: '2 — Poor', subtitle: 'Unsatisfactory experience or significant delay.', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  1: { title: '1 — Very Poor', subtitle: 'Very bad delivery experience or unprofessional.', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
};

export default function CustomerRatingPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<RatingInfo | null>(null);

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function loadRatingInfo() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi(`/ratings/token/${token}`);
        setInfo(data);
        if (data.is_already_rated && data.existing_rating) {
          setSelectedRating(data.existing_rating.rating);
          setComment(data.existing_rating.comment || '');
          setSubmitted(true);
        }
      } catch (err: any) {
        setError(err.message || t("public.unable_to_load_delivery_details_for_rating"));
      } finally {
        setLoading(false);
      }
    }

    loadRatingInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRating < 1 || selectedRating > 5) {
      setSubmitError(t('public.rating_required'));
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      await fetchApi('/ratings/submit', {
        method: 'POST',
        body: JSON.stringify({
          rating_token: token,
          rating: selectedRating,
          comment: comment.trim(),
        }),
      });

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || t("public.failed_to_submit_rating_please_try_again"));
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || selectedRating;
  const ratingDetails = activeRating > 0 ? RATING_LABELS[activeRating] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto w-full my-auto py-6">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Store className="w-3.5 h-3.5" />{' '}<T k="public.lumo_tracking_service_quality" />{' '}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{' '}<T k="public.delivery_experience" />{' '}</h1>
          <p className="text-sm text-slate-400 mt-1">{' '}<T k="public.your_feedback_helps_us_continuously_improve_delivery_standards" />{' '}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-300"><T k="public.retrieving_order_details" /></p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl p-6 text-center backdrop-blur-xl shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-rose-200"><T k="public.unable_to_rate_order" /></h2>
            <p className="text-sm text-rose-300/80 mt-1">{error}</p>
          </div>
        )}

        {/* Main Content Card */}
        {!loading && !error && info && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
            {/* Merchant & Order Summary Header */}
            <div className="bg-slate-900/60 border-b border-slate-700/60 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  {info.merchant_logo ? (
                    <img
                      src={info.merchant_logo}
                      alt={info.merchant_name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg">
                      {info.merchant_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-base">{info.merchant_name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Package className="w-3 h-3 text-orange-400" />{' '}<T k="common.order" />{' '}{info.order_number}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{' '}<T k="common.delivered" />{' '}</span>
                </div>
              </div>

              {/* Package & Driver Info */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5"><T k="public.item" /></span>
                  <span className="font-medium text-slate-200 truncate block">{info.product_name}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-0.5"><T k="common.driver" /></span>
                  <span className="font-medium text-slate-200 flex items-center gap-1 truncate">
                    <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                    {info.driver_name || t("public.assigned_driver")}
                  </span>
                </div>
              </div>
            </div>

            {/* Submitted State View */}
            {submitted ? (
              <div className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white"><T k="public.thank_you_for_your_feedback" /></h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                    {info.is_already_rated
                      ? t("public.you_have_already_rated_this_delivery_experience")
                      : t("public.your_rating_has_been_recorded_and_shared_with_the_merchant_and_delivery_driver")}
                  </p>
                </div>

                {/* Display submitted rating summary */}
                <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 max-w-sm mx-auto text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400"><T k="public.your_rating" /></span>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= selectedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {ratingDetails && (
                    <div className="text-xs font-semibold text-orange-400">
                      {uiLabel(ratingDetails.title)}
                    </div>
                  )}
                  {comment && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="italic text-slate-300">"{comment}"</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 pt-2">{' '}<T k="public.powered_by" />{' '}<span className="text-orange-400 font-semibold">LUMO Tracking</span>
                </p>
              </div>
            ) : (
              /* Interactive Rating Form */
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-white">{' '}<T k="public.how_was_your_delivery_experience" />{' '}</h2>
                  <p className="text-xs text-slate-400 mt-1">{' '}<T k="public.select_a_star_rating_from_1_very_poor_to_5_excellent" />{' '}</p>
                </div>

                {/* Star Selector */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (hoverRating || selectedRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`p-2 rounded-xl transition-all duration-200 transform hover:scale-115 focus:outline-none ${
                          isActive
                            ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        aria-label={t("interactions.rate_value0_star", { value0: (star) ?? '' })}
                      >
                        <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${isActive ? 'fill-amber-400' : ''}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Selected Rating Badge / Description */}
                {ratingDetails ? (
                  <div className={`p-3.5 rounded-xl border text-center transition-all ${ratingDetails.bg}`}>
                    <div className={`text-sm font-bold ${ratingDetails.color}`}>
                      {uiLabel(ratingDetails.title)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {uiLabel(ratingDetails.subtitle)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-500 italic h-10 flex items-center justify-center">{' '}<T k="public.tap_a_star_above_to_set_your_rating" />{' '}</div>
                )}

                {/* Optional Comment Input */}
                <div className="space-y-1.5">
                  <label htmlFor="comment" className="block text-xs font-semibold text-slate-300">{' '}<T k="public.tell_us_more_about_your_experience" />{' '}<span className="text-slate-500 font-normal"><T k="public.optional" /></span>
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("public.e_g_delivery_was_fast_driver_was_friendly_and_careful_with_the_package")}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || selectedRating === 0}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />{' '}<T k="public.submitting_rating" />{' '}</>
                  ) : (
                    'Submit Rating'
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 py-4">
        &copy; {new Date().getFullYear()}{' '}<T k="public.lumo_tracking_all_rights_reserved" />{' '}</footer>
    </div>
  );
}
