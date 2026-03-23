import { ReactNode } from "react"
import Link from "next/link"
import { LayoutDashboard, ShoppingCart, Package, Webhook, Brain, StickyNote, Settings, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex h-screen bg-[#030303] text-zinc-100 overflow-hidden selection:bg-primary/30">
      {/* Premium Gradient Overlays */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
      
      {/* Sidebar - Glassmorphism */}
      <div className="z-10 hidden w-72 flex-col border-r border-white/5 bg-black/30 backdrop-blur-3xl md:flex shadow-2xl">
        <div className="flex h-20 items-center px-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 border border-white/10">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              İtemSatış Pro
            </span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 space-y-1 custom-scrollbar">
          <p className="px-4 text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Modüller</p>
          <SidebarNav />
        </div>
        
        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
            <div className="flex items-center gap-3 px-1">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-extrabold text-white shadow-md border border-white/10">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col w-[120px]">
                <span className="text-sm font-semibold truncate text-zinc-200" title={user.email}>{user.email}</span>
                <span className="text-[10px] uppercase text-emerald-400 tracking-wider font-bold">Yönetici</span>
              </div>
            </div>
            <form action={async () => {
              "use server"
              const supabaseAction = createClient()
              await supabaseAction.auth.signOut()
              redirect("/login")
            }}>
              <Button variant="ghost" size="sm" className="w-full gap-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl justify-start h-10 transition-colors">
                <LogOut className="h-4 w-4" />
                Güvenli Çıkış
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col relative z-20 min-w-0">
        <header className="flex h-16 items-center gap-4 border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 md:hidden sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300">İtemSatış Pro</span>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarNav() {
  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Kapsamlı Özet' },
    { href: '/orders', icon: ShoppingCart, label: 'Siparişler' },
    { href: '/products', icon: Package, label: 'Ürün Kapsamı' },
    { href: '/webhooks', icon: Webhook, label: 'Canlı Loglar' },
    { href: '/ai-insights', icon: Brain, label: 'Yapay Zeka', highlight: true },
  ]
  return (
    <nav className="grid gap-1.5">
      {navItems.map((item) => (
        <Link 
          key={item.href} 
          href={item.href} 
          className="group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <item.icon className="h-4 w-4 transition-colors group-hover:text-primary" />
            {item.label}
          </div>
          {item.highlight && (
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(168,85,247,0.9)] animate-pulse relative z-10" />
          )}
          {/* Hover highlight effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary/40 to-transparent transition-opacity" />
        </Link>
      ))}
      <p className="px-4 text-[11px] font-bold text-zinc-600 uppercase tracking-widest mt-6 mb-3">Sistem</p>
      <Link href="#" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 transition-all hover:bg-white/5 hover:text-white pointer-events-none opacity-50">
        <StickyNote className="h-4 w-4 transition-colors group-hover:text-primary" /> Takım Notları
      </Link>
      <Link href="#" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 transition-all hover:bg-white/5 hover:text-white pointer-events-none opacity-50">
        <Settings className="h-4 w-4 transition-colors group-hover:text-primary" /> Ayarlar
      </Link>
    </nav>
  )
}
