import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

import { resolveImageUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type AppImageProps = {
  reference: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function AppImage({ reference, alt, className, eager }: AppImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setUsingFallback(false);
    resolveImageUrl(reference).then((value) => {
      if (active) setUrl(value);
    });
    return () => {
      active = false;
    };
  }, [reference]);

  async function handleImageError() {
    if (usingFallback) {
      setFailed(true);
      return;
    }
    const fallback = await resolveImageUrl(reference, true);
    if (fallback && fallback !== url) {
      setUsingFallback(true);
      setUrl(fallback);
      return;
    }
    setFailed(true);
  }

  if (!url || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary text-muted-foreground",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => void handleImageError()}
      className={className}
    />
  );
}
