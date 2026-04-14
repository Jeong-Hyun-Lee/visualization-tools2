import type { BasePaletteItemData, NgDiagramPaletteItem } from 'ng-diagram';

export interface SldPaletteItemData extends BasePaletteItemData {
  kind: string;
  labelKey: string;
}

export type SldPaletteItem = NgDiagramPaletteItem<SldPaletteItemData>;
