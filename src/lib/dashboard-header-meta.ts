/**
 * Default header titles from the URL when pages don't override via DashboardTitleProvider.
 * More specific path patterns must be checked first.
 */
export interface DashboardHeaderMeta {
  title: string
  subtitle?: string
}

export function getDashboardHeaderMeta(pathname: string): DashboardHeaderMeta {
  if (pathname === "/") {
    return {
      title: "Dashboard",
      subtitle: "Sales questionnaires workspace",
    }
  }

  if (pathname.startsWith("/questionnaires/new")) {
    return {
      title: "New questionnaire",
      subtitle: "Create a draft",
    }
  }

  if (/^\/questionnaires\/[^/]+\/responses$/.test(pathname)) {
    return {
      title: "Responses",
      subtitle: "Review submitted answers",
    }
  }

  if (/^\/questionnaires\/[^/]+$/.test(pathname)) {
    return {
      title: "Questionnaire",
      subtitle: "Edit, publish, and share",
    }
  }

  if (pathname.startsWith("/questionnaires")) {
    return {
      title: "Questionnaires",
      subtitle: "Browse and manage questionnaires",
    }
  }

  if (pathname.startsWith("/clients")) {
    return {
      title: "Clients",
      subtitle: "Accounts and contacts",
    }
  }

  if (pathname.startsWith("/admin/question-bank")) {
    return {
      title: "Question bank",
      subtitle: "Reusable question library",
    }
  }

  if (pathname.startsWith("/admin/templates")) {
    return {
      title: "Templates",
      subtitle: "Preset questionnaire templates",
    }
  }

  if (pathname.startsWith("/admin/questionnaire-types")) {
    return {
      title: "Questionnaire Types",
      subtitle: "Manage questionnaire categories",
    }
  }

  if (pathname.startsWith("/admin/users")) {
    return {
      title: "Users",
      subtitle: "Team access and roles",
    }
  }

  if (pathname.startsWith("/admin/audit-log")) {
    return {
      title: "Audit log",
      subtitle: "Security and activity history",
    }
  }

  return {
    title: "Workspace",
  }
}
