"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthFoxLogo } from "@/components/auth/auth-fox-logo";
import { authService } from "@/services/auth-service";

export function PendingApprovalContent({ email }: { email: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["auth", "me"] });
      toast.success("Ви вийшли з облікового запису");
      router.push("/login");
    },
    onError: () => toast.error("Не вдалося вийти"),
  });

  return (
    <main className="flex min-h-[80vh] flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AuthFoxLogo />
          <CardTitle className="text-2xl">Очікування підтвердження</CardTitle>
          <CardDescription className="text-pretty">
            Ваш обліковий запис <span className="font-medium text-foreground">{email}</span> ще не
            підтверджено. Після схвалення ви зможете користуватися системою.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full"
          >
            Вийти
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
