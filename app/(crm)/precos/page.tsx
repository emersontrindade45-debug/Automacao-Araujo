import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Preços" };

export default function PrecosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Preços</h1>
      <Card>
        <CardHeader>
          <CardTitle>Atualização de preços</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Tabela de preços será implementada no M2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
