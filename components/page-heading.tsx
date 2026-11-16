import { Eyebrow } from "@/components/ui/eyebrow";

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-5 text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
        {description}
      </p>
    </div>
  );
}
