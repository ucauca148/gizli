import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export const revalidate = 0
export const dynamic = 'force-dynamic'

type SaleRow = {
  advertId: string
  advertTitle: string
  price: number
  buyer: string
  saleAt: Date
  store: string
  eventId: string
}

function parseWebhookSaleRow(hook: any): SaleRow | null {
  const payload = (hook.payloadJson as any) || {}
  const details = payload.details || {}
  const advert = details.advert || {}
  const customer = details.customer || {}

  const eventType = String(hook.eventType || details.event || "").toLowerCase()
  if (eventType !== "sale" && eventType !== "advert_sold") return null

  const advertId = advert?.id ? String(advert.id) : ""
  if (!advertId) return null

  const rawPrice = advert?.price
  const price = Number(rawPrice)
  const validPrice = Number.isFinite(price) ? price : 0

  const saleUnix = Number(details?.time)
  const saleAt = Number.isFinite(saleUnix) && saleUnix > 0
    ? new Date(saleUnix * 1000)
    : new Date(hook.receivedAt)

  return {
    advertId,
    advertTitle: String(advert?.title || payload?.title || "Bilinmeyen İlan"),
    price: validPrice,
    buyer: String(customer?.name || customer?.username || "Bilinmiyor"),
    saleAt,
    store: String(hook.source || "ITEMSatis").replace("ITEMSatis-", ""),
    eventId: String(hook.id),
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  let sales: SaleRow[] = []
  let error = null
  const query = (searchParams?.q || "").trim()

  try {
    const hooks = await prisma.webhookEvent.findMany({
      where: {
        status: "PROCESSED",
        OR: [{ eventType: "sale" }, { eventType: "advert_sold" }],
      },
      orderBy: { receivedAt: "desc" },
      take: 5000,
    })

    const parsed = hooks
      .map(parseWebhookSaleRow)
      .filter((x): x is SaleRow => !!x)

    const filtered = query
      ? parsed.filter(
          (row) =>
            row.advertId.toLowerCase().includes(query.toLowerCase()) ||
            row.advertTitle.toLowerCase().includes(query.toLowerCase())
        )
      : parsed

    sales = filtered
  } catch (e: any) {
    error = e.message
  }

  const groupedByAdvert = new Map<string, SaleRow[]>()
  for (const row of sales) {
    const key = `${row.store}::${row.advertId}`
    if (!groupedByAdvert.has(key)) groupedByAdvert.set(key, [])
    groupedByAdvert.get(key)!.push(row)
  }

  const advertSummaries = Array.from(groupedByAdvert.entries())
    .map(([compositeKey, rows]) => {
      const sorted = [...rows].sort((a, b) => b.saleAt.getTime() - a.saleAt.getTime())
      const last = sorted[0]
      return {
        compositeKey,
        advertId: last.advertId,
        advertTitle: last.advertTitle,
        store: last.store,
        lastPrice: last.price,
        totalSales: rows.length,
        lastSaleAt: last.saleAt,
        lastBuyer: last.buyer,
      }
    })
    .sort((a, b) => b.lastSaleAt.getTime() - a.lastSaleAt.getTime())

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Ürün Performansı</h1>
        <p className="text-muted-foreground">Webhook ile gelen satışlara göre ilanlarınız ve alıcı geçmişi.</p>
        <div className="mt-3">
          <Input
            readOnly
            value={query}
            placeholder="Filtre yok (webhooktan gelince burada otomatik dolar)"
            className="max-w-md"
          />
        </div>
      </div>

      {error ? (
         <Card className="border-destructive bg-destructive/10">
           <CardHeader>
             <CardTitle className="text-destructive">Veritabanı Hatası</CardTitle>
             <CardDescription className="text-destructive/80">{error}</CardDescription>
           </CardHeader>
         </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-0">
            {advertSummaries.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                <span>Henüz satış webhook’u bulunmuyor.</span>
                <span className="text-xs">Satış geldikçe ilanlar burada otomatik oluşacak.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İlan Adı</TableHead>
                    <TableHead>İtemSatış ID</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Son Fiyat</TableHead>
                    <TableHead>Toplam Satış</TableHead>
                    <TableHead>Son Alıcı</TableHead>
                    <TableHead>Son Satış Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertSummaries.map((p) => (
                    <TableRow key={p.compositeKey}>
                      <TableCell className="font-medium max-w-[200px] lg:max-w-[400px] truncate" title={p.advertTitle}>
                        {p.advertTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.advertId}</TableCell>
                      <TableCell>{p.store || "Bilinmiyor"}</TableCell>
                      <TableCell>{Number(p.lastPrice).toFixed(2)} ₺</TableCell>
                      <TableCell>{p.totalSales}</TableCell>
                      <TableCell>{p.lastBuyer}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(p.lastSaleAt).toLocaleString('tr-TR', { timeZone: "Europe/Istanbul" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>Satış Geçmişi (Son 200)</CardTitle>
            <CardDescription>Webhook’tan akan satış kayıtları (alan kişi + fiyat + tarih).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İlan</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Alıcı</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Mağaza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 200).map((s) => (
                  <TableRow key={s.eventId}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(s.saleAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate" title={s.advertTitle}>
                      <Link
                        href={`/webhooks?q=${encodeURIComponent(s.advertId)}`}
                        className="text-primary hover:underline"
                      >
                        {s.advertTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.advertId}</TableCell>
                    <TableCell>{s.buyer}</TableCell>
                    <TableCell>{s.price.toFixed(2)} ₺</TableCell>
                    <TableCell>{s.store}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
