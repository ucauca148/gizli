import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { Input } from "@/components/ui/input"

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  let products = []
  let error = null
  const query = (searchParams?.q || "").trim()

  try {
    // Ürünleri güncellenme tarihine göre ters sıralıyoruz
    products = await prisma.product.findMany({
      where: query
        ? {
            OR: [
              { itemsatisProductId: { contains: query, mode: "insensitive" } },
              { title: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
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
        <h1 className="text-2xl font-bold tracking-tight">Ürün Performansı</h1>
        <p className="text-muted-foreground">Mağazanıza eklenmiş, satışı gerçekleşmiş ürünlerin genel durumu ve fiyatları.</p>
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
        <Card>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                <span>Sistemde henüz kayıtlı ürün bulunmuyor.</span>
                <span className="text-xs">Yeni bir webhook siparişi geldiğinde ürün buraya eklenecektir.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>İtemSatış ID</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Son Fiyat</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Son Satış Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[200px] lg:max-w-[400px] truncate" title={p.title}>
                        {p.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.itemsatisProductId}</TableCell>
                      <TableCell>{p.store?.name || "Bilinmiyor"}</TableCell>
                      <TableCell>{Number(p.price)} ₺</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleString('tr-TR') : "Bilinmiyor"}
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
