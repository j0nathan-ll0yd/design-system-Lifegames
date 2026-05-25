// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface IdentityCardProps {
  profile: {
    name: string;
    title: string;
    bio: string;
    github: string;
    linkedin: string;
    tagline?: string;
    site?: string;
    mastodon?: string;
    bluesky?: string;
  };
  compact?: boolean;
}
