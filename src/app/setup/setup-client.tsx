"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"

import { CampaignCombobox, type CampaignOption } from "./campaign-combobox"

const PORTRAIT_W = 1080
const PORTRAIT_H = 1920
const LANDSCAPE_W = 1920
const LANDSCAPE_H = 1080
type Orientation = "portrait" | "landscape"

/** TEMP: pre-select Nenovo campaign for /setup — remove before release */
const TEMP_DEFAULT_CAMPAIGN_ID = "69bd4e2537ea1ae52e956bea"

export default function SetupClient() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    TEMP_DEFAULT_CAMPAIGN_ID,
  )
  const [campaignOrientation, setCampaignOrientation] =
    useState<Orientation>("landscape")
  const [orientationOverride, setOrientationOverride] =
    useState<Orientation | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      setListError(null)
      try {
        const res = await fetch("/api/campaigns")
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login?callbackUrl=/setup"
            return
          }
          throw new Error("Failed to load campaigns")
        }
        const data = (await res.json()) as { campaigns?: CampaignOption[] }
        if (!cancelled) {
          setCampaigns(data.campaigns ?? [])
        }
      } catch {
        if (!cancelled) {
          setListError("Could not load campaigns. Try again.")
        }
      } finally {
        if (!cancelled) {
          setListLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)
    setCampaignOrientation(selectedCampaign?.orientation ?? "landscape")
  }, [campaigns, selectedCampaignId])

  const orientation = orientationOverride ?? campaignOrientation

  const previewSrc = selectedCampaignId
    ? `/${selectedCampaignId}${
        orientationOverride ? `?orientation=${orientationOverride}` : ""
      }`
    : ""

  const frameAspectClass =
    orientation === "portrait" ? "aspect-[9/16]" : "aspect-video"

  const contentW = orientation === "landscape" ? LANDSCAPE_W : PORTRAIT_W
  const contentH = orientation === "landscape" ? LANDSCAPE_H : PORTRAIT_H

  const previewTransform =
    "translate(-50%, -50%) scale(var(--preview-scale))" as const

  const previewVars = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scale = Math.min(rect.width / contentW, rect.height / contentH)
      el.style.setProperty("--preview-scale", String(Math.max(0.05, scale)))
    },
    [contentW, contentH],
  )

  const [frameNode, setFrameNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!frameNode) return
    previewVars(frameNode)
    const ro = new ResizeObserver(() => previewVars(frameNode))
    ro.observe(frameNode)
    return () => ro.disconnect()
  }, [frameNode, previewVars, selectedCampaignId, orientation])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Display setup
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            Home
          </Link>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          Sign out
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[380px]">
          <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur-sm">
            <div>
              <label
                htmlFor="setup-campaign-trigger"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Campaign
              </label>
              {listLoading ? (
                <p className="text-sm text-zinc-500">Loading campaigns…</p>
              ) : listError ? (
                <p className="text-sm text-red-400">{listError}</p>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-zinc-500">No campaigns found.</p>
              ) : (
                <CampaignCombobox
                  campaigns={campaigns}
                  value={selectedCampaignId}
                  onValueChange={(campaignId) => {
                    setSelectedCampaignId(campaignId)
                    setOrientationOverride(null)
                  }}
                  triggerId="setup-campaign-trigger"
                />
              )}
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Orientation
              </span>
              <p className="mb-3 text-xs text-zinc-500">
                Using campaign setting: {campaignOrientation}. Choose an option to
                preview with a query override.
              </p>
              <ButtonGroup className="w-full [&>button]:min-w-0 [&>button]:flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOrientationOverride("portrait")}
                  className={cn(
                    "h-10 text-sm font-medium shadow-none",
                    orientation === "portrait"
                      ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-500 hover:text-white"
                      : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
                  )}
                >
                  Portrait
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOrientationOverride("landscape")}
                  className={cn(
                    "h-10 text-sm font-medium shadow-none",
                    orientation === "landscape"
                      ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-500 hover:text-white"
                      : "border-zinc-600 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
                  )}
                >
                  Landscape
                </Button>
              </ButtonGroup>
              {orientationOverride ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOrientationOverride(null)}
                  className="mt-2 h-auto px-0 text-xs text-zinc-400 hover:bg-transparent hover:text-zinc-100"
                >
                  Use campaign setting
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl shadow-black/40 backdrop-blur-sm lg:min-h-0">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">Preview</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Live view of the campaign dashboard (read-only in the iframe).
            </p>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950/80 p-4">
            {!selectedCampaignId ? (
              <p className="max-w-xs text-center text-sm text-zinc-500">
                Choose a campaign to preview how it will appear on the display.
              </p>
            ) : (
              <div
                ref={setFrameNode}
                className={`relative max-h-full w-full max-w-full overflow-hidden rounded-lg border border-zinc-700 bg-black/40 shadow-inner ${frameAspectClass}`}
              >
                <div
                  className="absolute left-1/2 top-1/2 origin-center will-change-transform"
                  style={{
                    width: contentW,
                    height: contentH,
                    transform: previewTransform,
                  }}
                >
                  <iframe
                    title="Dashboard preview"
                    src={previewSrc}
                    className="block border-0 bg-white"
                    style={{
                      width: contentW,
                      height: contentH,
                      pointerEvents: "auto",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
