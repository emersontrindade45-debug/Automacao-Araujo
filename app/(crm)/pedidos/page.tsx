import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Pedidos" };

export default function PedidosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Lista será implementada no M2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
