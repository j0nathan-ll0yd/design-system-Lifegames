// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface ProfileCardProps {
  avatarUrl: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  createdAt: string;
  publicRepos: number;
}
