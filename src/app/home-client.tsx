"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { AgeGroupsSection } from "@/components/section/age-groups.section";
import { HalfPieChartSection } from "@/components/section/half-pie-chart.section";
import { MetricsSection } from "@/components/section/metrics.section";
import { MediaValueRacSection } from "@/components/section/media-value-rac.section";
import { Box } from "@/components/ui/box";
import { ControlPanel } from "@/components/ui/control-panel/control-panel";
import { Footer } from "@/components/ui/footer";
import { Header } from "@/components/ui/header";
import { ResponsiveScale } from "@/components/ui/responsive-scale";
import {
  ageGroupsData,
  contactsByGenderData,
  defaultAgeGroupsPercentageIfAllZero,
  metricItemsData,
} from "@/lib/constants";
import type {
  AgeGroupItem,
  MetricItem,
} from "@/lib/types";
import { useCampaignMetrics } from "@/hooks/use-campaign-metrics";
import { useCampaignStyles, useSaveCampaignStyles } from "@/hooks/use-campaign-styles";
import {
  CampaignSharedStyles,
  defaultSharedStyles,
} from "@/lib/shared-styles-types";
import { parseDashboardOrientation } from "@/lib/dashboard-orientation";

const METRIC_TYPES = [
  "uniqueContacts",
  "realtimeAccurateContacts",
  "aggregatedAudience",
  "viewFrequency",
  "visitFrequency",
  "viewTime",
  "viewTimeTotal",
  "shareOfVoice",
] as const;

