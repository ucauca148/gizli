"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, RefreshCw, Target, TrendingUp, AlertCircle, Loader2 } from "lucide-react"

export default function TrendyolPage() {
  const [competitors, setCompetitors] = useState<any[]>([])
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCompetitors()
  }, [])

  async function fetchCompetitors() {
    const res = await fetch("/api/competitors")
    const data = await res.json()
    if (!data.error) setCompetitors(data)
  }

  async function handleAdd() {
    if (!name || !url) return
    setLoading(true)
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url })
    })
    const data = await res.json()
    if (!data.error) {
      setName("")
      setUrl("")
      fetchCompetitors()
    }
    setLoading(false)
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id)
    const res = await fetch(`/api/competitors/${id}/analyze`, { method: "POST" })
    const data = await res.json()
    if (data.error) {
      alert("Hata: " + data.error)
    }
    fetchCompetitors()
    setAnalyzingId(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white animate-fade-in flex items-center gap-3">
          <TrendingUp className="text-primary h-8 w-8" />
          Trendyol / Rakip Analizi
        </h1>
        <p className="text-zinc-400 font-medium italic">Rakiplerinizin son 24 saatlik satışlarını (yorum tabanlı) anlık takip edin.</p>
      </header>

      {/* Rakip Ekleme Formu */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Yeni Rakip Mağaza Ekle
          </CardTitle>
          <CardDescription>Takip etmek istediğiniz İtemSatış mağaza profil linkini girin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Input 
              placeholder="Mağaza İsmi (Örn: Rakiplerin Kralı)" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/50 border-white/5 text-white h-11"
            />
            <Input 
              placeholder="Profil URL (https://www.itemsatis.com/profil/...)" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-black/50 border-white/5 text-white h-11"
            />
            <Button onClick={handleAdd} disabled={loading} className="bg-primary hover:bg-primary/80 text-white font-bold h-11 px-8 rounded-xl shrink-0 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Takibe Al"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rakip Listesi */}
      <Card className="bg-black/20 border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-zinc-400" />
            Takip Edilen Rakipler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-zinc-300">Mağaza</TableHead>
                  <TableHead className="text-zinc-300">Platform</TableHead>
                  <TableHead className="text-zinc-300 text-center">Son 24 Saat Satış</TableHead>
                  <TableHead className="text-zinc-300">Son Analiz</TableHead>
                  <TableHead className="text-right text-zinc-300">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-zinc-500 italic">
                      Henüz hiç rakip eklemediniz.
                    </TableCell>
                  </TableRow>
                ) : (
                  competitors.map((comp) => {
                    const lastAnalysis = comp.analyses?.[0]
                    return (
                      <TableRow key={comp.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-primary transition-colors">{comp.name}</span>
                            <a href={comp.url} target="_blank" className="text-[10px] text-zinc-500 hover:text-zinc-300 truncate max-w-[200px]">{comp.url}</a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                            {comp.platform}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {lastAnalysis ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                                {lastAnalysis.totalReviews}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-zinc-500">Tahmini Satış</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 italic text-xs">Henüz taranmadı</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs font-medium">
                          {lastAnalysis ? new Date(lastAnalysis.createdAt).toLocaleString("tr-TR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAnalyze(comp.id)}
                            disabled={analyzingId === comp.id}
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-9 px-4 font-bold"
                          >
                            {analyzingId === comp.id ? <Loader2 className="animate-spin h-4 w-4" /> : <><RefreshCw className="h-4 w-4 mr-2" /> Analiz Et</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bilgi Kutusu */}
      <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-primary font-bold">Analiz Mantığı Hakkında</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Bu analiz, rakip mağazanın son 24 saat içinde aldığı ürün yorumlarını saniye saniye takip eder. İtemSatış platformunda her yorum başarılı bir siparişin kanıtı olduğundan, **Yorum Sayısı = Minimum Satış Adedi** olarak raporlanır.
          </p>
        </div>
      </div>
    </div>
  )
}
