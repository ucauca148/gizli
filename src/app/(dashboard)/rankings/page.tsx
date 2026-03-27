"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, TrendingDown, AlertTriangle, Loader2, Trash2, RefreshCw, Star, Info, ChevronDown, ChevronRight } from "lucide-react"

type Tracker = {
  id: string
  categoryUrl: string
  myStoreUserId: string
}

type Listing = {
  title: string
  url: string
  price: number
  category: string
  rank?: number
}

type AnalysisResult = {
  myListings: Listing[]
  marketCheapest: number
  totalListings: number
  error?: string
}

type CheckStatus = "idle" | "checked" | "error"

type TrackerMeta = {
  status: CheckStatus
  lastCheckedAt?: number
  error?: string
}

type SortMode = "name-asc" | "name-desc" | "rank-asc" | "rank-desc"
type FilterMode = "all" | "has-results" | "no-results" | "has-rank" | "no-rank"

function getCategoryLabel(categoryUrl: string) {
  return categoryUrl
    .split("/")
    .pop()
    ?.replace(".html", "")
    .replace(/-/g, " ")
    .toUpperCase() || "BİLİNMEYEN KATEGORİ"
}

function getBestRank(result?: AnalysisResult) {
  const ranked = result?.myListings?.filter((r) => (r.rank || 0) > 0) || []
  return ranked.length > 0 ? Math.min(...ranked.map((r) => r.rank || 0)) : null
}

function statusBadge(meta?: TrackerMeta) {
  if (!meta || meta.status === "idle") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 text-zinc-400">Kontrol edilmedi</span>
  }
  if (meta.status === "error") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Hata</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">Kontrol edildi</span>
}

