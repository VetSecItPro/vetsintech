export const EXTERNAL_PLATFORMS = {
  coursera: {
    name: "Coursera",
    slug: "coursera",
    authType: "oauth2" as const,
    color: "#0056D2",
  },
  pluralsight: {
    name: "Pluralsight",
    slug: "pluralsight",
    authType: "api_key" as const,
    color: "#E80A89",
  },
  udemy: {
    name: "Udemy",
    slug: "udemy",
    authType: "basic" as const,
    color: "#A435F0",
  },
} as const;

export type ExternalPlatform = keyof typeof EXTERNAL_PLATFORMS;
