export type Settings = {
  theme?: "light" | "dark" | "auto" | "custom";
  fontSize?: number;
  viewMode?: "preview" | "source";
  fontFamily?: string;
  customFg?: string;
  customBg?: string;
  maxWidth?: number;
  // Text-to-Speech settings
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  autoReadOnLoad?: boolean;
};

export const DEFAULT_SETTINGS: Required<Settings> = {
  theme: "auto",
  fontSize: 16,
  viewMode: "preview",
  fontFamily: "system",
  customFg: "#191b1f",
  customBg: "#ffffff",
  maxWidth: 860,
  ttsEnabled: false,
  ttsVoice: "",
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  autoReadOnLoad: false,
};

export const EXTENSION_SHORT_NAME = chrome.runtime.getManifest().short_name;
export const EXTENSION_VERSION = chrome.runtime.getManifest().version;
