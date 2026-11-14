'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Package,
  Palette,
  Eye,
  Share2,
  QrCode,
  Settings,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Search,
  Sparkles,
  MessageSquare,
  ShoppingBag,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Trash2,
  Edit3,
  Download,
  Phone,
  Globe,
  MapPin,
  Mail,
  Send,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Star,
  Tag,
  ShieldCheck,
  LayoutGrid,
  List,
  Maximize2,
  X,
} from 'lucide-react';
import { fetchApi, API_BASE } from '@/lib/api';

const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${ASSET_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('lumo_token') ||
    localStorage.getItem('auth_token') ||
    null
  );
}

function formatTzs(amount?: number | null, currency = 'TZS'): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString('en-US')}`;
}

interface ProductVariantForm {
  id: string;
  name: string;
  type: string;
  value: string;
  price?: string;
  stockQuantity?: string;
  sku?: string;
}

type ActiveTab = 'overview' | 'products' | 'share' | 'enquiries' | 'analytics' | 'settings';

const DEFAULT_TEMPLATE =
  'Hello [Customer Name], browse all available products, prices and offers from [Business Name] anytime here:\n[Store Link]\nShop easily and order directly with us!';

export default function MerchantMyStorePage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Onboarding wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    slug: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    primaryColor: '#0F172A',
    secondaryColor: '#FF5500',
    contactPhone: '',
    whatsappNumber: '',
    contactEmail: '',
    location: '',
    promotionalBannerText: '',
    showSoldOutBadges: true,
    showOnTrackingPage: true,
    includeLinkInTransactionalSms: false,
    storeSmsTemplate: DEFAULT_TEMPLATE,
    publicationStatus: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED',
    socialLinks: {
      instagram: '',
      facebook: '',
      tiktok: '',
      website: '',
    },
  });

  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available?: boolean;
    slug?: string;
    error?: string;
  }>({ checking: false });

  const [savingStore, setSavingStore] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Product list filters & CRUD states
  const [prodSearch, setProdSearch] = useState('');
  const [prodStatusFilter, setProdStatusFilter] = useState('ALL');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('ALL');
  const [prodViewMode, setProdViewMode] = useState<'grid' | 'table'>('grid');
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Add/Edit Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    currency: 'TZS',
    unitPrice: '',
    costPrice: '',
    promotionalPrice: '',
    promotionStartAt: '',
    promotionEndAt: '',
    availableQuantity: '10',
    trackInventory: true,
    stockStatus: 'IN_STOCK' as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
    lowStockThreshold: '5',
    publicationStatus: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    isFeatured: false,
    primaryImageUrl: '',
    images: [] as string[],
    variants: [] as ProductVariantForm[],
  });

  // Category manager
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Share & SMS state
  const [smsTemplateDraft, setSmsTemplateDraft] = useState(DEFAULT_TEMPLATE);
  const [smsPreviewText, setSmsPreviewText] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualConsentConfirmed, setManualConsentConfirmed] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, prodRes, custRes] = await Promise.all([
        fetchApi('/store/my/dashboard'),
        fetchApi('/store/my/products'),
        fetchApi('/store/my/customers'),
      ]);

      const dashData = dashRes?.data || dashRes;
      const prodData = prodRes?.data || prodRes;
      const custData = custRes?.data || custRes;
      setDashboard(dashData);
      setProducts(prodData?.products || []);
      setCustomers(custData?.customers || []);

      const s = dashData?.store;
      if (s?.qrSvg) {
        setQrSvg(s.qrSvg);
      }
      const prefill = dashData?.prefill;
      if (s) {
        setStoreForm({
          storeName: s.storeName || '',
          slug: s.slug || '',
          description: s.description || '',
          logoUrl: s.logoUrl || '',
          coverImageUrl: s.coverImageUrl || '',
          primaryColor: s.primaryColor || '#0F172A',
          secondaryColor: s.secondaryColor || '#FF5500',
          contactPhone: s.contactPhone || '',
          whatsappNumber: s.whatsappNumber || '',
          contactEmail: s.contactEmail || '',
          location: s.location || '',
          promotionalBannerText: s.promotionalBannerText || '',
          showSoldOutBadges: Boolean(s.showSoldOutBadges),
          showOnTrackingPage: Boolean(s.showOnTrackingPage),
          includeLinkInTransactionalSms: Boolean(s.includeLinkInTransactionalSms),
          storeSmsTemplate: s.storeSmsTemplate || DEFAULT_TEMPLATE,
          publicationStatus: s.publicationStatus === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
          socialLinks: {
            instagram: s.socialLinks?.instagram || '',
            facebook: s.socialLinks?.facebook || '',
            tiktok: s.socialLinks?.tiktok || '',
            website: s.socialLinks?.website || '',
          },
        });
        setSmsTemplateDraft(s.storeSmsTemplate || DEFAULT_TEMPLATE);

        try {
          if (!s?.qrSvg) {
            const qrRes = await fetchApi('/store/my/qr');
            const qrData = qrRes?.data || qrRes;
            if (qrData?.svg) {
              setQrSvg(qrData.svg);
            }
          }
        } catch {
          // Non-fatal
        }
      } else if (prefill) {
        setStoreForm((prev) => ({
          ...prev,
          storeName: prefill.storeName || '',
          slug: prefill.suggestedSlug || '',
          description: prefill.description || '',
          logoUrl: prefill.logoUrl || '',
          primaryColor: prefill.primaryColor || '#0F172A',
          secondaryColor: prefill.secondaryColor || '#FF5500',
          contactPhone: prefill.contactPhone || '',
          whatsappNumber: prefill.whatsappNumber || '',
          contactEmail: prefill.contactEmail || '',
          location: prefill.location || '',
          socialLinks: {
            website: prefill.socialLinks?.website || '',
            instagram: '',
            facebook: '',
            tiktok: '',
          },
        }));
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load store workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live SMS preview refresh
  useEffect(() => {
    if (!dashboard?.store) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi('/store/my/sms/preview', {
          method: 'POST',
          body: JSON.stringify({ template: smsTemplateDraft, customerName: 'Amina' }),
        });
        const previewVal = typeof res === 'string' ? res : res?.data ?? res?.preview ?? '';
        setSmsPreviewText(typeof previewVal === 'string' ? previewVal : '');
      } catch {
        // Fallback local preview
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [smsTemplateDraft, dashboard?.store]);

  const checkSlug = async (slugToCheck: string) => {
    if (!slugToCheck.trim()) return;
    setSlugStatus({ checking: true });
    try {
      const res = await fetchApi(`/store/my/slug-check?slug=${encodeURIComponent(slugToCheck.trim())}`);
      const slugData = res?.data || res;
      setSlugStatus({
        checking: false,
        available: slugData?.available,
        slug: slugData?.slug,
        error: slugData?.error,
      });
    } catch (err: any) {
      setSlugStatus({ checking: false, available: false, error: err.message });
    }
  };

  const handleImageFileUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = getClientAuthToken();
      const res = await fetch(`${API_BASE}/store/my/upload-image`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Image upload failed');
      }
      showToast('success', 'Image uploaded successfully');
      return json.data.url as string;
    } catch (err: any) {
      showToast('error', err.message || 'Could not upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveStore = async (overridePubStatus?: 'DRAFT' | 'PUBLISHED') => {
    setSavingStore(true);
    try {
      const payload = {
        ...storeForm,
        publicationStatus: overridePubStatus || storeForm.publicationStatus,
      };
      await fetchApi('/store/my/store', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast(
        'success',
        overridePubStatus === 'PUBLISHED'
          ? 'Your SmartTrack Store is now LIVE!'
          : 'Store settings saved successfully.'
      );
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to save store');
    } finally {
      setSavingStore(false);
    }
  };

  const handleTogglePublication = async () => {
    if (!dashboard?.store) return;
    const nextStatus = dashboard.store.publicationStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setSavingStore(true);
    try {
      await fetchApi('/store/my/publish', {
        method: 'POST',
        body: JSON.stringify({ publicationStatus: nextStatus }),
      });
      showToast(
        'success',
        nextStatus === 'PUBLISHED' ? 'Store published and accessible to customers.' : 'Store switched to Draft mode.'
      );
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Could not change publication status');
    } finally {
      setSavingStore(false);
    }
  };

  const handleCopyStoreLink = async () => {
    const url = dashboard?.store?.publicUrl || `https://lumotrack.lumo.co.tz/store/${storeForm.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      showToast('success', 'Public store link copied to clipboard');
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      showToast('error', 'Failed to copy link');
    }
  };

  const handleDownloadQrSvg = async () => {
    try {
      let svgContent = qrSvg;
      const slug = dashboard?.store?.slug || 'smarttrack-store';
      if (!svgContent) {
        const res = await fetchApi('/store/my/qr');
        const qrData = res?.data || res;
        svgContent = qrData?.svg || '';
      }
      if (!svgContent) throw new Error('QR SVG not available yet');
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${slug}-qr.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast('success', 'Store QR SVG downloaded');
    } catch (err: any) {
      showToast('error', err.message || 'Unable to download QR code');
    }
  };

  const handleDownloadQrPng = async () => {
    try {
      let svgContent = qrSvg;
      const slug = dashboard?.store?.slug || 'smarttrack-store';
      if (!svgContent) {
        const res = await fetchApi('/store/my/qr');
        const qrData = res?.data || res;
        svgContent = qrData?.svg || '';
      }
      if (!svgContent) throw new Error('QR SVG not available yet');

      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const size = 600;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 24, 24, size - 48, size - 48);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              const pngUrl = URL.createObjectURL(pngBlob);
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${slug}-qr.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(pngUrl);
              showToast('success', 'Store QR PNG downloaded');
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        showToast('error', 'Unable to render PNG QR code');
      };
      img.src = svgUrl;
    } catch (err: any) {
      showToast('error', err.message || 'Unable to download PNG QR code');
    }
  };

  const openAddProductModal = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      sku: '',
      description: '',
      category: dashboard?.categories?.[0]?.name || '',
      brand: '',
      currency: 'TZS',
      unitPrice: '',
      costPrice: '',
      promotionalPrice: '',
      promotionStartAt: '',
      promotionEndAt: '',
      availableQuantity: '10',
      trackInventory: true,
      stockStatus: 'IN_STOCK',
      lowStockThreshold: '5',
      publicationStatus: 'PUBLISHED',
      isFeatured: false,
      primaryImageUrl: '',
      images: [],
      variants: [],
    });
    setProductModalOpen(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name || '',
      sku: prod.sku || '',
      description: prod.description || '',
      category: prod.category || '',
      brand: prod.brand || '',
      currency: prod.currency || 'TZS',
      unitPrice: prod.unitPrice !== undefined && prod.unitPrice !== null ? String(prod.unitPrice) : '',
      costPrice: prod.costPrice !== undefined && prod.costPrice !== null ? String(prod.costPrice) : '',
      promotionalPrice:
        prod.promotionalPrice !== undefined && prod.promotionalPrice !== null ? String(prod.promotionalPrice) : '',
      promotionStartAt: prod.promotionStartAt ? String(prod.promotionStartAt).slice(0, 16) : '',
      promotionEndAt: prod.promotionEndAt ? String(prod.promotionEndAt).slice(0, 16) : '',
      availableQuantity: String(prod.availableQuantityRaw ?? prod.availableQuantity ?? 0),
      trackInventory: Boolean(prod.trackInventory),
      stockStatus: prod.stockStatus || 'IN_STOCK',
      lowStockThreshold: String(prod.lowStockThreshold ?? 5),
      publicationStatus: prod.publicationStatus || 'DRAFT',
      isFeatured: Boolean(prod.isFeatured),
      primaryImageUrl: prod.primaryImageUrl || '',
      images: Array.isArray(prod.images) ? prod.images : [],
      variants: Array.isArray(prod.variants)
        ? prod.variants.map((v: any) => ({
            id: v.id,
            name: v.name || '',
            type: v.type || 'Option',
            value: v.value || v.name || '',
            price: v.price !== null && v.price !== undefined ? String(v.price) : '',
            stockQuantity: v.stockQuantity !== null && v.stockQuantity !== undefined ? String(v.stockQuantity) : '',
            sku: v.sku || '',
          }))
        : [],
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        description: productForm.description.trim() || null,
        category: productForm.category.trim() || null,
        brand: productForm.brand.trim() || null,
        currency: productForm.currency || 'TZS',
        unitPrice: Number(productForm.unitPrice || 0),
        costPrice: productForm.costPrice ? Number(productForm.costPrice) : null,
        promotionalPrice: productForm.promotionalPrice ? Number(productForm.promotionalPrice) : null,
        promotionStartAt: productForm.promotionStartAt || null,
        promotionEndAt: productForm.promotionEndAt || null,
        availableQuantity: Number(productForm.availableQuantity || 0),
        trackInventory: productForm.trackInventory,
        stockStatus: productForm.stockStatus,
        lowStockThreshold: Number(productForm.lowStockThreshold || 5),
        publicationStatus: productForm.publicationStatus,
        isFeatured: productForm.isFeatured,
        primaryImageUrl: productForm.primaryImageUrl || productForm.images[0] || null,
        images: productForm.images,
        variants: productForm.variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            id: v.id,
            name: v.name.trim(),
            type: v.type.trim() || 'Option',
            value: (v.value || v.name).trim(),
            price: v.price ? Number(v.price) : null,
            stockQuantity: v.stockQuantity ? Number(v.stockQuantity) : null,
            sku: v.sku?.trim() || null,
          })),
      };

      if (editingProductId) {
        await fetchApi(`/store/my/products/${editingProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Product updated cleanly');
      } else {
        await fetchApi('/store/my/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', 'New product added to your store');
      }

      setProductModalOpen(false);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickProductStatus = async (productId: string, publicationStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    try {
      await fetchApi(`/store/my/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ publicationStatus }),
      });
      showToast('success', `Product moved to ${publicationStatus}`);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTargetProduct) return;
    setDeletingProduct(true);
    try {
      await fetchApi(`/store/my/products/${deleteTargetProduct.id}`, {
        method: 'DELETE',
      });
      showToast('success', `"${deleteTargetProduct.name}" deleted`);
      setDeleteTargetProduct(null);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete product');
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      await fetchApi('/store/my/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim() || undefined,
        }),
      });
      setNewCategoryName('');
      setNewCategoryDesc('');
      showToast('success', 'Category added');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await fetchApi(`/store/my/categories/${categoryId}`, { method: 'DELETE' });
      showToast('success', 'Category removed');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to delete category');
    }
  };

  const handleToggleMarketingConsent = async (customerId: string, currentOptIn: boolean) => {
    try {
      await fetchApi(`/store/my/customers/${customerId}/consent`, {
        method: 'PATCH',
        body: JSON.stringify({ optIn: !currentOptIn, source: 'MERCHANT_DASHBOARD' }),
      });
      if (currentOptIn) {
        setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
      }
      showToast('success', !currentOptIn ? 'Customer opted in to store SMS' : 'Customer opted out cleanly');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update consent');
    }
  };

  const handleSendBulkSms = async () => {
    if (selectedCustomerIds.length === 0) {
      showToast('error', 'Select at least one opted-in customer first.');
      return;
    }
    setSendingSms(true);
    try {
      const res = await fetchApi('/store/my/sms/send', {
        method: 'POST',
        body: JSON.stringify({
          customerIds: selectedCustomerIds,
          customTemplate: smsTemplateDraft,
        }),
      });
      const r = res?.data || res;
      showToast(
        'success',
        `SMS complete: ${r?.sentCount || 0} sent, ${r?.skippedCount || 0} skipped (24h dedup), ${r?.failedCount || 0} failed`
      );
      setSelectedCustomerIds([]);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'SMS dispatch failed');
    } finally {
      setSendingSms(false);
    }
  };

  const handleSendManualSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;
    setSendingSms(true);
    try {
      const res = await fetchApi('/store/my/sms/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientPhone: manualPhone.trim(),
          recipientName: manualName.trim() || 'Customer',
          customTemplate: smsTemplateDraft,
          explicitConsentConfirmed: manualConsentConfirmed,
        }),
      });
      const r = res?.data || res;
      showToast(
        r?.failedCount ? 'error' : 'success',
        r?.failedCount
          ? 'SMS delivery failed (credits automatically refunded).'
          : 'Store link SMS sent successfully.'
      );
      setManualPhone('');
      setManualName('');
      setManualConsentConfirmed(false);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to send SMS');
    } finally {
      setSendingSms(false);
    }
  };

  const handleUpdateEnquiryStatus = async (enquiryId: string, status: string) => {
    try {
      await fetchApi(`/store/my/enquiries/${enquiryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast('success', `Updated status to ${status}`);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update enquiry status');
    }
  };

  const previewSegmentLength = smsPreviewText.length || smsTemplateDraft.length;
  const estimatedSegmentsPerRecipient = Math.max(1, Math.ceil(previewSegmentLength / 153));
  const estimatedCostTotal =
    Math.max(1, selectedCustomerIds.length) * estimatedSegmentsPerRecipient * 20;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-600">
        <RefreshCw className="w-7 h-7 animate-spin text-[#FF5500]" />
        <p className="text-sm font-medium">Loading LUMO SmartTrack Store workspace...</p>
      </div>
    );
  }

  const store = dashboard?.store;
  const stats = dashboard?.stats || {};
  const analytics = dashboard?.analytics || {};
  const categories = dashboard?.categories || [];
  const enquiries = dashboard?.enquiries || [];
  const smsLogs = dashboard?.smsLogs || [];

  const filteredProducts = products.filter((p) => {
    if (prodStatusFilter !== 'ALL' && p.publicationStatus !== prodStatusFilter) return false;
    if (prodCategoryFilter !== 'ALL' && (p.category || 'General') !== prodCategoryFilter) return false;
    if (prodSearch.trim()) {
      const q = prodSearch.toLowerCase();
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.sku || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q)
    );
  });

  // ==============================================================
  // FIRST-TIME STORE CREATION ONBOARDING WIZARD
  // ==============================================================
  if (!store) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
                : 'bg-rose-950 text-rose-100 border-rose-700'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-slate-900 to-slate-800 text-white p-7 shadow-xl border border-slate-700/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5500]/20 text-orange-300 border border-[#FF5500]/40 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                LUMO SmartTrack Store Onboarding
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">CREATE MY STORE</h1>
              <p className="text-slate-300 text-sm mt-1">
                Your Brand. Your Products. Your Customers. More Sales. Powered by LUMO.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setWizardStep(step as 1 | 2 | 3 | 4)}
                  className={`w-9 h-9 rounded-full font-bold transition ${
                    wizardStep === step
                      ? 'bg-[#FF5500] text-white shadow-md'
                      : wizardStep > step
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          {wizardStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 1: Business Information</h2>
                <p className="text-xs text-slate-500">
                  Prefilled from your existing merchant profile. Customize how customers see your brand.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    value={storeForm.storeName}
                    onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500] outline-none"
                    placeholder="e.g. ABC Fashion Tanzania"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Description</label>
                  <textarea
                    rows={3}
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500] outline-none"
                    placeholder="Describe your products, quality promise, and delivery availability..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Phone</label>
                  <input
                    type="text"
                    value={storeForm.contactPhone}
                    onChange={(e) => setStoreForm({ ...storeForm, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="+255 7XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={storeForm.whatsappNumber}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsappNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="+255 7XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={storeForm.contactEmail}
                    onChange={(e) => setStoreForm({ ...storeForm, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Location</label>
                  <input
                    type="text"
                    value={storeForm.location}
                    onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="Kariakoo, Dar es Salaam"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Logo</label>
                  <div className="flex items-center gap-3">
                    {storeForm.logoUrl && (
                      <img
                        src={resolveAssetUrl(storeForm.logoUrl)}
                        alt="Logo preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      />
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const url = await handleImageFileUpload(f);
                            if (url) setStoreForm((p) => ({ ...p, logoUrl: url }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Cover Banner</label>
                  <div className="flex items-center gap-3">
                    {storeForm.coverImageUrl && (
                      <img
                        src={resolveAssetUrl(storeForm.coverImageUrl)}
                        alt="Cover preview"
                        className="w-20 h-12 rounded-xl object-cover border border-slate-200"
                      />
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Cover'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const url = await handleImageFileUpload(f);
                            if (url) setStoreForm((p) => ({ ...p, coverImageUrl: url }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram URL (Optional)</label>
                  <input
                    type="text"
                    value={storeForm.socialLinks.instagram}
                    onChange={(e) =>
                      setStoreForm({
                        ...storeForm,
                        socialLinks: { ...storeForm.socialLinks, instagram: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="https://instagram.com/yourstore"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL (Optional)</label>
                  <input
                    type="text"
                    value={storeForm.socialLinks.website}
                    onChange={(e) =>
                      setStoreForm({
                        ...storeForm,
                        socialLinks: { ...storeForm.socialLinks, website: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="https://yourbusiness.co.tz"
                  />
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 2: Choose Your Unique Store URL</h2>
                <p className="text-xs text-slate-500">
                  Customers open this link directly from SMS without downloading any app or creating an account.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Public Store Slug *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
                    <span className="px-3 py-2.5 bg-slate-100 text-slate-500 text-xs font-mono border-r border-slate-200">
                      /store/
                    </span>
                    <input
                      type="text"
                      value={storeForm.slug}
                      onChange={(e) => {
                        setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase() });
                        setSlugStatus({ checking: false });
                      }}
                      className="flex-1 px-3 py-2.5 text-sm font-mono outline-none"
                      placeholder="abc-fashion"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => checkSlug(storeForm.slug)}
                    className="px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    {slugStatus.checking ? 'Checking...' : 'Check Availability'}
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-mono">
                  Preview: https://lumotrack.lumo.co.tz/store/{storeForm.slug || 'your-store'}
                </p>
                {slugStatus.available === true && (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Great news — /store/{slugStatus.slug} is available!
                  </p>
                )}
                {slugStatus.available === false && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    {slugStatus.error || 'Slug is already taken.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 3: Brand Appearance & Tracking Integration</h2>
                <p className="text-xs text-slate-500">
                  Personalize your storefront palette and automatic SmartTrack delivery page integration.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Brand Colour</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={storeForm.primaryColor}
                      onChange={(e) => setStoreForm({ ...storeForm, primaryColor: e.target.value })}
                      className="h-10 w-14 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={storeForm.primaryColor}
                      onChange={(e) => setStoreForm({ ...storeForm, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Colour</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={storeForm.secondaryColor}
                      onChange={(e) => setStoreForm({ ...storeForm, secondaryColor: e.target.value })}
                      className="h-10 w-14 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={storeForm.secondaryColor}
                      onChange={(e) => setStoreForm({ ...storeForm, secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Promotional Top Banner Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={storeForm.promotionalBannerText}
                    onChange={(e) => setStoreForm({ ...storeForm, promotionalBannerText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    placeholder="e.g. Same-day delivery within Dar es Salaam for orders before 3 PM!"
                  />
                </div>
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeForm.showSoldOutBadges}
                    onChange={(e) => setStoreForm({ ...storeForm, showSoldOutBadges: e.target.checked })}
                    className="mt-0.5 accent-[#FF5500]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">Show Sold-Out Badges</span>
                    <span className="text-xs text-slate-500">Display clear out-of-stock indicators on unavailable items.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeForm.showOnTrackingPage}
                    onChange={(e) => setStoreForm({ ...storeForm, showOnTrackingPage: e.target.checked })}
                    className="mt-0.5 accent-[#FF5500]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Discover More on Tracking Pages
                    </span>
                    <span className="text-xs text-slate-500">
                      Show your own store recommendations to customers checking deliveries.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 4: Preview & Launch</h2>
                <p className="text-xs text-slate-500">
                  Review your storefront details before creating your store. You can publish immediately or start in Draft mode.
                </p>
              </div>
              <div
                className="rounded-2xl p-6 text-white shadow-md"
                style={{ backgroundColor: storeForm.primaryColor || '#0F172A' }}
              >
                <div className="flex items-center gap-4">
                  {storeForm.logoUrl ? (
                    <img
                      src={resolveAssetUrl(storeForm.logoUrl)}
                      alt={storeForm.storeName}
                      className="w-16 h-16 rounded-2xl object-cover bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{storeForm.storeName || 'Your Store'}</h3>
                    <p className="text-xs text-white/80 font-mono">
                      https://lumotrack.lumo.co.tz/store/{storeForm.slug}
                    </p>
                    {storeForm.location && <p className="text-xs text-white/80 mt-1">{storeForm.location}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingStore}
                  onClick={() => handleSaveStore('DRAFT')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={savingStore}
                  onClick={() => handleSaveStore('PUBLISHED')}
                  className="px-6 py-2.5 rounded-xl bg-[#FF5500] text-white text-sm font-bold hover:bg-orange-600 shadow-md disabled:opacity-60"
                >
                  {savingStore ? 'Creating Store...' : 'Create & Publish Store'}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            {wizardStep < 4 && (
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // MERCHANT STOREFRONT MANAGEMENT DASHBOARD
  // ==============================================================
  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {store.publicationStatus === 'SUSPENDED' && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 flex items-start gap-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Store Suspended by Platform Administration</p>
            <p className="text-xs mt-0.5">
              Reason: {store.suspensionReason || 'Suspended by administrator review'}. Customers cannot view your storefront until restored.
            </p>
          </div>
        </div>
      )}

      {/* Store Brand Header Banner */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div
          className="h-28 md:h-36 relative"
          style={{
            backgroundColor: store.primaryColor || '#0F172A',
            backgroundImage: store.coverImageUrl ? `url(${resolveAssetUrl(store.coverImageUrl)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                store.publicationStatus === 'PUBLISHED'
                  ? 'bg-emerald-500 text-white'
                  : store.publicationStatus === 'SUSPENDED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-400 text-slate-950'
              }`}
            >
              {store.publicationStatus}
            </span>
            {store.publicationStatus !== 'SUSPENDED' && (
              <button
                type="button"
                disabled={savingStore}
                onClick={handleTogglePublication}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-900 hover:bg-white shadow"
              >
                {store.publicationStatus === 'PUBLISHED' ? 'Switch to Draft' : 'Publish Store'}
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 -mt-10 relative z-10">
            {store.logoUrl ? (
              <img
                src={resolveAssetUrl(store.logoUrl)}
                alt={store.storeName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-[#0F172A] text-white flex items-center justify-center">
                <Store className="w-9 h-9" />
              </div>
            )}
            <div className="pt-6">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">{store.storeName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {store.publicUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5500] hover:underline"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={openAddProductModal}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 shadow-sm min-h-[42px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              ADD PRODUCT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="truncate">MANAGE PRODUCTS</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span className="truncate">SHOW QR</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span className="truncate">CUSTOMISE</span>
            </button>
            <a
              href={`/store/${store.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span className="truncate">PREVIEW STORE</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 min-h-[42px]"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="truncate">SHARE SMS</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadQrSvg}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">QR SVG</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[42px]"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="truncate">SETTINGS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto sm:flex-wrap gap-2 border-b border-slate-200 pb-3 -mx-1 px-1">
        {[
          { id: 'overview', label: 'Overview', icon: Store },
          { id: 'products', label: `Products (${products.length})`, icon: Package },
          { id: 'share', label: 'Share & SMS', icon: Send },
          { id: 'enquiries', label: `Enquiries & Orders (${enquiries.length})`, icon: ShoppingBag },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Customise & Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Published Products', value: stats.totalPublished ?? 0, sub: 'Live on storefront' },
              { label: 'Available Products', value: stats.availableProducts ?? 0, sub: 'In stock right now' },
              { label: 'Unavailable', value: stats.unavailableProducts ?? 0, sub: 'Out of stock / paused' },
              { label: 'Total Store Views', value: analytics.storeViews ?? 0, sub: `${analytics.uniqueVisitors ?? 0} unique visitors` },
              { label: 'Product Views', value: analytics.productViews ?? 0, sub: `${analytics.whatsappClicks ?? 0} WhatsApp clicks` },
              {
                label: 'Enquiries & Orders',
                value: (analytics.enquiriesCount ?? 0) + (analytics.storefrontOrdersCount ?? 0),
                sub:
                  analytics.conversionRate !== null && analytics.conversionRate !== undefined
                    ? `${analytics.conversionRate}% conversion`
                    : 'Real event conversion',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent Storefront Enquiries & Order Requests</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('enquiries')}
                  className="text-xs font-semibold text-[#FF5500] hover:underline"
                >
                  View All
                </button>
              </div>
              {enquiries.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No storefront enquiries or order requests yet. Share your store link by SMS or WhatsApp to reach customers.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {enquiries.slice(0, 5).map((eq: any) => (
                    <div key={eq.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {eq.customer_name} <span className="text-xs font-normal text-slate-500">({eq.customer_phone})</span>
                        </p>
                        <p className="text-xs text-slate-600">
                          {eq.enquiry_type} • Qty {eq.quantity} {eq.selected_variant ? `• ${eq.selected_variant}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center text-center space-y-3">
              <div className="w-full flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">Your Store QR Code</h2>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5500] hover:underline"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Enlarge
                </button>
              </div>
              <p className="text-xs text-slate-500">Print on receipts, packaging, counter tents & delivery bags.</p>
              {qrSvg ? (
                <div
                  onClick={() => setQrModalOpen(true)}
                  title="Tap to enlarge QR code"
                  className="w-48 h-48 p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-center cursor-pointer hover:border-[#FF5500] transition [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  QR Preview Loading...
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  SVG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG
                </button>
              </div>
            </div>
          </div>

          {/* All Store Products Quick CRUD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">All Store Products ({products.length})</h2>
                <p className="text-xs text-slate-500">Create, edit, publish/draft or delete products visible in your store.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/products"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Package className="w-3.5 h-3.5" />
                  Full Catalogue
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Filters & Table
                </button>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-8 px-4 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No products in your store yet</p>
                <p className="text-xs text-slate-500">Add your first product so customers visiting your link or QR code can browse and order.</p>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Product
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.primaryImageUrl ? (
                          <img
                            src={resolveAssetUrl(prod.primaryImageUrl)}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                            {prod.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              prod.publicationStatus === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : prod.publicationStatus === 'ARCHIVED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {prod.publicationStatus}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              prod.stockStatus === 'OUT_OF_STOCK'
                                ? 'bg-rose-100 text-rose-700'
                                : prod.stockStatus === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {prod.stockStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-800">{formatTzs(prod.effectivePrice, prod.currency)}</span>
                          {prod.category ? ` • ${prod.category}` : ''}
                          {prod.sku ? ` • SKU: ${prod.sku}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <select
                        value={prod.publicationStatus}
                        onChange={(e) =>
                          handleQuickProductStatus(
                            prod.id,
                            e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
                          )
                        }
                        aria-label={`Change status for ${prod.name}`}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                      >
                        <option value="PUBLISHED">Publish</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archive</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => openEditProductModal(prod)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetProduct(prod)}
                        aria-label={`Delete ${prod.name}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS & CATEGORIES */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Categories Management Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Store Categories</h2>
            <form onSubmit={handleSaveCategory} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name (e.g. Shoes, Electronics, Bundles)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder="Optional short description"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="submit"
                disabled={savingCategory || !newCategoryName.trim()}
                className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                {savingCategory ? 'Adding...' : 'Add Category'}
              </button>
            </form>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat: any) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#FF5500]" />
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Product Filters & Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Search products by name, SKU or category..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <select
                  value={prodCategoryFilter}
                  onChange={(e) => setProdCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setProdViewMode('grid')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      prodViewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdViewMode('table')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      prodViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Table
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={openAddProductModal}
                className="w-full lg:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 lg:py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                ADD PRODUCT
              </button>
            </div>

            {/* Mobile-scrollable status filter pills */}
            <div className="flex overflow-x-auto gap-1.5 pb-1">
              {[
                { key: 'ALL', label: `All (${products.length})` },
                { key: 'PUBLISHED', label: 'Published' },
                { key: 'DRAFT', label: 'Draft' },
                { key: 'ARCHIVED', label: 'Archived' },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setProdStatusFilter(st.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    prodStatusFilter === st.key
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No products match this view</p>
                <p className="text-xs text-slate-500">Add a product with photos, prices and availability to start selling.</p>
              </div>
            ) : prodViewMode === 'table' ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category / SKU</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {prod.primaryImageUrl ? (
                                <img
                                  src={resolveAssetUrl(prod.primaryImageUrl)}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <span className="font-bold text-slate-900 line-clamp-1">{prod.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {prod.category || 'General'}
                          {prod.sku ? ` • ${prod.sku}` : ''}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0F172A] whitespace-nowrap">
                          {formatTzs(prod.effectivePrice, prod.currency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              prod.stockStatus === 'OUT_OF_STOCK'
                                ? 'bg-rose-100 text-rose-700'
                                : prod.stockStatus === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {prod.stockStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={prod.publicationStatus}
                            onChange={(e) =>
                              handleQuickProductStatus(
                                prod.id,
                                e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                          >
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditProductModal(prod)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetProduct(prod)}
                              aria-label={`Delete ${prod.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((prod) => (
                  <div key={prod.id} className="rounded-2xl border border-slate-200 overflow-hidden flex flex-col bg-white">
                    <div className="h-44 bg-slate-100 relative">
                      {prod.primaryImageUrl ? (
                        <img
                          src={resolveAssetUrl(prod.primaryImageUrl)}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            prod.publicationStatus === 'PUBLISHED'
                              ? 'bg-emerald-600 text-white'
                              : prod.publicationStatus === 'ARCHIVED'
                              ? 'bg-slate-700 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {prod.publicationStatus}
                        </span>
                        {prod.isFeatured && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FF5500] text-white inline-flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                              prod.stockStatus === 'OUT_OF_STOCK'
                                ? 'bg-rose-100 text-rose-700'
                                : prod.stockStatus === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {prod.stockStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {prod.category || 'General'} {prod.sku ? `• SKU: ${prod.sku}` : ''}
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-base font-bold text-[#0F172A]">
                            {formatTzs(prod.effectivePrice, prod.currency)}
                          </span>
                          {prod.isPromotionActive && (
                            <span className="text-xs text-slate-400 line-through">
                              {formatTzs(prod.unitPrice, prod.currency)}
                            </span>
                          )}
                        </div>
                        {prod.costPrice !== null && (
                          <p className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            Private Cost: {formatTzs(prod.costPrice, prod.currency)} (hidden from customers)
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(prod)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetProduct(prod)}
                            aria-label={`Delete ${prod.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                        <select
                          value={prod.publicationStatus}
                          onChange={(e) =>
                            handleQuickProductStatus(
                              prod.id,
                              e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                        >
                          <option value="PUBLISHED">Publish</option>
                          <option value="DRAFT">Draft</option>
                          <option value="ARCHIVED">Archive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SHARE & SMS */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          {/* Storefront Share & QR Code Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            {qrSvg ? (
              <div
                onClick={() => setQrModalOpen(true)}
                title="Tap to enlarge QR code"
                className="w-32 h-32 p-2.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shrink-0 cursor-pointer hover:border-[#FF5500] transition [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0 text-center px-2">
                QR Code Generating...
              </div>
            )}
            <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0 w-full">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Store Link & Printable QR Code</h2>
                <p className="text-xs text-slate-500">Share your direct link on WhatsApp/SMS or print your QR code on flyers and delivery bags.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl truncate max-w-full">
                  {store.publicUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  View Full QR
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Composer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Promotional Store Link SMS Template</h2>
                <button
                  type="button"
                  onClick={() => setSmsTemplateDraft(DEFAULT_TEMPLATE)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Reset Default
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['[Customer Name]', '[Business Name]', '[Store Name]', '[Store Link]'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSmsTemplateDraft((t) => `${t} ${tag}`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <textarea
                rows={4}
                value={smsTemplateDraft}
                onChange={(e) => setSmsTemplateDraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
              />
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Customer Preview</p>
                <p className="text-xs text-slate-800 whitespace-pre-wrap">{smsPreviewText || smsTemplateDraft}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>
                    {previewSegmentLength} chars • ~{estimatedSegmentsPerRecipient} SMS segment(s)
                  </span>
                  <span className="font-semibold text-[#FF5500]">
                    Est. TSh {estimatedCostTotal.toLocaleString('en-US')} (TSh 20/SMS unit)
                  </span>
                </div>
              </div>

              {/* Manual Single Recipient with Consent Confirmation */}
              <form onSubmit={handleSendManualSms} className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-900">Send to Specific Customer Phone</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualConsentConfirmed}
                    onChange={(e) => setManualConsentConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#FF5500]"
                  />
                  <span>
                    I confirm this customer provided explicit promotional SMS opt-in consent before messaging.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={sendingSms || !manualPhone.trim() || !manualConsentConfirmed}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingSms ? 'Sending...' : 'Send Store Link SMS'}
                </button>
              </form>
            </div>

            {/* Opted-In Customers Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Customer Opt-In Consent List</h2>
                  <p className="text-xs text-slate-500">Only customers with explicit Opt-In can receive store promotional SMS.</p>
                </div>
                <button
                  type="button"
                  disabled={sendingSms || selectedCustomerIds.length === 0}
                  onClick={handleSendBulkSms}
                  className="px-3.5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  Send to Selected ({selectedCustomerIds.length})
                </button>
              </div>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer name or phone..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredCustomers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center">No customer records found yet.</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          disabled={!c.marketing_opt_in}
                          checked={selectedCustomerIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomerIds((p) => [...p, c.id]);
                            } else {
                              setSelectedCustomerIds((p) => p.filter((id) => id !== c.id));
                            }
                          }}
                          className="accent-[#FF5500]"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-slate-500 font-mono">{c.phone}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleMarketingConsent(c.id, Boolean(c.marketing_opt_in))}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          c.marketing_opt_in
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c.marketing_opt_in ? 'Opted In' : 'Opted Out (Click to Opt-In)'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Browse products & latest prices from ${store.storeName}: ${store.publicUrl}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Share via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Public Store URL
                </button>
              </div>
            </div>
          </div>

          {/* SMS Dispatch History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Store SMS Dispatch History</h2>
            {smsLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No store link SMS campaigns sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4">Recipient</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Credits</th>
                      <th className="py-2 pr-4">Message</th>
                      <th className="py-2">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {smsLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="py-2.5 pr-4 font-mono">{log.recipient_phone}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              log.status === 'DELIVERED' || log.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-700'
                                : log.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {log.units_billed ?? 0} ({formatTzs((log.units_billed ?? 0) * 20)})
                        </td>
                        <td className="py-2.5 pr-4 max-w-xs truncate text-slate-600">{log.message_body}</td>
                        <td className="py-2.5 text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ENQUIRIES & ORDERS */}
      {activeTab === 'enquiries' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Storefront Enquiries, Order Requests & Repeat Orders</h2>
          {enquiries.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No customer enquiries or storefront orders received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Qty / Variant</th>
                    <th className="py-2 pr-4">Address / Note</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enquiries.map((eq: any) => (
                    <tr key={eq.id}>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                          {eq.enquiry_type}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{eq.customer_name}</p>
                        <p className="font-mono text-slate-500">{eq.customer_phone}</p>
                      </td>
                      <td className="py-3 pr-4">
                        Qty {eq.quantity} {eq.selected_variant ? `(${eq.selected_variant})` : ''}
                      </td>
                      <td className="py-3 pr-4 max-w-xs text-slate-600">
                        {eq.delivery_address || eq.message || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={eq.status}
                          onChange={(e) => handleUpdateEnquiryStatus(eq.id, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="CONVERTED">CONVERTED</option>
                          <option value="CONVERTED_TO_ORDER">CONVERTED_TO_ORDER</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td className="py-3">
                        {eq.order_id ? (
                          <Link
                            href={`/dashboard/orders/${eq.order_id}`}
                            className="text-[#FF5500] font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            View Order
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <a
                            href={`tel:${eq.customer_phone}`}
                            className="text-slate-700 font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            Call
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Store Views', value: analytics.storeViews ?? 0 },
              { label: 'Unique Visitors', value: analytics.uniqueVisitors ?? 0 },
              { label: 'Product Views', value: analytics.productViews ?? 0 },
              { label: 'Store Link Clicks', value: analytics.storeLinkClicks ?? 0 },
              { label: 'WhatsApp Clicks', value: analytics.whatsappClicks ?? 0 },
              { label: 'Product Enquiries', value: analytics.enquiriesCount ?? 0 },
              { label: 'Store Order Requests', value: analytics.storefrontOrdersCount ?? 0 },
              { label: 'Confirmed Orders', value: analytics.confirmedOrdersCount ?? 0 },
              { label: 'Completed Orders', value: analytics.completedOrdersCount ?? 0 },
              {
                label: 'Conversion Rate',
                value:
                  analytics.conversionRate !== null && analytics.conversionRate !== undefined
                    ? `${analytics.conversionRate}%`
                    : '—',
              },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Most-Viewed Products (Real Event Telemetry)</h2>
            {!analytics.mostViewedProducts || analytics.mostViewedProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No product views recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {analytics.mostViewedProducts.map((item: any) => (
                  <div key={item.productId} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.primaryImageUrl ? (
                        <img
                          src={resolveAssetUrl(item.primaryImageUrl)}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-800">
                      {item.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: CUSTOMISE & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Customise Store & Settings</h2>
              <p className="text-xs text-slate-500">
                Manage branding, URL slug, contact channels, tracking integration, and transactional SMS options.
              </p>
            </div>
            <button
              type="button"
              disabled={savingStore}
              onClick={() => handleSaveStore()}
              className="px-5 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
            >
              {savingStore ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name *</label>
              <input
                type="text"
                value={storeForm.storeName}
                onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store URL Slug</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={storeForm.slug}
                  onChange={(e) => {
                    setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase() });
                    setSlugStatus({ checking: false });
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => checkSlug(storeForm.slug)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-50"
                >
                  Check
                </button>
              </div>
              {storeForm.slug !== store.slug && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Note: Previous URL (/store/{store.slug}) will automatically redirect to this new URL.
                </p>
              )}
              {slugStatus.available === false && (
                <p className="text-[11px] text-rose-600 mt-1">{slugStatus.error}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Description</label>
              <textarea
                rows={3}
                value={storeForm.description}
                onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Logo</label>
              <div className="flex items-center gap-3">
                {storeForm.logoUrl && (
                  <img
                    src={resolveAssetUrl(storeForm.logoUrl)}
                    alt="Logo"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4" />
                  Upload New Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = await handleImageFileUpload(f);
                        if (url) setStoreForm((p) => ({ ...p, logoUrl: url }));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cover / Banner Image</label>
              <div className="flex items-center gap-3">
                {storeForm.coverImageUrl && (
                  <img
                    src={resolveAssetUrl(storeForm.coverImageUrl)}
                    alt="Cover"
                    className="w-20 h-12 rounded-xl object-cover border border-slate-200"
                  />
                )}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4" />
                  Upload Banner
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = await handleImageFileUpload(f);
                        if (url) setStoreForm((p) => ({ ...p, coverImageUrl: url }));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Brand Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={storeForm.primaryColor}
                  onChange={(e) => setStoreForm({ ...storeForm, primaryColor: e.target.value })}
                  className="h-10 w-14 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  value={storeForm.primaryColor}
                  onChange={(e) => setStoreForm({ ...storeForm, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={storeForm.secondaryColor}
                  onChange={(e) => setStoreForm({ ...storeForm, secondaryColor: e.target.value })}
                  className="h-10 w-14 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  value={storeForm.secondaryColor}
                  onChange={(e) => setStoreForm({ ...storeForm, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Phone</label>
              <input
                type="text"
                value={storeForm.contactPhone}
                onChange={(e) => setStoreForm({ ...storeForm, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={storeForm.whatsappNumber}
                onChange={(e) => setStoreForm({ ...storeForm, whatsappNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                value={storeForm.contactEmail}
                onChange={(e) => setStoreForm({ ...storeForm, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
              <input
                type="text"
                value={storeForm.location}
                onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Promotional Announcement Banner</label>
              <input
                type="text"
                value={storeForm.promotionalBannerText}
                onChange={(e) => setStoreForm({ ...storeForm, promotionalBannerText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                placeholder="Optional storewide promotional message shown at the top of your storefront"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram URL</label>
              <input
                type="text"
                value={storeForm.socialLinks.instagram}
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    socialLinks: { ...storeForm.socialLinks, instagram: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                value={storeForm.socialLinks.website}
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    socialLinks: { ...storeForm.socialLinks, website: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={storeForm.showSoldOutBadges}
                onChange={(e) => setStoreForm({ ...storeForm, showSoldOutBadges: e.target.checked })}
                className="mt-0.5 accent-[#FF5500]"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Sold-Out Badges</span>
                <span className="text-[11px] text-slate-500">Show clear unavailable labels for out-of-stock products.</span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={storeForm.showOnTrackingPage}
                onChange={(e) => setStoreForm({ ...storeForm, showOnTrackingPage: e.target.checked })}
                className="mt-0.5 accent-[#FF5500]"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Tracking Page Discovery</span>
                <span className="text-[11px] text-slate-500">Recommend your products & Buy Again on delivery tracking links.</span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={storeForm.includeLinkInTransactionalSms}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, includeLinkInTransactionalSms: e.target.checked })
                }
                className="mt-0.5 accent-[#FF5500]"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Eligible Delivery SMS Link</span>
                <span className="text-[11px] text-slate-500">
                  Append storefront link on ORDER_DELIVERED SMS only for opted-in customers.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-3xl w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingProductId ? 'Edit Product' : 'Add Product to Your Store'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    list="store-categories-datalist"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="e.g. Footwear, Electronics"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <datalist id="store-categories-datalist">
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code (Optional)</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Pricing */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (TZS) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.unitPrice}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Promotional / Discount Price (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.promotionalPrice}
                    onChange={(e) => setProductForm({ ...productForm, promotionalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Start (Optional)</label>
                  <input
                    type="datetime-local"
                    value={productForm.promotionStartAt}
                    onChange={(e) => setProductForm({ ...productForm, promotionStartAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promo End (Optional)</label>
                  <input
                    type="datetime-local"
                    value={productForm.promotionEndAt}
                    onChange={(e) => setProductForm({ ...productForm, promotionEndAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Private Cost Price (Merchant Only — Never Public)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={productForm.publicationStatus}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        publicationStatus: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="PUBLISHED">PUBLISHED (Visible to customers)</option>
                    <option value="DRAFT">DRAFT (Hidden from store)</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                {/* Inventory */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.availableQuantity}
                    onChange={(e) => setProductForm({ ...productForm, availableQuantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Status</label>
                  <select
                    value={productForm.stockStatus}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        stockStatus: e.target.value as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="LOW_STOCK">LOW STOCK</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.trackInventory}
                    onChange={(e) => setProductForm({ ...productForm, trackInventory: e.target.checked })}
                    className="accent-[#FF5500]"
                  />
                  Automatically track stock & enforce available quantity
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isFeatured}
                    onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                    className="accent-[#FF5500]"
                  />
                  Mark as Featured Product
                </label>
              </div>

              {/* Multi-image uploader */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Product Photos (Up to multiple photos)</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold cursor-pointer hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        for (const f of files) {
                          const url = await handleImageFileUpload(f);
                          if (url) {
                            setProductForm((prev) => ({
                              ...prev,
                              primaryImageUrl: prev.primaryImageUrl || url,
                              images: Array.from(new Set([...prev.images, url])),
                            }));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {productForm.images.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {productForm.images.map((imgUrl) => {
                      const isPrimary = productForm.primaryImageUrl === imgUrl;
                      return (
                        <div key={imgUrl} className="relative group w-24 rounded-xl overflow-hidden border border-slate-300 bg-white">
                          <img src={resolveAssetUrl(imgUrl)} alt="" className="w-24 h-20 object-cover" />
                          <div className="p-1 flex items-center justify-between gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setProductForm((p) => ({ ...p, primaryImageUrl: imgUrl }))}
                              className={`font-bold ${isPrimary ? 'text-[#FF5500]' : 'text-slate-600'}`}
                            >
                              {isPrimary ? 'Primary' : 'Set Main'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setProductForm((p) => {
                                  const next = p.images.filter((u) => u !== imgUrl);
                                  return {
                                    ...p,
                                    images: next,
                                    primaryImageUrl: p.primaryImageUrl === imgUrl ? next[0] || '' : p.primaryImageUrl,
                                  };
                                })
                              }
                              className="text-rose-600 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Variants Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Product Variants (Size, Colour, Pack, etc.)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm((p) => ({
                        ...p,
                        variants: [
                          ...p.variants,
                          {
                            id: `var-${Date.now()}`,
                            name: '',
                            type: 'Option',
                            value: '',
                            price: '',
                            stockQuantity: '',
                            sku: '',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Variant
                  </button>
                </div>
                {productForm.variants.map((v, idx) => (
                  <div key={v.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const next = [...productForm.variants];
                        next[idx] = { ...next[idx], name: e.target.value, value: e.target.value };
                        setProductForm({ ...productForm, variants: next });
                      }}
                      placeholder="Label (e.g. Large / Red)"
                      className="px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white sm:col-span-2"
                    />
                    <input
                      type="number"
                      min="0"
                      value={v.price}
                      onChange={(e) => {
                        const next = [...productForm.variants];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setProductForm({ ...productForm, variants: next });
                      }}
                      placeholder="Price override"
                      className="px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={v.stockQuantity}
                        onChange={(e) => {
                          const next = [...productForm.variants];
                          next[idx] = { ...next[idx], stockQuantity: e.target.value };
                          setProductForm({ ...productForm, variants: next });
                        }}
                        placeholder="Qty"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setProductForm((p) => ({
                            ...p,
                            variants: p.variants.filter((item) => item.id !== v.id),
                          }))
                        }
                        className="text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur py-3 px-5 sm:px-6 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 border-t border-slate-200 flex items-center justify-end gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORE QR CODE LIGHTBOX MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Store QR Code</h2>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                aria-label="Close QR preview"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Customers scan this QR code to open <strong>{store.storeName}</strong> without registering.
            </p>
            <div className="flex justify-center">
              {qrSvg ? (
                <div
                  className="w-64 h-64 p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-64 h-64 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  QR Preview Unavailable
                </div>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-700 truncate">{store.publicUrl}</span>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold"
              >
                {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadQrSvg}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                Download SVG
              </button>
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {deleteTargetProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">Delete product?</h2>
                <p className="text-xs text-slate-600">
                  Are you sure you want to permanently remove <strong>{deleteTargetProduct.name}</strong> from your store catalogue? Existing customer order records will remain safe.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingProduct}
                onClick={() => setDeleteTargetProduct(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProduct}
                onClick={handleDeleteProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingProduct ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
