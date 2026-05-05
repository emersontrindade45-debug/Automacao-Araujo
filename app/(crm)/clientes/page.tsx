import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Tabela será implementada no M2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
