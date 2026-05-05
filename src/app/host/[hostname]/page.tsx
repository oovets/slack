import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HostDashboardClient from "./host-dashboard-client";

interface HostPageProps {
  params: Promise<{ hostname: string }>;
}

export const metadata: Metadata = {
  title: "Host Event Dashboard",
  description: "Live host telemetry and per-camera analytics",
};

export default async function HostPage({ params }: HostPageProps) {
  const { hostname } = await params;
  const decodedHostname = decodeHostParam(hostname);

  if (!decodedHostname || !/^(aspace-prod-\d+|tag:[a-z0-9_-]+)$/.test(decodedHostname)) {
    notFound();
  }

  return <HostDashboardClient host={decodedHostname} />;
}

function decodeHostParam(hostname: string) {
  try {
    return decodeURIComponent(hostname);
  } catch {
    return "";
  }
}
