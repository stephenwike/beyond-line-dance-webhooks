import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The card renderer reads fonts, brand images and photos from assets/ at runtime.
    outputFileTracingIncludes: {
        "/api/card/[id]": ["./assets/**/*"],
        "/api/styles/preview": ["./assets/**/*"],
        "/api/photos/[id]": ["./assets/photos/*"],
    },
};

export default nextConfig;
