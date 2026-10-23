import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The card renderer reads fonts and brand images from assets/ at runtime.
    outputFileTracingIncludes: { "/api/card/[id]": ["./assets/**/*"] },
};

export default nextConfig;
