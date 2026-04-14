import { Component, input } from '@angular/core';
import {
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
} from 'ng-diagram';

import { DiagramPaletteItemComponent } from './diagram-palette-item.component';
import type { SldPaletteItem } from './diagram-palette.types';

@Component({
  selector: 'app-diagram-palette',
  standalone: true,
  imports: [
    NgDiagramPaletteItemComponent,
    NgDiagramPaletteItemPreviewComponent,
    DiagramPaletteItemComponent,
  ],
  template: `
    <div class="palette">
      @for (paletteItem of items(); track paletteItem.type || $index) {
        <ng-diagram-palette-item class="palette__entry" [item]="paletteItem">
          <app-diagram-palette-item [item]="paletteItem" />
          <ng-diagram-palette-item-preview>
            <app-diagram-palette-item [item]="paletteItem" />
          </ng-diagram-palette-item-preview>
        </ng-diagram-palette-item>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .palette {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
      user-select: none;
    }

    .palette__entry {
      display: block;
      width: 100%;
      cursor: grab;
    }

    .palette__entry:active {
      cursor: grabbing;
    }
  `,
})
export class DiagramPaletteComponent {
  readonly items = input.required<readonly SldPaletteItem[]>();
}
