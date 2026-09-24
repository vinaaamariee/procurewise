import { cn } from "@/lib/utils";
import type { FormHTMLAttributes, ReactNode } from "react";

export function FormShell({ title, description, icon, children, className, ...props }: FormHTMLAttributes<HTMLFormElement> & { title: string; description: string; icon?: ReactNode }) {
  return <form className={cn("flat-panel p-5 sm:p-6", className)} {...props}><div className="flex items-start justify-between gap-4 border-b border-[#ece8df] dark:border-[#46515c] pb-4"><div><p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#77818d] dark:text-[#aeb9c4]">{description}</p></div>{icon ? <div className="text-[#7b1e1e] dark:text-[#ff837a]">{icon}</div> : null}</div>{children}</form>;
}
