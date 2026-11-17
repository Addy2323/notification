import { prisma } from '../database/prisma';
import { serializePublicProduct, serializePublicStore } from './storeService';

const pAny = prisma as any;

const DEFAULT_CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  subcategories?: Array<{ name: string; slug: string; description?: string }>;
}> = [
  {
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    description: 'Men, women & kids apparel, casual wear and official outfits.',
    icon_name: 'Shirt',
    subcategories: [
      { name: "Men's Fashion", slug: 'mens-fashion' },
      { name: "Women's Fashion", slug: 'womens-fashion' },
      { name: "Children's Clothing", slug: 'childrens-clothing' },
      { name: 'Casual Wear', slug: 'casual-wear' },
      { name: 'Official Wear', slug: 'official-wear' },
    ],
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Football jerseys, sports shoes, gym gear and fitness accessories.',
    icon_name: 'Trophy',
    subcategories: [
      { name: 'Football Jerseys', slug: 'football-jerseys' },
      { name: 'Sports Shoes', slug: 'sports-shoes' },
      { name: 'Sports Equipment', slug: 'sports-equipment' },
      { name: 'Fitness Accessories', slug: 'fitness-accessories' },
    ],
  },
  {
    name: 'Electronics & Technology',
    slug: 'electronics-technology',
    description: 'Smartphones, computers, audio, accessories and home electronics.',
    icon_name: 'Smartphone',
    subcategories: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Computers', slug: 'computers' },
      { name: 'Accessories', slug: 'electronics-accessories' },
      { name: 'Home Electronics', slug: 'home-electronics' },
    ],
  },
  {
    name: 'Beauty & Cosmetics',
    slug: 'beauty-cosmetics',
    description: 'Skincare, haircare, fragrances, makeup and grooming essentials.',
    icon_name: 'Sparkles',
  },
  {
    name: 'Shoes & Footwear',
    slug: 'shoes-footwear',
    description: 'Sneakers, heels, sandals, leather shoes and everyday footwear.',
    icon_name: 'Footprints',
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, home decor, kitchenware, bedding and lighting.',
    icon_name: 'Home',
  },
  {
    name: 'Food & Beverages',
    slug: 'food-beverages',
    description: 'Fresh foods, snacks, spices, drinks and restaurant deliveries.',
    icon_name: 'Utensils',
  },
  {
    name: 'Jewellery & Accessories',
    slug: 'jewellery-accessories',
    description: 'Watches, rings, necklaces, bags, sunglasses and gifts.',
    icon_name: 'Gem',
  },
  {
    name: 'Automotive & Accessories',
    slug: 'automotive-accessories',
    description: 'Car parts, motorcycle gear, oils, tyres and vehicle accessories.',
    icon_name: 'Car',
  },
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Books, office supplies, school kits and printing materials.',
    icon_name: 'BookOpen',
  },
  {
    name: 'Services',
    slug: 'services',
    description: 'Repairs, tailoring, photography, printing and professional services.',
    icon_name: 'Briefcase',
  },
  {
    name: 'Other Businesses',
    slug: 'other-businesses',
    description: 'Verified local businesses and specialty shops across Tanzania.',
    icon_name: 'Store',
  },
];

let defaultCategoriesSeeded = false;

export function slugifyCategory(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;
}

export async function ensureDefaultMerchantCategories() {
  if (defaultCategoriesSeeded || !pAny.merchantCategory?.count) return;
  const existingCount = await pAny.merchantCategory.count();
  if (existingCount > 0) {
    defaultCategoriesSeeded = true;
    return;
  }

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    const parent = await pAny.merchantCategory.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon_name: cat.icon_name,
        display_order: i + 1,
        is_active: true,
      },
    });
    if (cat.subcategories?.length) {
      for (let j = 0; j < cat.subcategories.length; j++) {
        const sub = cat.subcategories[j];
        await pAny.merchantCategory.create({
          data: {
            name: sub.name,
            slug: sub.slug,
            description: sub.description || null,
            parent_id: parent.id,
            display_order: j + 1,
            is_active: true,
          },
        });
      }
    }
  }
  defaultCategoriesSeeded = true;
}

export function isMerchantCurrentlyVerified(merchant: {
  is_verified?: boolean | null;
  verification_status?: string | null;
  verification_expires_at?: Date | string | null;
}): boolean {
  if (!merchant?.is_verified || merchant.verification_status !== 'VERIFIED') return false;
  if (!merchant.verification_expires_at) return true;
  return new Date(merchant.verification_expires_at).getTime() > Date.now();
}

