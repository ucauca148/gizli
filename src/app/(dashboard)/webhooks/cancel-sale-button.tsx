"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelSaleFromWebhookAction } from "./actions";
import { Loader2, Ban } from "lucide-react";

type Props = {
  webhookEventId: string;
  show: boolean;
};

export function CancelSaleButton({ webhookEventId, show }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!show) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs border-orange-500/40 text-orange-200 hover:bg-orange-950/40"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const r = await cancelSaleFromWebhookAction(webhookEventId);
            setMsg(r.message);
            if (r.ok) router.refresh();
          });
        }}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Ban className="h-3.5 w-3.5" />
        )}
        <span className="ml-1.5">Manuel iptal</span>
      </Button>
      {msg ? (
        <span
          className={`text-[10px] max-w-[140px] text-right leading-tight ${
            msg.includes("iptal edildi") || msg.includes("güncellendi")
              ? "text-emerald-400"
              : "text-zinc-500"
          }`}
        >
          {msg}
        </span>
      ) : null}
    </div>
  );
}
