"use client";

import React from "react";
import { ConfigProvider, App } from "antd";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    colorInfo: "#1677ff",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#001529",
      bodyBg: "#f0f2f5",
    },
    Menu: {
      darkItemBg: "#001529",
    },
    Card: {
      headerFontSize: 16,
    },
    Table: {
      headerBg: "#fafafa",
    },
  },
};

export default function AntdConfigProvider({ children }) {
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
