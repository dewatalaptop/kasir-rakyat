import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./components/auth/RouteGuard";
import { OnboardingGuard } from "./components/auth/OnboardingGuard";
import { AdminAuthGuard } from "./components/auth/AdminAuthGuard";
import { CashierLayout } from "./components/layout/CashierLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/onboarding/OnboardingPage";
import { CatalogPage } from "./pages/kasir/CatalogPage";
import { CartPage } from "./pages/kasir/CartPage";
import { PaymentPage } from "./pages/kasir/PaymentPage";
import { ReceiptPage } from "./pages/kasir/ReceiptPage";
import { TodayHistoryPage } from "./pages/kasir/TodayHistoryPage";
import { MorePage } from "./pages/kasir/MorePage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { ProductEditPage } from "./pages/admin/ProductEditPage";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { TransactionsPage } from "./pages/admin/TransactionsPage";
import { TransactionDetailPage } from "./pages/admin/TransactionDetailPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { SheetsSettingsPage } from "./pages/admin/SheetsSettingsPage";
import { PrinterSettingsPage } from "./pages/admin/PrinterSettingsPage";
import { HelpPage } from "./pages/admin/HelpPage";
import { AccountPage } from "./pages/admin/AccountPage";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./components/ui/Toast";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-secondary)]">
      Halaman tidak ditemukan.
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SettingsProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RouteGuard />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route element={<OnboardingGuard />}>
                  {/*
                    Access boundary:
                    - Kasir, no password: /kasir/* (Kasir, Keranjang, Bayar,
                      Struk, Riwayat hari ini, Lainnya) and the shared
                      /bantuan — every user, including a kasir with no admin
                      password, can reach these.
                    - Admin, password-gated (AdminAuthGuard below): /admin/*
                      — Dashboard, Produk, Kategori, Transaksi (+ detail +
                      batalkan), Laporan, Pengaturan (+ Sheets + Printer +
                      Keamanan/password), Akun.
                  */}
                  <Route path="/kasir" element={<CashierLayout />}>
                    <Route index element={<CatalogPage />} />
                    <Route path="keranjang" element={<CartPage />} />
                    <Route path="bayar" element={<PaymentPage />} />
                    <Route path="struk/:id" element={<ReceiptPage />} />
                    <Route path="riwayat" element={<TodayHistoryPage />} />
                    <Route path="lainnya" element={<MorePage />} />
                  </Route>
                  <Route path="/bantuan" element={<HelpPage />} />
                  <Route path="/admin" element={<AdminAuthGuard />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="produk" element={<ProductsPage />} />
                      <Route path="produk/baru" element={<ProductEditPage />} />
                      <Route path="produk/:id/edit" element={<ProductEditPage />} />
                      <Route path="kategori" element={<CategoriesPage />} />
                      <Route path="transaksi" element={<TransactionsPage />} />
                      <Route path="transaksi/:id" element={<TransactionDetailPage />} />
                      <Route path="laporan" element={<ReportsPage />} />
                      <Route path="pengaturan" element={<SettingsPage />} />
                      <Route path="pengaturan/sheets" element={<SheetsSettingsPage />} />
                      <Route path="pengaturan/printer" element={<PrinterSettingsPage />} />
                      <Route path="akun" element={<AccountPage />} />
                    </Route>
                  </Route>
                  <Route path="/" element={<Navigate to="/kasir" replace />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </CartProvider>
        </SettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
