import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
const AdminSuggestions = lazy(() => import('./pages/AdminSuggestions'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const Media = lazy(() => import('./pages/Media'));
const Edukim = lazy(() => import('./pages/Edukim'));
const ImportPosts = lazy(() => import('./pages/ImportPosts'));
const Bileta = lazy(() => import('./pages/Bileta'));
const BamiresiFull = lazy(() => import('./pages/Bamiresi'));
const Statuset = lazy(() => import('./pages/Statuset'));
const Pazar = lazy(() => import('./pages/Pazar'));
const Akademia = lazy(() => import('./pages/Akademia'));
const AkademiaCourseDetail = lazy(() => import('./pages/AkademiaCourseDetail'));
const AkademiaAdmin = lazy(() => import('./pages/AkademiaAdmin'));
const AkademiaMentor = lazy(() => import('./pages/AkademiaMentor'));
const DesignerPage = lazy(() => import('./pages/DesignerPage'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const Login = lazy(() => import('./pages/Login'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import VisualEditMode from '@/components/admin/VisualEditMode';
import SEOHead from '@/components/SEOHead';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isLoginRoute = window.location.pathname.toLowerCase() === "/login";

  if (isLoginRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/Login" element={<Login />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageLoader />}>
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
      {Pages.Privacy && <Route path="/privacy" element={<LayoutWrapper currentPageName="Privacy"><Pages.Privacy /></LayoutWrapper>} />}
      {Pages.Privacy && <Route path="/politika-e-privatesise" element={<LayoutWrapper currentPageName="Privacy"><Pages.Privacy /></LayoutWrapper>} />}
      {Pages.Terms && <Route path="/terms" element={<LayoutWrapper currentPageName="Terms"><Pages.Terms /></LayoutWrapper>} />}
      {Pages.Terms && <Route path="/kushtet-e-perdorimit" element={<LayoutWrapper currentPageName="Terms"><Pages.Terms /></LayoutWrapper>} />}
      {Pages.Contact && <Route path="/contact" element={<LayoutWrapper currentPageName="Contact"><Pages.Contact /></LayoutWrapper>} />}
      {Pages.Contact && <Route path="/kontakt" element={<LayoutWrapper currentPageName="Contact"><Pages.Contact /></LayoutWrapper>} />}
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
      <Route path="/Pune" element={<LayoutWrapper currentPageName="Feed"><Pages.Feed fixedCategory="pune" /></LayoutWrapper>} />
      <Route path="/ImportPosts" element={<LayoutWrapper currentPageName="ImportPosts"><ImportPosts /></LayoutWrapper>} />
      <Route path="/admin/import-assistant" element={<LayoutWrapper currentPageName="ImportPosts"><ImportPosts /></LayoutWrapper>} />
      <Route path="/admin/import-assistant/queue" element={<LayoutWrapper currentPageName="ImportPosts"><ImportPosts defaultTab="table" /></LayoutWrapper>} />
      <Route path="/Media" element={<LayoutWrapper currentPageName="Media"><Media /></LayoutWrapper>} />
      <Route path="/Edukim" element={<LayoutWrapper currentPageName="Edukim"><Edukim /></LayoutWrapper>} />
      <Route path="/Member/:email" element={<LayoutWrapper currentPageName="Members"><MemberProfile /></LayoutWrapper>} />
      <Route path="/404" element={<LayoutWrapper currentPageName="404"><PageNotFound /></LayoutWrapper>} />
      <Route path="*" element={<LayoutWrapper currentPageName="404"><PageNotFound /></LayoutWrapper>} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <SEOHead />
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
