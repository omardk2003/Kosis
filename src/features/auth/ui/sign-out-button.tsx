"use client";

import { useFormStatus } from "react-dom";
import { useOnline } from "@/components/use-online";

type Props = { label: string; pendingLabel: string; offlineReason: string };

export function SignOutButton({ label, pendingLabel, offlineReason }: Props) {
  const { pending } = useFormStatus();
  const online = useOnline();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="submit"
        className="btn btn-secondary self-start"
        aria-disabled={!online || pending}
        onClick={(event) => {
          if (!online || pending) event.preventDefault();
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {!online ? <p className="text-sm text-text-muted">{offlineReason}</p> : null}
    </div>
  );
}
