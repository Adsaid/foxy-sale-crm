import Image from "next/image";

export const FOX_LOGO_SRC =
  "/vecteezy_simple-vector-logo-featuring-red-fox_29724383_bg_removed.png";

export function AuthFoxLogo() {
  return (
    <div className="mb-3 flex justify-center">
      <Image
        src={FOX_LOGO_SRC}
        alt=""
        width={140}
        height={140}
        className="h-28 w-auto max-w-[180px] object-contain"
        priority
      />
    </div>
  );
}
