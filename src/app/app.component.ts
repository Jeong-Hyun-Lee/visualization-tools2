import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  AppLanguage,
  AppPreferencesService,
  AppTheme,
} from './app-preferences.service';
import { NewDiagramRequestService } from './new-diagram-request.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterOutlet,
    TranslateModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
})
export class AppComponent {
  title = 'GE Vernova';

  readonly theme = this.preferences.themeState;
  readonly language = this.preferences.languageState;

  constructor(
    private readonly newDiagramRequest: NewDiagramRequestService,
    private readonly preferences: AppPreferencesService,
    private readonly translate: TranslateService,
  ) {
    this.preferences.syncDom();
    this.translate.setDefaultLang('ko');
    effect(() => {
      this.translate.use(this.language());
    });
  }

  onRequestNewDiagram(): void {
    this.newDiagramRequest.requestNew();
  }

  onThemeSelect(theme: AppTheme): void {
    this.preferences.setTheme(theme);
  }

  onLanguageSelect(lang: AppLanguage): void {
    this.preferences.setLanguage(lang);
  }
}
