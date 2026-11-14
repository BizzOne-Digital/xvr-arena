import { SmartImage } from "@/components/ui/SmartImage";
import { Reveal } from "@/components/ui/Reveal";
import type { GalleryDTO } from "@/lib/data";

export function Gallery({ items }: { items: Pick<GalleryDTO, "image" | "alt" | "caption">[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map((g, i) => (
        <Reveal as="li" key={g.image + i} delay={(i % 4) * 0.05} className={i % 5 === 0 ? "col-span-2 row-span-2" : ""}>
          <figure className="card-neon group relative h-full min-h-40 overflow-hidden">
            <SmartImage src={g.image} alt={g.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
            {g.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg to-transparent p-3 text-sm">{g.caption}</figcaption>
            )}
          </figure>
        </Reveal>
      ))}
    </ul>
  );
}
