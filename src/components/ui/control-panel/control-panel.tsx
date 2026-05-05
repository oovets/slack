import { Box } from "../box";
import { SetStateAction, useState, useEffect } from "react";
import { CampaignSharedStyles, availableFonts, DashboardBlock, MetricConfig } from "@/lib/shared-styles-types";
import Image from "next/image";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';

interface FallbackData {
  uniqueContacts: number;
  totalHumans: number;
  malePercentage: number;
  femalePercentage: number;
  ageGroupsPercentage: {
    '18 - 24': number;
    '25 - 34': number;
    '35 - 44': number;
    '45 - 54': number;
    '55 - 64': number;
    '65+': number;
  };
  viewFrequency: number;
  visitFrequency: number;
  viewTime: number;
  viewTimeTotal: number;
  lastCalculatedAt?: string;
}

// Sortable Block Item Component
function SortableBlockItem({ 
  block, 
  onToggleVisibility, 
  onUpdateTitle 
}: { 
  block: DashboardBlock; 
  onToggleVisibility: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </button>
      <input
        type="checkbox"
        checked={block.visible}
        onChange={() => onToggleVisibility(block.id)}
        className="w-4 h-4"
      />
      <input
        type="text"
        value={block.title}
        onChange={(e) => onUpdateTitle(block.id, e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
      />
    </div>
  );
}

// Sortable Metric Item Component
function SortableMetricItem({ 
  metric, 
  onToggleVisibility,
  onUpdateName 
}: { 
  metric: MetricConfig; 
  onToggleVisibility: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </button>
      <input
        type="checkbox"
        checked={metric.visible}
        onChange={() => onToggleVisibility(metric.id)}
        className="w-4 h-4"
      />
      <input
        type="text"
        value={metric.name}
        onChange={(e) => onUpdateName(metric.id, e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
      />
    </div>
  );
}

type ControlPanelProps = {
  isOpen: boolean;
  setIsOpen: (value: SetStateAction<boolean>) => void;
  styles: CampaignSharedStyles;
  onStylesChange: (styles: CampaignSharedStyles) => void;
  onSave: () => void;
  isSaving: boolean;
};

export function ControlPanel({
  isOpen,
  setIsOpen,
  styles,
  onStylesChange,
  onSave,
  isSaving,
}: ControlPanelProps) {

  const availableDevices = styles.campaignId === '6960e209bbd2c589f355a4ff' ? ['aspace-prod-31', 'aspace-prod-32', 'aspace-prod-33'] : [];
  const tabs = availableDevices.length > 0 ? ['fallback', "advanced", "device"] : ['fallback', "advanced"]; // 'blocks', 'colors', 'fonts', 'logo', 'layout', 'advanced', 
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('fallback');
  const [fallbackData, setFallbackData] = useState<FallbackData | null>(null);
  const [loadingFallback, setLoadingFallback] = useState(false);
  const [isSavingFallback, setIsSavingFallback] = useState(false);
  const [calculatedData, setCalculatedData] = useState<FallbackData | null>(null);
  const [loadingCalculated, setLoadingCalculated] = useState(false);

  const [mainDevice, setMainDevice] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);
  
  const queryClient = useQueryClient()
  
  // Fetch fallback data when useFallbackData is enabled
  const fetchFallbackData = async () => {
    setLoadingFallback(true);
    try {
      const response = await fetch(`/api/fallback-data?campaignId=${styles.campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setFallbackData(data);
      }
    } catch (error) {
      console.error('Error fetching fallback data:', error);
    }
    setLoadingFallback(false);
  };
  
  // Save fallback data
  const saveFallbackData = async () => {
    if (!fallbackData) return;
    
    setIsSavingFallback(true);
    try {
      await fetch('/api/fallback-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: styles.campaignId,
          ...fallbackData
        })
      });
      
      console.log('✅ Fallback data saved');
    } catch (error) {
      console.error('Error saving fallback data:', error);
    } finally {
      setIsSavingFallback(false);
    }
  };

  // Fetch calculated data from analytics (not fallback)
  const fetchCalculatedData = async () => {
    setLoadingCalculated(true);
    try {
      // Temporarily disable fallback to get real calculated data
      const response = await fetch(`/api/metrics?campaignId=${styles.campaignId}&skipFallback=true`);
      if (response.ok) {
        const data = await response.json();
        
        // Extract the same essentials
        const metrics = data.metrics || [];
        const calculated: FallbackData = {
          uniqueContacts: metrics.find((m: { label: string; value: number }) => m.label === 'Unique Contacts')?.value || 0,
          totalHumans: metrics.find((m: { label: string; value: number }) => m.label === 'Aggregated audience')?.value || 0,
          malePercentage: Math.round(data.genderDistribution?.malePercentage || 0),
          femalePercentage: Math.round(data.genderDistribution?.femalePercentage || 0),
          viewFrequency: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View freq. (avr.)')?.value || 0),
          visitFrequency: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'Visit freq. (avr.)')?.value || 0),
          viewTime: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View Time (avr.)')?.value || 0),
          viewTimeTotal: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View Time (Total)')?.value || 0),
          ageGroupsPercentage: data.ageGroupsPercentage || {
            '18 - 24': 0,
            '25 - 34': 0,
            '35 - 44': 0,
            '45 - 54': 0,
            '55 - 64': 0,
            '65+': 0
          }
        };

        setCalculatedData(calculated);
      }
    } catch (error) {
      console.error('Error fetching calculated data:', error);
    } finally {
      setLoadingCalculated(false);
    }
  };

  // Fetch calculated data every 10 seconds when on fallback tab
  useEffect(() => {
    if (activeTab === 'fallback' && styles.useFallbackData) {
      // Fetch immediately
      fetchCalculatedData();
      
      // Set up 10-second interval
      const interval = setInterval(fetchCalculatedData, 10000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, styles.useFallbackData, styles.campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'device') {
      const fetchMainDevice = async () => {
        try {
          const response = await fetch(`/api/campaign?campaignId=${styles.campaignId}`);
          if (response.ok) {
            const data = await response.json()
            setMainDevice(data.deviceId || null)
            setSelectedDevice(data.deviceId || null)
          }
        } catch (error) {
          console.error('Error fetching main device:', error)
        }
      }
      fetchMainDevice()
    }
  }, [activeTab, styles.campaignId])

  const updateDevice = async () => {
    if (!selectedDevice || !styles.campaignId) return
    
    setIsUpdatingDevice(true)
    try {
      const response = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: styles.campaignId,
          deviceId: selectedDevice
        })
      })
      
      if (response.ok) {
        setMainDevice(selectedDevice)
        console.log('✅ Device updated successfully')
      } else {
        console.error('Error updating device:', await response.text())
      }
    } catch (error) {
      console.error('Error updating device:', error)
    } finally {
      setIsUpdatingDevice(false)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if "s" key is pressed and we're on fallback tab
      if (e.key === 's' && activeTab === 'fallback' && fallbackData) {
        e.preventDefault();
        saveFallbackData();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, fallbackData]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateStyles = (updates: Partial<CampaignSharedStyles>) => {
    onStylesChange({ ...styles, ...updates });
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = styles.blocks.findIndex((block) => block.id === active.id);
      const newIndex = styles.blocks.findIndex((block) => block.id === over.id);
      const newBlocks = arrayMove(styles.blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index,
      }));
      updateStyles({ blocks: newBlocks });
    }
  };

  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = styles.metrics.findIndex((metric) => metric.id === active.id);
      const newIndex = styles.metrics.findIndex((metric) => metric.id === over.id);
      const newMetrics = arrayMove(styles.metrics, oldIndex, newIndex).map((metric, index) => ({
        ...metric,
        order: index,
      }));
      updateStyles({ metrics: newMetrics });
    }
  };

  const toggleBlockVisibility = (id: string) => {
    const newBlocks = styles.blocks.map((block) =>
      block.id === id ? { ...block, visible: !block.visible } : block
    );
    updateStyles({ blocks: newBlocks });
  };

  const updateBlockTitle = (id: string, title: string) => {
    const newBlocks = styles.blocks.map((block) =>
      block.id === id ? { ...block, title } : block
    );
    updateStyles({ blocks: newBlocks });
  };

  const toggleMetricVisibility = (id: string) => {
    const newMetrics = styles.metrics.map((metric) =>
      metric.id === id ? { ...metric, visible: !metric.visible } : metric
    );
    updateStyles({ metrics: newMetrics });
  };

  const updateMetricName = (id: string, name: string) => {
    const newMetrics = styles.metrics.map((metric) =>
      metric.id === id ? { ...metric, name } : metric
    );
    updateStyles({ metrics: newMetrics });
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-white text-gray-900 [color-scheme:light]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Style Customization
          </h2>
          <p className="text-sm text-gray-600">
            Customize the appearance of your dashboard
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 my-4 border-b pb-2 border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1 rounded capitalize transition-colors text-sm"
            style={{
              backgroundColor: activeTab === tab ? styles.colorScheme.primary : 'transparent',
              color: activeTab === tab ? '#fff' : '#374151',
              fontWeight: activeTab === tab ? '600' : '400',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
          {/* Blocks Tab */}
          {activeTab === 'blocks' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm" title="Dashboard Blocks">
                <p className="text-xs text-gray-600 mb-3">
                  Drag to reorder, toggle visibility, or edit titles
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleBlockDragEnd}
                >
                  <SortableContext
                    items={styles.blocks.map((block) => block.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {styles.blocks.map((block) => (
                        <SortableBlockItem
                          key={block.id}
                          block={block}
                          onToggleVisibility={toggleBlockVisibility}
                          onUpdateTitle={updateBlockTitle}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Metrics">
                <p className="text-xs text-gray-600 mb-3">
                  Choose which metrics to display and in what order
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleMetricDragEnd}
                >
                  <SortableContext
                    items={styles.metrics.map((metric) => metric.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {styles.metrics.map((metric) => (
                        <SortableMetricItem
                          key={metric.id}
                          metric={metric}
                          onToggleVisibility={toggleMetricVisibility}
                          onUpdateName={updateMetricName}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </Box>
            </>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm" title="Background">
        <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Background Color:</span>
                    <input
                      type="color"
                      value={styles.backgroundColor}
                      onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.backgroundColor}
                      onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={styles.backgroundGradient?.enabled}
                      onChange={(e) => updateStyles({
                        backgroundGradient: {
                          ...styles.backgroundGradient!,
                          enabled: e.target.checked,
                        }
                      })}
                    />
                    <span>Enable Gradient</span>
                  </label>

                  {styles.backgroundGradient?.enabled && (
                    <>
                      <label className="flex items-center gap-2">
                        <span className="w-32">Gradient Type:</span>
                        <select
                          value={styles.backgroundGradient.type}
                          onChange={(e) => updateStyles({
                            backgroundGradient: {
                              ...styles.backgroundGradient!,
                              type: e.target.value as 'linear' | 'radial',
                            }
                          })}
                          className="flex-1 px-2 py-1 border rounded"
                        >
                          <option value="linear">Linear</option>
                          <option value="radial">Radial</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-2">
                        <span className="w-32">Color 1:</span>
                        <input
                          type="color"
                          value={styles.backgroundGradient.colors[0]}
                          onChange={(e) => {
                            const newColors = [...styles.backgroundGradient!.colors];
                            newColors[0] = e.target.value;
                            updateStyles({
                              backgroundGradient: {
                                ...styles.backgroundGradient!,
                                colors: newColors,
                              }
                            });
                          }}
                          className="w-20 h-8"
                        />
                        <input
                          type="text"
                          value={styles.backgroundGradient.colors[0]}
                          onChange={(e) => {
                            const newColors = [...styles.backgroundGradient!.colors];
                            newColors[0] = e.target.value;
                            updateStyles({
                              backgroundGradient: {
                                ...styles.backgroundGradient!,
                                colors: newColors,
                              }
                            });
                          }}
                          className="flex-1 px-2 py-1 border rounded"
                        />
                      </label>

                      <label className="flex items-center gap-2">
                        <span className="w-32">Color 2:</span>
                        <input
                          type="color"
                          value={styles.backgroundGradient.colors[1]}
                          onChange={(e) => {
                            const newColors = [...styles.backgroundGradient!.colors];
                            newColors[1] = e.target.value;
                            updateStyles({
                              backgroundGradient: {
                                ...styles.backgroundGradient!,
                                colors: newColors,
                              }
                            });
                          }}
                          className="w-20 h-8"
                        />
                        <input
                          type="text"
                          value={styles.backgroundGradient.colors[1]}
                          onChange={(e) => {
                            const newColors = [...styles.backgroundGradient!.colors];
                            newColors[1] = e.target.value;
                            updateStyles({
                              backgroundGradient: {
                                ...styles.backgroundGradient!,
                                colors: newColors,
                              }
                            });
                          }}
                          className="flex-1 px-2 py-1 border rounded"
                        />
                      </label>

                      {styles.backgroundGradient.type === 'linear' && (
                        <label className="flex items-center gap-2">
                          <span className="w-32">Angle:</span>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={styles.backgroundGradient.angle || 135}
                            onChange={(e) => updateStyles({
                              backgroundGradient: {
                                ...styles.backgroundGradient!,
                                angle: parseInt(e.target.value),
                              }
                            })}
                            className="flex-1"
                          />
                          <span className="w-12">{styles.backgroundGradient.angle || 135}°</span>
                        </label>
                      )}
                    </>
                  )}
                </div>
          </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Text Colors">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Text Color:</span>
                    <input
                      type="color"
                      value={styles.textColor}
                      onChange={(e) => updateStyles({ textColor: e.target.value })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.textColor}
                      onChange={(e) => updateStyles({ textColor: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Heading Color:</span>
                    <input
                      type="color"
                      value={styles.headingColor || styles.textColor}
                      onChange={(e) => updateStyles({ headingColor: e.target.value })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.headingColor || styles.textColor}
                      onChange={(e) => updateStyles({ headingColor: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Secondary Text:</span>
                    <input
                      type="color"
                      value={styles.secondaryTextColor || '#e0e0e0'}
                      onChange={(e) => updateStyles({ secondaryTextColor: e.target.value })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.secondaryTextColor || '#e0e0e0'}
                      onChange={(e) => updateStyles({ secondaryTextColor: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>
                </div>
          </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Color Scheme">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Primary Color:</span>
                    <input
                      type="color"
                      value={styles.colorScheme.primary}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, primary: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.colorScheme.primary}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, primary: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Secondary Color:</span>
                    <input
                      type="color"
                      value={styles.colorScheme.secondary}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, secondary: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.colorScheme.secondary}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, secondary: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Accent Color:</span>
                    <input
                      type="color"
                      value={styles.colorScheme.accent || '#ffffff'}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, accent: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.colorScheme.accent || '#ffffff'}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, accent: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Border Color:</span>
                    <input
                      type="color"
                      value={styles.colorScheme.border || '#ffffff33'}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, border: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.colorScheme.border || '#ffffff33'}
                      onChange={(e) => updateStyles({
                        colorScheme: { ...styles.colorScheme, border: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>
                </div>
          </Box>
            </>
          )}

          {/* Fonts Tab */}
          {activeTab === 'fonts' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm" title="Font Family">
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span>Primary Font:</span>
            <select
                      value={styles.primaryFont}
                      onChange={(e) => updateStyles({ primaryFont: e.target.value })}
                      className="px-2 py-2 border rounded bg-white"
                    >
                      {availableFonts.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.name}
                </option>
              ))}
            </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Heading Font:</span>
            <select
                      value={styles.headingFont || styles.primaryFont}
                      onChange={(e) => updateStyles({ headingFont: e.target.value })}
                      className="px-2 py-2 border rounded bg-white"
                    >
                      {availableFonts.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.name}
                        </option>
              ))}
            </select>
                  </label>
                </div>
              </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Font Sizes">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Base Size:</span>
                    <input
                      type="text"
                      value={styles.fontSize.base}
                      onChange={(e) => updateStyles({
                        fontSize: { ...styles.fontSize, base: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 16px"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Heading Size:</span>
                    <input
                      type="text"
                      value={styles.fontSize.heading}
                      onChange={(e) => updateStyles({
                        fontSize: { ...styles.fontSize, heading: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 24px"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Small Size:</span>
                    <input
                      type="text"
                      value={styles.fontSize.small}
                      onChange={(e) => updateStyles({
                        fontSize: { ...styles.fontSize, small: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 14px"
                    />
                  </label>
                </div>
          </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Font Weights">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Normal:</span>
                    <input
                      type="number"
                      min="100"
                      max="900"
                      step="100"
                      value={styles.fontWeight.normal}
                      onChange={(e) => updateStyles({
                        fontWeight: { ...styles.fontWeight, normal: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Medium:</span>
                    <input
                      type="number"
                      min="100"
                      max="900"
                      step="100"
                      value={styles.fontWeight.medium}
                      onChange={(e) => updateStyles({
                        fontWeight: { ...styles.fontWeight, medium: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Bold:</span>
                    <input
                      type="number"
                      min="100"
                      max="900"
                      step="100"
                      value={styles.fontWeight.bold}
                      onChange={(e) => updateStyles({
                        fontWeight: { ...styles.fontWeight, bold: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>
                </div>
              </Box>
            </>
          )}

          {/* Logo Tab */}
          {activeTab === 'logo' && (
            <>
            <Box className="px-3 pb-3 pt-2 text-sm" title="Logo Settings">
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span>Logo URL:</span>
                  <input
                    type="text"
                    value={styles.logo.url}
                    onChange={(e) => updateStyles({
                      logo: { ...styles.logo, url: e.target.value }
                    })}
                    className="px-2 py-1 border rounded"
                    placeholder="/logo.png or https://..."
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="w-32">Width:</span>
                  <input
                    type="text"
                    value={styles.logo.width || 'auto'}
                    onChange={(e) => updateStyles({
                      logo: { ...styles.logo, width: e.target.value }
                    })}
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="auto or 200px"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="w-32">Height:</span>
                  <input
                    type="text"
                    value={styles.logo.height || '60px'}
                    onChange={(e) => updateStyles({
                      logo: { ...styles.logo, height: e.target.value }
                    })}
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="60px"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="w-32">Position:</span>
                  <select
                    value={styles.logo.position || 'center'}
                    onChange={(e) => updateStyles({
                      logo: { ...styles.logo, position: e.target.value as 'left' | 'center' | 'right' }
                    })}
                    className="flex-1 px-2 py-1 border rounded"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">
                  <span className="w-32">Margin Top:</span>
                  <input
                    type="text"
                    value={styles.logo.marginTop || '0px'}
                    onChange={(e) => updateStyles({
                      logo: { ...styles.logo, marginTop: e.target.value }
                    })}
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="0px"
                  />
                </label>

                {/* Logo Preview */}
                <div className="mt-4 p-4 border rounded flex justify-center relative" style={{ backgroundColor: styles.backgroundColor, minHeight: '100px' }}>
                  {styles.logo.url && (
                    <Image 
                      src={styles.logo.url} 
                      alt="Logo preview"
                      width={200}
                      height={60}
                      style={{
                        width: styles.logo.width,
                        height: styles.logo.height,
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            </Box>

            {/* Footer Configuration */}
            <Box className="px-3 pb-3 pt-2 text-sm" title="Footer">
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span>Footer Background Image URL:</span>
                  <input
                    type="text"
                    value={styles.footer?.backgroundUrl || ''}
                    onChange={(e) => updateStyles({
                      footer: { ...styles.footer, backgroundUrl: e.target.value || undefined }
                    })}
                    className="px-2 py-1 border rounded"
                    placeholder="/footer-background.svg or https://..."
                  />
                  <span className="text-xs text-gray-500">Leave empty to use solid color</span>
                </label>

                <label className="flex flex-col gap-1">
                  <span>Footer Background Color:</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={styles.footer?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyles({
                        footer: { ...styles.footer, backgroundColor: e.target.value }
                      })}
                      className="w-12 h-8 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styles.footer?.backgroundColor || ''}
                      onChange={(e) => updateStyles({
                        footer: { ...styles.footer, backgroundColor: e.target.value || undefined }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="#ffffff"
                    />
                  </div>
                  <span className="text-xs text-gray-500">Used if no background image is set</span>
                </label>

                {/* Footer Preview */}
                <div className="mt-4 p-4 border rounded" style={{ minHeight: '100px' }}>
                  <p className="text-xs text-gray-500 mb-2">Footer Preview:</p>
                  <div 
                    className="w-full h-20 rounded"
                    style={{
                      backgroundImage: styles.footer?.backgroundUrl ? `url('${styles.footer.backgroundUrl}')` : undefined,
                      backgroundColor: styles.footer?.backgroundColor || '#f3f4f6',
                      backgroundRepeat: 'repeat-x',
                      backgroundPosition: 'top',
                      backgroundSize: 'auto 100%',
                    }}
                  />
                </div>
              </div>
            </Box>
            </>
          )}

          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm" title="Box Styling">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Background:</span>
                    <input
                      type="color"
                      value={styles.boxStyle.backgroundColor}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, backgroundColor: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.boxStyle.backgroundColor}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, backgroundColor: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Border Radius:</span>
                    <input
                      type="text"
                      value={styles.boxStyle.borderRadius}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, borderRadius: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 8px"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Border Width:</span>
                    <input
                      type="text"
                      value={styles.boxStyle.borderWidth}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, borderWidth: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 1px"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Border Color:</span>
                    <input
                      type="color"
                      value={styles.boxStyle.borderColor}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, borderColor: e.target.value }
                      })}
                      className="w-20 h-8"
                    />
                    <input
                      type="text"
                      value={styles.boxStyle.borderColor}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, borderColor: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Box Shadow:</span>
                    <input
                      type="text"
                      value={styles.boxStyle.shadow}
                      onChange={(e) => updateStyles({
                        boxStyle: { ...styles.boxStyle, shadow: e.target.value }
                      })}
                      className="px-2 py-1 border rounded text-xs"
                      placeholder="e.g., 0 1px 3px 0 rgb(0 0 0 / 0.1)"
                    />
                  </label>
                </div>
              </Box>

              <Box className="px-3 pb-3 pt-2 text-sm" title="Spacing">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <span className="w-32">Section Gap:</span>
                    <input
                      type="text"
                      value={styles.spacing.sectionGap}
                      onChange={(e) => updateStyles({
                        spacing: { ...styles.spacing, sectionGap: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 20px"
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-32">Content Padding:</span>
                    <input
                      type="text"
                      value={styles.spacing.contentPadding}
                      onChange={(e) => updateStyles({
                        spacing: { ...styles.spacing, contentPadding: e.target.value }
                      })}
                      className="flex-1 px-2 py-1 border rounded"
                      placeholder="e.g., 40px"
                    />
                  </label>
                </div>
              </Box>
            </>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm" title="Metrics Caps">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-600 mb-2">
                    Set maximum values for metrics. Other metrics will calculate based on these caps.
                  </p>
                  
                  <label className="flex flex-col gap-1">
                    <span>Total Human Cap:</span>
                    <input
                      type="number"
                      min="0"
                      value={styles.metricsCaps?.totalHumanCap || ''}
                      onChange={(e) => updateStyles({
                        metricsCaps: {
                          ...styles.metricsCaps,
                          totalHumanCap: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="px-2 py-1 border rounded"
                      placeholder="No cap (use actual value)"
                    />
                    <span className="text-xs text-gray-500">
                      Maximum total humans to display. Leave empty for no cap.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Unique Contacts Cap:</span>
                    <input
                      type="number"
                      min="0"
                      value={styles.metricsCaps?.uniqueContactsCap || ''}
                      onChange={(e) => updateStyles({
                        metricsCaps: {
                          ...styles.metricsCaps,
                          uniqueContactsCap: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="px-2 py-1 border rounded"
                      placeholder="No cap (use actual value)"
                    />
                    <span className="text-xs text-gray-500">
                      Maximum unique contacts to display. Leave empty for no cap.
                    </span>
                  </label>
                </div>
              </Box>

              {/* <Box className="px-3 pb-3 pt-2 text-sm" title="Custom CSS">
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span>Custom CSS (Advanced):</span>
                    <textarea
                      value={styles.customCSS || ''}
                      onChange={(e) => updateStyles({ customCSS: e.target.value })}
                      className="px-2 py-1 border rounded font-mono text-xs"
                      rows={8}
                      placeholder=".custom-class { color: red; }"
                    />
                  </label>
                </div>
              </Box> */}
            </>
          )}

          {/* Fallback Tab */}
          {activeTab === 'fallback' && (
            <>
              <Box className="px-3 pb-3 pt-2 text-sm text-gray-900" title="Fallback Data Settings">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={styles.useFallbackData || false}
                      onChange={async (e) => {
                        const isEnabled = e.target.checked;
                        updateStyles({ useFallbackData: isEnabled });
                        
                        // Auto-save to both campaign and styles immediately
                        try {
                          // Save to campaign
                          await fetch('/api/campaign-fallback-toggle', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              campaignId: styles.campaignId,
                              useFallbackData: isEnabled
                            })
                          });
                          
                          // Save to styles
                          await fetch('/api/campaign-styles', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...styles,
                              useFallbackData: isEnabled
                            })
                          });
                          
                          
                          // Invalidate styles query to refresh
                          queryClient.invalidateQueries({ queryKey: ['campaignStyles', styles.campaignId] });
                        } catch (error) {
                          console.error('Error saving fallback flag:', error);
                        }
                        
                        if (isEnabled) {
                          // When enabling fallback data, fetch current live data and save it as fallback
                          setLoadingFallback(true);
                          try {
                            // Fetch real calculated data (skip fallback to get live data)
                            const response = await fetch(`/api/metrics?campaignId=${styles.campaignId}&skipFallback=true`);
                            if (response.ok) {
                              const data = await response.json();
                              
                              // Extract the metrics
                              const metrics = data.metrics || [];
                              const liveData: FallbackData = {
                                uniqueContacts: metrics.find((m: { label: string; value: number }) => m.label === 'Unique Contacts')?.value || 0,
                                totalHumans: metrics.find((m: { label: string; value: number }) => m.label === 'Aggregated audience')?.value || 0,
                                malePercentage: Math.round(data.genderDistribution?.malePercentage || 0),
                                femalePercentage: Math.round(data.genderDistribution?.femalePercentage || 0),
                                viewFrequency: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View freq. (avr.)')?.value || 0),
                                visitFrequency: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'Visit freq. (avr.)')?.value || 0),
                                viewTime: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View Time (avr.)')?.value || 0),
                                viewTimeTotal: Math.round(metrics.find((m: { label: string; value: number }) => m.label === 'View Time (Total)')?.value || 0),
                                ageGroupsPercentage: data.ageGroupsPercentage || {
                                  '18 - 24': 0,
                                  '25 - 34': 0,
                                  '35 - 44': 0,
                                  '45 - 54': 0,
                                  '55 - 64': 0,
                                  '65+': 0
                                }
                              };
                              
                              // Set it to the state
                              setFallbackData(liveData);
                              
                              // Save it immediately as fallback data
                              await fetch('/api/fallback-data', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  campaignId: styles.campaignId,
                                  ...liveData
                                })
                              });
                              
                            }
                          } catch (error) {
                            console.error('Error saving live data as fallback:', error);
                          } finally {
                            setLoadingFallback(false);
                          }
                        } else {
                          setFallbackData(null);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">Use Fallback Data</span>
                  </label>
                  <p className="text-xs text-gray-600">
                    When enabled, current live data will be saved as fallback data, allowing you to manually adjust values. The dashboard will then display this fallback data instead of calculating from analytics. <strong>(Auto-saved)</strong>
                  </p>
                </div>
              </Box>

              {styles.useFallbackData && (
                <>
                  <Box className="px-3 pb-3 pt-2 text-sm text-gray-900" title="Fallback Metrics Editor">
                    {loadingFallback ? (
                      <div className="text-center py-4 text-gray-500">Loading fallback data...</div>
                    ) : !fallbackData ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-600">No fallback data found.</p>
                        <button
                          onClick={fetchFallbackData}
                          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Load Fallback Data
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1">
                          <span>Total Humans:</span>
                          <input
                            type="number"
                            min="0"
                            value={fallbackData.totalHumans || 0}
                            onChange={(e) => setFallbackData({
                              ...fallbackData,
                              totalHumans: Number(e.target.value)
                            })}
                            className="px-2 py-1 border rounded bg-white text-gray-900"
                          />
                        </label>

                        <label className="flex flex-col gap-1">
                          <span>Unique Contacts:</span>
                          <input
                            type="number"
                            min="0"
                            value={fallbackData.uniqueContacts || 0}
                            onChange={(e) => setFallbackData({
                              ...fallbackData,
                              uniqueContacts: Number(e.target.value)
                            })}
                            className="px-2 py-1 border rounded bg-white text-gray-900"
                          />
                        </label>

                        <div className="flex flex-col gap-2">
                          <span className="font-semibold">Frequency & Time Metrics:</span>
                          
                          <label className="flex flex-col gap-1">
                            <span className="text-xs">View Frequency (avg):</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fallbackData.viewFrequency || 0}
                              onChange={(e) => setFallbackData({
                                ...fallbackData,
                                viewFrequency: Number(e.target.value)
                              })}
                              className="px-2 py-1 border rounded text-sm bg-white text-gray-900"
                            />
                          </label>

                          {/* <label className="flex flex-col gap-1">
                            <span className="text-xs">Visit Frequency (avg):</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fallbackData.visitFrequency || 0}
                              onChange={(e) => setFallbackData({
                                ...fallbackData,
                                visitFrequency: Number(e.target.value)
                              })}
                              className="px-2 py-1 border rounded text-sm"
                            />
                          </label> */}

                          <label className="flex flex-col gap-1">
                            <span className="text-xs">View Time (avg) - seconds:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={fallbackData.viewTime || 0}
                              onChange={(e) => setFallbackData({
                                ...fallbackData,
                                viewTime: Number(e.target.value)
                              })}
                              className="px-2 py-1 border rounded text-sm bg-white text-gray-900"
                            />
                          </label>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="font-semibold">Gender Distribution:</span>
                          
                          <label className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span>Male: {fallbackData.malePercentage?.toFixed(1) || 0}%</span>
                              <span>Female: {fallbackData.femalePercentage?.toFixed(1) || 0}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={fallbackData.malePercentage || 50}
                              onChange={(e) => {
                                const male = Number(e.target.value);
                                setFallbackData({
                                  ...fallbackData,
                                  malePercentage: male,
                                  femalePercentage: 100 - male
                                });
                              }}
                              className="w-full"
                            />
                          </label>
                        </div>

                        {/* <div className="flex flex-col gap-2">
                          <span className="font-semibold">Age Groups (%):</span>
                          
                          {Object.entries(fallbackData.ageGroupsPercentage || {}).map(([ageGroup, value]) => (
                            <label key={ageGroup} className="flex items-center gap-2">
                              <span className="w-20 text-xs">{ageGroup}:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={value}
                                onChange={(e) => setFallbackData({
                                  ...fallbackData,
                                  ageGroupsPercentage: {
                                    ...fallbackData.ageGroupsPercentage,
                                    [ageGroup]: Number(e.target.value)
                                  }
                                })}
                                className="flex-1 px-2 py-1 border rounded text-xs"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </label>
                          ))}
                        </div> */}

                        <button
                          onClick={saveFallbackData}
                          disabled={isSavingFallback}
                          className="w-full py-2 px-4 rounded font-semibold text-white transition-colors mt-4"
                          style={{
                            backgroundColor: styles.colorScheme.primary,
                            opacity: isSavingFallback ? 0.6 : 1,
                            cursor: isSavingFallback ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSavingFallback ? 'Saving...' : 'Save Fallback Data (S)'}
                        </button>

                        {/* Real Calculated Data */}
                        {calculatedData && (
                          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">Real Calculated Data</span>
                              {loadingCalculated && <span className="text-xs text-blue-600">Updating...</span>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex flex-col">
                                <span className="text-gray-500">Total Humans:</span>
                                <span className="font-semibold">{calculatedData.totalHumans}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">Unique Contacts:</span>
                                <span className="font-semibold">{calculatedData.uniqueContacts}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">View Freq:</span>
                                <span className="font-semibold">{calculatedData.viewFrequency}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">Visit Freq:</span>
                                <span className="font-semibold">{calculatedData.visitFrequency}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">View Time:</span>
                                <span className="font-semibold">{calculatedData.viewTime}s</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">Male/Female:</span>
                                <span className="font-semibold">{calculatedData.malePercentage}% / {calculatedData.femalePercentage}%</span>
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              Auto-updates every 10 seconds
                            </p>
                          </div>
                        )}

                        {fallbackData.lastCalculatedAt && (
                          <p className="text-xs text-gray-500 text-center mt-2">
                            Last calculated: {new Date(fallbackData.lastCalculatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </Box>
                </>
              )}
            </>
          )}

          {/* Device Tab */}
          {availableDevices.length > 0 && activeTab === 'device' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Device Configuration</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Current device: <b className="text-gray-900">{mainDevice || 'Loading...'}</b>
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Select Device:</label>
                <select 
                  value={selectedDevice || ''} 
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full py-2 px-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUpdatingDevice}
                >
                  <option value="" disabled>Select a device</option>
                  {availableDevices.map((device) => (
                    <option key={device} value={device}>{device}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={updateDevice}
                disabled={isUpdatingDevice || !selectedDevice || selectedDevice === mainDevice}
                className="w-full py-2 px-4 rounded font-semibold text-white transition-colors bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isUpdatingDevice ? 'Updating...' : 'Update Device'}
              </button>
            </div>
          )}

        {/* Save Button */}
        {activeTab === 'advanced' && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="w-full py-3 px-4 rounded font-semibold text-white transition-colors sticky bottom-0 bg-white shadow-lg mt-4"
            style={{
              backgroundColor: styles.colorScheme.primary,
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
        </div>
  );
}
