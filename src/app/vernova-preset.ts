import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Aura 기반 — 둥근 모서리·스카이 계열 포인트 컬러로 모던 톤 정리 */
export const VernovaPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      md: '12px',
      lg: '16px',
      xl: '22px',
    },
  },
  semantic: {
    colorScheme: {
      light: {
        primary: {
          color: '{sky.600}',
          contrastColor: '#ffffff',
          hoverColor: '{sky.700}',
          activeColor: '{sky.800}',
        },
      },
      dark: {
        primary: {
          color: '{sky.400}',
          contrastColor: '{zinc.950}',
          hoverColor: '{sky.300}',
          activeColor: '{sky.200}',
        },
      },
    },
  },
});
