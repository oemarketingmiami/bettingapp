"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
