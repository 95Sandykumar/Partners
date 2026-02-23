'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  ClipboardCheck,
  TrendingUp,
  Target,
  Upload,
  Building2,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '@/types/po';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[13px] font-medium text-muted-foreground tracking-wide">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-[28px] font-semibold tracking-tight text-foreground">{value}</div>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const { data: recentPOs } = useQuery({
    queryKey: ['recent-pos'],
    queryFn: async () => {
      const res = await fetch('/api/po?limit=5&sort=created_at&order=desc');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const PIE_COLORS = ['#34C759', '#FF9500', '#FF3B30'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Overview of your PO processing activity
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="rounded-xl shadow-sm h-10 px-5 text-[13px] font-medium">
            <Upload className="mr-2 h-4 w-4" />
            Upload PO
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="POs Today"
              value={stats?.pos_today ?? 0}
              icon={FileText}
              description="Purchase orders received today"
            />
            <StatCard
              title="Pending Reviews"
              value={stats?.pending_reviews ?? 0}
              icon={ClipboardCheck}
              description="Awaiting operator review"
            />
            <StatCard
              title="Avg Confidence"
              value={`${(stats?.avg_confidence ?? 0).toFixed(1)}%`}
              icon={TrendingUp}
              description="Average extraction confidence"
            />
            <StatCard
              title="Match Rate"
              value={`${(stats?.match_rate ?? 0).toFixed(1)}%`}
              icon={Target}
              description="Part number auto-match rate"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Recent Purchase Orders</CardTitle>
            <a href="/api/po/export?status=approved">
              <Button variant="ghost" size="sm" className="rounded-lg text-[13px] text-muted-foreground hover:text-foreground">
                <Download className="mr-1 h-3.5 w-3.5" />
                Export
              </Button>
            </a>
          </CardHeader>
          <CardContent>
            {recentPOs && recentPOs.length > 0 ? (
              <div className="space-y-2">
                {recentPOs.map((po: Record<string, unknown>) => (
                  <Link
                    key={po.id as string}
                    href={`/dashboard/review/${po.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 p-3.5 hover:bg-black/[0.02] transition-all duration-200"
                  >
                    <div>
                      <p className="font-medium text-[13px] text-foreground">PO #{po.po_number as string}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(po.created_at as string).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className="rounded-full text-[11px] font-medium"
                      variant={
                        po.status === 'approved'
                          ? 'default'
                          : po.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {(po.status as string).replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  No purchase orders yet. Upload your first PO to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/upload" className="block">
              <div className="flex items-center gap-3.5 rounded-xl border border-border/60 p-3.5 hover:bg-black/[0.02] transition-all duration-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-[13px] text-foreground">Upload PO</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Process a new purchase order
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/review" className="block">
              <div className="flex items-center gap-3.5 rounded-xl border border-border/60 p-3.5 hover:bg-black/[0.02] transition-all duration-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34C759]/8">
                  <ClipboardCheck className="h-5 w-5 text-[#34C759]" />
                </div>
                <div>
                  <p className="font-medium text-[13px] text-foreground">Review Queue</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Review pending extractions
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/vendors" className="block">
              <div className="flex items-center gap-3.5 rounded-xl border border-border/60 p-3.5 hover:bg-black/[0.02] transition-all duration-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5856D6]/8">
                  <Building2 className="h-5 w-5 text-[#5856D6]" />
                </div>
                <div>
                  <p className="font-medium text-[13px] text-foreground">Manage Vendors</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Add or edit vendor templates
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">PO Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[250px] w-full rounded-xl" />
            ) : analytics?.posOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.posOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    tickFormatter={(d) => String(d).slice(5)}
                    axisLine={{ stroke: '#E8E8ED' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(d) => new Date(String(d)).toLocaleDateString()}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E8E8ED', fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#007AFF" radius={[4, 4, 0, 0]} name="POs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[250px] w-full rounded-xl" />
            ) : analytics?.confidenceDistribution?.some((d: { count: number }) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.confidenceDistribution}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    strokeWidth={2}
                    stroke="#FFFFFF"
                  >
                    {analytics.confidenceDistribution.map((_: unknown, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E8ED', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">POs by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[250px] w-full rounded-xl" />
            ) : analytics?.vendorBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.vendorBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    axisLine={{ stroke: '#E8E8ED' }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="vendor"
                    type="category"
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    width={120}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E8E8ED', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#5856D6" radius={[0, 4, 4, 0]} name="POs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Match Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[250px] w-full rounded-xl" />
            ) : analytics?.matchRateTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.matchRateTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    tickFormatter={(d) => String(d).slice(5)}
                    axisLine={{ stroke: '#E8E8ED' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#86868B' }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(d) => new Date(String(d)).toLocaleDateString()}
                    formatter={(v) => [`${v}%`, 'Match Rate']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E8E8ED', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#34C759"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#34C759', strokeWidth: 2, stroke: '#FFFFFF' }}
                    name="Match Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-[13px] text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
