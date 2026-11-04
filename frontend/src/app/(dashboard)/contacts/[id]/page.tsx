"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/contacts?id=${id}`);
    } else {
      router.replace("/contacts");
    }
  }, [params, router]);

  return (
    <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
      Loading contact details...
    </div>
  );
}
