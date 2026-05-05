import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Kanban" };

export default function KanbanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Kanban</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm">Board será implementado no M2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
