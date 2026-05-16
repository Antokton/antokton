# Antokton Backend Blueprint

Inspected source: `https://antokton.com` on 2026-05-07.
Additional source: user-provided `antokton.zip`, extracted into
`antokton-export`.

## Frontend Stack Signals

- React single page app.
- Base44 SDK client embedded in the bundle.
- App id: `6991d40eddf82cc25ec834a7`.
- Public assets are hosted through Supabase storage, but app data is loaded
  through Base44-style API endpoints.

## Pages Found

About, Admin, AdminAnalytics, AdminSuggestions, AdvancedRecruiterSearch,
ApplicationsDashboard, Bamiresi, Bileta, BulkImport, Companies, Contact,
ContentModeration, CreatePost, Dashboard, Edukim, EmployerDashboard,
EventDetail, Events, EventsCalendar, FacebookGroups, Feed, ImportPosts,
InspectorPanel, JobMatches, Media, Members, Messages, NotificationCenter,
NotificationSettings, Partners, PaymentHistory, PostDetail, PremiumDashboard,
Privacy, Profile, ProjectDetail, Recommendations, RecruiterTools, Referime,
Search, Setup, StaffChat, StateAntokton, Statuset, Subscriptions, Terms,
UserProfiles, UserSearch, Pazar.

## Entities Found

Job, JobComment, JobReaction, UserWarning, CommentLike, CommentReport,
Subscription, ChatMessage, JobApplication, Event, Notification, Questionnaire,
Interview, JobTemplate, QuestionnaireResponse, Rating, NotificationPreference,
CompanyProfile, JobMatch, EventRegistration, JobView, CompanyRating,
CandidateRating, PremiumSubscription, Certification, UserActivity, FeaturedJob,
ProfileView, StaffMessage, DetailedRating, UserReview, SavedSearch,
EventParticipant, EventComment, AntonktonProject, AdminAction, UserReference,
ContentModeration, RecurringEvent, EventRSVP, Report, ContactMessage,
ProfessionSuggestion, CountrySuggestion, Partner, MediaChannel, SiteConfig,
CharityProject, Status, StatusComment, ImportedPost, EducationPartner,
MediaPost, NavConfig.

The backend stores these in one JSON-backed `entity_records` table first.
That is the safest Base44-compatible database model because the frontend treats
entities as flexible documents. The extracted zip also includes JSONC schemas
for 14 key entities, and these are loaded into `entity_schemas`.

## Custom Functions Used By Frontend

advancedRecruiterSearch, aiJobMatching, analyzeQuestionnaireResponses,
analyzeUserBehavior, createPremiumCheckout, downloadEnhancedProfile,
generateCV, generateProfileSuggestions, getRecommendations, importJobPost,
importMarketplacePost, notifyApprovalEmail, publishToFacebook,
rankApplications, savePage, summarizeCV.

The scaffold logs every function call and returns safe placeholders. This keeps
the frontend alive while each function is implemented.

## Core Integrations Used

- `UploadFile`: profile photos, event images, chat attachments, CVs,
  status images and social logos.
- `SendEmail`: ticket/transport request emails.
- `InvokeLLM`: post cleanup, location parsing, profile/job suggestions and
  import helpers.

## Compatibility API

The frontend expects:

```text
GET    /api/apps/public/prod/public-settings/by-id/{appId}
GET    /api/apps/{appId}/entities/{Entity}
GET    /api/apps/{appId}/entities/{Entity}/{id}
POST   /api/apps/{appId}/entities/{Entity}
PUT    /api/apps/{appId}/entities/{Entity}/{id}
DELETE /api/apps/{appId}/entities/{Entity}/{id}
POST   /api/apps/{appId}/entities/{Entity}/bulk
PUT    /api/apps/{appId}/entities/{Entity}/bulk
PATCH  /api/apps/{appId}/entities/{Entity}/update-many
GET    /api/apps/{appId}/entities/User/me
PUT    /api/apps/{appId}/entities/User/me
POST   /api/apps/{appId}/functions/{functionName}
POST   /api/apps/{appId}/integration-endpoints/Core/{operation}
```

## Recommended Normalized Tables Later

- `users`: auth, role, profile, preferences.
- `jobs`: feed posts, marketplace listings, jobs, real estate and moderation.
- `job_applications`: CV, applicant details, pipeline status.
- `companies`: employer profiles and ratings.
- `events`: events, registrations, RSVP and comments.
- `statuses`: social posts, comments, likes and reactions.
- `messages`: direct chat plus attachments.
- `notifications`: user notifications and preferences.
- `subscriptions`: premium checkout state and payment history.
- `site_config`: navigation, social links, static pages and feature flags.

Keep `entity_records` as a compatibility layer during migration.