function HomeContent({ campaignId, isAdmin }: { campaignId: string; isAdmin: boolean }) {
  const searchParams = useSearchParams();
  // Fetch campaign metrics from API (will use prefetched data from server)
  const { data: campaignMetrics } = useCampaignMetrics(campaignId);

  // Fetch campaign styles (will use prefetched data from server)
  const { data: campaignStyles } = useCampaignStyles(campaignId);

  // Save campaign styles mutation
  const { mutate: saveStyles, isPending: isSaving } = useSaveCampaignStyles(campaignId);

  const [metricItems, setMetricItems] = useState<MetricItem[]>(
    metricItemsData.map((datum) => ({ ...datum, visible: true })),
  );

  const [contactsByGender, setContactsByGender] =
    useState<typeof contactsByGenderData>(contactsByGenderData);
  

  const [ageGroups, setAgeGroups] = useState<AgeGroupItem[]>(
    ageGroupsData.map((datum) => ({ ...datum, visible: true })),
  );

  const [isOpen, setIsOpen] = useState(false);

  // Local state for styles (for immediate UI updates) - initialized from prefetched data
  const [localStyles, setLocalStyles] = useState<CampaignSharedStyles>(
    campaignStyles || { ...defaultSharedStyles, campaignId }
  );

  /** Campaign orientation is the default; query params are explicit overrides. Legacy: ?layout= */
  const queryOrientation =
    parseDashboardOrientation(searchParams.get("orientation")) ??
    parseDashboardOrientation(searchParams.get("layout"));
  const campaignOrientation = parseDashboardOrientation(
    campaignMetrics?.campaign?.orientation,
  );
  const orientation = queryOrientation ?? campaignOrientation ?? localStyles.orientation;
  const isLandscape = orientation === "landscape";

  // Update local styles when fetched styles arrive (for live updates after initial load)
  useEffect(() => {
    if (campaignStyles) {
      // Ensure all required fields exist with fallbacks
      const stylesWithDefaults = {
        ...defaultSharedStyles,
        ...campaignStyles,
        metrics: campaignStyles.metrics || defaultSharedStyles.metrics,
        blocks: campaignStyles.blocks || defaultSharedStyles.blocks,
        orientation: campaignStyles.orientation || defaultSharedStyles.orientation,
        boxStyle: campaignStyles.boxStyle || defaultSharedStyles.boxStyle,
        spacing: campaignStyles.spacing || defaultSharedStyles.spacing,
        footer: campaignStyles.footer || defaultSharedStyles.footer,
        metricsCaps: campaignStyles.metricsCaps || defaultSharedStyles.metricsCaps,
        useFallbackData: campaignStyles.useFallbackData || defaultSharedStyles.useFallbackData,
      };
      setLocalStyles(stylesWithDefaults);
    }
  }, [campaignStyles]);

  // Update metric items with fetched data
  useEffect(() => {
    if (campaignMetrics?.metrics) {
      const updatedMetrics = metricItemsData.map((datum, index) => {
        const fetchedMetric = campaignMetrics.metrics[index];
        if (fetchedMetric) {
          return {
            ...datum,
            amount: fetchedMetric.value,
            visible: true
          } as MetricItem;
        }
        return { ...datum, visible: true } as MetricItem;
      });
      setMetricItems(updatedMetrics);
    }
  }, [campaignMetrics]);

  // Update gender distribution with fetched data
  useEffect(() => {
    if (campaignMetrics?.genderDistribution && campaignMetrics?.ageGroups && campaignMetrics.metrics) {
      // Use actual counts from API response (based on unique contacts)
      const maleCount = campaignMetrics.genderDistribution.maleCount || 0;
      const femaleCount = campaignMetrics.genderDistribution.femaleCount || 0;
      
      setContactsByGender({
        left: {
          title: "Female",
          number: femaleCount
        },
        right: {
          title: "Male",
          number: maleCount
        }
      });
    }
  }, [campaignMetrics]);

  // Update age groups with fetched data (same order as ageGroupsData / API keys)
  useEffect(() => {
    if (!campaignMetrics) return;
    const agp = defaultAgeGroupsPercentageIfAllZero(
      campaignMetrics.ageGroupsPercentage ?? null,
    );
    setAgeGroups(
      ageGroupsData.map((datum) => ({
        name: datum.name,
        amount: agp[datum.name] ?? 0,
        visible: true,
      })),
    );
  }, [campaignMetrics]);

  const configuredMetrics = useMemo(() => {
    const metricsConfig = localStyles.metrics || [];
    if (metricsConfig.length > 0) {
      return metricsConfig
        .filter((m) => m.visible)
        .sort((a, b) => a.order - b.order)
        .map((config) => {
          const metricItem = metricItems.find((_, index) => {
            return METRIC_TYPES[index] === config.type;
          });
          return metricItem ? { ...metricItem, name: config.name } : null;
        })
        .filter(
          (item: MetricItem | null) =>
            item !== null &&
            !["Visit Frequency (avr.)", "Share of Voice"].includes(item.name),
        )
        .filter(Boolean) as MetricItem[];
    }
    return metricItems;
  }, [localStyles.metrics, metricItems]);

  const racValue = useMemo(
    () =>
      metricItems.find((item) => item.name === "Realtime Accurate Contacts")?.amount ?? 0,
    [metricItems],
  );

  const blockVisible = (type: (typeof localStyles.blocks)[0]["type"]) =>
    localStyles.blocks.some((b) => b.type === type && b.visible);

  // Apply styles to the document
  useEffect(() => {
    if (!localStyles) return;

    // Apply fonts
    document.body.style.fontFamily = localStyles.primaryFont;
    document.body.style.fontSize = localStyles.fontSize.base;
    document.body.style.fontWeight = localStyles.fontWeight.normal;

    // Apply color variables
    document.documentElement.style.setProperty('--primary', localStyles.colorScheme.primary);
    document.documentElement.style.setProperty('--secondary', localStyles.colorScheme.secondary);
    document.documentElement.style.setProperty('--text-color', localStyles.textColor);
    document.documentElement.style.setProperty('--heading-color', localStyles.headingColor || localStyles.textColor);
    document.documentElement.style.setProperty('--secondary-text-color', localStyles.secondaryTextColor || '#e0e0e0');
    document.documentElement.style.setProperty('--border-color', localStyles.colorScheme.border || '#ffffff33');
    
    // Apply font family variables
    document.documentElement.style.setProperty('--font-family-primary', localStyles.primaryFont);
    document.documentElement.style.setProperty('--font-family-heading', localStyles.headingFont || localStyles.primaryFont);
    
    // Apply font size variables
    document.documentElement.style.setProperty('--font-size-base', localStyles.fontSize.base);
    document.documentElement.style.setProperty('--font-size-heading', localStyles.fontSize.heading);
    document.documentElement.style.setProperty('--font-size-small', localStyles.fontSize.small);
    
    // Apply font weight variables
    document.documentElement.style.setProperty('--font-weight-normal', localStyles.fontWeight.normal);
    document.documentElement.style.setProperty('--font-weight-medium', localStyles.fontWeight.medium);
    document.documentElement.style.setProperty('--font-weight-bold', localStyles.fontWeight.bold);

    // Apply custom CSS if provided
    if (localStyles.customCSS) {
      const styleId = 'custom-campaign-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = localStyles.customCSS;
    }
  }, [localStyles]);

  // Handle save styles
  const handleSaveStyles = () => {
    saveStyles(localStyles);
  };

  // Since data is prefetched server-side, we shouldn't see loading states
  // But keep a minimal check just in case
  if (!localStyles || !campaignMetrics) {
    // This should rarely/never happen due to prefetching
    return null;
  }

  // Calculate background style (transparent so rotated bg.png shows through)
  const getBackgroundStyle = () => {
    return { backgroundColor: 'transparent' };
  };

  // Handle click on main content - only allow opening sidebar if user is admin
  const handleMainContentClick = () => {
    if (isAdmin) {
      setIsOpen(true);
    }
  };

  const boxStyles = {
    backgroundColor: "#FFFFFF",
    borderRadius: "8px",
    borderWidth: localStyles.boxStyle.borderWidth,
    borderColor: localStyles.boxStyle.borderColor,
    borderStyle: "solid" as const,
    boxShadow: "none",
  };

  const campaignTitle = campaignMetrics?.campaign?.name?.trim() || "booth";

  if (isLandscape) {
    return (
      <div className="relative mx-auto flex h-[1080px] min-h-[1080px] w-[1920px] min-w-[1920px] max-w-[1920px] overflow-hidden bg-[#fbfbf9]">
        <div
          id="dashboard-main"
          className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-10 pb-14 pt-13.5"
          onClick={handleMainContentClick}
          style={{
            cursor: isAdmin ? "pointer" : "default",
          }}
        >
          <header className="relative mb-[20px] flex h-[72px] w-full shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/eidra-logo.svg"
              alt=""
              className="relative z-10 h-[44px] w-[136px] shrink-0 object-contain"
            />
            <h1
              id="dashboard-header-title"
              className="eidra-sans pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-[min(100%,1600px)] -translate-x-1/2 -translate-y-1/2 text-center text-[52px] leading-[60px] text-black"
              style={{ textRendering: "geometricPrecision" }}
            >
              <span className="font-medium text-black/60">Live metrics from </span>
              <span className="font-bold">{campaignTitle}</span>
            </h1>
            <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center">
              {/* Campaign logo URLs are dynamic — next/image remotePatterns would be noisy */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={localStyles.logo.url}
                alt=""
                className="h-11 w-auto max-w-[200px] object-contain"
              />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 gap-[20px]">
            <div className="flex min-h-0 w-[1000px] shrink-0 flex-col justify-end gap-[20px]">
              {blockVisible("metrics") ? (
                <Box
                  id="block-metrics-landscape"
                  title="Metrics"
                  style={boxStyles}
                  className="flex h-[387px] min-h-[387px] shrink-0 flex-col overflow-hidden"
                >
                  <div className="flex min-h-0 flex-1 flex-col">
                    <MetricsSection
                      metricItems={configuredMetrics}
                      layout="landscape"
                    />
                  </div>
                </Box>
              ) : null}
              {blockVisible("ageGroups") ? (
                <Box
                  id="block-ageGroups-landscape"
                  title="Age groups"
                  style={boxStyles}
                  className="flex h-[453px] min-h-[453px] shrink-0 flex-col overflow-hidden"
                >
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <AgeGroupsSection ageGroups={ageGroups} />
                  </div>
                </Box>
              ) : null}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-end gap-[20px]">
              {blockVisible("genderDistribution") ? (
                <Box
                  id="block-gender-landscape"
                  title="Contacts by gender"
                  style={boxStyles}
                  className="flex h-[734px] min-h-[734px] shrink-0 flex-col overflow-hidden"
                >
                  <div className="relative flex min-h-0 w-full flex-1 flex-col">
                    <HalfPieChartSection
                      contactsByGender={contactsByGender}
                      hideOverview
                    />
                  </div>
                </Box>
              ) : null}
              {blockVisible("mediaValueRac") ? (
                <Box
                  id="block-mediaValueRac"
                  title={undefined}
                  style={boxStyles}
                  className="flex h-[106px] min-h-[106px] shrink-0 flex-col justify-center overflow-hidden py-0"
                >
                  <MediaValueRacSection racValue={racValue} />
                </Box>
              ) : null}
            </div>
          </div>
        </div>

        {isAdmin && (
          <aside
            id="dashboard-sidebar"
            className={`flex-shrink-0 overflow-hidden border-l border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out [color-scheme:light] ${
              isOpen ? "w-[450px]" : "w-0"
            }`}
            style={{
              height: 1080,
              minHeight: 1080,
              position: "sticky",
              top: 0,
              alignSelf: "stretch",
            }}
          >
            <div className="h-full w-[450px] overflow-y-auto">
              <ControlPanel
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                styles={localStyles}
                onStylesChange={setLocalStyles}
                onSave={handleSaveStyles}
                isSaving={isSaving}
              />
            </div>
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-[1920px] min-h-[1920px] w-full overflow-hidden">
      {/* Rotated background image - clipped to 1080x1920 */}
      <div className="absolute inset-0 z-0 flex items-center justify-center" aria-hidden>
        <div
          style={{
            position: 'relative',
            width: 1080,
            height: 1920,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 2852,
              height: 1954,
              left: '50%',
              top: '50%',
              opacity: 1,
              backgroundImage: 'url(/bg.png)',
              transform: 'translate(-50%, -50%) rotate(-60.25deg)',
              transformOrigin: 'center center',
            }}
          />
        </div>
      </div>
      {/* Main Content */}
      <div 
        id="dashboard-main"
        className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 justify-center overflow-y-auto"
        onClick={handleMainContentClick}
        style={{ 
          ...getBackgroundStyle(),
          color: '#ffffff', //localStyles.textColor,
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        <div 
          id="dashboard-content"
          className="flex h-full min-h-0 min-w-[1080px] max-w-[1080px] flex-col items-center"
        >
          <Header campaignName={campaignMetrics?.campaign?.name} />

          <main 
            id="dashboard-main-content"
            className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
            style={{
              fontFamily: localStyles.primaryFont,
              color: localStyles.textColor,
              padding: localStyles.spacing.contentPadding,
              gap: localStyles.spacing.sectionGap,
            }}
          >
            {localStyles.blocks
              .filter((block) => block.visible)
              .sort((a, b) => a.order - b.order)
              .map((block) => {
                switch (block.type) {
                  case 'metrics':
                    return (
                      <Box 
                        key={block.id}
                        id={`block-${block.id}`}
                        title={block.title !== 'Metrics' ? block.title : undefined}
                        style={boxStyles}
                      >
                        <MetricsSection metricItems={configuredMetrics} />
                      </Box>
                    );
                  case 'mediaValueRac':
                    return (
                      <Box 
                        key={block.id}
                        id={`block-${block.id}`}
                        title={undefined}
                        style={boxStyles}
                      >
                        <MediaValueRacSection racValue={racValue} />
                      </Box>
                    );
                  case 'genderDistribution':
                    return (
                      <Box 
                        key={block.id}
                        id={`block-${block.id}`}
                        title={block.title}
                        style={boxStyles}
                      >
                        <HalfPieChartSection contactsByGender={contactsByGender} />
                      </Box>
                    );
                  case 'ageGroups':
                    return (
                      <Box 
                        key={block.id}
                        id={`block-${block.id}`}
                        title={block.title}
                        style={boxStyles}
                      >
                        <AgeGroupsSection ageGroups={ageGroups} />
                      </Box>
                    );
                  default:
                    return null;
                }
              })}
          </main>

          <Footer 
            src={localStyles.logo.url}
            logoWidth={localStyles.logo.width}
            logoHeight={localStyles.logo.height}
            logoPosition={localStyles.logo.position}
            logoMarginTop={localStyles.logo.marginTop}
            footerBackgroundUrl={localStyles.footer?.backgroundUrl}
            footerBackgroundColor={localStyles.footer?.backgroundColor}
          />
        </div>
      </div>

      {/* Sidebar Control Panel - Only render if user is admin */}
      {isAdmin && (
        <aside 
          id="dashboard-sidebar"
          className={`transition-all duration-300 ease-in-out ${
            isOpen ? 'w-[450px]' : 'w-0'
          } overflow-hidden bg-white text-gray-900 border-l border-gray-200 flex-shrink-0 [color-scheme:light]`}
          style={{ 
            height: 1920,
            minHeight: 1920,
            position: 'sticky',
            top: 0,
            alignSelf: 'stretch',
          }}
        >
          <div className="w-[450px] h-full overflow-y-auto">
            <ControlPanel
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              styles={localStyles}
              onStylesChange={setLocalStyles}
              onSave={handleSaveStyles}
              isSaving={isSaving}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

export default HomeContent;

