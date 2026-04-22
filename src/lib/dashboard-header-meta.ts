/**
 * Default header titles from the URL when pages don't override via DashboardTitleProvider.
 * More specific path patterns must be checked first.
 */
export interface DashboardHeaderMeta {
  eyebrow: string
  title: string
  subtitle?: string
}

export function getDashboardHeaderMeta(pathname: string): DashboardHeaderMeta {
  if (pathname === "/") {
    return {
      eyebrow: "Overview",
      title: "Dashboard",
      subtitle: "Sales questionnaires workspace",
    }
  }

  if (pathname.startsWith("/questionnaires/new")) {
    return {
      eyebrow: "Questionnaires",
      title: "New questionnaire",
      subtitle: "Create a draft",
    }
  }

  if (/^\/questionnaires\/[^/]+\/responses$/.test(pathname)) {
    return {
      eyebrow: "Questionnaires",
      title: "Responses",
      subtitle: "Review submitted answers",
    }
  }

  if (/^\/questionnaires\/[^/]+$/.test(pathname)) {
    return {
      eyebrow: "Questionnaires",
      title: "Questionnaire",
      subtitle: "Edit, publish, and share",
    }
  }

  if (pathname.startsWith("/questionnaires")) {
    return {
      eyebrow: "Questionnaires",
      title: "Questionnaires",
      subtitle: "Browse and manage drafts",
    }
  }

  if (pathname.startsWith("/clients")) {
    return {
      eyebrow: "Directory",
      title: "Clients",
      subtitle: "Accounts and contacts",
    }
  }

  if (pathname.startsWith("/admin/question-bank")) {
    return {
      eyebrow: "Admin",
      title: "Question bank",
      subtitle: "Reusable question library",
    }
  }

  if (pathname.startsWith("/admin/templates")) {
    return {
      eyebrow: "Admin",
      title: "Templates",
      subtitle: "Preset questionnaire templates",
    }
  }

  if (pathname.startsWith("/admin/users")) {
    return {
      eyebrow: "Admin",
      title: "Users",
      subtitle: "Team access and roles",
    }
  }

  if (pathname.startsWith("/admin/audit-log")) {
    return {
      eyebrow: "Admin",
      title: "Audit log",
      subtitle: "Security and activity history",
    }
  }

  return {
    eyebrow: "",
    title: "Workspace",
  }
}
