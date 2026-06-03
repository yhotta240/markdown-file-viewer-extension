export type Settings = {
  theme?: "light" | "dark" | "auto" | "custom";
  fontSize?: number;
  viewMode?: "preview" | "source";
  notifications?: boolean;
  fontFamily?: string;
  customFg?: string;
  customBg?: string;
  maxWidth?: number;
};

export const DEFAULT_SETTINGS: Required<Settings> = {
  theme: "auto",
  fontSize: 16,
  viewMode: "preview",
  notifications: true,
  fontFamily: "system",
  customFg: "#191b1f",
  customBg: "#ffffff",
  maxWidth: 860,
};
