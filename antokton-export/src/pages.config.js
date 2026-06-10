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
 *   import Dashboard from './pages/Dashboard';
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
 *   import Home from './pages/Home';
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
import About from './pages/About';
import Certifikim from './pages/Certifikim';
import Media from './pages/Media';
import Edukim from './pages/Edukim';
import EdukiMeDija from './pages/EdukiMeDija';
import Admin from './pages/Admin';
import AdvancedRecruiterSearch from './pages/AdvancedRecruiterSearch';
import ApplicationsDashboard from './pages/ApplicationsDashboard';
import BulkImport from './pages/BulkImport';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Contact from './pages/Contact';
import ContentModeration from './pages/ContentModeration';
import CreatePost from './pages/CreatePost';
import Dashboard from './pages/Dashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import EventDetail from './pages/EventDetail';
import Events from './pages/Events';
import EventsCalendar from './pages/EventsCalendar';
import FacebookGroups from './pages/FacebookGroups';
import Feed from './pages/Feed';
import Home from './pages/Home';
import InspectorPanel from './pages/InspectorPanel';
import JobMatches from './pages/JobMatches';
import Members from './pages/Members';
import Messages from './pages/Messages';
import NotificationCenter from './pages/NotificationCenter';
import Partners from './pages/Partners';
import PaymentHistory from './pages/PaymentHistory';
import PostDetail from './pages/PostDetail';
import PremiumDashboard from './pages/PremiumDashboard';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import Recommendations from './pages/Recommendations';
import RecruiterTools from './pages/RecruiterTools';
import Referime from './pages/Referime';
import Search from './pages/Search';
import Setup from './pages/Setup';
import Sherbime from './pages/Sherbime';
import StaffChat from './pages/StaffChat';
import StateAntokton from './pages/StateAntokton';
import Subscriptions from './pages/Subscriptions';
import Terms from './pages/Terms';
import UserProfiles from './pages/UserProfiles';
import UserSearch from './pages/UserSearch';
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