export async function listPublicCategories() {
  await ensureDefaultMerchantCategories();

  const categories = await pAny.merchantCategory.findMany({
    where: { is_active: true, parent_id: null },
    orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    include: {
      subcategories: {
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      },
      _count: {
        select: { merchants: true },
      },
    },
  });

  // Also count merchants under subcategories or primary categories accurately (only ACTIVE + PUBLISHED stores)
  const publishedMappings = await pAny.merchantCategoryMapping.findMany({
    where: {
      merchant: {
        status: 'ACTIVE',
        store: { publication_status: 'PUBLISHED' },
      },
    },
    select: {
      merchant_id: true,
      category_id: true,
      category: { select: { parent_id: true } },
    },
  });

  const merchantSetByCat = new Map<string, Set<string>>();
  for (const m of publishedMappings) {
    if (!merchantSetByCat.has(m.category_id)) merchantSetByCat.set(m.category_id, new Set());
    merchantSetByCat.get(m.category_id)!.add(m.merchant_id);
    if (m.category?.parent_id) {
      if (!merchantSetByCat.has(m.category.parent_id)) merchantSetByCat.set(m.category.parent_id, new Set());
      merchantSetByCat.get(m.category.parent_id)!.add(m.merchant_id);
    }
  }

  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    imageUrl: cat.image_url,
    iconName: cat.icon_name || 'Store',
    displayOrder: cat.display_order,
    merchantCount: merchantSetByCat.get(cat.id)?.size || 0,
    subcategories: (cat.subcategories || []).map((sub: any) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      imageUrl: sub.image_url,
      iconName: sub.icon_name,
      merchantCount: merchantSetByCat.get(sub.id)?.size || 0,
    })),
  }));
}

export async function listAdminCategories() {
  await ensureDefaultMerchantCategories();
  const categories = await pAny.merchantCategory.findMany({
    orderBy: [{ parent_id: 'asc' }, { display_order: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { merchants: true, subcategories: true } },
    },
  });
  return categories;
}

export async function createAdminCategory(adminId: string, input: {
  name: string;
  description?: string;
  imageUrl?: string;
  iconName?: string;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const baseSlug = slugifyCategory(input.name);
  let slug = baseSlug;
  const existing = await pAny.merchantCategory.findUnique({ where: { slug } });
  if (existing) slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  const category = await pAny.merchantCategory.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      icon_name: input.iconName?.trim() || null,
      parent_id: input.parentId || null,
      display_order: Number(input.displayOrder || 0),
      is_active: input.isActive !== undefined ? Boolean(input.isActive) : true,
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ADMIN_CATEGORY_CREATED',
      object_type: 'MERCHANT_CATEGORY',
      object_id: category.id,
      metadata: JSON.stringify({ name: category.name, parent_id: category.parent_id }),
    },
  });

  return category;
}

export async function updateAdminCategory(adminId: string, id: string, input: {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  iconName?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const existing = await pAny.merchantCategory.findUnique({ where: { id } });
  if (!existing) throw new Error('Category not found');

  const data: any = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.imageUrl !== undefined) data.image_url = input.imageUrl?.trim() || null;
  if (input.iconName !== undefined) data.icon_name = input.iconName?.trim() || null;
  if (input.parentId !== undefined) data.parent_id = input.parentId || null;
  if (input.displayOrder !== undefined) data.display_order = Number(input.displayOrder);
  if (input.isActive !== undefined) data.is_active = Boolean(input.isActive);

  const updated = await pAny.merchantCategory.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ADMIN_CATEGORY_UPDATED',
      object_type: 'MERCHANT_CATEGORY',
      object_id: id,
      metadata: JSON.stringify(data),
    },
  });

  return updated;
}

export async function deleteAdminCategory(adminId: string, id: string) {
  const existing = await pAny.merchantCategory.findUnique({ where: { id } });
  if (!existing) throw new Error('Category not found');

  await pAny.merchantCategory.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ADMIN_CATEGORY_DELETED',
      object_type: 'MERCHANT_CATEGORY',
      object_id: id,
      metadata: JSON.stringify({ name: existing.name }),
    },
  });

  return { deleted: true, id };
}

