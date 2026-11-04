// Group endpoints work without an existing group, so no x-group-id header here.
export class GroupApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postGroup(path: string, id: string): Promise<string> {
  const response = await fetch(`/api/v1/groups${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GroupApiError(data.message || "Wystąpił nieznany błąd", response.status);
  }
  // The backend normalizes the code (single source of truth) and returns it
  return data.id as string;
}

// Create a new group (409 if the code is taken)
export const createGroupApi = (id: string) => postGroup("", id);

// Join an existing group (404 if there is none)
export const joinGroupApi = (id: string) => postGroup("/join", id);
