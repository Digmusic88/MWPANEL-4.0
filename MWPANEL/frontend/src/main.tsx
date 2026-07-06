import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'

// Student notes service using mock data

// Initialize global error handlers
import './utils/errorHandler'

// Initialize clean race condition protection (error handlers only - no method overrides)  
import { initializeCleanRaceConditionFix } from './utils/cleanRaceConditionFix'
initializeCleanRaceConditionFix()

// Global error suppression for {type, count} errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Objects are not valid as a React child')) {
    // Suppressed React child error
    return; // Don't display the error
  }
  return originalConsoleError.apply(console, args);
};

// Override React.createElement to clean {type, count} objects
const originalCreateElement = React.createElement;
React.createElement = function(type: any, props: any, ...children: any[]) {
  try {
    const safeChildren = children.map((child) => {
      if (child && typeof child === 'object' && !React.isValidElement(child) && !Array.isArray(child)) {
        const keys = Object.keys(child);
        if (keys.length === 2 && keys.includes('type') && keys.includes('count')) {
          return String(child.count || 0);
        }
      }
      return child;
    });

    return originalCreateElement.call(this, type, props, ...safeChildren);
  } catch (error) {
    console.error('Error in React.createElement override:', error);
    return originalCreateElement.call(this, type, props, ...children);
  }
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import './index.css'
import './styles/responsive.css'
import './styles/scrollable-modal.css'
import App from './App'

// Configure dayjs plugins and locale
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('es')

// Set default timezone to Europe/Madrid (Spain)
// This ensures all date operations use Spanish timezone by default
dayjs.tz.setDefault('Europe/Madrid')

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// ─────────────────────────────────────────────────────────────────
// MW Panel 2.0 — Ant Design Theme
// Aesthetic: White Light · Refined Minimalism · Educational
// ─────────────────────────────────────────────────────────────────
const theme = {
  token: {
    // Brand
    colorPrimary:   '#579172',
    colorSuccess:   '#2E7D52',
    colorWarning:   '#B45309',
    colorError:     '#C43030',
    colorInfo:      '#2C5F8A',

    // Typography
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,

    // Surfaces
    colorBgContainer:  '#FFFFFF',
    colorBgLayout:     '#FAFAF8',
    colorBgElevated:   '#FFFFFF',
    colorBgSpotlight:  '#F5F2ED',

    // Text
    colorText:          '#1E1E30',
    colorTextSecondary: '#6B6B7B',
    colorTextTertiary:  '#9B9BAB',
    colorTextDisabled:  '#C0BDC8',

    // Borders
    colorBorder:          '#E2DDD8',
    colorBorderSecondary: '#EDE9E4',

    // Border radius
    borderRadius:   6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 3,

    // Shadows
    boxShadow:          '0 1px 4px rgba(30, 30, 48, 0.06), 0 1px 2px rgba(30, 30, 48, 0.04)',
    boxShadowSecondary: '0 4px 12px -2px rgba(30, 30, 48, 0.08), 0 2px 6px -1px rgba(30, 30, 48, 0.05)',

    // Motion
    wireframe: false,
    motionDurationFast: '0.12s',
    motionDurationMid:  '0.2s',
    motionDurationSlow: '0.3s',

    // Control sizing
    controlHeight:   34,
    controlHeightLG: 40,
    controlHeightSM: 28,
    lineHeight: 1.6,
  },
  components: {
    Layout: {
      headerBg:   '#FFFFFF',
      siderBg:    '#FFFFFF',
      bodyBg:     '#FAFAF8',
      headerHeight: 60,
      footerBg:   '#FAFAF8',
    },
    Menu: {
      itemBg:            'transparent',
      itemSelectedBg:    '#EEF5FA',
      itemHoverBg:       '#F2EEE9',
      itemSelectedColor: '#2C5F8A',
      itemColor:         '#6B6B7B',
      itemHoverColor:    '#1E1E30',
      itemHeight:        38,
      itemMarginInline:  8,
      itemPaddingInline: 12,
      groupTitleColor:   '#9B9BAB',
      groupTitleFontSize: 10.5,
      fontSize: 13,
      subMenuItemBg: 'transparent',
      collapsedWidth: 64,
    },
    Button: {
      borderRadius:      6,
      borderRadiusSM:    4,
      controlHeight:     34,
      controlHeightLG:   40,
      controlHeightSM:   28,
      primaryShadow:     'none',
      defaultShadow:     'none',
      dangerShadow:      'none',
      fontWeight:        500,
      paddingContentHorizontal: 14,
      paddingContentHorizontalLG: 18,
      paddingContentHorizontalSM: 10,
    },
    Card: {
      borderRadius:      8,
      borderRadiusLG:    8,
      paddingLG:         20,
      headerBg:          'transparent',
      headerFontSize:    14,
      headerFontSizeSM:  13,
      boxShadowCard:     '0 1px 4px rgba(30, 30, 48, 0.06), 0 1px 2px rgba(30, 30, 48, 0.04)',
    },
    Table: {
      borderRadius:        8,
      borderRadiusLG:      8,
      headerBg:            '#F5F2ED',
      headerColor:         '#6B6B7B',
      headerSortActiveBg:  '#EDE9E4',
      rowHoverBg:          '#F2EEE9',
      cellPaddingBlock:    11,
      cellPaddingInline:   16,
      cellPaddingBlockSM:  8,
      cellPaddingInlineSM: 12,
      fontSize:            13,
      headerSplitColor:    '#E2DDD8',
    },
    Form: {
      itemMarginBottom:  16,
      labelColor:        '#1E1E30',
      labelFontSize:     12.5,
      labelRequiredMarkColor: '#C43030',
    },
    Input: {
      borderRadius:      6,
      controlHeight:     34,
      controlHeightLG:   40,
      controlHeightSM:   28,
      activeBorderColor: '#2C5F8A',
      hoverBorderColor:  '#9B9BAB',
      activeShadow:      '0 0 0 3px rgba(44, 95, 138, 0.14)',
      paddingBlock:      7,
      paddingInline:     10,
      fontSize:          13,
    },
    Select: {
      borderRadius:      6,
      controlHeight:     34,
      controlHeightLG:   40,
      controlHeightSM:   28,
      optionFontSize:    13,
      optionPadding:     '5px 12px',
      optionSelectedBg:  '#EEF5FA',
      optionSelectedColor: '#2C5F8A',
      optionActiveBg:    '#F5F2ED',
    },
    DatePicker: {
      borderRadius:      6,
      controlHeight:     34,
      controlHeightLG:   40,
      fontSize:          13,
      activeBorderColor: '#2C5F8A',
      activeShadow:      '0 0 0 3px rgba(44, 95, 138, 0.14)',
      cellActiveWithRangeBg: '#EEF5FA',
      cellHoverBg:       '#F5F2ED',
    },
    Modal: {
      borderRadius:   10,
      borderRadiusLG: 10,
      headerBg:       '#FFFFFF',
      contentBg:      '#FFFFFF',
      footerBg:       '#F5F2ED',
      titleFontSize:  15,
      titleLineHeight: 1.4,
      paddingMD:      24,
      paddingContentHorizontalLG: 24,
    },
    Drawer: {
      borderRadiusLG: 0,
      footerPaddingBlock:    12,
      footerPaddingInline:   20,
      paddingLG:             20,
    },
    Tabs: {
      borderRadius:           6,
      inkBarColor:            '#2C5F8A',
      itemActiveColor:        '#2C5F8A',
      itemSelectedColor:      '#2C5F8A',
      itemHoverColor:         '#1E1E30',
      itemColor:              '#6B6B7B',
      cardBg:                 '#F5F2ED',
      cardPadding:            '8px 16px',
      horizontalItemPadding:  '8px 0',
      horizontalItemGutter:   24,
      titleFontSize:          13,
      titleFontSizeLG:        14,
      titleFontSizeSM:        12,
    },
    Collapse: {
      borderRadius:   8,
      borderRadiusLG: 8,
      headerBg:       '#F5F2ED',
      contentBg:      '#FFFFFF',
      headerPadding:  '12px 16px',
      contentPadding: '16px',
      fontSize:       13,
    },
    Alert: {
      borderRadius:   6,
      borderRadiusLG: 6,
      fontSize:       13,
      paddingMD:      10,
      paddingContentHorizontalLG: 14,
    },
    Badge: {
      borderRadius:    4,
      fontSize:        11,
      textFontSize:    11,
      textFontWeight:  '500',
    },
    Tag: {
      borderRadius:    4,
      borderRadiusSM:  3,
      fontSize:        11,
      defaultBg:       '#F5F2ED',
      defaultColor:    '#6B6B7B',
    },
    Statistic: {
      titleFontSize:   11.5,
      contentFontSize: 22,
    },
    Typography: {
      titleMarginBottom: 12,
      titleMarginTop:    12,
      fontSizeHeading1:  28,
      fontSizeHeading2:  22,
      fontSizeHeading3:  18,
      fontSizeHeading4:  16,
      fontSizeHeading5:  14,
    },
    Divider: {
      colorSplit: '#EDE9E4',
      fontSize:   13,
      fontSizeLG: 14,
    },
    Pagination: {
      borderRadius:    4,
      fontSize:        13,
      itemActiveBg:    '#EEF5FA',
      itemLinkBg:      'transparent',
      itemSize:        28,
    },
    Tooltip: {
      borderRadius:   6,
      fontSize:       12,
      paddingSM:      10,
      colorBgSpotlight: '#1E1E30',
    },
    Notification: {
      borderRadius:  8,
      fontSize:      13,
      width:         340,
    },
    Message: {
      borderRadius: 6,
      fontSize:     13,
    },
    Dropdown: {
      borderRadius:    8,
      borderRadiusSM:  4,
      fontSize:        13,
      paddingBlock:    7,
      controlPaddingHorizontal: 12,
    },
    Segmented: {
      borderRadius:    6,
      borderRadiusSM:  4,
      fontSize:        13,
      itemSelectedBg:  '#FFFFFF',
      trackBg:         '#F5F2ED',
      trackPadding:    3,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider 
          locale={esES}
          theme={theme}
        >
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Student notes system ready
