import { magazine } from "@/config/magazine";
import { siteCopy } from "@/content/site";

export function CoverArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label={magazine.name + " sample cover artwork"}
      className={
        "relative flex aspect-[0.72] w-full flex-col justify-between overflow-hidden border border-line bg-mist p-5 text-ink sm:p-7 " +
        (compact ? "max-w-[230px]" : "max-w-[370px]")
      }
      role="img"
    >
      <div className="flex items-center justify-between border-b border-ink/20 pb-3 text-[10px] font-semibold uppercase tracking-[0.17em]">
        <span>{magazine.name}</span>
        <span>May 2026</span>
      </div>
      <div className="my-auto py-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf">
          {magazine.departmentShort}
        </p>
        <p className="mt-3 max-w-[10ch] font-serif text-4xl leading-[0.95] tracking-[-0.05em] sm:text-5xl">
          {siteCopy.cover.headline}
        </p>
        <p className="mt-5 max-w-[22ch] text-xs leading-5 text-muted">
          {siteCopy.cover.note}
        </p>
      </div>
      <div className="flex items-end justify-between border-t border-ink/20 pt-3 text-[10px] uppercase tracking-[0.15em] text-muted">
        <span>{magazine.universityShort}</span>
        <span>{siteCopy.cover.label}</span>
      </div>
    </div>
  );
}
