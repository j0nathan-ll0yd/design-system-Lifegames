export interface StoryBackground {
  name: string
  value: `#${string}`
}

export declare const STORY_BACKGROUNDS: {dark: StoryBackground; light: StoryBackground}
export declare const INITIAL_BACKGROUND: keyof typeof STORY_BACKGROUNDS
