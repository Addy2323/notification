// Adds the final batch of interface strings to both locale dictionaries.
// Each entry: [key, English, Kiswahili, optionalSourceText]
// When sourceText is given, it is registered in source-keys.json so that
// static UI config rendered through label()/TLabel resolves to the key.
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '../frontend/locales');
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const en = read('en.json'), sw = read('sw.json'), keys = read('source-keys.json');

const entries = [
  // Language selector
  ['common.choose_language', 'Choose language', 'Chagua lugha'],
  ['common.current_language', 'Current language: {language}', 'Lugha ya sasa: {language}'],
  // Generic UI
  ['common.go_to_slide', 'Go to slide {number}', 'Nenda kwenye slaidi ya {number}'],
  ['common.time_just_now', 'Just now', 'Sasa hivi'],
  ['common.minutes_ago', '{count} min ago', 'Dakika {count} zilizopita'],
  ['common.hours_ago', '{count}h ago', 'Saa {count} zilizopita'],
  ['common.days_ago', '{count}d ago', 'Siku {count} zilizopita'],
  ['common.min_read', '{count} min read', 'Dakika {count} za kusoma'],
  ['common.lumo_logo', 'LUMO Logo', 'Nembo ya LUMO', 'LUMO Logo'],
  // Authentication
  ['auth.otp_sent_to_phone', 'A 6-digit verification SMS code has been sent to {phone}.', 'Msimbo wa uthibitisho wa tarakimu 6 umetumwa kwa SMS kwenda {phone}.'],
  ['auth.reset_otp_sent_to_phone', 'Registered phone number verified! 6-digit SMS OTP code dispatched to {phone}.', 'Namba ya simu iliyosajiliwa imethibitishwa! Msimbo wa OTP wa tarakimu 6 umetumwa kwa SMS kwenda {phone}.'],
  ['auth.otp_verified_set_password', 'OTP code verified! Please set your new account password.', 'Msimbo wa OTP umethibitishwa! Tafadhali weka nenosiri jipya la akaunti yako.'],
  ['auth.password_reset_success', 'Account credentials successfully updated! You may now sign in.', 'Taarifa za akaunti zimesasishwa kikamilifu! Sasa unaweza kuingia.'],
  ['auth.phone_placeholder_or_international', '0627204980 or 255...', '0627204980 au 255...'],
  // Public tracking / rating / driver portal
  ['public.rating_required', 'Please select a star rating between 1 and 5 stars.', 'Tafadhali chagua ukadiriaji wa nyota kati ya 1 na 5.'],
  ['public.driver_assigned_to_order', '{driver} has been assigned to your order.', '{driver} amepangiwa kuleta oda yako.'],
  ['public.share_order_message', '🚚 Your order #{order} from {merchant} is on the way!\n\nTrack your delivery here:\n{link}', '🚚 Oda yako #{order} kutoka {merchant} iko njiani!\n\nFuatilia mzigo wako hapa:\n{link}'],
  ['public.driver_action_accept', 'Delivery accepted!', 'Uwasilishaji umekubaliwa!'],
  ['public.driver_action_start', 'Status updated: On The Way! Customer notified.', 'Hali imesasishwa: Njiani! Mteja amejulishwa.'],
  ['public.driver_action_nearby', 'Status updated: Nearby! Customer notified.', 'Hali imesasishwa: Karibu kufika! Mteja amejulishwa.'],
  ['public.driver_action_delivered', 'Delivery completed! Customer notified.', 'Uwasilishaji umekamilika! Mteja amejulishwa.'],
  ['public.driver_action_failed', 'Delivery marked as failed.', 'Uwasilishaji umewekwa kuwa haukufanikiwa.'],
  // Landing marquee highlights
  ['public.marquee_automated', 'Automated', 'Kiotomatiki', 'Automated'],
  ['public.marquee_instant_web_access', 'Instant Web Access', 'Ufikiaji wa Papo Hapo Mtandaoni', 'Instant Web Access'],
  ['public.marquee_confirmed_fulfillment', 'Confirmed Fulfillment', 'Ukabidhi Uliothibitishwa', 'Confirmed Fulfillment'],
  ['public.marquee_tanzania_kenya', 'Tanzania & Kenya', 'Tanzania na Kenya', 'Tanzania & Kenya'],
  ['public.marquee_sms_whatsapp', 'SMS & WhatsApp', 'SMS na WhatsApp', 'SMS & WhatsApp'],
  ['public.marquee_live_driver_dispatch', 'Live Driver Dispatch', 'Utumaji wa Madereva Moja kwa Moja', 'Live Driver Dispatch'],
  // Pricing
  ['public.price_free', 'Free', 'Bure', 'Free'],
  ['public.period_forever', 'Forever', 'Milele', 'Forever'],
  ['public.period_per_delivery_sms', 'Per Delivery / SMS', 'Kwa Kila Uwasilishaji / SMS', 'Per Delivery / SMS'],
  // Features
  ['public.feature_app_free_portal_desc', 'Customers click a secure tracking link in their SMS/WhatsApp message to view live delivery status on any smartphone browser — no app installation or sign-up required.', 'Wateja hubonyeza kiungo salama cha kufuatilia kilicho kwenye ujumbe wao wa SMS/WhatsApp ili kuona hali ya mzigo moja kwa moja kwenye kivinjari cha simu yoyote janja — bila kusakinisha programu wala kujisajili.', 'Customers click a secure tracking link in their SMS/WhatsApp message to view live delivery status on any smartphone browser — no app installation or sign-up required.'],
  // Blog index
  ['public.blog_excerpt_tracking_guide', 'Discover how modern Tanzanian merchants eliminate customer delivery calls and build buyer trust using zero-install web tracking links and automated SMS alerts.', 'Gundua jinsi wafanyabiashara wa kisasa wa Tanzania wanavyoondoa simu za wateja wanaouliza kuhusu mizigo na kujenga imani ya wanunuzi kwa kutumia viungo vya kufuatilia mtandaoni visivyohitaji kusakinisha programu pamoja na arifa za SMS za kiotomatiki.', 'Discover how modern Tanzanian merchants eliminate customer delivery calls and build buyer trust using zero-install web tracking links and automated SMS alerts.'],
  ['public.blog_excerpt_sms_trust', 'Explore why SMS delivery notifications boast a 98% open rate in East Africa and how automated status alerts convert first-time buyers into loyal repeat customers.', 'Fahamu kwa nini arifa za SMS za uwasilishaji husomwa kwa kiwango cha asilimia 98 Afrika Mashariki, na jinsi arifa za hali za kiotomatiki zinavyowageuza wanunuzi wapya kuwa wateja waaminifu wanaorudi.', 'Explore why SMS delivery notifications boast a 98% open rate in East Africa and how automated status alerts convert first-time buyers into loyal repeat customers.'],
  ['public.blog_excerpt_whatsapp', 'Learn how sending rich WhatsApp notification cards with shop logos, driver contact options, and one-tap tracking buttons elevates customer satisfaction.', 'Jifunze jinsi kutuma arifa za WhatsApp zenye nembo ya duka, njia za kuwasiliana na dereva, na vitufe vya kufuatilia kwa mguso mmoja kunavyoongeza kuridhika kwa wateja.', 'Learn how sending rich WhatsApp notification cards with shop logos, driver contact options, and one-tap tracking buttons elevates customer satisfaction.'],
  ['public.blog_excerpt_no_app', 'App fatigue is real. Learn why web-based, zero-install tracking links outperform mobile applications for last-mile customer communication in Tanzania.', 'Uchovu wa kupakua programu ni halisi. Jifunze kwa nini viungo vya kufuatilia mtandaoni visivyohitaji kusakinisha chochote hufanya kazi vizuri kuliko programu za simu katika mawasiliano na wateja kwenye hatua ya mwisho ya uwasilishaji nchini Tanzania.', 'App fatigue is real. Learn why web-based, zero-install tracking links outperform mobile applications for last-mile customer communication in Tanzania.'],
  // Merchant order detail
  ['merchant.event_order_created', 'Order Created', 'Oda Imeundwa', 'Order Created'],
  ['merchant.event_order_delivered', 'Order Delivered', 'Oda Imewasilishwa', 'Order Delivered'],
  ['merchant.mark_arrived_driver_nearby', 'Mark Arrived / Driver Nearby', 'Weka Amefika / Dereva Yuko Karibu', 'Mark Arrived / Driver Nearby'],
];

