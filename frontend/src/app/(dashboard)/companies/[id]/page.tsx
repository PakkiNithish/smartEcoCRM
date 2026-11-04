"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/companies?id=${id}`);
    } else {
      router.replace("/companies");
    }
  }, [params, router]);

  return (
    <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
      Loading company details...
    </div>
  );
}
