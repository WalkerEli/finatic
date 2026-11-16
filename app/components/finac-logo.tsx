"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
};

export default function FinaticLogo({
  alt,
  width,
  height,
  priority,
  className,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="inline-flex items-center justify-center font-bold tracking-tight text-blue-700"
        style={{
          minWidth: width / 1.4,
          minHeight: height / 1.4,
        }}
      >
        Finatic
      </span>
    );
  }

  // Display the original Finatic logo.
  return (
    <Image
      src="/assets/Finatic_Logo.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      onError={() => setImageFailed(true)}
    />
  );
}
