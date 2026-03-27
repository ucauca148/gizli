import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

// Her zaman taze datayı görmek için full dinamik
export const revalidate = 0
export const dynamic = 'force-dynamic'

function formatEventTypeLabel(raw: string) {
  const event = (raw || "").toLowerCase()
  if (event === "sale" || event === "advert_sold") return "Satış"
  if (event === "refund") return "İade"
  if (event === "new_review") return "Yeni Değerlendirme"
  if (event === "review_received") return "Yeni Değerlendirme"
  if (event === "question_asked") return "Soru Cevap"
  if (event === "sms_sent") return "SMS"
  if (event === "stock_finished") return "Stok Bitti"
  if (event === "withdrawal_approved") return "Çekim Onaylandı"
  if (event === "doping_expired") return "Doping Süresi Doldu"
  if (event === "cancelled" || event === "order.cancelled") return "İptal"
  if (event === "order.created") return "Sipariş Oluştu"
  if (event === "order.approved") return "Sipariş Onaylandı"
  if (event === "product.out_of_stock") return "Stok Bitti"
  if (!event || event === "unknown") return "Bilinmiyor"
  return event
}

function scoreBadge(score: number | string | undefined) {
  const n = Number(score)
  if (!Number.isFinite(n)) return "text-zinc-400"
  if (n >= 9) return "text-emerald-400"
  if (n >= 7) return "text-yellow-400"
  return "text-red-400"
}

function renderStatus(status: string, eventType: string) {
  const event = eventType.toLowerCase()
  if (status === "PROCESSED") {
    const label = event === "sale" || event === "advert_sold" ? "Onaylandı" : "İşlendi"
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        {label}
      </span>
    )
  }
  if (status === "CANCELLED") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
        İptal
      </span>
    )
  }
  if (status === "ACTION_REQUIRED") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
        Aksiyon Gerekli
      </span>
    )
  }
  if (status === "INFO") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        Bilgi
      </span>
    )
  }
  if (status === "FAILED") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
        Hata
      </span>
    )
  }
  if (status === "UNMAPPED") {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
        Eşleşmedi
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
      {status}
    </span>
  )
}

export default async function WebhooksPage() {
  let hooks = []
  let error = null

  try {
    hooks = await prisma.webhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 50
    })
  } catch (e: any) {
    error = e.message
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Webhook Log Merkezi</h1>
        <p className="text-muted-foreground">İtemSatış'tan gelen son 50 webhook ham isteği ve işlenme durumu.</p>
      </div>

      {error ? (
         <Card className="border-destructive bg-destructive/10">
           <CardHeader>
             <CardTitle className="text-destructive">Veritabanı Hatası</CardTitle>
             <CardDescription className="text-destructive/80">{error}</CardDescription>
           </CardHeader>
         </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {hooks.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                <span>Henüz hiç webhook logu bulunmuyor.</span>
                <span className="text-xs">Sistem yeni webhook bekliyor...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Olay Tipi</TableHead>
                    <TableHead>İlan</TableHead>
                    <TableHead className="text-right w-[120px]">Fiyat</TableHead>
                    <TableHead>Statü</TableHead>
                    <TableHead>Detay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hooks.map((h) => (
                    <TableRow key={h.id}>
                      {(() => {
                        const payload = (h.payloadJson as any) || {}
                        const details = payload.details || {}
                        const eventType = (h.eventType || details.event || "unknown").toString().toLowerCase()
                        const reviewRating = details?.review?.rating || {}
                        const advertId = details?.advert?.id ? String(details.advert.id) : ""
                        const rowTitle =
                          details?.advert?.title ||
                          payload?.title ||
                          details?.sender?.username ||
                          details?.asker?.username ||
                          "-"
                        const priceRaw =
                          details?.advert?.price ||
                          details?.data?.amount ||
                          details?.amount

                        let priceText = "-"
                        if (priceRaw != null) {
                          const n = Number(priceRaw)
                          priceText = Number.isFinite(n) ? `${n.toFixed(2)} TL` : `${priceRaw} TL`
                        } else if (eventType === "withdrawal_approved") {
                          const innerRaw = details?.data?.details
                          if (typeof innerRaw === "string") {
                            try {
                              const parsed = JSON.parse(innerRaw)
                              const n = Number(parsed?.amount)
                              if (Number.isFinite(n)) priceText = `${n.toFixed(2)} TL`
                            } catch {
                              // ignore
                            }
                          }
                        }

                        return (
                          <>
                      <TableCell className="whitespace-nowrap">
                        {new Date(h.receivedAt).toLocaleString('tr-TR', { timeZone: "Europe/Istanbul" })}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {h.source?.replace("ITEMSatis-", "") || "Bilinmiyor"}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatEventTypeLabel(
                          eventType
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate" title={rowTitle}>
                        {advertId ? (
                          <Link
                            href={`/products?q=${encodeURIComponent(advertId)}`}
                            className="text-primary hover:underline"
                            title="Ürün kapsamında bu ilanı aç"
                          >
                            {rowTitle}
                          </Link>
                        ) : (
                          rowTitle
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold whitespace-nowrap">
                        {priceText}
                      </TableCell>
                      <TableCell>
                        {renderStatus(h.status, eventType)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] lg:max-w-[460px]">
                        {eventType === "review_received" ? (
                          <div className="flex items-center gap-2 font-semibold">
                            <span className={scoreBadge(reviewRating.iletisim)}>İ:{reviewRating.iletisim ?? "-"}</span>
                            <span className={scoreBadge(reviewRating.teslimat)}>T:{reviewRating.teslimat ?? "-"}</span>
                            <span className={scoreBadge(reviewRating.memnuniyet)}>M:{reviewRating.memnuniyet ?? "-"}</span>
                            <span className={scoreBadge(reviewRating.guvenilirlik)}>G:{reviewRating.guvenilirlik ?? "-"}</span>
                          </div>
                        ) : eventType === "sale" || eventType === "advert_sold" ? (
                          <span title={details?.customer?.name || ""} className="truncate block">
                            Alıcı: {details?.customer?.name || details?.customer?.username || "Bilinmiyor"}
                          </span>
                        ) : (
                          <span title={h.errorMessage || ""} className="truncate block">
                            {h.errorMessage || "-"}
                          </span>
                        )}
                      </TableCell>
                          </>
                        )
                      })()}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
