import { supabase } from "@/lib/supabase";

export type GrantRecord = {
  id: string;
  name: string | null;
  organization: string | null;
  url: string | null;
  short_description?: string | null;
  eligibility_summary?: string | null;
  industry_tags?: string[] | null;
  stage_tags?: string[] | null;
  goal_tags?: string[] | null;
  supports_rd?: boolean | null;
  funding_type?: string | null;
  funding_preference?: string | null;
  intake_status?: string | null;
  sort_priority?: number | null;
  verification_status?: "review_pending" | "verified" | "rejected" | null;
  is_active?: boolean | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  business_relevance?: "high" | "medium" | "low" | null;
  source_name?: string | null;
  source_program_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchLiveGrants(): Promise<GrantRecord[]> {
  const { data, error } = await supabase
    .from("grants")
    .select("*")
    .eq("is_active", true)
    .eq("verification_status", "verified")
    .order("sort_priority", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch live grants: ${error.message}`);
  }

  return (data || []) as GrantRecord[];
}

export async function fetchPendingGrants(): Promise<GrantRecord[]> {
  const { data, error } = await supabase
    .from("grants")
    .select("*")
    .eq("is_active", false)
    .eq("verification_status", "review_pending")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending grants: ${error.message}`);
  }

  return (data || []) as GrantRecord[];
}

export async function fetchRejectedGrants(): Promise<GrantRecord[]> {
  const { data, error } = await supabase
    .from("grants")
    .select("*")
    .eq("verification_status", "rejected")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch rejected grants: ${error.message}`);
  }

  return (data || []) as GrantRecord[];
}

export async function fetchAdminGrantCounts() {
  const [liveRes, pendingRes, rejectedRes] = await Promise.all([
    supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("verification_status", "verified"),

    supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false)
      .eq("verification_status", "review_pending"),

    supabase
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "rejected"),
  ]);

  if (liveRes.error) {
    throw new Error(`Failed to fetch live count: ${liveRes.error.message}`);
  }
  if (pendingRes.error) {
    throw new Error(`Failed to fetch pending count: ${pendingRes.error.message}`);
  }
  if (rejectedRes.error) {
    throw new Error(`Failed to fetch rejected count: ${rejectedRes.error.message}`);
  }

  return {
    live: liveRes.count || 0,
    pending: pendingRes.count || 0,
    rejected: rejectedRes.count || 0,
  };
}

export async function approveGrant(grantId: string, reviewedBy = "admin") {
  const { error } = await supabase
    .from("grants")
    .update({
      verification_status: "verified",
      is_active: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", grantId);

  if (error) {
    throw new Error(`Failed to approve grant: ${error.message}`);
  }
}

export async function rejectGrant(
  grantId: string,
  reviewNotes?: string,
  reviewedBy = "admin"
) {
  const { error } = await supabase
    .from("grants")
    .update({
      verification_status: "rejected",
      is_active: false,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", grantId);

  if (error) {
    throw new Error(`Failed to reject grant: ${error.message}`);
  }
}

export async function keepGrantPending(
  grantId: string,
  reviewNotes?: string,
  reviewedBy = "admin"
) {
  const { error } = await supabase
    .from("grants")
    .update({
      verification_status: "review_pending",
      is_active: false,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", grantId);

  if (error) {
    throw new Error(`Failed to keep grant pending: ${error.message}`);
  }
}