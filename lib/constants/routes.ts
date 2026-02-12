export const ROUTES = {
  // Auth
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",

  // Student
  dashboard: "/dashboard",
  courses: "/courses",
  course: (courseId: string) => `/courses/${courseId}`,
  lesson: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}`,
  community: "/community",
  thread: (threadId: string) => `/community/${threadId}`,
  profile: "/profile",
  publicProfile: (userId: string) => `/profile/${userId}`,
  notifications: "/notifications",
  certificate: (certId: string) => `/certificates/${certId}`,
  announcements: "/announcements",
  assignments: (courseId: string) => `/courses/${courseId}/assignments`,
  assignment: (courseId: string, assignmentId: string) =>
    `/courses/${courseId}/assignments/${assignmentId}`,
  paths: "/paths",
  path: (pathId: string) => `/paths/${pathId}`,
  resources: "/resources",
  leaderboard: "/leaderboard",
  calendar: "/calendar",
  grades: (courseId: string) => `/courses/${courseId}/grades`,

  // Public
  catalog: "/catalog",
  about: "/about",
  contact: "/contact",

  // Admin
  adminDashboard: "/admin/dashboard",
  adminCourses: "/admin/courses",
  adminNewCourse: "/admin/courses/new",
  adminEditCourse: (courseId: string) => `/admin/courses/${courseId}/edit`,
  adminModules: (courseId: string) => `/admin/courses/${courseId}/modules`,
  adminEditLesson: (courseId: string, lessonId: string) =>
    `/admin/courses/${courseId}/lessons/${lessonId}/edit`,
  adminCohorts: "/admin/cohorts",
  adminNewCohort: "/admin/cohorts/new",
  adminCohort: (cohortId: string) => `/admin/cohorts/${cohortId}`,
  adminStudents: "/admin/students",
  adminNewStudent: "/admin/students/new",
  adminStudent: (studentId: string) => `/admin/students/${studentId}`,
  adminIntegrations: "/admin/integrations",
  adminAnnouncements: "/admin/announcements",
  adminNewAnnouncement: "/admin/announcements/new",
  adminDiscussions: "/admin/discussions",
  adminFiles: "/admin/files",
  adminSettings: "/admin/settings",
  adminPaths: "/admin/paths",
  adminNewPath: "/admin/paths/new",
  adminPath: (pathId: string) => `/admin/paths/${pathId}`,
  adminAssignments: (courseId: string) =>
    `/admin/courses/${courseId}/assignments`,
  adminAssignment: (courseId: string, assignmentId: string) =>
    `/admin/courses/${courseId}/assignments/${assignmentId}`,
  adminGradeSubmission: (
    courseId: string,
    assignmentId: string,
    submissionId: string
  ) =>
    `/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}`,
  adminResources: "/admin/resources",
  adminNewResource: "/admin/resources/new",
  adminCalendar: "/admin/calendar",
  adminGradebook: (courseId: string) =>
    `/admin/courses/${courseId}/gradebook`,
} as const;
