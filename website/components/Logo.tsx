import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <Image
      src="/efrion-logo.svg"
      alt="EFRION"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      priority
    />
  );
}
