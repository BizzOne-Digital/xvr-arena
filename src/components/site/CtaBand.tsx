import Link from "next/link";
import { CalendarDays, Gamepad2 } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function CtaBand({
  title = "Ready to enter the arena?",
  text = "Pick your experience, choose a time and lock in your adventure online in minutes.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="container-x mt-24">
      <Reveal>
        <div className="card-neon is-red relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div className="grid-bg absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="absolute -top-24 left-1/2 h-48 w-[60%] -translate-x-1/2 rounded-full bg-red/25 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="section-title text-3xl sm:text-5xl">{title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">{text}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/booking" className="btn btn-red">
                <CalendarDays className="size-5" aria-hidden="true" /> Book an Adventure
              </Link>
              <Link href="/games" className="btn btn-cyan">
                <Gamepad2 className="size-5" aria-hidden="true" /> Explore Our Games
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
