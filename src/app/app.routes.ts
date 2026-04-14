import { Routes } from '@angular/router';

import { WorkspacePageComponent } from './workspace/workspace-page.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', component: WorkspacePageComponent },
  { path: 'workspace', component: WorkspacePageComponent },
  { path: '**', redirectTo: '' },
];
