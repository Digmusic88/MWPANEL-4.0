import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import App from './App';

// La semana empieza en lunes: el <Calendar> de antd deriva el primer día de
// la semana de la locale de dayjs (es → weekStart 1). Sin esto quedaría en
// domingo (default 'en'), aunque antd ConfigProvider ya esté en es_ES.
dayjs.locale('es');
import { RealtimeProvider } from './realtime/RealtimeProvider';
import './index.css';

// ─────────────────────────────────────────────────────────────────
// Mismo tema visual que MW Panel — White Light · Refined Minimalism
// ─────────────────────────────────────────────────────────────────
const theme = {
  token: {
    colorPrimary: '#579172', colorSuccess: '#2E7D52', colorWarning: '#B45309', colorError: '#C43030', colorInfo: '#5B93C4',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorBgContainer: '#FFFFFF', colorBgLayout: '#FAFAF8', colorBgElevated: '#FFFFFF', colorBgSpotlight: '#F5F2ED',
    colorText: '#1E1E30', colorTextSecondary: '#6B6B7B', colorTextTertiary: '#9B9BAB', colorTextDisabled: '#C0BDC8',
    colorBorder: '#E2DDD8', colorBorderSecondary: '#EDE9E4',
    borderRadius: 6, borderRadiusLG: 8, borderRadiusSM: 4, borderRadiusXS: 3,
    boxShadow: '0 1px 4px rgba(30, 30, 48, 0.06), 0 1px 2px rgba(30, 30, 48, 0.04)',
    boxShadowSecondary: '0 4px 12px -2px rgba(30, 30, 48, 0.08), 0 2px 6px -1px rgba(30, 30, 48, 0.05)',
    wireframe: false, motionDurationFast: '0.12s', motionDurationMid: '0.2s', motionDurationSlow: '0.3s',
    controlHeight: 34, controlHeightLG: 40, controlHeightSM: 28, lineHeight: 1.6,
  },
  components: {
    Layout: { headerBg: '#FFFFFF', siderBg: '#FFFFFF', bodyBg: '#FAFAF8', headerHeight: 60, footerBg: '#FAFAF8' },
    Menu: {
      itemBg: 'transparent', itemSelectedBg: '#EEF5FA', itemHoverBg: '#F2EEE9', itemSelectedColor: '#2C5F8A',
      itemColor: '#6B6B7B', itemHoverColor: '#1E1E30', itemHeight: 38, itemMarginInline: 8, itemPaddingInline: 12,
      groupTitleColor: '#9B9BAB', groupTitleFontSize: 10.5, fontSize: 13, subMenuItemBg: 'transparent', collapsedWidth: 64,
    },
    Button: { borderRadius: 6, borderRadiusSM: 4, controlHeight: 34, controlHeightLG: 40, controlHeightSM: 28, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 500, paddingContentHorizontal: 14, paddingContentHorizontalLG: 18, paddingContentHorizontalSM: 10 },
    Card: { borderRadius: 8, borderRadiusLG: 8, paddingLG: 20, headerBg: 'transparent', headerFontSize: 14, headerFontSizeSM: 13, boxShadowCard: '0 1px 4px rgba(30, 30, 48, 0.06), 0 1px 2px rgba(30, 30, 48, 0.04)' },
    Table: { borderRadius: 8, borderRadiusLG: 8, headerBg: '#F5F2ED', headerColor: '#6B6B7B', headerSortActiveBg: '#EDE9E4', rowHoverBg: '#F2EEE9', cellPaddingBlock: 11, cellPaddingInline: 16, cellPaddingBlockSM: 8, cellPaddingInlineSM: 12, fontSize: 13, headerSplitColor: '#E2DDD8' },
    Form: { itemMarginBottom: 16, labelColor: '#1E1E30', labelFontSize: 12.5, labelRequiredMarkColor: '#C43030' },
    Input: { borderRadius: 6, controlHeight: 34, controlHeightLG: 40, controlHeightSM: 28, activeBorderColor: '#2C5F8A', hoverBorderColor: '#9B9BAB', activeShadow: '0 0 0 3px rgba(44, 95, 138, 0.14)', paddingBlock: 7, paddingInline: 10, fontSize: 13 },
    Select: { borderRadius: 6, controlHeight: 34, controlHeightLG: 40, controlHeightSM: 28, optionFontSize: 13, optionPadding: '5px 12px', optionSelectedBg: '#EEF5FA', optionSelectedColor: '#2C5F8A', optionActiveBg: '#F5F2ED' },
    DatePicker: { borderRadius: 6, controlHeight: 34, controlHeightLG: 40, fontSize: 13, activeBorderColor: '#2C5F8A', activeShadow: '0 0 0 3px rgba(44, 95, 138, 0.14)', cellActiveWithRangeBg: '#EEF5FA', cellHoverBg: '#F5F2ED' },
    Modal: { borderRadius: 10, borderRadiusLG: 10, headerBg: '#FFFFFF', contentBg: '#FFFFFF', footerBg: '#F5F2ED', titleFontSize: 15, titleLineHeight: 1.4, paddingMD: 24, paddingContentHorizontalLG: 24 },
    Tabs: { borderRadius: 6, inkBarColor: '#2C5F8A', itemActiveColor: '#2C5F8A', itemSelectedColor: '#2C5F8A', itemHoverColor: '#1E1E30', itemColor: '#6B6B7B', titleFontSize: 13, titleFontSizeLG: 14, titleFontSizeSM: 12 },
    Alert: { borderRadius: 6, borderRadiusLG: 6, fontSize: 13, paddingMD: 10, paddingContentHorizontalLG: 14 },
    Tag: { borderRadius: 4, borderRadiusSM: 3, fontSize: 11, defaultBg: '#F5F2ED', defaultColor: '#6B6B7B' },
    Statistic: { titleFontSize: 11.5, contentFontSize: 22 },
    Typography: { titleMarginBottom: 12, titleMarginTop: 12, fontSizeHeading1: 28, fontSizeHeading2: 22, fontSizeHeading3: 18, fontSizeHeading4: 16, fontSizeHeading5: 14 },
    Pagination: { borderRadius: 4, fontSize: 13, itemActiveBg: '#EEF5FA', itemLinkBg: 'transparent', itemSize: 28 },
    Tooltip: { borderRadius: 6, fontSize: 12, paddingSM: 10, colorBgSpotlight: '#1E1E30' },
    Message: { borderRadius: 6, fontSize: 13 },
  },
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={esES} theme={theme}>
      <RealtimeProvider>
        <App />
      </RealtimeProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
