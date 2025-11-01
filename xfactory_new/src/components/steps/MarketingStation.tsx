import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, ArrowLeft, Download, Target, Users, Megaphone, Palette, Image, Calendar, Sparkles, Loader2, X, Clock, Hash, MessageSquare, Check, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { StationFlowManager } from "@/lib/stationFlow";
import { apiClient, toAbsoluteMediaUrl } from "@/lib/api";
import { getCurrentTeamId } from "@/lib/teamScope";

import InfoButton from "@/components/info-button";
import { FactorAI } from "../FactorAI";
import { UserMenu } from "../UserMenu";

interface MarketingStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  testingData?: any;
  mvpData?: any;
  validationData?: any;
}

type CampaignPlanEntry = {
  date: string;
  dayOfCampaign: number;
  theme: string;
  contentType: string;
  caption: string;
  platform: string;
  impressions: number;
  callToAction: string;
  postingTime: string;
  notes?: string;
  imagePrompt?: string;
};

interface CampaignCalendarState {
  id?: number;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  goal?: string;
  tone?: string;
  postingFrequency?: string;
  budgetRange?: string;
  themes?: string;
  platforms?: string[];
  generationMethod?: string;
  entries: CampaignPlanEntry[];
  raw?: any;
}

const MARKETING_DRAFT_STORAGE_KEY = "xfactory_marketing_station_draft";

