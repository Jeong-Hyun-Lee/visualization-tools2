import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NodeEditorComponent } from './node-editor/node-editor.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: NodeEditorComponent },
  { path: 'editor', component: NodeEditorComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
