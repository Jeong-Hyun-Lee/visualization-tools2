import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import type { SldPaletteItem } from './diagram-palette.types';

@Component({
  selector: 'app-diagram-palette-item',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="palette-item">
      {{ labelKey() | translate }}
    </div>
  `,
  styles: `
    .palette-item {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 0.85rem;
      line-height: 1.15;
      padding: 0.52rem 0.62rem;
      box-sizing: border-box;
      user-select: none;
    }
  `,
})
export class DiagramPaletteItemComponent {
  readonly item = input.required<SldPaletteItem>();

  readonly labelKey = computed(() => this.item().data.labelKey);
}
