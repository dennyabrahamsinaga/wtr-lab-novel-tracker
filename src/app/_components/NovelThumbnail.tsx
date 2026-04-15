import Image from "next/image";

function shouldBypassOptimizer(src: string) {
  return src.includes("www.wtr-lab.com/api/v2/img") || src.includes("img.wtr-lab.com");
}

export function NovelThumbnail({
  src,
  alt = "",
  sizes,
  className,
}: {
  src: string;
  alt?: string;
  sizes: string;
  className?: string;
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} unoptimized={shouldBypassOptimizer(src)} className={className} />;
}
