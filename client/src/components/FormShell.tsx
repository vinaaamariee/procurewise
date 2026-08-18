import { cn } from "@/lib/utils";
import type { FormHTMLAttributes, ReactNode } from "react";

export function FormShell({ title, description, icon, children, className, ...props }: FormHTMLAttributes<HTMLFormElement> & { title: string; description: string; icon?: ReactNode }) {
  return <form className={cn("flat-panel p-5 sm:p-6", className)} {...props}><div className="flex items-start justify-between gap-4 border-b border-[#ece8df] pb-4"><div><p className="text-sm font-semibold text-[#34404e]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#77818d]">{description}</p></div>{icon ? <div className="text-[#7b1e1e]">{icon}</div> : null}</div>{children}</form>;
}