export async function listPublicMerchants(filters: {
  q?: string;
  category?: string;
  subcategory?: string;
  verifiedOnly?: boolean;
  location?: string;
  sort?: 'popularity' | 'recent' | 'engagement';
  page?: number;
  limit?: number;
}) {
  await ensureDefaultMerchantCategories();

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(48, Math.max(1, Number(filters.limit || 18)));
  const q = filters.q?.trim() || '';
  const location = filters.location?.trim() || '';

  const where: any = {
    status: 'ACTIVE',
    store: {
      is: {
        publication_status: 'PUBLISHED',
      },
    },
  };

  if (filters.verifiedOnly) {
    where.is_verified = true;
    where.verification_status = 'VERIFIED';
    where.OR = [
      { verification_expires_at: null },
      { verification_expires_at: { gt: new Date() } },
    ];
  }

  if (location) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { location: { contains: location, mode: 'insensitive' } },
        { store: { location: { contains: location, mode: 'insensitive' } } },
      ],
    });
  }

  const targetCatSlug = filters.subcategory?.trim() || filters.category?.trim();
  if (targetCatSlug) {
    where.AND = where.AND || [];
    where.AND.push({
      category_mappings: {
        some: {
          category: {
            OR: [
              { slug: targetCatSlug },
              { id: targetCatSlug },
              { parent: { slug: targetCatSlug } },
              { parent: { id: targetCatSlug } },
            ],
          },
        },
      },
    });
  }

  if (q) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { business_name: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { store: { store_name: { contains: q, mode: 'insensitive' } } },
        { store: { description: { contains: q, mode: 'insensitive' } } },
        {
          category_mappings: {
            some: {
              category: { name: { contains: q, mode: 'insensitive' } },
            },
          },
        },
        {
          products: {
            some: {
              status: 'ACTIVE',
              publication_status: 'PUBLISHED',
              name: { contains: q, mode: 'insensitive' },
            },
          },
        },
      ],
    });
  }

  const merchants = await pAny.merchant.findMany({
    where,
    include: {
      store: true,
      category_mappings: {
        include: {
          category: {
            include: { parent: { select: { id: true, name: true, slug: true } } },
          },
        },
        orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
      },
      _count: {
        select: {
          followers: true,
          customers: true,
          posts: { where: { is_published: true } },
          products: { where: { status: 'ACTIVE', publication_status: 'PUBLISHED' } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const formatted = merchants.map((m: any) => {
    const verified = isMerchantCurrentlyVerified(m);
    const primaryMapping = m.category_mappings?.find((cm: any) => cm.is_primary) || m.category_mappings?.[0];
    const primaryCategory = primaryMapping?.category || null;
    const followersCount = Number(m._count?.followers || 0);
    const productsCount = Number(m._count?.products || 0);
    const customersCount = Number(m._count?.customers || 0);
    const postsCount = Number(m._count?.posts || 0);

    return {
      id: m.id,
      slug: m.store?.slug || m.id,
      businessName: m.business_name,
      storeName: m.store?.store_name || m.business_name,
      description: m.store?.description || '',
      logoUrl: m.store?.logo_url || m.logo_url || null,
      coverImageUrl: m.store?.cover_image_url || null,
      location: m.store?.location || m.location || null,
      isVerified: verified,
      primaryCategory: primaryCategory
        ? {
            id: primaryCategory.id,
            name: primaryCategory.name,
            slug: primaryCategory.slug,
            parentName: primaryCategory.parent?.name || null,
          }
        : null,
      categories: (m.category_mappings || []).map((cm: any) => ({
        id: cm.category.id,
        name: cm.category.name,
        slug: cm.category.slug,
        isPrimary: cm.is_primary,
      })),
      stats: {
        followersCount,
        productsCount,
        customersCount,
        postsCount,
      },
      createdAt: m.created_at,
    };
  });

  const sort = filters.sort || 'popularity';
  formatted.sort((a: any, b: any) => {
    if (sort === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === 'engagement') {
      const scoreB = b.stats.followersCount * 2 + b.stats.customersCount * 3 + b.stats.postsCount;
      const scoreA = a.stats.followersCount * 2 + a.stats.customersCount * 3 + a.stats.postsCount;
      if (scoreB !== scoreA) return scoreB - scoreA;
    }
    // Default popularity: verified first, then followers + products + customers
    if (a.isVerified !== b.isVerified) return b.isVerified ? 1 : -1;
    const popB = b.stats.followersCount * 2 + b.stats.productsCount + b.stats.customersCount;
    const popA = a.stats.followersCount * 2 + a.stats.productsCount + a.stats.customersCount;
    return popB - popA;
  });

  const total = formatted.length;
  const start = (page - 1) * limit;
  const items = formatted.slice(start, start + limit);

  // Distinct available locations for filter dropdown
  const locations = Array.from(
    new Set(formatted.map((m: any) => m.location).filter(Boolean))
  ).slice(0, 30);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    locations,
  };
}

export async function getPublicMerchantProfile(slugOrId: string, followerKey?: string | null) {
  await ensureDefaultMerchantCategories();

  // First try resolving via MerchantStore slug (or previous slugs) or Merchant ID
  let store = await pAny.merchantStore.findUnique({
    where: { slug: slugOrId },
    include: {
      merchant: true,
    },
  });

  if (!store) {
    const merchantById = await pAny.merchant.findUnique({
      where: { id: slugOrId },
      include: { store: true },
    });
    if (merchantById?.store) {
      store = { ...merchantById.store, merchant: merchantById };
    }
  }

  if (!store || store.publication_status !== 'PUBLISHED' || store.merchant?.status !== 'ACTIVE') {
    return null;
  }

  const merchant = store.merchant;
  const verified = isMerchantCurrentlyVerified(merchant);

  const [
    productsRaw,
    storeCategories,
    merchantCategoryMappings,
    posts,
    followersCount,
    customersCount,
    existingFollow,
  ] = await Promise.all([
    pAny.product.findMany({
      where: {
        merchant_id: merchant.id,
        status: 'ACTIVE',
        publication_status: 'PUBLISHED',
      },
      orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
    }),
    pAny.storeCategory.findMany({
      where: { store_id: store.id, status: 'ACTIVE' },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    }),
    pAny.merchantCategoryMapping.findMany({
      where: { merchant_id: merchant.id },
      include: { category: { include: { parent: true } } },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    }),
    pAny.merchantPost.findMany({
      where: { merchant_id: merchant.id, is_published: true },
      orderBy: { created_at: 'desc' },
      take: 30,
    }),
    pAny.merchantFollower.count({ where: { merchant_id: merchant.id } }),
    pAny.customer.count({ where: { merchant_id: merchant.id } }),
    followerKey
      ? pAny.merchantFollower.findUnique({
          where: {
            merchant_id_follower_key: {
              merchant_id: merchant.id,
              follower_key: followerKey,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const products = (productsRaw || []).map((p: any) => serializePublicProduct(p, store.show_sold_out_badges));
  const primaryMapping = merchantCategoryMappings.find((cm: any) => cm.is_primary) || merchantCategoryMappings[0];

  return {
    merchant: {
      id: merchant.id,
      slug: store.slug,
      username: `@${store.slug}`,
      businessName: merchant.business_name,
      storeName: store.store_name,
      description: store.description || '',
      logoUrl: store.logo_url || merchant.logo_url || null,
      coverImageUrl: store.cover_image_url || null,
      location: store.location || merchant.location || null,
      website: merchant.website || null,
      contactPhone: store.contact_phone || merchant.business_phone || null,
      whatsappNumber: store.whatsapp_number || merchant.whatsapp_number || null,
      contactEmail: store.contact_email || merchant.email || null,
      isVerified: verified,
      verifiedAt: verified ? merchant.verified_at : null,
      primaryCategory: primaryMapping?.category
        ? {
            id: primaryMapping.category.id,
            name: primaryMapping.category.name,
            slug: primaryMapping.category.slug,
            parentName: primaryMapping.category.parent?.name || null,
          }
        : null,
      categories: merchantCategoryMappings.map((cm: any) => ({
        id: cm.category.id,
        name: cm.category.name,
        slug: cm.category.slug,
        isPrimary: cm.is_primary,
      })),
    },
    store: serializePublicStore(store),
    stats: {
      postsCount: posts.length,
      followersCount,
      customersCount,
      productsCount: products.length,
    },
    isFollowing: Boolean(existingFollow),
    storeCategories: storeCategories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
    })),
    products,
    posts: posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      caption: post.caption,
      imageUrl: post.image_url,
      productId: post.product_id,
      likesCount: post.likes_count,
      createdAt: post.created_at,
    })),
  };
}

export async function toggleFollowMerchant(
  slugOrId: string,
  followerKey: string,
  userId?: string | null,
  followerName?: string | null
) {
  let store = await pAny.merchantStore.findUnique({
    where: { slug: slugOrId },
    select: { merchant_id: true, publication_status: true },
  });
  let merchantId = store?.merchant_id;

  if (!merchantId) {
    const merchant = await pAny.merchant.findUnique({
      where: { id: slugOrId },
      select: { id: true, status: true },
    });
    if (!merchant || merchant.status !== 'ACTIVE') {
      throw new Error('Merchant not found');
    }
    merchantId = merchant.id;
  }

  const existing = await pAny.merchantFollower.findUnique({
    where: {
      merchant_id_follower_key: {
        merchant_id: merchantId,
        follower_key: followerKey,
      },
    },
  });

  let following = false;
  if (existing) {
    await pAny.merchantFollower.delete({ where: { id: existing.id } });
    following = false;
  } else {
    await pAny.merchantFollower.create({
      data: {
        merchant_id: merchantId,
        follower_key: followerKey,
        user_id: userId || null,
        follower_name: followerName || null,
      },
    });
    following = true;
  }

  const followersCount = await pAny.merchantFollower.count({ where: { merchant_id: merchantId } });
  return { following, followersCount };
}

export async function getMerchantCategoriesSelection(merchantId: string) {
  await ensureDefaultMerchantCategories();
  const [allCategories, mappings] = await Promise.all([
    listPublicCategories(),
    pAny.merchantCategoryMapping.findMany({
      where: { merchant_id: merchantId },
      include: { category: true },
    }),
  ]);

  const primary = mappings.find((m: any) => m.is_primary)?.category_id || null;
  const additional = mappings.filter((m: any) => !m.is_primary).map((m: any) => m.category_id);

  return {
    availableCategories: allCategories,
    primaryCategoryId: primary,
    additionalCategoryIds: additional,
  };
}

export async function updateMerchantCategoriesSelection(
  merchantId: string,
  userId: string,
  primaryCategoryId: string,
  additionalCategoryIds: string[] = []
) {
  const uniqueIds = Array.from(new Set([primaryCategoryId, ...additionalCategoryIds].filter(Boolean)));
  const validCategories = await pAny.merchantCategory.findMany({
    where: { id: { in: uniqueIds }, is_active: true },
    select: { id: true },
  });
  const validSet = new Set(validCategories.map((c: any) => c.id));
  if (!validSet.has(primaryCategoryId)) {
    throw new Error('Selected primary category is invalid or inactive');
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.merchantCategoryMapping.deleteMany({ where: { merchant_id: merchantId } });
    for (const catId of uniqueIds) {
      if (!validSet.has(catId)) continue;
      await tx.merchantCategoryMapping.create({
        data: {
          merchant_id: merchantId,
          category_id: catId,
          is_primary: catId === primaryCategoryId,
        },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'MERCHANT_CATEGORIES_UPDATED',
      object_type: 'MERCHANT',
      object_id: merchantId,
      metadata: JSON.stringify({ primaryCategoryId, additionalCategoryIds }),
    },
  });

  return getMerchantCategoriesSelection(merchantId);
}

export async function listMyMerchantPosts(merchantId: string) {
  return pAny.merchantPost.findMany({
    where: { merchant_id: merchantId },
    orderBy: { created_at: 'desc' },
  });
}

export async function createMyMerchantPost(
  merchantId: string,
  userId: string,
  input: { title?: string; caption: string; imageUrl?: string; productId?: string; isPublished?: boolean }
) {
  if (!input.caption?.trim()) {
    throw new Error('Post caption is required');
  }

  if (input.productId) {
    const ownedProduct = await prisma.product.findFirst({
      where: { id: input.productId, merchant_id: merchantId },
      select: { id: true },
    });
    if (!ownedProduct) {
      throw new Error('Linked product does not belong to this merchant');
    }
  }

  const post = await pAny.merchantPost.create({
    data: {
      merchant_id: merchantId,
      title: input.title?.trim() || null,
      caption: input.caption.trim(),
      image_url: input.imageUrl?.trim() || null,
      product_id: input.productId || null,
      is_published: input.isPublished !== undefined ? Boolean(input.isPublished) : true,
    },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'MERCHANT_POST_CREATED',
      object_type: 'MERCHANT_POST',
      object_id: post.id,
    },
  });

  return post;
}

export async function deleteMyMerchantPost(merchantId: string, userId: string, postId: string) {
  const existing = await pAny.merchantPost.findFirst({
    where: { id: postId, merchant_id: merchantId },
  });
  if (!existing) throw new Error('Post not found');

  await pAny.merchantPost.delete({ where: { id: postId } });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'MERCHANT_POST_DELETED',
      object_type: 'MERCHANT_POST',
      object_id: postId,
    },
  });

  return { deleted: true, id: postId };
}

