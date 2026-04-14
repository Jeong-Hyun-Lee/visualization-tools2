import '@angular/compiler';
import { Component } from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { DiagramComponent } from './diagram.component';

@Component({
  standalone: true,
  imports: [DiagramComponent],
  providers: [provideNgDiagram()],
  template: `<diagram />`,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
  `,
})
export class DiagramWrapperComponent {}
