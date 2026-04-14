import { Routes } from '@angular/router';

import { DiagramWrapperComponent } from './example/diagram-wrapper.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', component: DiagramWrapperComponent },
  { path: 'example', component: DiagramWrapperComponent },
  { path: '**', redirectTo: '' },
];
