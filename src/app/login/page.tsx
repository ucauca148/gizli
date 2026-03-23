import { login } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 overflow-hidden bg-[#050505]">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[120px]" />

      <Card className="glass-panel w-full max-w-md animate-slide-up relative z-10 border-white/10 bg-black/60 !shadow-2xl">
        <form action={login}>
          <CardHeader className="space-y-4 pb-6 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.4)]">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-white mt-1">Sisteme Giriş</CardTitle>
              <CardDescription className="text-zinc-400 text-sm max-w-[260px] mx-auto">
                Size özel İtemSatış Yönetim Paneline erişmek için kimliğinizi doğrulayın.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-300 font-semibold px-1">E-posta Adresiniz</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="admin@itemsatis.com" 
                required 
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus:border-primary/50 transition-all h-12 rounded-xl px-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-zinc-300 font-semibold px-1">Güvenlik Şifreniz</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••"
                required 
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus:border-primary/50 transition-all h-12 rounded-xl px-4"
              />
            </div>
            {searchParams?.error && (
              <div className="text-sm font-medium text-red-300 bg-red-950/40 p-3 rounded-lg border border-red-500/20 animate-fade-in text-center flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {searchParams.error}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2 pb-6">
            <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] font-bold text-[15px] transition-all rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95" type="submit">
              Panele Eriş
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
