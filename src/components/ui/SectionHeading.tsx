import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  align = "left",
  as: H = "h2",
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10", align === "center" && "text-center", className)}>
      {eyebrow && <p className="eyebrow mb-3 text-sm">{eyebrow}</p>}
      <div className={cn("flex items-center gap-4", align === "center" && "justify-center")}>
        <span className="h-[3px] w-8 shrink-0 rounded-full bg-cyan shadow-[0_0_12px_#00dfff]" aria-hidden="true" />
        <H className="section-title text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</H>
        {align === "center" && <span className="h-[3px] w-8 shrink-0 rounded-full bg-cyan shadow-[0_0_12px_#00dfff]" aria-hidden="true" />}
      </div>
      {subtitle && <p className={cn("mt-4 max-w-2xl text-base text-muted sm:text-lg", align === "center" && "mx-auto")}>{subtitle}</p>}
    </Reveal>
  );
}
