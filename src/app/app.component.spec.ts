import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { NewDiagramRequestService } from './new-diagram-request.service';
import { AppPreferencesService } from './app-preferences.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [
        AppComponent,
        RouterTestingModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        NewDiagramRequestService,
        AppPreferencesService,
        provideHttpClient(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have default diagram name`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.diagramName()).toEqual('제목없는 다이어그램');
  });

  it('should render title in toolbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain(
      '제목없는 다이어그램',
    );
  });
});
