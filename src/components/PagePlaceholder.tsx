import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center">
          <Icon className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">Modul siap dikembangkan</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Form, tabel, dan workflow akan ditambahkan pada iterasi berikutnya.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Tambah Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
