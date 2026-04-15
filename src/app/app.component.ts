import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  computed,
  effect,
  inject,
} from '@angular/core';
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
import { WorkspaceComponent } from './workspace/workspace.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    WorkspaceComponent,
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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly pages = this.diagramPages.pages;
  readonly activePageIndex = this.diagramPages.activeIndex;
  readonly theme = this.preferences.themeState;
  readonly language = this.preferences.languageState;
  readonly themeToggleIcon = computed(() =>
    this.theme() === 'dark' ? 'pi pi-sun' : 'pi pi-moon',
  );
  readonly themeToggleTooltip = computed(() => {
    this.i18nRefresh.revision();
    return this.theme() === 'dark'
      ? this.translate.instant('app.light')
      : this.translate.instant('app.dark');
  });
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
    const lang = this.language();
    return [
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

    const saveShortcutHandler = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }
      const isSave =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        (event.code === 'KeyS' || event.key?.toLowerCase() === 's');
      if (!isSave) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void this.diagramPages.saveAllTabsToSession();
    };
    this.document.addEventListener('keydown', saveShortcutHandler, true);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('keydown', saveShortcutHandler, true),
    );
  }

  onAddPage(): void {
    this.diagramPages.addUntitledPage();
  }

  onThemeSelect(theme: AppTheme): void {
    this.preferences.setTheme(theme);
  }

  onToggleTheme(): void {
    this.onThemeSelect(this.theme() === 'dark' ? 'light' : 'dark');
  }

  onLanguageSelect(lang: AppLanguage): void {
    this.preferences.setLanguage(lang);
  }

  onSelectPage(value: string | number | undefined): void {
    const index = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    if (!Number.isFinite(index)) {
      return;
    }

    // Tab list의 마지막 "+" 탭을 클릭하면 새 다이어그램을 생성한다.
    if (index === -1) {
      this.onAddPage();
      return;
    }

    if (index >= 0) {
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

}
