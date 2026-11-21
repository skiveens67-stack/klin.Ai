"use client";
import { useCallback, useEffect, useState } from "react";
type SupportCase = {
  id: string; sender: string; sender_address: string; subject: string; body_text: string;
  category: string; priority: string; summary: string | null; ai_draft: string | null;
  status: string; requires_human: boolean; escalation_reason: string | null;
  received_at: string; sent_at: string | null;
};
export default function KlinSupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const loadCases = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const suffix = filter === "all" ? "" : "?status=" + encodeURIComponent(filter);
      const response = await fetch("/api/admin/support/emails" + suffix, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load support cases.");
      const nextCases = result.cases as SupportCase[];
      setCases(nextCases);
      setSelectedId((current) => nextCases.some((item) => item.id === current) ? current : nextCases[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support c¶»§q«^