const splitToArray = (input?: string | string[] | null): string[] => {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => `${item}`.trim())
      .filter((item) => item.length > 0);
  }
  return `${input}`
    .split(/[\s,;+]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const formatAsHashtag = (value: string): string => {
  if (!value) {
    return '';
  }
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').trim();
  if (!cleaned) {
    return '';
  }
  return `#${cleaned}`;
};
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatImpressions = (value: number): string => {
  if (!value || value <= 0) {
    return 'Organic';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${value}`;
};



export const MarketingStation = ({ 
  onComplete, 
  onBack, 
  testingData,
  mvpData,
  validationData 
}: MarketingStationProps) => {
  const [activeTab, setActiveTab] = useState("branding");
  const [isLoading, setIsLoading] = useState(false);
  const [serverInsights, setServerInsights] = useState<any | null>(null);
  const [serverSchedule, setServerSchedule] = useState<any | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isGeneratingPreferences, setIsGeneratingPreferences] = useState(false);
  
  // Brand Building Data
  const [brandBuildingData, setBrandBuildingData] = useState({
    brandName: '',
    brandIdentity: '',
    brandPersona: '',
    brandValues: '',
    brandMission: '',
    brandVision: ''
  });

  // Image Generation Data
  const [imageGenData, setImageGenData] = useState({
    generatedImages: [],
    savedImages: []
  });

  // Campaign Image Selection Data
  const [campaignImageSelections, setCampaignImageSelections] = useState<{[key: string]: {images: any[], selectedImage?: any, enhancedPrompt?: string, pipelineSuccess?: boolean}}>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationModes, setGenerationModes] = useState<{[key: string]: 'single' | 'ab-test'}>({});
  const [collapsedDays, setCollapsedDays] = useState<{[key: string]: boolean}>({});
  
  // Day Detail Popup Data
  const [selectedDay, setSelectedDay] = useState<CampaignPlanEntry | null>(null);
  const [isDayPopupOpen, setIsDayPopupOpen] = useState(false);

  // Campaign Planning Data
  const [campaignCalendar, setCampaignCalendar] = useState<CampaignCalendarState | null>(null);
  const [campaignGenerationError, setCampaignGenerationError] = useState<string | null>(null);
  
  const [campaignPreferences, setCampaignPreferences] = useState({
    goal: '',
    platforms: [] as string[],
    themes: '',
    budgetRange: '',
    frequency: '',
    tone: ''
  });

  // Target Audience Data
  const [audienceData, setAudienceData] = useState({
    customerType: '',
    ageRange: '',
    income: '',
    location: '',
    painPoints: '',
    goals: '',
    behaviors: ''
  });

  // Brand Strategy Data
  const [brandData, setBrandData] = useState({
    brandName: '',
    tagline: '',
    valueProposition: '',
    tone: '',
    competitors: '',
    uniqueness: ''
  });

  // Marketing Channels Data
  const [channelsData, setChannelsData] = useState({
    primaryChannels: [] as string[],
    budget: '',
    contentTypes: [] as string[],
    launchPlan: ''
  });

  // Brand Assets Data
  const [assetsData, setAssetsData] = useState({
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B'
    },
    messaging: '',
    socialHandles: ''
  });

  const sortedCampaignEntries = useMemo(() => {
    if (!campaignCalendar?.entries?.length) {
      return [];
    }

    return [...campaignCalendar.entries].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : NaN;
      const bTime = b.date ? new Date(b.date).getTime() : NaN;

      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return aTime - bTime;
      }

      if (!Number.isNaN(aTime)) {
        return -1;
      }

      if (!Number.isNaN(bTime)) {
        return 1;
      }

      return (a.dayOfCampaign ?? 0) - (b.dayOfCampaign ?? 0);
    });
  }, [campaignCalendar]);

  const campaignEntriesMap = useMemo(() => {
    if (!sortedCampaignEntries.length) {
      return {};
    }

    return sortedCampaignEntries.reduce<Record<string, CampaignPlanEntry>>((acc, entry, index) => {
      const key = entry.date || `day-${entry.dayOfCampaign ?? index + 1}`;
      acc[key] = entry;
      return acc;
    }, {});
  }, [sortedCampaignEntries]);

  const ageOptions = useMemo(() => ['18-24', '25-34', '35-44', '45-54', '55+'], []);
  const ageOptionLabels = useMemo<Record<string, string>>(() => ({
    '18-24': '18-24',
    '25-34': '25-34',
    '35-44': '35-44',
    '45-54': '45-54',
    '55+': '55+'
  }), []);

  const normalizeAgeRange = useCallback((raw?: string | null): string => {
    if (!raw) return '';
    const value = raw.toString().trim();
    if (!value) return '';
    if (ageOptions.includes(value)) return value;

    const lower = value.toLowerCase();
    if (lower.includes('teen') || lower.includes('college') || lower.includes('young adult') || lower.includes('gen z') || lower.includes('student')) {
      return '18-24';
    }
    if (lower.includes('late twenties') || lower.includes('early thirties') || lower.includes('millennial') || lower.includes('twenties')) {
      return '25-34';
    }
    if (lower.includes('mid thirties') || lower.includes('late thirties') || lower.includes('early forties')) {
      return '35-44';
    }
    if (lower.includes('midlife') || lower.includes('forties')) {
      return '45-54';
    }
    if (lower.includes('senior') || lower.includes('retire') || lower.includes('boomer') || lower.includes('older adult') || lower.includes('55')) {
      return '55+';
    }

    const rangeMatch = lower.match(/(\d{1,2})\D+(\d{1,2})/);
    if (rangeMatch) {
      const startAge = parseInt(rangeMatch[1], 10);
      const endAge = parseInt(rangeMatch[2], 10);
      const midpoint = (startAge + endAge) / 2;
      const ranges = [
        { key: '18-24', low: 18, high: 24 },
        { key: '25-34', low: 25, high: 34 },
        { key: '35-44', low: 35, high: 44 },
        { key: '45-54', low: 45, high: 54 },
      ];
      for (const range of ranges) {
        if ((startAge >= range.low && endAge <= range.high) || (midpoint >= range.low && midpoint <= range.high)) {
          return range.key;
        }
      }
      if (endAge >= 55) {
        return '55+';
      }
    }

    const singleMatch = lower.match(/(\d{2})\s*\+?/);
    if (singleMatch) {
      const age = parseInt(singleMatch[1], 10);
      if (age < 25) return '18-24';
      if (age < 35) return '25-34';
      if (age < 45) return '35-44';
      if (age < 55) return '45-54';
      return '55+';
    }

    return '';
  }, [ageOptions]);

  const incomeOptions = useMemo(() => ['<30k', '30-50k', '50-100k', '100k+'], []);
  const incomeOptionLabels = useMemo<Record<string, string>>(() => ({
    '<30k': 'Under $30k',
    '30-50k': '$30k - $50k',
    '50-100k': '$50k - $100k',
    '100k+': '$100k+',
  }), []);

  const normalizeIncomeLevel = useCallback((raw?: string | null): string => {
    if (!raw) return '';
    const original = raw.toString().trim();
    if (!original) return '';
    if (incomeOptions.includes(original)) return original;

    const lower = original.toLowerCase();
    const matchKeyword = (keywords: string[]): boolean => keywords.some((keyword) => lower.includes(keyword));

    if (matchKeyword(['six-figure', '100k', 'high income', 'upper income', 'affluent', 'wealthy', 'premium'])) {
      return '100k+';
    }
    if (matchKeyword(['50-100', '50k', 'mid income', 'middle income', 'upper-middle', 'moderate-high'])) {
      return '50-100k';
    }
    if (matchKeyword(['30-50', '30k', 'lower-middle', 'entry-level', 'starter income', 'budget-conscious'])) {
      return '30-50k';
    }
    if (matchKeyword(['under 30', 'less than 30', 'low income', 'limited budget', 'tight budget', 'affordable', 'student budget', 'below 30'])) {
      return '<30k';
    }

    const parseToken = (token: string): number | null => {
      const cleaned = token.trim();
      if (!cleaned) return null;
      const hasThousandSuffix = cleaned.includes('k');
      const numeric = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
      if (Number.isNaN(numeric)) return null;
      let value = numeric * (hasThousandSuffix ? 1000 : 1);
      if (!hasThousandSuffix && value < 1000) {
        value *= 1000;
      }
      return value;
    };

    const rangeMatch = lower.match(/(\d+[k]?)[^\d]+(\d+[k]?)/);
    if (rangeMatch) {
      const startRaw = parseToken(rangeMatch[1]);
      const endRaw = parseToken(rangeMatch[2]);
      if (startRaw !== null && endRaw !== null) {
        const midpoint = (startRaw + endRaw) / 2;
        if (midpoint >= 100_000) return '100k+';
        if (midpoint >= 50_000) return '50-100k';
        if (midpoint >= 30_000) return '30-50k';
        return '<30k';
      }
    }

    const singleMatch = lower.match(/(\d+[k]?)/);
    if (singleMatch) {
      const value = parseToken(singleMatch[1]);
      if (value !== null) {
        if (value >= 100_000) return '100k+';
        if (value >= 50_000) return '50-100k';
        if (value >= 30_000) return '30-50k';
        return '<30k';
      }
    }

    return '';
  }, [incomeOptions]);

  const autosaveReadyRef = useRef(false);

  const ageSelectValue = useMemo(() => {
    const normalized = normalizeAgeRange(audienceData.ageRange);
    return normalized && ageOptions.includes(normalized) ? normalized : '';
  }, [audienceData.ageRange, normalizeAgeRange, ageOptions]);

  const incomeSelectValue = useMemo(() => {
    const normalized = normalizeIncomeLevel(audienceData.income);
    return normalized && incomeOptions.includes(normalized) ? normalized : '';
  }, [audienceData.income, normalizeIncomeLevel, incomeOptions]);

  const mergeBrandingFromServer = useCallback((branding: any) => {
    if (!branding) {
      return;
    }

    setBrandBuildingData((prev) => ({
      brandName: prev.brandName || branding.brand_name || '',
      brandIdentity: prev.brandIdentity || branding.brand_identity || '',
      brandPersona: prev.brandPersona || branding.brand_persona || '',
      brandValues: prev.brandValues || (Array.isArray(branding.brand_values) ? branding.brand_values.join(', ') : branding.brand_values ?? ''),
      brandMission: prev.brandMission || branding.brand_mission || '',
      brandVision: prev.brandVision || branding.brand_vision || '',
    }));

    setBrandData((prev) => ({
      ...prev,
      brandName: prev.brandName || branding.brand_name || prev.brandName,
      valueProposition: prev.valueProposition || branding.brand_identity || prev.valueProposition,
      tone: prev.tone || branding.brand_voice || prev.tone,
      uniqueness: prev.uniqueness || branding.visual_style || prev.uniqueness,
    }));

    if (Array.isArray(branding.color_palette) && branding.color_palette.length) {
      setAssetsData((prev) => ({
        ...prev,
        colors: {
          primary: branding.color_palette[0]?.hex ?? prev.colors.primary,
          secondary: branding.color_palette[1]?.hex ?? prev.colors.secondary,
          accent: branding.color_palette[2]?.hex ?? prev.colors.accent,
        },
      }));
    }
  }, []);

  const mergeAudienceFromServer = useCallback((audience: any) => {
    if (!audience) {
      return;
    }

    const toMultiline = (value: any) => {
      if (Array.isArray(value)) {
        return value.filter(Boolean).join('\n');
      }
      return value ?? '';
    };

    setAudienceData((prev) => ({
      customerType: prev.customerType || audience.customer_type || '',
      ageRange: prev.ageRange || normalizeAgeRange(audience.age_range),
      income: prev.income || normalizeIncomeLevel(audience.income_level),
      location:
        prev.location || (Array.isArray(audience.location) ? audience.location.join(', ') : audience.location ?? ''),
      painPoints: prev.painPoints || toMultiline(audience.pain_points),
      goals: prev.goals || toMultiline(audience.goals),
      behaviors: prev.behaviors || toMultiline(audience.behaviors),
    }));
  }, [normalizeAgeRange, normalizeIncomeLevel]);
  const hydrateCampaignCalendar = useCallback((calendar: any) => {
    if (!calendar) {
      return;
    }

    setCampaignGenerationError(null);
    const startDateValue = calendar.startDate ?? calendar.start_date ?? null;
    const endDateValue = calendar.endDate ?? calendar.end_date ?? null;
    const rawEntries = Array.isArray(calendar.entries) ? calendar.entries : calendar.calendar_entries;
    const baseStartDate = startDateValue ? new Date(startDateValue) : null;

    const normalizedEntries: CampaignPlanEntry[] = Array.isArray(rawEntries)
      ? rawEntries.map((entry: any, index: number) => {
          const resolvedDate = entry?.date ?? entry?.day ?? (
            baseStartDate ? new Date(baseStartDate.getTime() + index * MS_PER_DAY).toISOString().split('T')[0] : ''
          );
          const platformValue = Array.isArray(entry?.platform) ? entry.platform[0] : entry?.platform;
          const impressionsValue =
            typeof entry?.impressions_to_buy === 'number'
              ? entry.impressions_to_buy
              : Number(entry?.impressions_to_buy ?? entry?.impressions ?? entry?.paid_impressions ?? 0) || 0;

          return {
            date: resolvedDate || '',
            dayOfCampaign: typeof entry?.day_of_campaign === 'number' ? entry.day_of_campaign : index + 1,
            theme: entry?.theme ?? entry?.purpose ?? entry?.focus ?? '',
            contentType: entry?.content_type ?? entry?.format ?? entry?.contentType ?? '',
            caption: entry?.caption ?? entry?.copy ?? entry?.activity ?? '',
            platform: platformValue ?? 'Instagram',
            impressions: impressionsValue,
            callToAction: entry?.call_to_action ?? entry?.cta ?? '',
            postingTime: entry?.posting_time ?? entry?.scheduled_time ?? '',
            notes: entry?.notes ?? entry?.rationale ?? undefined,
            imagePrompt: entry?.image_prompt ?? entry?.imagePrompt ?? '',
          };
        })
      : [];

    setCampaignCalendar({
      id: calendar.id,
      startDate: startDateValue ?? undefined,
      endDate: endDateValue ?? undefined,
      durationDays: calendar.durationDays ?? calendar.duration_days ?? (normalizedEntries.length || undefined),
      goal: calendar.campaign_goal ?? calendar.goal ?? undefined,
      tone: calendar.campaign_tone ?? calendar.tone ?? undefined,
      postingFrequency: calendar.posting_frequency ?? calendar.postingFrequency ?? undefined,
      budgetRange: calendar.budget_range ?? calendar.budgetRange ?? undefined,
      themes: calendar.themes ?? undefined,
      platforms: Array.isArray(calendar.platforms)
        ? calendar.platforms
        : typeof calendar.platforms === 'string'
          ? splitToArray(calendar.platforms)
          : undefined,
      generationMethod: calendar.generation_method ?? calendar.generationMethod ?? undefined,
      entries: normalizedEntries,
      raw: calendar,
    });
  }, [setCampaignGenerationError]);

  const hydrateLegacyCampaignPlan = useCallback((plan: Record<string, any>) => {
    if (!plan) {
      return;
    }

    setCampaignGenerationError(null);
    const transformedEntries: CampaignPlanEntry[] = Object.entries(plan).map(([date, value], index) => {
      const entry = value as any;
      const impressions = typeof entry?.impressions === 'number' ? entry.impressions : Number(entry?.impressions) || 0;
      return {
        date,
        dayOfCampaign: index + 1,
        theme: entry?.purpose ?? entry?.theme ?? '',
        contentType: entry?.contentType ?? entry?.activity ?? '',
        caption: entry?.caption ?? entry?.activity ?? '',
        platform: entry?.platform ?? 'Instagram',
        impressions,
        callToAction: entry?.callToAction ?? entry?.cta ?? '',
        postingTime: entry?.postingTime ?? '',
        notes: entry?.notes ?? undefined,
        imagePrompt: entry?.imagePrompt ?? entry?.image_prompt ?? '',
      };
    });

    if (transformedEntries.length) {
      setCampaignCalendar({
        entries: transformedEntries,
        raw: { legacyGeneratedPlan: plan },
      });
    }
  }, [setCampaignGenerationError]);

  useEffect(() => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) {
      return;
    }
    let isCancelled = false;
    const teamId = Number(teamIdStr);

    (async () => {
      try {
        const response = await apiClient.getMarketingTeam(teamId);
        if (isCancelled || !response.data) {
          return;
        }
        const payload = response.data as any;
        if (payload.branding) {
          mergeBrandingFromServer(payload.branding);
        }
        if (payload.target_audience) {
          mergeAudienceFromServer(payload.target_audience);
        }
        if (payload.campaign_calendar) {
          hydrateCampaignCalendar(payload.campaign_calendar);
        } else if (payload.campaignData && payload.campaignData.generatedPlan) {
          hydrateLegacyCampaignPlan(payload.campaignData.generatedPlan);
        }
        
        // Load existing campaign images
        try {
          const imagesResponse = await apiClient.getMarketingCampaignImagesListTeam(teamId);
          if (!isCancelled && imagesResponse.data) {
            const imagesByEntry = (imagesResponse.data as any)?.images_by_entry || {};
            
            // Update the campaign image selections with existing images
            setCampaignImageSelections(prev => {
              const updated = { ...prev };
              Object.entries(imagesByEntry).forEach(([entryKey, images]: [string, any]) => {
                updated[entryKey] = {
                  ...updated[entryKey],
                  images: images || [],
                  enhancedPrompt: images?.[0]?.image_prompt || ''
                };
              });
              return updated;
            });
          }
        } catch (error) {
          console.error('Failed to load existing images:', error);
        }
        
        setServerInsights((prev) => payload ?? prev);
      } catch (error) {
        console.error('Failed to fetch marketing data', error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [mergeAudienceFromServer, mergeBrandingFromServer, hydrateCampaignCalendar, hydrateLegacyCampaignPlan]);

  const handleGenerateMarketing = async () => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) { alert('Select a team to generate marketing insights.'); return; }
    const teamId = Number(teamIdStr);
    setIsLoading(true);
    try {
      await apiClient.generateMarketingTeam(teamId);
      const res = await apiClient.getMarketingTeam(teamId);
      setServerInsights(res.data);
      if ((res.data as any)?.campaign_calendar) {
        hydrateCampaignCalendar((res.data as any).campaign_calendar);
      } else if ((res.data as any)?.campaignData?.generatedPlan) {
        hydrateLegacyCampaignPlan((res.data as any).campaignData.generatedPlan);
      }
    } catch (e) {
      console.error('Marketing generation failed', e);
      alert('Failed to generate marketing insights');
    } finally {
      setIsLoading(false);
    }
  };



const handleGenerateCampaignPreferences = async () => {
  const teamIdStr = getCurrentTeamId();
  if (!teamIdStr) {
    alert('Select a team to generate campaign preferences.');
    return;
  }
  const teamId = Number(teamIdStr);
  setIsGeneratingPreferences(true);
  
  try {
    // Generate AI-powered campaign preferences based on previous data
    const response = await apiClient.generateMarketingPreferencesTeam(teamId);
    const preferences = (response.data as any)?.preferences;
    
    if (preferences) {
      setCampaignPreferences(prev => ({
        ...prev,
        goal: preferences.goal || prev.goal,
        platforms: preferences.platforms || prev.platforms,
        themes: preferences.themes || prev.themes,
        tone: preferences.tone || prev.tone,
        // Note: budgetRange and frequency are not AI-generated as per requirements
      }));
    }
  } catch (error) {
    console.error('Campaign preferences generation failed', error);
    alert('Failed to generate campaign preferences. Please try again.');
  } finally {
    setIsGeneratingPreferences(false);
  }
};

const handleGenerateCampaignCalendar = async () => {
  const teamIdStr = getCurrentTeamId();
  if (!teamIdStr) {
    alert('Select a team to generate the campaign calendar.');
    return;
  }
  const teamId = Number(teamIdStr);
  setIsGeneratingCampaign(true);
  setCampaignGenerationError(null);
  try {
    const preferencesPayload: Record<string, any> = {
      goal: campaignPreferences.goal || undefined,
      platforms: campaignPreferences.platforms.length ? campaignPreferences.platforms : undefined,
      themes: campaignPreferences.themes || undefined,
      budget_range: campaignPreferences.budgetRange || undefined,
      frequency: campaignPreferences.frequency || undefined,
      tone: campaignPreferences.tone || undefined,
    };
    Object.keys(preferencesPayload).forEach((key) => {
      if (preferencesPayload[key] === undefined || preferencesPayload[key] === '') {
        delete preferencesPayload[key];
      }
    });

    const payload: Record<string, any> = {
      preferences: preferencesPayload,
      duration_days: 30,
    };

    const response = await apiClient.generateMarketingCalendarTeam(teamId, payload);
    const calendar = (response.data as any)?.calendar;
    if (calendar) {
      hydrateCampaignCalendar(calendar);
    } else if ((response.data as any)?.generatedPlan) {
      hydrateLegacyCampaignPlan((response.data as any).generatedPlan);
    }
  } catch (error) {
    console.error('Campaign calendar generation failed', error);
    setCampaignGenerationError('Failed to generate campaign calendar.');
  } finally {
    setIsGeneratingCampaign(false);
  }
};

  const handleGenerateCampaignImages = async (entryKey: string, imagePrompt: string, abTesting: boolean = false, campaignEntry?: CampaignPlanEntry) => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) {
      alert('Select a team to generate images.');
      return;
    }
    const teamId = Number(teamIdStr);
    setIsGeneratingImages(true);
    
    try {
      const response = await apiClient.generateMarketingCampaignImagesTeam(teamId, {
        entries: [entryKey],
        variantCount: abTesting ? 2 : 1, // Generate 1 image for single mode, 2 for A/B testing
        size: 'social',
        abTesting: abTesting,
        imagePrompt: imagePrompt,
        campaignEntry: campaignEntry || {},
        usePipeline: true
      });
      
             console.log('API Response:', response.data);
             
             const result = (response.data as any)?.results?.[entryKey];
             console.log('Result for entryKey:', entryKey, result);
             
             if (result) {
               const images = result.images || [];
               const enhancedPrompt = result.enhanced_prompt || imagePrompt;
               
               console.log('Generated images count:', images.length);
               console.log('Images data:', images);
               console.log('Enhanced prompt:', enhancedPrompt);
        
        setCampaignImageSelections(prev => ({
          ...prev,
          [entryKey]: {
            ...prev[entryKey],
            images: images,
            enhancedPrompt: enhancedPrompt,
            pipelineSuccess: result.pipeline_success
          }
        }));
        
        // Show success message with enhanced prompt info
        if (result.pipeline_success && enhancedPrompt !== imagePrompt) {
          console.log('Enhanced prompt generated:', enhancedPrompt);
        }
        
        if (images.length === 0) {
          console.warn('No images generated despite successful API call');
        }
      } else {
        console.error('No result found for entryKey:', entryKey);
      }
           } catch (error) {
             console.error('Image generation failed', error);
             console.error('Error details:', error.response?.data || error.message);
             alert(`Failed to generate images: ${error.response?.data?.error || error.message}`);
           } finally {
             setIsGeneratingImages(false);
           }
  };

  const handleSelectImage = (entryKey: string, image: any) => {
    setCampaignImageSelections(prev => ({
      ...prev,
      [entryKey]: {
        ...prev[entryKey],
        selectedImage: image
      }
    }));
  };

  const handleGenerationModeChange = (entryKey: string, mode: 'single' | 'ab-test') => {
    setGenerationModes(prev => ({
      ...prev,
      [entryKey]: mode
    }));
  };

  // Set default generation mode to 'single' if none is selected
  const getGenerationMode = (entryKey: string) => {
    return generationModes[entryKey] || 'single';
  };

  const toggleDayCollapse = (entryKey: string) => {
    setCollapsedDays(prev => ({
      ...prev,
      [entryKey]: !prev[entryKey]
    }));
  };

  // Check if a day is collapsed (defaults to true if not set)
  const isDayCollapsed = (entryKey: string) => {
    return collapsedDays[entryKey] !== false; // Default to true (collapsed)
  };

  const handleDayClick = (plan: CampaignPlanEntry) => {
    setSelectedDay(plan);
    setIsDayPopupOpen(true);
  };
  const handleGenerateBranding = async () => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) { alert('Select a team to generate branding.'); return; }
    const teamId = Number(teamIdStr);
    setIsLoading(true);
    try {
      const res = await apiClient.generateBrandingTeam(teamId);
      const payload = ((res.data as any)?.branding) ?? {};
      setBrandBuildingData({
        brandName: payload.brand_name ?? '',
        brandIdentity: payload.brand_identity ?? '',
        brandPersona: payload.brand_persona ?? '',
        brandValues: Array.isArray(payload.brand_values) ? payload.brand_values.join(', ') : (payload.brand_values ?? ''),
        brandMission: payload.brand_mission ?? '',
        brandVision: payload.brand_vision ?? ''
      });
      setBrandData(prev => ({
        ...prev,
        brandName: payload.brand_name ?? prev.brandName,
        valueProposition: payload.brand_identity ?? prev.valueProposition,
        tone: payload.brand_voice ?? prev.tone,
      }));
      if (Array.isArray(payload.color_palette) && payload.color_palette.length) {
        setAssetsData(prev => ({
          ...prev,
          colors: {
            primary: payload.color_palette[0]?.hex ?? prev.colors.primary,
            secondary: payload.color_palette[1]?.hex ?? prev.colors.secondary,
            accent: payload.color_palette[2]?.hex ?? prev.colors.accent,
          }
        }));
      }
    } catch (e) {
      console.error('Branding generation failed', e);
      alert('Failed to auto-generate branding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTargetAudience = async () => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) { alert('Select a team to generate audience insights.'); return; }
    const teamId = Number(teamIdStr);
    setIsLoading(true);
    try {
      const res = await apiClient.generateTargetAudienceTeam(teamId);
      const payload = ((res.data as any)?.target_audience) ?? {};
      const toText = (value: any) => Array.isArray(value) ? value.filter(Boolean).join('\n') : (value ?? '');
      const rawAge = Array.isArray(payload.age_range) ? payload.age_range.join(', ') : (payload.age_range ?? '');
      const normalizedAge = normalizeAgeRange(rawAge);
      const rawIncome = Array.isArray(payload.income_level) ? payload.income_level.join(', ') : (payload.income_level ?? '');
      const normalizedIncome = normalizeIncomeLevel(rawIncome);
      const recognizedIncomeOption = normalizedIncome && incomeOptions.includes(normalizedIncome) ? normalizedIncome : '';
      setAudienceData({
        customerType: payload.customer_type ?? '',
        ageRange: normalizedAge,
        income: recognizedIncomeOption,
        location: payload.location ?? '',
        painPoints: toText(payload.pain_points),
        goals: toText(payload.goals),
        behaviors: toText(payload.behaviors)
      });
    } catch (e) {
      console.error('Target audience generation failed', e);
      alert('Failed to auto-generate target audience');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstagramSchedule = async () => {
    const teamIdStr = getCurrentTeamId();
    if (!teamIdStr) { alert('Select a team to schedule Instagram.'); return; }
    const teamId = Number(teamIdStr);
    setIsLoading(true);
    try {
      const res = await apiClient.instagramScheduleTeam(teamId, 30);
      setServerSchedule((res.data as any)?.schedule || null);
    } catch (e) {
      console.error('Instagram schedule failed', e);
      alert('Failed to generate Instagram schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  const [submissionLinks, setSubmissionLinks] = useState({
    strategyLink: '',
    brandingLink: '',
    tractionLink: ''
  });

  const handleComplete = () => {
    const marketingData = {
      brandBuildingData,
      imageGenData,
      campaignCalendar,
      campaignEntries: campaignEntriesMap,
      campaignPreferences,
      audienceData,
      brandData,
      channelsData,
      assetsData,
      serverInsights,
      serverSchedule,
      completedAt: new Date().toISOString()
    };

    StationFlowManager.saveStationOutput('marketing', marketingData, 85);
    setShowSubmissionDialog(true);
  };

  const handleSubmitMarketing = async () => {
    try {
      const teamIdStr = getCurrentTeamId();
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      const marketingData = {
        brandBuildingData,
        imageGenData,
        campaignCalendar,
        campaignEntries: campaignEntriesMap,
        campaignPreferences,
        audienceData,
        brandData,
        channelsData,
        assetsData,
        serverInsights,
        serverSchedule,
        completedAt: new Date().toISOString()
      };
      await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
        marketing: {
          submission_completed: true,
          strategy_link: submissionLinks.strategyLink,
          branding_link: submissionLinks.brandingLink,
          traction_link: submissionLinks.tractionLink,
        }
      });
      setShowSubmissionDialog(false);
      onComplete(marketingData);
    } catch {
      alert('Failed to submit marketing links');
    }
  };

  const downloadMarketingPlan = () => {
    const calendarPlatforms = (campaignCalendar?.platforms && campaignCalendar.platforms.length)
      ? campaignCalendar.platforms
      : (campaignPreferences.platforms.length ? campaignPreferences.platforms : []);
    const calendarSummary = sortedCampaignEntries.length
      ? `
CAMPAIGN CALENDAR:
- Start: ${campaignCalendar?.startDate ?? sortedCampaignEntries[0].date}
- Duration: ${(campaignCalendar?.durationDays ?? sortedCampaignEntries.length)} days
- Platforms: ${calendarPlatforms.length ? calendarPlatforms.join(', ') : 'As configured'}
- Highlights:
${sortedCampaignEntries.slice(0, 10).map(entry => `  - ${entry.date}: ${entry.platform} - ${entry.caption || entry.theme} (Impressions: ${formatImpressions(entry.impressions)})`).join('\n')}
`
      : '';

    const plan = `MARKETING PLAN

TARGET AUDIENCE:
- Customer Type: ${audienceData.customerType}
- Demographics: ${audienceData.ageRange}, ${audienceData.income}, ${audienceData.location}
- Pain Points: ${audienceData.painPoints}
- Goals: ${audienceData.goals}

BRAND STRATEGY:
- Brand Name: ${brandData.brandName}
- Tagline: ${brandData.tagline}
- Value Proposition: ${brandData.valueProposition}
- Brand Tone: ${brandData.tone}
- Key Differentiator: ${brandData.uniqueness}

MARKETING CHANNELS:
- Primary Channels: ${channelsData.primaryChannels.join(', ')}
- Budget: ${channelsData.budget}
- Content Types: ${channelsData.contentTypes.join(', ')}
- Launch Plan: ${channelsData.launchPlan}

BRAND ASSETS:
- Colors: Primary ${assetsData.colors.primary}, Secondary ${assetsData.colors.secondary}
- Key Messaging: ${assetsData.messaging}
- Social Handles: ${assetsData.socialHandles}

${calendarSummary}
Generated by Ivy Factory Marketing Workshop`;

    const blob = new Blob([plan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketing-plan.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-to-r from-purple-600 to-blue-600 relative">
          {/* Logos positioned at absolute left edge */}
          <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
            <img 
              src="/logos/prov_logo_white.png" 
              alt="xFactory Logo" 
              className="h-8 w-auto object-contain"
              onError={(e) => {
                const imgElement = e.target as HTMLImageElement;
                imgElement.style.display = 'none';
              }}
            />
            <img 
              src="/logos/fiualonetransreverse.png" 
              alt="FIU Logo" 
              className="h-8 w-auto object-contain"
              onError={(e) => {
                const imgElement = e.target as HTMLImageElement;
                imgElement.style.display = 'none';
              }}
            />
          </div>

          {/* User controls positioned at absolute right edge */}
          <div className="absolute right-0 top-0 h-full flex items-center gap-3 pr-6">
            <UserMenu />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center">
              {/* Left: Section name and icon (bounded left) */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Marketing Workshop</h1>
                  <p className="text-sm text-white/80">
                    Build your marketing strategy and brand identity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="machinery" onClick={handleGenerateMarketing} disabled={isLoading}>Generate Marketing (Team)</Button>
          <Button variant="outline" onClick={handleInstagramSchedule} disabled={isLoading}>Schedule Instagram (30 days)</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="advertising" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Ad Campaigning
            </TabsTrigger>
          </TabsList>

          {/* Branding Section */}
          <TabsContent value="branding" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Brand Building */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>Brand Building</span>
                    <div className="flex items-center gap-2">
                      <InfoButton
                        title="Brand Building Cheat Sheet"
                        content={`**Brand Elements**
                        Provide your brand name, personality, and mission in clear, simple terms.
                        Make it understandable and memorable.`}
                      />
                      <Button size="sm" variant="outline" onClick={handleGenerateBranding} disabled={isLoading}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Auto Branding
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Define your brand name, identity, and persona
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Brand Name</Label>
                    <Input
                      placeholder="Your brand/company name"
                      value={brandBuildingData.brandName}
                      onChange={(e) => setBrandBuildingData(prev => ({ ...prev, brandName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Brand Identity</Label>
                    <Textarea
                      placeholder="What does your brand represent? What are its core characteristics?"
                      value={brandBuildingData.brandIdentity}
                      onChange={(e) => setBrandBuildingData(prev => ({ ...prev, brandIdentity: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Brand Persona</Label>
                    <Textarea
                      placeholder="If your brand were a person, how would you describe their personality?"
                      value={brandBuildingData.brandPersona}
                      onChange={(e) => setBrandBuildingData(prev => ({ ...prev, brandPersona: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Brand Values</Label>
                    <Textarea
                      placeholder="What core values guide your brand? What principles do you stand for?"
                      value={brandBuildingData.brandValues}
                      onChange={(e) => setBrandBuildingData(prev => ({ ...prev, brandValues: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Target Audience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>Target Audience</span>
                    <div className="flex items-center gap-2">
                      <InfoButton
                        title="Target Audience Vibes"
                        content={`**Target Audience Details**
                        Identify the specific group you are building this for.
                        Include their age, interests, and primary concerns.`}
                      />
                      <Button size="sm" variant="outline" onClick={handleGenerateTargetAudience} disabled={isLoading}>
                        <Users className="h-4 w-4 mr-2" />
                        Auto Audience
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Define your ideal customer profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Customer Type</Label>
                    <Input
                      placeholder="B2B professionals, young adults, entrepreneurs..."
                      value={audienceData.customerType}
                      onChange={(e) => setAudienceData(prev => ({ ...prev, customerType: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Age Range</Label>
                      <Select
                        value={ageSelectValue || undefined}
                        onValueChange={(value) => setAudienceData(prev => ({ ...prev, ageRange: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                        <SelectContent>
                          {ageOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {ageOptionLabels[option] ?? option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Income Level</Label>
                      <Select
                        value={incomeSelectValue || undefined}
                        onValueChange={(value) => setAudienceData(prev => ({ ...prev, income: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select income" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {incomeOptionLabels[option] ?? option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Pain Points</Label>
                    <Textarea
                      placeholder="What problems do they face that your product solves?"
                      value={audienceData.painPoints}
                      onChange={(e) => setAudienceData(prev => ({ ...prev, painPoints: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Goals & Motivations</Label>
                    <Textarea
                      placeholder="What are they trying to achieve? What motivates them?"
                      value={audienceData.goals}
                      onChange={(e) => setAudienceData(prev => ({ ...prev, goals: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ad Campaigning Section */}
          <TabsContent value="advertising" className="space-y-6">
            <Tabs defaultValue="channels" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="channels" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Marketing Channels
                </TabsTrigger>
                <TabsTrigger value="campaign" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Campaign Planner
                </TabsTrigger>
                <TabsTrigger value="images" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Image Creation
                </TabsTrigger>
              </TabsList>

              {/* Marketing Channels Tab */}
              <TabsContent value="channels" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>Marketing Channels</span>
                      <InfoButton
                        title="Channel Selector"
                        content={`**Choose marketing channels**
                        Select where you will promote your startup within your budget.
                        Focus on platforms where your target audience is active.`}
                      />
                    </CardTitle>
                  <CardDescription>
                      Select your primary marketing channels and strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Primary Channels</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {['Social Media', 'Email Marketing', 'Content Marketing', 'SEO', 'PPC Ads', 'Influencer Marketing', 'PR/Media', 'Events'].map((channel) => (
                              <div key={channel} className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id={channel}
                                  checked={channelsData.primaryChannels.includes(channel)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setChannelsData(prev => ({ 
                                        ...prev, 
                                        primaryChannels: [...prev.primaryChannels, channel] 
                                      }));
                                    } else {
                                      setChannelsData(prev => ({ 
                                        ...prev, 
                                        primaryChannels: prev.primaryChannels.filter(c => c !== channel) 
                                      }));
                                    }
                                  }}
                                />
                                <label htmlFor={channel} className="text-sm">{channel}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Marketing Budget</Label>
                          <Select value={channelsData.budget} onValueChange={(value) => setChannelsData(prev => ({ ...prev, budget: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select budget range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="<1k">Under $1,000</SelectItem>
                              <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
                              <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                              <SelectItem value="10k+">$10,000+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Content Types</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {['Blog Posts', 'Social Media Posts', 'Videos', 'Infographics', 'Podcasts', 'Webinars', 'Case Studies', 'White Papers'].map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id={type}
                                  checked={channelsData.contentTypes.includes(type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setChannelsData(prev => ({ 
                                        ...prev, 
                                        contentTypes: [...prev.contentTypes, type] 
                                      }));
                                    } else {
                                      setChannelsData(prev => ({ 
                                        ...prev, 
                                        contentTypes: prev.contentTypes.filter(t => t !== type) 
                                      }));
                                    }
                                  }}
                                />
                                <label htmlFor={type} className="text-sm">{type}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Launch Strategy</Label>
                          <Textarea
                            placeholder="Outline your marketing launch strategy..."
                            value={channelsData.launchPlan}
                            onChange={(e) => setChannelsData(prev => ({ ...prev, launchPlan: e.target.value }))}
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Campaign Planner Tab */}
              <TabsContent value="campaign" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>30-Day Campaign Planner</span>
                      <div className="flex items-center gap-2">
                      <InfoButton
                        title="Campaign Chaos Controller"
                        content={`**Your month-long game plan**
                        Plot what you are dropping each week so you are not winging it at 2 AM.
                        Lock in goals, platforms, and hype themes.`}
                      />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleGenerateCampaignPreferences} 
                          disabled={isGeneratingPreferences}
                        >
                          {isGeneratingPreferences ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          AI Generate Preferences
                        </Button>
                      </div>
                    </CardTitle>
                  <CardDescription>
                      AI-generated campaign strategy and content calendar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Campaign Goals</Label>
                          <Select
                            value={campaignPreferences.goal}
                            onValueChange={(value) => setCampaignPreferences((prev) => ({ ...prev, goal: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select primary goal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="brand-awareness">Brand Awareness</SelectItem>
                              <SelectItem value="lead-generation">Lead Generation</SelectItem>
                              <SelectItem value="product-launch">Product Launch</SelectItem>
                              <SelectItem value="engagement">Community Engagement</SelectItem>
                              <SelectItem value="sales">Direct Sales</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Target Platforms</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {['Instagram', 'Facebook', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube'].map((platform) => {
                              const normalizedPlatform = platform === 'Twitter/X' ? 'Twitter/X' : platform;
                              const isChecked = campaignPreferences.platforms.includes(normalizedPlatform);
                              return (
                                <div key={platform} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={platform}
                                    checked={isChecked}
                                    onChange={(event) => {
                                      setCampaignPreferences((prev) => {
                                        if (event.target.checked) {
                                          if (prev.platforms.includes(normalizedPlatform)) {
                                            return prev;
                                          }
                                          return { ...prev, platforms: [...prev.platforms, normalizedPlatform] };
                                        }
                                        return { ...prev, platforms: prev.platforms.filter((item) => item !== normalizedPlatform) };
                                      });
                                    }}
                                  />
                                  <label htmlFor={platform} className="text-sm">{platform}</label>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <Label>Content Themes</Label>
                          <Textarea
                            placeholder="What topics and themes should your content focus on?"
                            rows={4}
                            value={campaignPreferences.themes}
                            onChange={(event) => setCampaignPreferences((prev) => ({ ...prev, themes: event.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                          <Label>Budget Range</Label>
                            <InfoButton
                              title="Why Budget Range Isn't AI-Generated"
                              content={`**Budget is a business decision**
                              AI cannot determine your actual budget constraints, cash flow, or financial priorities.
                              This should be set based on your real business situation and available resources.`}
                            />
                          </div>
                          <Select
                            value={campaignPreferences.budgetRange}
                            onValueChange={(value) => setCampaignPreferences((prev) => ({ ...prev, budgetRange: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select budget" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-100">$0 - $100</SelectItem>
                              <SelectItem value="100-500">$100 - $500</SelectItem>
                              <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                              <SelectItem value="1000+">$1,000+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                          <Label>Posting Frequency</Label>
                            <InfoButton
                              title="Why Posting Frequency Isn't AI-Generated"
                              content={`**Frequency depends on your capacity**
                              AI cannot know your team size, available time, or content creation capacity.
                              This should be set based on your realistic ability to create and publish content consistently.`}
                            />
                          </div>
                          <Select
                            value={campaignPreferences.frequency}
                            onValueChange={(value) => setCampaignPreferences((prev) => ({ ...prev, frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="3-times-week">3 times per week</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Brand Tone</Label>
                          <Select
                            value={campaignPreferences.tone}
                            onValueChange={(value) => setCampaignPreferences((prev) => ({ ...prev, tone: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual & Friendly</SelectItem>
                              <SelectItem value="humorous">Humorous</SelectItem>
                              <SelectItem value="inspirational">Inspirational</SelectItem>
                              <SelectItem value="educational">Educational</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        className="w-full md:w-auto"
                        onClick={handleGenerateCampaignCalendar}
                        disabled={isGeneratingCampaign}
                      >
                        {isGeneratingCampaign ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Campaign Calendar...
                          </>
                        ) : (
                          <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Generate 30-Day Campaign Plan
                          </>
                        )}
                      </Button>
                    </div>

                    {campaignGenerationError && (
                      <p className="text-sm text-destructive text-center">{campaignGenerationError}</p>
                    )}
                    {sortedCampaignEntries.length ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-2 mb-4">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center font-semibold text-sm p-2 bg-muted rounded">
                              {day}
                            </div>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-2">
                          {sortedCampaignEntries.map((plan, index) => {
                            const dateObj = new Date(plan.date);
                            const isValidDate = !Number.isNaN(dateObj.getTime());
                            const dayOfWeek = isValidDate ? dateObj.getDay() : 0;
                            const entryKey = plan.date || `day-${plan.dayOfCampaign ?? index + 1}`;
                            const imageSelection = campaignImageSelections[entryKey];
                            const hasImagePrompt = plan.imagePrompt && plan.imagePrompt.trim() !== '';
                            
                            return (
                              <div 
                                key={entryKey}
                                className="min-h-[200px] p-2 border rounded-lg hover:shadow-md transition-shadow bg-card flex flex-col gap-1 cursor-pointer"
                                style={{ gridColumnStart: index === 0 ? dayOfWeek + 1 : undefined }}
                                onClick={() => handleDayClick(plan)}
                              >
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="font-semibold text-sm text-foreground">
                                    {isValidDate ? dateObj.getDate() : plan.date}
                                  </span>
                                  {plan.postingTime && (
                                    <span>{plan.postingTime}</span>
                                  )}
                                </div>
                                <div className="text-xs">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {plan.theme || 'Campaign Drop'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {plan.caption || plan.contentType || 'Planned activation'}
                                </div>
                                <div className="text-xs text-primary font-semibold flex items-center justify-between">
                                  <span>{plan.platform}</span>
                                  <span>{formatImpressions(plan.impressions)}</span>
                                </div>
                                
                                {/* Image Prompt and Generation */}
                                {hasImagePrompt && (
                                  <div className="mt-2 space-y-2">
                                    <div className="text-[10px] text-muted-foreground">
                                      <strong>Image Prompt:</strong> {plan.imagePrompt}
                                    </div>
                                    
                                    {!imageSelection?.images?.length ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-[10px] h-6"
                                        onClick={() => handleGenerateCampaignImages(entryKey, plan.imagePrompt)}
                                        disabled={isGeneratingImages}
                                      >
                                        {isGeneratingImages ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        Generate Images
                                      </Button>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="text-[10px] font-semibold">
                                          {getGenerationMode(entryKey) === 'single' ? 'Generated Image:' : 'A/B Test Images:'}
                                        </div>
                                        {getGenerationMode(entryKey) === 'single' ? (
                                          // Single image in calendar grid
                                          <div className="flex justify-center">
                                            <div
                                              className={`relative cursor-pointer border-2 rounded ${
                                                imageSelection.selectedImage?.id === imageSelection.images[0]?.id 
                                                  ? 'border-primary' 
                                                  : 'border-muted'
                                              }`}
                                              onClick={() => handleSelectImage(entryKey, imageSelection.images[0])}
                                            >
                                              <img
                                                src={toAbsoluteMediaUrl(imageSelection.images[0]?.url || imageSelection.images[0]?.image_url)}
                                                alt="Generated Image"
                                                className="w-full h-12 object-contain rounded"
                                              />
                                              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] px-1 rounded-bl">
                                                ✓
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          // A/B test images in calendar grid
                                          <div className="grid grid-cols-2 gap-1">
                                            {imageSelection.images.map((image: any, imgIndex: number) => (
                                              <div
                                                key={imgIndex}
                                                className={`relative cursor-pointer border-2 rounded ${
                                                  imageSelection.selectedImage?.id === image.id 
                                                    ? 'border-primary' 
                                                    : 'border-muted'
                                                }`}
                                                onClick={() => handleSelectImage(entryKey, image)}
                                              >
                                                <img
                                                  src={toAbsoluteMediaUrl(image.url || image.image_url)}
                                                  alt={`Option ${imgIndex + 1}`}
                                                  className="w-full h-12 object-contain rounded"
                                                />
                                                {imageSelection.selectedImage?.id === image.id && (
                                                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] px-1 rounded-bl">
                                                    ✓
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {plan.callToAction && (
                                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    CTA: {plan.callToAction}
                                  </div>
                                )}
                                {plan.notes && (
                                  <div className="text-[10px] text-muted-foreground line-clamp-2">
                                    {plan.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Campaign Overview</h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground block">Primary Goal</span>
                              {campaignCalendar?.goal || 'Aligned with selected objective'}
                          </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground block">Posting Rhythm</span>
                              {campaignCalendar?.postingFrequency || campaignPreferences.frequency || 'Configured cadence'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground block">Platforms</span>
                              {(campaignCalendar?.platforms && campaignCalendar.platforms.length)
                                ? campaignCalendar.platforms.join(', ')
                                : (campaignPreferences.platforms.length ? campaignPreferences.platforms.join(', ') : 'Chosen platforms')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground block">Budget Focus</span>
                              {campaignCalendar?.budgetRange || campaignPreferences.budgetRange || 'As specified'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Click the button above to generate your 30-day campaign calendar</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Image Creation Tab */}
              <TabsContent value="images" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>Campaign Image Generation</span>
                      <InfoButton
                        title="A/B Testing Images"
                        content={`**Smart image generation**
                        Generate images for your calendar uploads with A/B testing.
                        Single image: Generate one optimized image.
                        A/B Testing: Generate 2 variants and split impressions 50/50 for performance comparison.`}
                      />
                    </CardTitle>
                  <CardDescription>
                      Generate images for your scheduled social media uploads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {campaignCalendar && campaignCalendar.entries && campaignCalendar.entries.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid gap-4">
                          {campaignCalendar.entries.map((entry: CampaignPlanEntry, index: number) => {
                            const entryKey = `${entry.date}-${entry.dayOfCampaign || index}`;
                            const imageSelection = campaignImageSelections[entryKey];
                            const hasImages = imageSelection?.images?.length > 0;
                            
                            return (
                              <Card key={entryKey} className="border-l-4 border-l-primary">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <button
                                        onClick={() => toggleDayCollapse(entryKey)}
                                        className="flex items-center gap-2 hover:bg-muted p-1 rounded"
                                      >
                                        {isDayCollapsed(entryKey) ? (
                                          <ChevronRight className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </button>
                                      
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {entry.date ? new Date(entry.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          }) : `Day ${entry.dayOfCampaign}`}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {entry.platform}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {entry.contentType}
                                        </Badge>
                        </div>
                                    </div>
                                  </div>
                                  
                                  {!isDayCollapsed(entryKey) && (
                                    <div className="mt-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                      
                          <div>
                                        <h4 className="font-medium text-sm">{entry.theme}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {entry.caption}
                                        </p>
                          </div>
                                      
                                      {entry.imagePrompt && (
                                        <div className="bg-muted p-2 rounded text-xs">
                                          <span className="font-medium">Original Prompt:</span>
                                          <p className="mt-1 text-muted-foreground">{entry.imagePrompt}</p>
                            </div>
                                      )}
                                      
                                      {imageSelection?.enhancedPrompt && imageSelection.enhancedPrompt !== entry.imagePrompt && (
                                        <div className="bg-primary/10 p-2 rounded text-xs border border-primary/20">
                                          <span className="font-medium text-primary">Enhanced Prompt:</span>
                                          <p className="mt-1 text-muted-foreground">{imageSelection.enhancedPrompt}</p>
                            </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {entry.postingTime}
                                        <span>•</span>
                                        <span>{formatImpressions(entry.impressions)} impressions</span>
                          </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 ml-4">
                                      {/* Generation Mode Selection */}
                                      <div className="flex flex-col gap-1">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Generation Mode</div>
                                        <div className="flex flex-col gap-1">
                                          <button
                                            className={`flex items-center gap-2 px-2 py-1 text-xs rounded border ${
                                              getGenerationMode(entryKey) === 'single' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'bg-background border-border hover:bg-muted'
                                            }`}
                                            onClick={() => handleGenerationModeChange(entryKey, 'single')}
                                          >
                                            <Check className="h-3 w-3" />
                                            Single Image
                                          </button>
                                          <button
                                            className={`flex items-center gap-2 px-2 py-1 text-xs rounded border ${
                                              getGenerationMode(entryKey) === 'ab-test' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'bg-background border-border hover:bg-muted'
                                            }`}
                                            onClick={() => handleGenerationModeChange(entryKey, 'ab-test')}
                                          >
                                            <Check className="h-3 w-3" />
                                            A/B Test
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Generate Button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGenerateCampaignImages(
                                          entryKey, 
                                          entry.imagePrompt || '', 
                                          getGenerationMode(entryKey) === 'ab-test', 
                                          entry
                                        )}
                                        disabled={isGeneratingImages}
                                        title={hasImages ? "Regenerate: Creates new enhanced prompt and new images" : "Generate: Creates enhanced prompt and images"}
                                      >
                                        {isGeneratingImages ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        {hasImages ? 'Regenerate' : 'Generate'}
                          </Button>
                                    </div>
                                  </div>
                                  
                                  {hasImages && (
                                    <div className="mt-4 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Generated Images</Label>
                          </div>
                                      
                                      {/* Image Display based on generation mode */}
                                      {getGenerationMode(entryKey) === 'single' ? (
                                        // Single image mode - centered
                                        <div className="flex justify-center">
                                          <div className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all max-w-md w-full ${
                                            imageSelection.selectedImage?.id === imageSelection.images[0]?.id 
                                              ? 'border-primary ring-2 ring-primary/20' 
                                              : 'border-muted hover:border-primary/50'
                                          }`}>
                                            <img
                                              src={toAbsoluteMediaUrl(imageSelection.images[0]?.image_url)}
                                              alt="Generated Image"
                                              className="w-full h-auto object-contain"
                                              onError={(e) => {
                                                console.error('Image failed to load:', imageSelection.images[0]?.image_url);
                                                e.currentTarget.src = 'https://via.placeholder.com/300x200/cccccc/666666?text=Image+Failed+To+Load';
                                              }}
                                            />
                                            <div className="absolute top-2 right-2">
                                              <Badge className="bg-primary text-primary-foreground text-xs">
                                                Selected
                                              </Badge>
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                              <Badge variant="outline" className="text-xs bg-background/80">
                                                {entry.impressions} impressions
                                              </Badge>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 px-2 text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.open(imageSelection.images[0]?.image_url, '_blank');
                                                }}
                                              >
                                                <Download className="h-3 w-3 mr-1" />
                                                View
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // A/B testing mode - two images side by side
                                        <div className="grid grid-cols-2 gap-3">
                                          {imageSelection.images.map((image: any, imgIndex: number) => (
                                            <div
                                              key={imgIndex}
                                              className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                                                imageSelection.selectedImage?.id === image.id 
                                                  ? 'border-primary ring-2 ring-primary/20' 
                                                  : 'border-muted hover:border-primary/50'
                                              }`}
                                              onClick={() => handleSelectImage(entryKey, image)}
                                            >
                                              <img
                                                src={toAbsoluteMediaUrl(image.image_url)}
                                                alt={`Option ${imgIndex + 1}`}
                                                className="w-full h-auto object-contain"
                                                onError={(e) => {
                                                  console.error('Image failed to load:', image.image_url);
                                                  e.currentTarget.src = 'https://via.placeholder.com/300x200/cccccc/666666?text=Image+Failed+To+Load';
                                                }}
                                              />
                                              <div className="absolute top-2 right-2">
                                                {imageSelection.selectedImage?.id === image.id ? (
                                                  <Badge className="bg-primary text-primary-foreground text-xs">
                                                    Selected
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="secondary" className="text-xs">
                                                    Option {imgIndex + 1}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                                <Badge variant="outline" className="text-xs bg-background/80">
                                                  {Math.floor(entry.impressions / 2)} impressions
                                                </Badge>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(image.image_url, '_blank');
                                                  }}
                                                >
                                                  <Download className="h-3 w-3 mr-1" />
                                                  View
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Campaign Calendar Found</h3>
                        <p className="text-muted-foreground mb-4">
                          Generate a campaign calendar first to create images for your scheduled uploads.
                        </p>
                        <Button onClick={() => setActiveTab('calendar')}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Go to Campaign Planner
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

        </Tabs>

        {/* Navigation */}
        <div className="flex justify-center mt-8">
          <Button onClick={handleComplete} size="lg">
            Complete Marketing Workshop
          </Button>
        </div>
        {showSubmissionDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Submit Marketing Documents</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSubmissionDialog(false)}>
                  Close
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Marketing Strategy (Drive link)</label>
                  <input type="url" value={submissionLinks.strategyLink} onChange={(e)=>setSubmissionLinks({...submissionLinks, strategyLink: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Startup Branding (Drive link)</label>
                  <input type="url" value={submissionLinks.brandingLink} onChange={(e)=>setSubmissionLinks({...submissionLinks, brandingLink: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Validation/Traction (Drive link)</label>
                  <input type="url" value={submissionLinks.tractionLink} onChange={(e)=>setSubmissionLinks({...submissionLinks, tractionLink: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowSubmissionDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSubmitMarketing} className="flex-1">Submit</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Popup */}
      <Dialog open={isDayPopupOpen} onOpenChange={setIsDayPopupOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Campaign Day Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-6">
              {/* Date and Time */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {selectedDay.date ? new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : `Day ${selectedDay.dayOfCampaign}`}
                  </span>
                </div>
                {selectedDay.postingTime && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedDay.postingTime}
                  </Badge>
                )}
              </div>

              {/* Theme and Platform */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Theme
                  </Label>
                  <Badge variant="secondary" className="text-sm">
                    {selectedDay.theme || 'Campaign Drop'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Platform
                  </Label>
                  <Badge variant="outline" className="text-sm">
                    {selectedDay.platform}
                  </Badge>
                </div>
              </div>

              {/* Content Type and Impressions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Content Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedDay.contentType || 'Social Media Post'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Target Impressions</Label>
                  <p className="text-sm font-semibold text-primary">
                    {formatImpressions(selectedDay.impressions)}
                  </p>
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Caption
                </Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedDay.caption || 'Planned activation'}</p>
                </div>
              </div>

              {/* Call to Action */}
              {selectedDay.callToAction && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Call to Action</Label>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">{selectedDay.callToAction}</p>
                  </div>
                </div>
              )}

              {/* Image Prompt */}
              {selectedDay.imagePrompt && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Image Prompt
                  </Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedDay.imagePrompt}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDay.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Notes</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedDay.notes}</p>
                  </div>
                </div>
              )}

              {/* Generated Images */}
              {(() => {
                const entryKey = `${selectedDay.date}-${selectedDay.dayOfCampaign || 0}`;
                const imageSelection = campaignImageSelections[entryKey];
                return imageSelection?.images?.length ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Generated Images</Label>
                    {getGenerationMode(entryKey) === 'single' ? (
                      // Single image in popup
                      <div className="flex justify-center">
                        <div className={`relative border-2 rounded-lg overflow-hidden max-w-md w-full ${
                          imageSelection.selectedImage?.id === imageSelection.images[0]?.id 
                            ? 'border-primary' 
                            : 'border-muted'
                        }`}>
                          <img
                            src={toAbsoluteMediaUrl(imageSelection.images[0]?.url || imageSelection.images[0]?.image_url)}
                            alt="Generated Image"
                            className="w-full h-auto object-contain"
                          />
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Selected
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                window.open(imageSelection.images[0]?.url || imageSelection.images[0]?.image_url, '_blank');
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // A/B test images in popup
                      <div className="grid grid-cols-2 gap-2">
                        {imageSelection.images.map((image: any, imgIndex: number) => (
                          <div
                            key={imgIndex}
                            className={`relative border-2 rounded-lg overflow-hidden ${
                              imageSelection.selectedImage?.id === image.id 
                                ? 'border-primary' 
                                : 'border-muted'
                            }`}
                          >
                            <img
                              src={toAbsoluteMediaUrl(image.url || image.image_url)}
                              alt={`Option ${imgIndex + 1}`}
                              className="w-full h-auto object-contain"
                            />
                            {imageSelection.selectedImage?.id === image.id && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                Selected
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  window.open(image.url || image.image_url, '_blank');
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Ivie Assistant */}
      <FactorAI currentStation={7} userData={{ testingData, mvpData, validationData }} context="marketing" />
    </div>
  );
};