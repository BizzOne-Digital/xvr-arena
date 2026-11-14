import { Flag, Footprints, Glasses, PartyPopper, Rotate3d, Users } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Family-Friendly", text: "Adventures for nearly every age" },
  { icon: Glasses, title: "Free-Roaming", text: "Wireless VR & MR arena" },
  { icon: Rotate3d, title: "360° Motion Simulator", text: "Racing, flight & more" },
  { icon: Footprints, title: "VR Treadmill", text: "Walk & run inside the game" },
  { icon: Flag, title: "Golf Simulator", text: "Virtual courses year-round" },
  { icon: PartyPopper, title: "Party Room", text: "Birthdays & team events" },
];

export function FeatureStrip() {
  return (
    <section aria-label="Highlights" className="relative border-y border-cyan/20 bg-bg-2/80 backdrop-blur">
      <div className="neon-divider absolute inset-x-0 top-0 opacity-70" />
      <ul className="container-x grid grid-cols-2 gap-px py-2 sm:grid-cols-3 xl:grid-cols-6">
        {FEATURES.map(({ icon: Ico, title, text }, i) => (
          <li
            key={title}
            className={`flex items-center gap-3 px-3 py-5 sm:px-5 ${i > 0 ? "xl:border-l xl:border-cyan/15" : ""}`}
          >
            <Ico className="size-9 shrink-0 text-cyan drop-shadow-[0_0_10px_rgba(0,223,255,0.6)] sm:size-10" strokeWidth={1.6} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display text-[0.98rem] font-bold leading-tight text-ink sm:text-base">{title}</p>
              <p className="text-xs leading-snug text-muted sm:text-[0.8rem]">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
