'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Truck, Award, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
  const [range, setRange] = useState('TODAY');
  const [analytics, setAnalytics] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSummary, resTop] = await Promise.all([
        fetchApi(`/analytics/summary?range=${range}`),
        fetchApi(`/products/top?sortBy=revenue&limit=5`),
      ]);
      setAnalytics(resSummary);
      setTopProducts(resTop || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const kpis = analytics?.kpis || {
    totalOrders: 0,
    totalSales: 0,
    totalCost: 0,
    grossProfit: 0,
    productsSold: 0,
    deliveriesCreated: 0,
    deliveredCount: 0,
    pendingCount: 0,
    failedCount: 0,
    notificationsSent: 0,
  };

  const comparison = analytics?.comparison || {
    prevTotalSales: 0,
    salesGrowthPct: 0,
  };

  const trend: Array<{ label: string; sales: number; profit?: number }> = analytics?.trend || [];

  const maxSalesInTrend = Math.max(
    trend.reduce((max, d) => Math.max(max, d.sales), 0),
    1000
  );

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartH;

  // Compute SVG Points for Curve
  const points = trend.map((d, i) => {
    const x =
      trend.length === 1
        ? paddingLeft + chartW / 2
        : paddingLeft + (i / (trend.length - 1)) * chartW;
    const y = baselineY - (d.sales / maxSalesInTrend) * chartH;
    return { x, y, label: d.label, sales: d.sales, raw: d };
  });

  // Generate Smooth Bezier Path (Spline / Bell-Curve Style)
  const buildCurvedPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.45;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.55;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const lineD = buildCurvedPath(points);
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Interactive Business Analytics</h1>
            <p className="text-xs sm:text-sm text-slate-400">Sales performance, profit margins, fulfillment velocity & growth metrics</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 w-full lg:w-auto">
          {/* Period Selector (Horizontal Scrollable on Mobile) */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'Week' },
              { id: 'THIS_MONTH', label: 'Month' },
              { id: 'THIS_YEAR', label: 'Year' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  range === p.id
                    ? 'bg-[#FF5500] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700 shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            TZS {kpis.totalSales.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {comparison.salesGrowthPct >= 0 ? (
              <span className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{comparison.salesGrowthPct}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {comparison.salesGrowthPct}%
              </span>
            )}
            <span className="text-slate-400">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            TZS {kpis.grossProfit.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Margin: <strong>{kpis.totalSales > 0 ? Math.round((kpis.grossProfit / kpis.totalSales) * 100) : 0}%</strong> of revenue
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Orders & Products</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.totalOrders} Orders</p>
          <p className="text-xs text-slate-500 mt-2">
            <strong>{kpis.productsSold}</strong> individual products sold
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Fulfillment & SMS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {kpis.deliveredCount} <span className="text-xs text-emerald-600 font-semibold uppercase">Delivered</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            <strong>{kpis.notificationsSent}</strong> automated SMS sent
          </p>
        </div>
      </div>

      {/* Visual Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Smooth Curve Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider text-xs text-amber-700">
                SALES REVENUE VELOCITY (TSH TREND)
              </h3>
              <p className="text-xs text-slate-500">Smooth deposit & revenue inflow curve across time periods</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono font-semibold">
              Period: {range}
            </span>
          </div>

          <div className="relative w-full overflow-x-auto">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF5500]" />
              </div>
            ) : trend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No sales trend data available for this selection
              </div>
            ) : (
              <div className="relative">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto max-h-64 overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97706" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#FF5500" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#D97706" />
                      <stop offset="50%" stopColor="#FF5500" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = paddingTop + chartH * (1 - pct);
                    const val = Math.round(maxSalesInTrend * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          stroke="#F1F5F9"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 3}
                          fill="#94A3B8"
                          fontSize="9"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${(val / 1000).toFixed(0)}k`
                            : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Curve Fill Area */}
                  {areaD && <path d={areaD} fill="url(#areaGradient)" />}

                  {/* Main Curved Line Path */}
                  {lineD && (
                    <path
                      d={lineD}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points / Glowing Dots */}
                  {points.map((pt, idx) => (
                    <g key={idx} className="cursor-pointer group" onMouseEnter={() => setHoveredPoint(pt)}>
                      {/* Outer Glow Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="7"
                        fill="#F59E0B"
                        fillOpacity="0.2"
                        className="transition-transform group-hover:scale-150"
                      />
                      {/* Inner Solid Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#D97706"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />

                      {/* X Axis Label */}
                      <text
                        x={pt.x}
                        y={baselineY + 20}
                        fill="#64748B"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Hover Tooltip Popup */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                      left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                      top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                    }}
                  >
                    <p className="font-bold">{hoveredPoint.label}</p>
                    <p className="text-amber-400 font-mono">TZS {hoveredPoint.sales.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-[#FF5500]" />
              <span>Smooth Deposit & Revenue Inflow Velocity</span>
            </div>
            <span>Peak Revenue: TZS {maxSalesInTrend.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Products Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">Top Selling Products</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {topProducts.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">No product sales records yet</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.orderCount} orders • {p.totalQty} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">TZS {p.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">+TZS {p.totalProfit.toLocaleString()} profit</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
