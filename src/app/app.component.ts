import { ChangeDetectionStrategy, Component, computed, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  AppLanguage,
  AppPreferencesService,
  AppTheme,
} from './app-preferences.service';
import { DiagramPagesService } from './diagram-pages.service';

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
    MatChipsModule,
    MatMenuModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
})
export class AppComponent {
  readonly pages = this.diagramPages.pages;
  readonly activePageIndex = this.diagramPages.activeIndex;
  readonly theme = this.preferences.themeState;
  readonly language = this.preferences.languageState;
  readonly diagramName = computed(
    () => this.diagramPages.activePage()?.name ?? '제목없는 다이어그램',
  );

  constructor(
    private readonly diagramPages: DiagramPagesService,
    private readonly preferences: AppPreferencesService,
    private readonly translate: TranslateService,
  ) {
    this.preferences.syncDom();
    this.translate.setDefaultLang('ko');
    effect(() => {
      this.translate.use(this.language());
    });
  }

  onAddPage(): void {
    this.diagramPages.addUntitledPage();
  }

  onThemeSelect(theme: AppTheme): void {
    this.preferences.setTheme(theme);
  }

  onLanguageSelect(lang: AppLanguage): void {
    this.preferences.setLanguage(lang);
  }

  onSelectPage(index: number): void {
    this.diagramPages.selectPageByIndex(index);
  }

  onClosePage(index: number, event?: unknown): void {
    if (event && typeof event === 'object') {
      const maybeEvent = event as {
        preventDefault?: () => void;
        stopPropagation?: () => void;
      };
      maybeEvent.preventDefault?.();
      maybeEvent.stopPropagation?.();
    }
    this.diagramPages.removePageByIndex(index);
  }
}
