import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { signOutCleanly } from "@/lib/signOut";

export const Route = createFileRoute("/maintenance")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "صيانة مؤقتة — المنصة الخاصة" },
      { name: "description", content: "المنصة في وضع الصيانة مؤقتاً، يرجى المحاولة لاحقاً." },
      { property: "og:title", content: "صيانة مؤقتة — المنصة الخاصة" },
      { property: "og:description", content: "المنصة في وضع الصيانة مؤقتاً، يرجى المحاولة لاحقاً." },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <AuthShell title="صيانة مؤقتة" subtitle="نعمل على تحسينات سريعة، سنعود قريباً">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Wrench className="size-6" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">
          تم تعطيل الوصول مؤقتاً من قِبل المسؤول. سيتم استئناف الخدمة تلقائياً بعد انتهاء الصيانة.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await signOutCleanly(queryClient);
            navigate({ to: "/login", replace: true });
          }}
        >
          تسجيل الخروج
        </Button>
      </div>
    </AuthShell>
  );
}
