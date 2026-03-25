"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, RefreshCw, Target, TrendingUp, AlertCircle, Loader2, ExternalLink, BrainCircuit, ChevronDown, ChevronUp, Trash2, Package, Clock } from "lucide-react"

export default function TrendyolPage() {
  const [competitors, setCompetitors] = useState<any[]>([])
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [days, setDays] = useState("30")
  const [loading, setLoading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({})

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
    } else {
      alert("Hata: " + data.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu rakibi takip listesinden çıkarmak istediğine emin misin?")) return
    await fetch(`/api/competitors/${id}`, { method: "DELETE" })
    fetchCompetitors()
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id)
    const res = await fetch(`/api/competitors/${id}/analyze`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days })
    })
    const data = await res.json()
    if (data.error) alert("Hata: " + data.error)
    fetchCompetitors()
    setAnalyzingId(null)
  }

  async function handleAIAnalysis(id: string) {
    setAiLoadingId(id)
    const res = await fetch(`/api/competitors/${id}/ai-analysis`, { method: "POST" })
    const data = await res.json()
    if (data.error) {
      alert("Hata: " + data.error)
    } else {
      setAiInsights(prev => ({ ...prev, [id]: data.insight }))
    }
    setAiLoadingId(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-white animate-fade-in flex items-center gap-3">
            <TrendingUp className="text-primary h-10 w-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            Rakip Analiz Merkezi
          </h1>
          <p className="text-zinc-400 font-medium italic text-lg">
            İtemSatış rakiplerinizin satışlarını ve ürün bazlı stratejilerini Gemini AI ile çözün.
          </p>
        </div>
      </header>

      {/* Kontrol Paneli: Zaman Aralığı */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold px-2">
          <Clock className="h-4 w-4 text-primary" />
          Analiz Aralığı:
        </div>
        {[
          { label: "24 Saat", value: "1" },
          { label: "3 Gün", value: "3" },
          { label: "7 Gün", value: "7" },
          { label: "30 Gün", value: "30" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setDays(item.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              days === item.value 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                : "bg-white/5 text-zinc-500 hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Rakip Ekleme Formu */}
      <Card className="glass-panel relative overflow-hidden border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-primary" />
            Yeni Rakip Ekle
          </CardTitle>
          <CardDescription className="text-zinc-500">Takip listenize herhangi bir mağaza Profil linkini ekleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 px-1 italic">Mağaza İsmi</label>
              <Input 
                placeholder="Örn: Rakiplerin Kralı" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/50 border-white/5 text-white h-12 rounded-xl focus:ring-primary/50"
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 px-1 italic">Diğer Mağaza URL</label>
              <Input 
                placeholder="İstediğiniz profil linkini kopyalayıp buraya yapıştırın" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-black/50 border-white/5 text-white h-12 rounded-xl focus:ring-primary/50"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={loading} className="bg-primary hover:bg-primary/80 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Listeye Ekle"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rakip Listesi */}
      <div className="grid gap-6">
        {competitors.length === 0 ? (
          <Card className="bg-black/20 border-white/5 border-dashed py-20 text-center">
            <CardContent>
              <Target className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium tracking-wide">Henüz takip edilen bir rakip bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          competitors.map((comp) => {
            const lastAnalysis = comp.analyses?.[0]
            const productMap = lastAnalysis?.resultJson as Record<string, any> || {}
            const isExpanded = expandedId === comp.id

            return (
              <Card key={comp.id} className={`transition-all duration-300 border-white/5 ${isExpanded ? 'bg-zinc-900/40 ring-1 ring-primary/20' : 'bg-black/30 hover:bg-black/40'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-2xl font-black text-white">{comp.name}</CardTitle>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase tracking-tighter">AKTİF TAKİP</span>
                      </div>
                      <a href={comp.url} target="_blank" className="text-xs text-zinc-500 hover:text-primary flex items-center gap-1 transition-colors">
                        {comp.url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center px-6 border-r border-white/5">
                        <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Tespit Edilen Satış</p>
                        <p className="text-3xl font-black text-emerald-400 leading-none tracking-tight">
                          {lastAnalysis ? lastAnalysis.totalReviews : "-"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleAnalyze(comp.id)}
                            disabled={analyzingId === comp.id}
                            className="h-9 bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 rounded-lg text-xs"
                          >
                            {analyzingId === comp.id ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                            {days} Günlük Tara
                          </Button>
                          <Button 
                            onClick={() => handleDelete(comp.id)}
                            variant="destructive"
                            className="h-9 w-9 p-0 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button 
                          onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                          variant="ghost" 
                          className="h-9 text-zinc-400 hover:text-white text-xs font-bold"
                        >
                          {isExpanded ? <><ChevronUp className="h-4 w-4 mr-1" /> Kapat</> : <><ChevronDown className="h-4 w-4 mr-1" /> Detaylar</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          Satılan Ürünler
                        </h4>
                        <div className="rounded-xl border border-white/5 overflow-hidden bg-black/20 max-h-[400px] overflow-y-auto custom-scrollbar">
                          <Table>
                            <TableHeader className="bg-white/5 sticky top-0 z-10">
                              <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="text-[11px] font-bold text-zinc-500">İlan</TableHead>
                                <TableHead className="text-[11px] font-bold text-zinc-500 text-center">Adet</TableHead>
                                <TableHead className="text-[11px] font-bold text-zinc-500 text-right">Git</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.keys(productMap).length > 0 ? (
                                Object.entries(productMap)
                                  .sort(([, a], [, b]) => b.count - a.count)
                                  .map(([key, p]) => (
                                    <TableRow key={key} className="border-white/5 hover:bg-white/5 group">
                                      <TableCell className="text-xs font-medium text-zinc-300 max-w-[200px] truncate group-hover:text-white">{p.title}</TableCell>
                                      <TableCell className="text-center font-bold text-emerald-400 text-sm group-hover:scale-110 transition-transform">{p.count}</TableCell>
                                      <TableCell className="text-right">
                                        <a href={p.link} target="_blank" className="text-zinc-500 hover:text-primary transition-colors">
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-10 text-zinc-600 italic text-xs">Veri henüz taranmadı.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-primary" />
                            AI Strateji Raporu
                          </h4>
                          <Button 
                            onClick={() => handleAIAnalysis(comp.id)}
                            disabled={aiLoadingId === comp.id || !lastAnalysis}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 px-4 rounded-lg text-[10px] shadow-lg shadow-purple-900/20 active:scale-95 transition-all"
                          >
                            {aiLoadingId === comp.id ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <BrainCircuit className="h-3.5 w-3.5 mr-2" />}
                            RAPORU GÜNCELLE
                          </Button>
                        </div>
                        <div className="min-h-[250px] bg-zinc-950/50 border border-white/5 rounded-3xl p-6 text-sm text-zinc-300 leading-relaxed relative overflow-hidden group">
                          {aiInsights[comp.id] ? (
                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap animate-in fade-in duration-500">
                              {aiInsights[comp.id]}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20 group-hover:opacity-30 transition-opacity">
                              <BrainCircuit className="h-12 w-12" />
                              <p className="text-xs text-center max-w-[200px]">Rakip stratejisini analiz etmek için butona bas.</p>
                            </div>
                          )}
                          {!aiInsights[comp.id] && aiLoadingId === comp.id && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                              <div className="relative">
                                <Loader2 className="animate-spin h-10 w-10 text-primary" />
                                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white animate-pulse" />
                              </div>
                              <span className="font-bold text-primary animate-pulse tracking-widest text-xs uppercase">AI Analiz Ediyor...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
