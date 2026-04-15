import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';

import {
  AppLanguage,
  AppPreferencesService,
  AppTheme,
} from './app-preferences.service';
import { DiagramPagesService } from './diagram-pages.service';
import { I18nRefreshService } from './i18n-refresh.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterOutlet,
    TranslateModule,
    ButtonModule,
    DividerModule,
    MenuModule,
    TabsModule,
    TooltipModule,
  ],
})
export class AppComponent {
  private readonly i18nRefresh = inject(I18nRefreshService);

  readonly pages = this.diagramPages.pages;
  readonly activePageIndex = this.diagramPages.activeIndex;
  readonly theme = this.preferences.themeState;
  readonly language = this.preferences.languageState;
  readonly diagramName = computed(() => {
    this.i18nRefresh.revision();
    this.language();
    return (
      this.diagramPages.activePage()?.name ??
      this.translate.instant('workspace.defaultUntitledDiagram')
    );
  });

  readonly settingsMenuItems = computed((): MenuItem[] => {
    this.i18nRefresh.revision();
    const tr = this.translate;
    const th = this.theme();
    const lang = this.language();
    return [
      {
        label: tr.instant('app.theme'),
        disabled: true,
        styleClass: 'app-settings-menu__heading',
      },
      {
        label: tr.instant('app.light'),
        icon: th === 'light' ? 'pi pi-check' : undefined,
        command: () => this.onThemeSelect('light'),
      },
      {
        label: tr.instant('app.dark'),
        icon: th === 'dark' ? 'pi pi-check' : undefined,
        command: () => this.onThemeSelect('dark'),
      },
      { separator: true },
      {
        label: tr.instant('app.language'),
        disabled: true,
        styleClass: 'app-settings-menu__heading',
      },
      {
        label: tr.instant('app.korean'),
        icon: lang === 'ko' ? 'pi pi-check' : undefined,
        command: () => this.onLanguageSelect('ko'),
      },
      {
        label: tr.instant('app.english'),
        icon: lang === 'en' ? 'pi pi-check' : undefined,
        command: () => this.onLanguageSelect('en'),
      },
    ];
  });

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

  onSelectPage(value: string | number | undefined): void {
    const index = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    if (Number.isFinite(index)) {
      this.diagramPages.selectPageByIndex(index);
    }
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

  @HostListener('window:keydown', ['$event'])
  async onWindowSaveShortcut(event: KeyboardEvent): Promise<void> {
    const isSaveShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
    if (!isSaveShortcut) {
      return;
    }

    event.preventDefault();
    await this.diagramPages.saveAllTabsToSession();
  }
}
