import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export const revalidate = 0
export const dynamic = 'force-dynamic'

async function markOrderCancelled(formData: FormData) {
  "use server"
  const id = String(formData.get("id") || "")
  if (!id) return

  await prisma.order.update({
    where: { id },
    data: { status: "CANCELLED" },
  })

  revalidatePath("/orders")
  revalidatePath("/")
}

export default async function OrdersPage() {
  let orders = []
  let error = null

  try {
    orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        store: true
      }
    })
  } catch (e: any) {
    error = e.message
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Sipariş Yönetimi</h1>
        <p className="text-muted-foreground">Sisteme başarıyla loglanmış son 50 sipariş.</p>
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
            {orders.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                Henüz hiç sipariş kaydı bulunmuyor.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İtemSatış ID</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.itemsatisOrderId}</TableCell>
                      <TableCell>{o.store?.name || "Bilinmiyor"}</TableCell>
                      <TableCell>{Number(o.totalAmount)} ₺</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          o.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          o.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {o.status === "APPROVED" ? "Onaylandı" : o.status === "CANCELLED" ? "İptal" : "Bekliyor"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {o.status !== "CANCELLED" && (
                          <form action={markOrderCancelled}>
                            <input type="hidden" name="id" value={o.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                            >
                              İptal Et
                            </Button>
                          </form>
                        )}
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
