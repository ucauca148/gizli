import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"

// Her zaman taze datayı görmek için full dinamik
export const revalidate = 0
export const dynamic = 'force-dynamic'

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
                    <TableHead>Olay Tipi</TableHead>
                    <TableHead>Statü</TableHead>
                    <TableHead>Hata Mesajı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hooks.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(h.receivedAt).toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {h.eventType || "Bilinmiyor"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          h.status === 'PROCESSED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          h.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          h.status === 'UNMAPPED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {h.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] lg:max-w-[400px] truncate" title={h.errorMessage || ""}>
                        {h.errorMessage || "-"}
                      </TableCell>
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