export default function RankingsPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [categoryUrl, setCategoryUrl] = useState("")
  const [myStoreUserId, setMyStoreUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({})
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})
  const [trackerMeta, setTrackerMeta] = useState<Record<string, TrackerMeta>>({})
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [sortMode, setSortMode] = useState<SortMode>("name-asc")
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })

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
    setCheckingIds((prev) => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/rankings/${id}`, { method: "POST" })
    const data: AnalysisResult = await res.json()

    if (!data.error) {
      setAnalysisResults((prev) => ({ ...prev, [id]: data }))
      setTrackerMeta((prev) => ({
        ...prev,
        [id]: {
          status: "checked",
          lastCheckedAt: Date.now(),
        },
      }))
    } else {
      setTrackerMeta((prev) => ({
        ...prev,
        [id]: {
          status: "error",
          error: data.error,
          lastCheckedAt: Date.now(),
        },
      }))
    }
    setCheckingIds((prev) => ({ ...prev, [id]: false }))
  }

  async function runBatch(ids: string[]) {
    if (ids.length === 0 || batchRunning) return
    setBatchRunning(true)
    setBatchProgress({ done: 0, total: ids.length })

    const queue = [...ids]
    const concurrency = 2

    async function worker() {
      while (queue.length > 0) {
        const id = queue.shift()
        if (!id) return
        await handleRefresh(id)
        setBatchProgress((prev) => ({ ...prev, done: prev.done + 1 }))
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
    setBatchRunning(false)
  }

  const visibleTrackers = useMemo(() => {
    let list = trackers.filter((tracker) => {
      const label = getCategoryLabel(tracker.categoryUrl)
      const matchesSearch =
        label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tracker.myStoreUserId.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      const result = analysisResults[tracker.id]
      const bestRank = getBestRank(result)
      const foundCount = result?.myListings?.length || 0

      if (filterMode === "has-results") return foundCount > 0
      if (filterMode === "no-results") return foundCount === 0
      if (filterMode === "has-rank") return !!bestRank
      if (filterMode === "no-rank") return !bestRank
      return true
    })

    list = [...list].sort((a, b) => {
      const labelA = getCategoryLabel(a.categoryUrl)
      const labelB = getCategoryLabel(b.categoryUrl)
      const rankA = getBestRank(analysisResults[a.id]) ?? 999999
      const rankB = getBestRank(analysisResults[b.id]) ?? 999999

      if (sortMode === "name-asc") return labelA.localeCompare(labelB, "tr")
      if (sortMode === "name-desc") return labelB.localeCompare(labelA, "tr")
      if (sortMode === "rank-asc") return rankA - rankB
      return rankB - rankA
    })

    return list
  }, [trackers, analysisResults, filterMode, searchTerm, sortMode])

  const selectedVisibleIds = visibleTrackers.map((t) => t.id).filter((id) => selectedIds[id])
  const allVisibleSelected = visibleTrackers.length > 0 && selectedVisibleIds.length === visibleTrackers.length

  function toggleSelectAllVisible(checked: boolean) {
    const next = { ...selectedIds }
    for (const tracker of visibleTrackers) {
      next[tracker.id] = checked
    }
    setSelectedIds(next)
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
      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Kategori Yönetimi</CardTitle>
              <CardDescription>
                50+ kategori için hızlı arama, filtreleme ve toplu kontrol araçları.
              </CardDescription>
            </div>
            <div className="text-xs text-zinc-500">
              Toplam {trackers.length} kategori, görünür {visibleTrackers.length} kategori
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kategori/mağaza ara..."
              className="bg-black/50 border-white/5"
            />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="h-10 rounded-md border border-white/10 bg-black/50 px-3 text-sm text-zinc-300"
            >
              <option value="all">Tüm sonuçlar</option>
              <option value="has-results">Bulunan ilanı olanlar</option>
              <option value="no-results">Bulunan ilanı olmayanlar</option>
              <option value="has-rank">Sırası bulunanlar</option>
              <option value="no-rank">Sırası olmayanlar</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-10 rounded-md border border-white/10 bg-black/50 px-3 text-sm text-zinc-300"
            >
              <option value="name-asc">Kategori A-Z</option>
              <option value="name-desc">Kategori Z-A</option>
              <option value="rank-asc">En iyi sıra (artan)</option>
              <option value="rank-desc">En iyi sıra (azalan)</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-300"
                onClick={() => runBatch(selectedVisibleIds)}
                disabled={selectedVisibleIds.length === 0 || batchRunning}
              >
                {batchRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Seçilileri Yenile
              </Button>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-300"
                onClick={() => runBatch(visibleTrackers.map((t) => t.id))}
                disabled={visibleTrackers.length === 0 || batchRunning}
              >
                Tüm Görünenleri Yenile
              </Button>
            </div>
          </div>

          {batchRunning && (
            <div className="text-xs text-zinc-400">
              Toplu kontrol ilerlemesi: {batchProgress.done}/{batchProgress.total}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Mağaza</TableHead>
                  <TableHead className="text-center" title="Kategori içinde bulunan kendi ilan sayısı">Bulunan</TableHead>
                  <TableHead className="text-center" title="Taranan organik ilan adedi">Taranan</TableHead>
                  <TableHead className="text-center">En İyi Sıra</TableHead>
                  <TableHead className="text-center">Pazar En Ucuz</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="text-right">Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTrackers.map((tracker) => {
                  const result = analysisResults[tracker.id]
                  const bestRank = getBestRank(result)
                  const foundCount = result?.myListings?.length || 0
                  const checkedAt = trackerMeta[tracker.id]?.lastCheckedAt
                  const isOpen = !!expandedIds[tracker.id]
                  const isChecking = !!checkingIds[tracker.id]

                  return (
                    <Fragment key={tracker.id}>
                      <TableRow key={tracker.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={!!selectedIds[tracker.id]}
                            onChange={(e) =>
                              setSelectedIds((prev) => ({ ...prev, [tracker.id]: e.target.checked }))
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIds((prev) => ({ ...prev, [tracker.id]: !prev[tracker.id] }))
                            }
                            className="flex items-center gap-2 text-left hover:text-primary"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="truncate text-xs font-semibold">{getCategoryLabel(tracker.categoryUrl)}</span>
                          </button>
                          <p className="text-[11px] text-zinc-500 truncate">{tracker.categoryUrl}</p>
                          {checkedAt && (
                            <p className="text-[10px] text-zinc-500">
                              Son kontrol: {new Date(checkedAt).toLocaleTimeString("tr-TR")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-primary font-semibold">{tracker.myStoreUserId}</TableCell>
                        <TableCell className="text-center text-xs text-primary">{foundCount}</TableCell>
                        <TableCell className="text-center text-xs text-yellow-400">{result?.totalListings ?? "-"}</TableCell>
                        <TableCell className="text-center text-xs font-bold">
                          {bestRank ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">#{bestRank}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-zinc-300">
                          {result ? `${result.marketCheapest ?? 0} ₺` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div title={trackerMeta[tracker.id]?.error}>{statusBadge(trackerMeta[tracker.id])}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefresh(tracker.id)}
                              disabled={isChecking || batchRunning}
                              className="border-white/10 bg-white/5 text-zinc-300"
                            >
                              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(tracker.id)}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="border-white/5 bg-black/20">
                          <TableCell colSpan={9}>
                            {!result ? (
                              <div className="text-xs text-zinc-500 py-2">
                                Henüz analiz sonucu yok. Bu kategori için "Yenile" çalıştırın.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Bulunan İlan</p>
                                    <p className="text-xl font-black text-primary">{result.myListings?.length ?? 0}</p>
                                  </div>
                                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">En İyi Sıra</p>
                                    <p className="text-xl font-black text-emerald-400">{bestRank ? `#${bestRank}` : "-"}</p>
                                  </div>
                                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Taranan İlan</p>
                                    <p className="text-xl font-black text-yellow-500">{result.totalListings ?? 0}</p>
                                  </div>
                                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Pazar En Ucuz</p>
                                    <p className="text-xl font-black text-zinc-300">{result.marketCheapest ?? 0} ₺</p>
                                  </div>
                                </div>

                                {result.myListings?.length > 0 && (
                                  <div className="rounded-lg border border-white/5 overflow-hidden">
                                    <Table>
                                      <TableHeader className="bg-white/5">
                                        <TableRow className="border-white/5">
                                          <TableHead className="text-xs text-zinc-500">İlan Başlığı</TableHead>
                                          <TableHead className="text-xs text-zinc-500 text-center">Fiyat</TableHead>
                                          <TableHead className="text-xs text-zinc-500 text-center">Sıra</TableHead>
                                          <TableHead className="text-xs text-zinc-500 text-right">Durum</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {result.myListings.map((rk, idx) => {
                                          const isCheapest = rk.price > 0 && rk.price <= (result.marketCheapest ?? 0)
                                          const isNoPriceFound = !rk.price || rk.price === 0

                                          return (
                                            <TableRow key={`${tracker.id}-${idx}`} className="border-white/5 hover:bg-white/5">
                                              <TableCell className="text-xs font-medium text-zinc-300 max-w-[260px] truncate">
                                                <a href={rk.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                                                  {rk.title}
                                                </a>
                                              </TableCell>
                                              <TableCell className="text-center font-bold text-white text-xs">
                                                {isNoPriceFound ? <span className="text-zinc-500">Alınamadı</span> : `${rk.price} ₺`}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rk.rank && rk.rank > 0 && rk.rank <= 5 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                                                  {rk.rank && rk.rank > 0 ? `#${rk.rank}` : "-"}
                                                </span>
                                              </TableCell>
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
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
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
