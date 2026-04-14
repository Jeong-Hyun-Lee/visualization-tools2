import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { NewDiagramRequestService } from '../new-diagram-request.service';
import { NodeEditorComponent } from './node-editor.component';

describe('NodeEditorComponent', () => {
  let fixture: ComponentFixture<NodeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [
        NodeEditorComponent,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
      ],
      providers: [NewDiagramRequestService, provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(NodeEditorComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
