import { useEffect, useState } from "react";

export default function ProductMedia({
  src,
  alt,
  fallback,
  style,
  imageStyle,
  children,
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {children}
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 1,
            ...imageStyle,
          }}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
