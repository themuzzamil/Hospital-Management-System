"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markBillPaid } from "@/lib/actions";

export default function PayButton({ billId }: { billId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-primary px-3 py-1 text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markBillPaid(billId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Mark paid"}
    </button>
  );
}
