import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdConfigProvider from "@/components/AntdConfigProvider";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "School ERP - Modern Institution Management",
  description: "Comprehensive Enterprise Resource Planning system for schools, colleges, and educational institutes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AntdConfigProvider>
            <AuthProvider>{children}</AuthProvider>
          </AntdConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
