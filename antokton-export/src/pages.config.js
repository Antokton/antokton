/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   const Dashboard = lazy(() => import('./pages/Dashboard'));
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   const Home = lazy(() => import('./pages/Home'));
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
const About = lazy(() => import('./pages/About'));
const Certifikim = lazy(() => import('./pages/Certifikim'));
const Media = lazy(() => import('./pages/Media'));
const Edukim = lazy(() => import('./pages/Edukim'));
const EdukiMeDija = lazy(() => import('./pages/EdukiMeDija'));
const Admin = lazy(() => import('./pages/Admin'));
const AdvancedRecruiterSearch = lazy(() => import('./pages/AdvancedRecruiterSearch'));
const ApplicationsDashboard = lazy(() => import('./pages/ApplicationsDashboard'));
const BulkImport = lazy(() => import('./pages/BulkImport'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const ContentModeration = lazy(() => import('./pages/ContentModeration'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployerDashboard = lazy(() => import('./pages/EmployerDashboard'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Events = lazy(() => import('./pages/Events'));
const EventsCalendar = lazy(() => import('./pages/EventsCalendar'));
const FacebookGroups = lazy(() => import('./pages/FacebookGroups'));
const Feed = lazy(() => import('./pages/Feed'));
const Home = lazy(() => import('./pages/Home'));
const InspectorPanel = lazy(() => import('./pages/InspectorPanel'));
const JobMatches = lazy(() => import('./pages/JobMatches'));
const Members = lazy(() => import('./pages/Members'));
const Messages = lazy(() => import('./pages/Messages'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const Partners = lazy(() => import('./pages/Partners'));
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const PremiumDashboard = lazy(() => import('./pages/PremiumDashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Profile = lazy(() => import('./pages/Profile'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const RecruiterTools = lazy(() => import('./pages/RecruiterTools'));
const Referime = lazy(() => import('./pages/Referime'));
const Search = lazy(() => import('./pages/Search'));
const Setup = lazy(() => import('./pages/Setup'));
const Sherbime = lazy(() => import('./pages/Sherbime'));
const StaffChat = lazy(() => import('./pages/StaffChat'));
const StateAntokton = lazy(() => import('./pages/StateAntokton'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Terms = lazy(() => import('./pages/Terms'));
const UserProfiles = lazy(() => import('./pages/UserProfiles'));
const UserSearch = lazy(() => import('./pages/UserSearch'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "Certifikim": Certifikim,
    "Media": Media,
    "Edukim": Edukim,
    "EdukiMeDija": EdukiMeDija,
    "Admin": Admin,
    "AdvancedRecruiterSearch": AdvancedRecruiterSearch,
    "ApplicationsDashboard": ApplicationsDashboard,
    "BulkImport": BulkImport,
    "Companies": Companies,
    "CompanyDetail": CompanyDetail,
    "Contact": Contact,
    "ContentModeration": ContentModeration,
    "CreatePost": CreatePost,
    "Dashboard": Dashboard,
    "EmployerDashboard": EmployerDashboard,
    "EventDetail": EventDetail,
    "Events": Events,
    "Ngjarje": Events,
    "EventsCalendar": EventsCalendar,
    "FacebookGroups": FacebookGroups,
    "Feed": Feed,
    "Home": Home,
    "InspectorPanel": InspectorPanel,
    "JobMatches": JobMatches,
    "Members": Members,
    "Messages": Messages,
    "NotificationCenter": NotificationCenter,
    "Partners": Partners,
    "PaymentHistory": PaymentHistory,
    "PostDetail": PostDetail,
    "PremiumDashboard": PremiumDashboard,
    "Privacy": Privacy,
    "Profile": Profile,
    "ProjectDetail": ProjectDetail,
    "Recommendations": Recommendations,
    "RecruiterTools": RecruiterTools,
    "Referime": Referime,
    "Search": Search,
    "Setup": Setup,
    "Sherbime": Sherbime,
    "StaffChat": StaffChat,
    "StateAntokton": StateAntokton,
    "Subscriptions": Subscriptions,
    "Terms": Terms,
    "UserProfiles": UserProfiles,
    "UserSearch": UserSearch,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
