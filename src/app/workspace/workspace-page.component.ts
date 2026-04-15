import '@angular/compiler';
import { Component } from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { WorkspaceComponent } from './workspace.component';

@Component({
  standalone: true,
  imports: [WorkspaceComponent],
  providers: [provideNgDiagram()],
  template: `<app-workspace [storageKey]="'workspace-route'" />`,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
  `,
})
export class WorkspacePageComponent {}
