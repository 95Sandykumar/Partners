'use client';

import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Settings, LogOut, User, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/upload': 'Upload PO',
  '/dashboard/review': 'Review Queue',
  '/dashboard/pos': 'Purchase Orders',
  '/dashboard/vendors': 'Vendor Management',
  '/dashboard/mappings': 'Part Mappings',
  '/dashboard/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || '');
    });
  }, [supabase]);

  const title = pageTitles[pathname] ||
    (pathname.startsWith('/dashboard/review/') ? 'PO Review' : 'Dashboard');

  const initials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between bg-white/72 dark:bg-gray-950/72 backdrop-blur-xl border-b border-border/60 px-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity hover:opacity-80">
            <Avatar className="h-8 w-8 shadow-sm">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/60">
          <div className="px-3 py-2">
            <p className="text-[13px] font-medium text-foreground">{userEmail}</p>
          </div>
          <DropdownMenuSeparator className="opacity-60" />
          <DropdownMenuItem className="rounded-lg text-[13px]" onClick={() => router.push('/dashboard/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg text-[13px]" onClick={() => router.push('/dashboard/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="opacity-60" />
          <DropdownMenuItem className="rounded-lg text-[13px]" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
