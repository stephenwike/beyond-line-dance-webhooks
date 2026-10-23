function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

export const env = {
    instructorId: () => required("INSTRUCTOR_ID"),
    defaultTimeZone: () => process.env.DEFAULT_TIME_ZONE || "America/Denver",
    siteUrl: () => (process.env.SITE_URL || "https://beyondlinedance.com").replace(/\/$/, ""),
    adminUrl: () => (process.env.ADMIN_URL || "").replace(/\/$/, ""),
    /** Only "live" reaches Facebook; anything else is a dry run. */
    publishLive: () => process.env.FACEBOOK_PUBLISH === "live",
    fbPageId: () => required("FB_PAGE_ID"),
    fbPageToken: () => required("FB_PAGE_TOKEN"),
    fbGraphVersion: () => process.env.FB_GRAPH_VERSION || "v25.0",
};
