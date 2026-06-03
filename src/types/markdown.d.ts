interface DocItem {
  metadata: {
    id: string;
    title: string;
    order: number;
    visible: boolean;
    expanded: boolean;
    date: string;
    lang: string;
  };
  content: string;
}

declare module "*CHANGELOG.md" {
  import type { VersionItem } from "../popup/types";
  const changelog: VersionItem[];
  export default changelog;
}

declare module "*.md" {
  const doc: DocItem;
  export default doc;
}
