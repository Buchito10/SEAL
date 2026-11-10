import Image from "next/image";

/** Gold shield with transparent negative space to blend into its host surface. */
export default function BrandLogo({
  size = "default",
  alt = "",
}: {
  size?: "small" | "default" | "large";
  alt?: string;
}) {
  const pixels = size === "large" ? 80 : size === "small" ? 48 : 64;
  return (
    <Image
      src="/brand/seal-escudo-transparente.png"
      unoptimized
      alt={alt}
      width={pixels}
      height={pixels}
      sizes={`${pixels}px`}
      className={`seal-logo seal-logo--${size}`}
    />
  );
}
