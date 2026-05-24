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
