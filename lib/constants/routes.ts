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
} as const;
