"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Target, TrendingDown, AlertTriangle, Loader2, Trash2, ExternalLink, RefreshCw, Star, Info } from "lucide-react"

export default function RankingsPage() {
  const [trackers, setTrackers] = useState<any[]>([])
  const [categoryUrl, setCategoryUrl] = useState("")
  const [myStoreUserId, setMyStoreUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchTrackers()
  }, [])

  async function fetchTrackers() {
    const res = await fetch("/api/rankings")
    const data = await res.json()
    setTrackers(data)
  }

  async function handleAdd() {
    if (!categoryUrl || !myStoreUserId) return
    setLoading(true)
    const res = await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryUrl, myStoreUserId })
    })
    if (res.ok) {
      setCategoryUrl("")
      fetchTrackers()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kategori takibini silmek istediğine emin misin?")) return
    await fetch(`/api/rankings/${id}`, { method: "DELETE" })
    fetchTrackers()
  }

  async function handleRefresh(id: string) {
    setCheckingId(id)
    const res = await fetch(`/api/rankings/${id}`, { method: "POST" })
    const data = await res.json()
    if (!data.error) {
      setAnalysisResults(prev => ({ ...prev, [id]: data }))
    } else {
      alert("Hata: " + data.error)
    }
    setCheckingId(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-black text-white flex items-center gap-3">
          <Search className="text-primary h-10 w-10" />
          İlan Sıralama Takibi
        </h1>
        <p className="text-zinc-400 mt-2">Kategorilerdeki ilanlarınızın yerini görün ve rakiplerinizin fiyatlarını izleyin.</p>
      </header>

      {/* Tracker Ekleme */}
      <Card className="glass-panel border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Yeni Kategori Takibi
          </CardTitle>
          <CardDescription>Takip etmek istediğiniz kategori URL'sini ve mağaza isminizi girin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Kategori URL (Örn: https://www.itemsatis.com/ilanlar/valorant-hesap-satisi.html)" 
                value={categoryUrl}
                onChange={(e) => setCategoryUrl(e.target.value)}
                className="bg-black/50 border-white/5 h-12 rounded-xl"
              />
            </div>
            <div className="md:w-64">
              <Input 
                placeholder="Senin Mağaza İsmin" 
                value={myStoreUserId}
                onChange={(e) => setMyStoreUserId(e.target.value)}
                className="bg-black/50 border-white/5 h-12 rounded-xl"
              />
            </div>
            <Button onClick={handleAdd} disabled={loading} className="h-12 px-8 bg-primary hover:bg-primary/80">
              {loading ? <Loader2 className="animate-spin" /> : "Takibe Al"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Takip Listesi */}
      <div className="grid gap-6">
        {trackers.map((tracker) => {
          const result = analysisResults[tracker.id]
          
          return (
            <Card key={tracker.id} className="bg-zinc-900/40 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-md text-white truncate max-w-[400px]">
                    {tracker.categoryUrl.split("/").pop()?.replace(".html", "").replace(/-/g, " ").toUpperCase()}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="text-primary font-bold">{tracker.myStoreUserId}</span> 
                    mağazası için takip ediliyor
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRefresh(tracker.id)}
                    disabled={checkingId === tracker.id}
                    className="border-white/10 bg-white/5 text-zinc-300"
                  >
                    {checkingId === tracker.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sıralama Kontrolü
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tracker.id)} className="h-9 w-9 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              {result && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Bulunan İlan</p>
                      <p className="text-2xl font-black text-primary">{result.myListings?.length ?? 0}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">En İyi Sıran</p>
                      <p className="text-2xl font-black text-emerald-400">
                        {(() => {
                          const ranked = result.myListings?.filter((r: any) => r.rank > 0) || [];
                          return ranked.length > 0 ? `#${Math.min(...ranked.map((r: any) => r.rank))}` : "-";
                        })()}
                      </p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Taranan İlan</p>
                      <p className="text-2xl font-black text-yellow-500">{result.totalListings ?? 0}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Pazar En Ucuz</p>
                      <p className="text-2xl font-black text-zinc-400">{result.marketCheapest ?? 0} ₺</p>
                    </div>
                  </div>

                  {result.myListings?.length > 0 && (
                    <div className="rounded-xl border border-white/5 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="border-white/5">
                            <TableHead className="text-xs text-zinc-500">İlan Başlığı</TableHead>
                            <TableHead className="text-xs text-zinc-500 text-center">Fiyat</TableHead>
                            <TableHead className="text-xs text-zinc-500 text-center">Sıra</TableHead>
                            <TableHead className="text-xs text-zinc-500 text-center">Kategori</TableHead>
                            <TableHead className="text-xs text-zinc-500 text-right">Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.myListings.map((rk: any, idx: number) => {
                            const marketMin = result.marketCheapest ?? 0;
                            const isCheapest = rk.price > 0 && rk.price <= marketMin;
                            const isNoPriceFound = !rk.price || rk.price === 0;

                            return (
                              <TableRow key={idx} className="border-white/5 hover:bg-white/5">
                                <TableCell className="text-xs font-medium text-zinc-300 max-w-[260px] truncate">
                                  <a href={rk.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                                    {rk.title}
                                  </a>
                                </TableCell>
                                <TableCell className="text-center font-bold text-white">
                                  {isNoPriceFound ? <span className="text-zinc-500 text-xs">Alınamadı</span> : `${rk.price} ₺`}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rk.rank > 0 && rk.rank <= 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                    {rk.rank > 0 ? `#${rk.rank}` : "-"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-xs text-zinc-400">{rk.category}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isNoPriceFound && <AlertTriangle className="h-4 w-4 text-zinc-500" />}
                                    {!isNoPriceFound && !isCheapest && <TrendingDown className="h-4 w-4 text-yellow-500" />}
                                    {isCheapest && <Star className="h-4 w-4 text-emerald-500" />}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
      
      {/* Bilgilendirme */}
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          <strong>İpucu:</strong> Tüm kategori taranarak <strong>gerçek sıranız</strong> hesaplanmaktadır. Eğer sıra kısmında "-" görüyorsanız ilanınız organik aramalarda taranan sayfalarda çıkmamıştır (sadece profilinizden bulunmuştur).
          Sıralamanızı artırmak için ilanınızı öne çıkarabilir veya fiyatınızı piyasanın <strong>en ucuz fiyatına</strong> yaklaştırabilirsiniz.
        </p>
      </div>
    </div>
  )
}
