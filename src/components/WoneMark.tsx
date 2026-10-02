import Image from "next/image";

/**
 * Ícone oficial Wone, a partir do arquivo da marca.
 *
 * O PNG tem a geometria correta — chevrons sólidos e anéis com abertura — que a
 * aproximação em SVG não reproduzia. Fundo transparente e laranja chapado, então
 * assenta em qualquer superfície do site.
 */
export function WoneIcon({
  className = "h-8 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/logo-icon.png"
      alt="Wone"
      width={642}
      height={400}
      sizes="64px"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}