// Blog categories/authors: register source mappings only if no key exists yet.
const optionalLabels = [
  ['public.blog_category_customer_experience', 'Customer Experience', 'Uzoefu wa Mteja'],
  ['public.blog_category_whatsapp_automation', 'WhatsApp Automation', 'Uendeshaji wa WhatsApp kwa Kiotomatiki'],
  ['public.blog_category_mobile_ux', 'Mobile UX', 'Uzoefu wa Mtumiaji kwenye Simu'],
  ['public.blog_category_delivery_strategy', 'Delivery Strategy', 'Mkakati wa Uwasilishaji'],
  ['public.blog_author_logistics_team', 'LUMO Logistics Team', 'Timu ya Usafirishaji ya LUMO'],
  ['public.blog_author_product_team', 'LUMO Product Team', 'Timu ya Bidhaa ya LUMO'],
  ['public.blog_author_marketing_team', 'LUMO Marketing Team', 'Timu ya Masoko ya LUMO'],
  ['public.blog_author_tech_team', 'LUMO Tech Team', 'Timu ya Teknolojia ya LUMO'],
];

const get = (obj, key) => key.split('.').reduce((o, p) => o?.[p], obj);
const set = (obj, key, value) => { const parts = key.split('.'); const last = parts.pop(); let o = obj; for (const p of parts) o = o[p] ??= {}; o[last] = value; };
let added = 0, mapped = 0;
const add = (key, e, s, source) => {
  const existing = get(en, key);
  if (existing !== undefined && existing !== e) throw new Error(`Key collision: ${key}`);
  if (existing === undefined) { set(en, key, e); set(sw, key, s); added++; }
  if (source && !keys[source]) { keys[source] = key; mapped++; }
};
for (const [k, e, s, src] of entries) add(k, e, s, src);
for (const [k, e, s] of optionalLabels) { if (!keys[e]) add(k, e, s, e); }

const write = (f, data) => fs.writeFileSync(path.join(dir, f), JSON.stringify(data, null, 2) + '\n');
write('en.json', en); write('sw.json', sw); write('source-keys.json', keys);
console.log(JSON.stringify({ added, mapped }));
