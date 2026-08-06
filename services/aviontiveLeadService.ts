/**
 * Aviontive Lead Service
 * Handles all communications with the Aviontive API for leads management
 */

export interface AviontiveContact {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  phone_e164: string;
  notes: string;
  connections: Array<{
    type: string;
    value: string;
  }>;
}

export interface AviontiveExternalUser {
  id: string;
  username: string;
  display_name: string;
  profile_picture_url: string;
  external_user_id: string;
  contact: AviontiveContact;
}

export interface AviontiveChannelAccount {
  id: string;
  username: string;
  display_name: string;
  profile_picture_url: string;
  channel: {
    id: number;
    name: string;
    icon: string | null;
  };
}

export interface AviontiveTask {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AviontiveConversation {
  id: string;
  external_user_id: string;
  summary: string;
  last_message_at: string;
  created_at: string;
  channel_account: AviontiveChannelAccount;
  external_user: AviontiveExternalUser;
  tasks: AviontiveTask[];
}

export interface AviontiveStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface AviontiveLabel {
  system_label: {
    id: string;
    name: string;
    category: string;
    color: string;
    description: string;
  };
}

export interface AviontiveLead {
  id: string;
  brand_id: string;
  pipeline_id: string;
  stage_id: string;
  conversation_id: string;
  contact_id: string;
  title: string;
  notes: string;
  source: string;
  created_at: string;
  updated_at: string;
  stage: AviontiveStage;
  conversation: AviontiveConversation;
  labels: AviontiveLabel[];
}

export interface AviontiveLeadsResponse {
  data: AviontiveLead[];
}

const getApiConfig = () => {
  const baseUrl = process.env.AVIONTIVE_API_BASE_URL;
  const apiKey = process.env.AVIONTIVE_API_KEY;
  const brandId = process.env.AVIONTIVE_BRAND_ID;

  if (!baseUrl || !apiKey || !brandId) {
    throw new Error(
      "Missing Aviontive API configuration. Please check your environment variables.",
    );
  }

  return { baseUrl, apiKey, brandId };
};

/**
 * Fetch leads from Aviontive API
 * @param pipelineId - Optional: Filter by pipeline UUID
 * @returns Promise<AviontiveLeadsResponse>
 */
export async function fetchAviontiveLeads(
  pipelineId?: string,
): Promise<AviontiveLeadsResponse> {
  const { baseUrl, apiKey, brandId } = getApiConfig();

  const url = new URL(`${baseUrl}/leads/leads`);

  // Add pipeline_id query parameter if provided
  if (pipelineId) {
    url.searchParams.append("pipeline_id", pipelineId);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Aviontive API Error: ${response.status} - ${
          errorData.message || response.statusText
        }`,
      );
    }

    const data: AviontiveLeadsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch Aviontive leads:", error);
    throw error;
  }
}

/**
 * Fetch a single lead by ID
 * @param leadId - The lead ID
 * @returns Promise<AviontiveLead>
 */
export async function fetchAviontiveLeadById(
  leadId: string,
): Promise<AviontiveLead> {
  const { baseUrl, apiKey, brandId } = getApiConfig();

  const url = `${baseUrl}/leads/leads/${leadId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Aviontive API Error: ${response.status} - ${
          errorData.message || response.statusText
        }`,
      );
    }

    const data: AviontiveLead = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch Aviontive lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Fetch all pipelines
 * @returns Promise<AviontivePipeline[]>
 */
export async function fetchAviontivePipelines(): Promise<any[]> {
  const { baseUrl, apiKey, brandId } = getApiConfig();

  const url = `${baseUrl}/leads/pipelines`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pipelines: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch Aviontive pipelines:", error);
    throw error;
  }
}

/**
 * Fetch all stages
 * @returns Promise<AviontiveStage[]>
 */
export async function fetchAviontiveStages(): Promise<AviontiveStage[]> {
  const { baseUrl, apiKey, brandId } = getApiConfig();

  const url = `${baseUrl}/leads/stages`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Brand-ID": brandId,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch stages: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch Aviontive stages:", error);
    throw error;
  }
}
