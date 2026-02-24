'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Upload,
  ClipboardCheck,
  FileText,
  Building2,
  Link2,
  Package,
  Settings,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload PO', href: '/dashboard/upload', icon: Upload },
  { name: 'Review Queue', href: '/dashboard/review', icon: ClipboardCheck },
  { name: 'All POs', href: '/dashboard/pos', icon: FileText },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Part Mappings', href: '/dashboard/mappings', icon: Link2 },
  { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white/72 dark:bg-gray-950/72 backdrop-blur-xl border-r border-border/60">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
          <FileText className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">POFlow</span>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px]', isActive && 'text-primary')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator className="opacity-60" />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl text-[13px] text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
