import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AdminSuggestions from './pages/AdminSuggestions';
import AdminAnalytics from './pages/AdminAnalytics';
import Media from './pages/Media';
import Edukim from './pages/Edukim';
import ImportPosts from './pages/ImportPosts';
import Bileta from './pages/Bileta';
import BamiresiFull from './pages/Bamiresi';
import Statuset from './pages/Statuset';
import Pazar from './pages/Pazar';
import Akademia from './pages/Akademia';
import AkademiaCourseDetail from './pages/AkademiaCourseDetail';
import AkademiaAdmin from './pages/AkademiaAdmin';
import AkademiaMentor from './pages/AkademiaMentor';
import DesignerPage from './pages/DesignerPage';
import VerifyCertificate from './pages/VerifyCertificate';
import Login from './pages/Login';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import VisualEditMode from '@/components/admin/VisualEditMode';
import AuthRequiredState from '@/components/AuthRequiredState';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();
  const [showSlowLoadRecovery, setShowSlowLoadRecovery] = useState(false);
  const isLoginRoute = window.location.pathname.toLowerCase() === "/login";

  useEffect(() => {
    if (!isLoadingPublicSettings && !isLoadingAuth) {
      setShowSlowLoadRecovery(false);
      return;
    }

    const timer = window.setTimeout(() => setShowSlowLoadRecovery(true), 5500);
    return () => window.clearTimeout(timer);
  }, [isLoadingPublicSettings, isLoadingAuth]);

  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/Login" element={<Login />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b1020] px-6 text-center" style={{ paddingTop: 'var(--app-safe-top)', paddingBottom: 'var(--app-safe-bottom)' }}>
        <div className="max-w-xs">
          <div className="mx-auto mb-4 w-8 h-8 border-4 border-white/25 border-t-[#8ab4ff] rounded-full animate-spin"></div>
          <p className="text-white font-semibold">Duke hapur Antokton...</p>
          {showSlowLoadRecovery && (
            <div className="mt-4 space-y-3">
              <p className="text-white/60 text-sm">
                Lidhja po zgjat më shumë se zakonisht. Nëse je në iPhone PWA, provo rifreskim të lehtë.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => checkAppState()}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
                >
                  Provo përsëri
                </button>
                <button
                  type="button"
                  onClick={() => window.location.assign('/')}
                  className="rounded-lg border border-[#8ab4ff]/40 bg-[#8ab4ff]/15 px-3 py-2 text-sm font-semibold text-[#8ab4ff]"
                >
                  Kryefaqja
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <LayoutWrapper currentPageName={mainPageKey}>
          <AuthRequiredState message="Hyr ose regjistrohu për të hapur këtë pjesë të Antokton." />
        </LayoutWrapper>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/akademia" element={<LayoutWrapper currentPageName="Akademia"><Akademia /></LayoutWrapper>} />
      <Route path="/akademia/:courseId" element={<LayoutWrapper currentPageName="Akademia"><AkademiaCourseDetail /></LayoutWrapper>} />
      <Route path="/AkademiaAdmin" element={<LayoutWrapper currentPageName="AkademiaAdmin"><AkademiaAdmin /></LayoutWrapper>} />
      <Route path="/AkademiaMentor" element={<LayoutWrapper currentPageName="AkademiaMentor"><AkademiaMentor /></LayoutWrapper>} />
      <Route path="/DesignerPage/:slug" element={<LayoutWrapper currentPageName="DesignerPage"><DesignerPage /></LayoutWrapper>} />
      <Route path="/verify-certificate/:certificateNumber" element={<LayoutWrapper currentPageName="VerifyCertificate"><VerifyCertificate /></LayoutWrapper>} />
      <Route path="/Login" element={<Login />} />
      <Route path="/AdminSuggestions" element={<LayoutWrapper currentPageName="AdminSuggestions"><AdminSuggestions /></LayoutWrapper>} />
      <Route path="/AdminAnalytics" element={<LayoutWrapper currentPageName="AdminAnalytics"><AdminAnalytics /></LayoutWrapper>} />
      <Route path="/Bileta" element={<LayoutWrapper currentPageName="Bileta"><Bileta /></LayoutWrapper>} />
      <Route path="/Bamiresi" element={<LayoutWrapper currentPageName="Bamiresi"><BamiresiFull /></LayoutWrapper>} />
      <Route path="/Statuset" element={<LayoutWrapper currentPageName="Statuset"><Statuset /></LayoutWrapper>} />
      <Route path="/Pazar" element={<LayoutWrapper currentPageName="Pazar"><Pazar /></LayoutWrapper>} />
      <Route path="/ImportPosts" element={<LayoutWrapper currentPageName="ImportPosts"><ImportPosts /></LayoutWrapper>} />
      <Route path="/Media" element={<LayoutWrapper currentPageName="Media"><Media /></LayoutWrapper>} />
      <Route path="/Edukim" element={<LayoutWrapper currentPageName="Edukim"><Edukim /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
          <VisualEditMode />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
