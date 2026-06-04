declare module "*.css";

// TypeScript の lib.dom が CSS Custom Highlight API の set/delete を未定義のため補完
interface HighlightRegistry {
  set(key: string, value: Highlight): this;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  get(key: string): Highlight | undefined;
  readonly size: number;
}
