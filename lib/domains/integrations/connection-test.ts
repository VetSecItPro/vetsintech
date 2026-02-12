import type { ExternalPlatform } from "./types";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime: number;
}

/**
 * Test the API connection for an external platform.
 *
 * Attempts a lightweight API call using the provided credentials and
 * returns success/failure plus the response time in milliseconds.
 */
export async function testConnection(
  platform: ExternalPlatform,
  credentials: Record<string, string>
): Promise<ConnectionTestResult> {
  const start = Date.now();

  try {
    switch (platform) {
      case "coursera":
        return await testCoursera(credentials, start);
      case "pluralsight":
        return await testPluralsight(credentials, start);
      case "udemy":
        return await testUdemy(credentials, start);
      default:
        return {
          success: false,
          message: `Unsupported platform: ${platform}`,
          responseTime: Date.now() - start,
        };
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
      responseTime: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Platform-specific testers
// ---------------------------------------------------------------------------

async function testCoursera(
  credentials: Record<string, string>,
  start: number
): Promise<ConnectionTestResult> {
  const { client_id, client_secret, org_slug } = credentials;

  if (!client_id || !client_secret || !org_slug) {
    return {
      success: false,
      message: "Missing required credentials: client_id, client_secret, org_slug",
      responseTime: Date.now() - start,
    };
  }

  // Attempt OAuth2 token exchange
  const body = new URLSearchParams({
    client_id,
    client_secret,
    grant_type: "client_credentials",
  });

  const res = await fetch(
    "https://api.coursera.org/oauth2/client_credentials/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    }
  );

  const responseTime = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      message: `Authentication failed (${res.status}): ${text.slice(0, 200)}`,
      responseTime,
    };
  }

  return {
    success: true,
    message: `Connected successfully to Coursera (${responseTime}ms)`,
    responseTime,
  };
}

async function testPluralsight(
  credentials: Record<string, string>,
  start: number
): Promise<ConnectionTestResult> {
  const { api_token, plan_id } = credentials;

  if (!api_token || !plan_id) {
    return {
      success: false,
      message: "Missing required credentials: api_token, plan_id",
      responseTime: Date.now() - start,
    };
  }

  const res = await fetch(
    `https://api.pluralsight.com/api/v1/plans/${plan_id}`,
    {
      headers: {
        Authorization: `Bearer ${api_token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const responseTime = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      message: `API request failed (${res.status}): ${text.slice(0, 200)}`,
      responseTime,
    };
  }

  return {
    success: true,
    message: `Connected successfully to Pluralsight (${responseTime}ms)`,
    responseTime,
  };
}

async function testUdemy(
  credentials: Record<string, string>,
  start: number
): Promise<ConnectionTestResult> {
  const { api_key, account_id } = credentials;

  if (!api_key || !account_id) {
    return {
      success: false,
      message: "Missing required credentials: api_key, account_id",
      responseTime: Date.now() - start,
    };
  }

  const authHeader = api_key.includes(":")
    ? `Basic ${Buffer.from(api_key).toString("base64")}`
    : `Bearer ${api_key}`;

  const res = await fetch(
    `https://${account_id}.udemy.com/api-2.0/organizations/${account_id}/users/list/?page=1&page_size=1`,
    {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const responseTime = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      message: `API request failed (${res.status}): ${text.slice(0, 200)}`,
      responseTime,
    };
  }

  return {
    success: true,
    message: `Connected successfully to Udemy Business (${responseTime}ms)`,
    responseTime,
  };
}
