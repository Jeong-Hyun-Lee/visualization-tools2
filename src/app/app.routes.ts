import { Routes } from '@angular/router';

import { NodeEditorComponent } from './node-editor/node-editor.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', component: NodeEditorComponent },
  { path: 'editor', component: NodeEditorComponent },
  { path: '**', redirectTo: '' },
];
