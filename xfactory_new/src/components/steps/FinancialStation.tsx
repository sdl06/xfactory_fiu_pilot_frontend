import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, TrendingUp, PieChart, ArrowLeft, Download, Target, BarChart3, FileText, Play, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StationFlowManager } from "@/lib/stationFlow";
import { apiClient } from "@/lib/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, ReferenceLine } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import InfoButton from "@/components/info-button";

interface FinancialStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  previousData?: any;
  reviewMode?: boolean;
}

export const FinancialStation = ({ onComplete, onBack, previousData, reviewMode = false }: FinancialStationProps) => {
  const [activeTab, setActiveTab] = useState("costs");
  const [startupCosts, setStartupCosts] = useState({
    productDevelopment: 0,
    marketing: 0,
    teamSalaries: 0,
    toolsSubscriptions: 0,
    legalAdmin: 0,
    other: 0
  });

  const [monthlyOperationalCosts, setMonthlyOperationalCosts] = useState({
    rentUtilities: 0,
    salaries: 0,
    marketing: 0,
    toolsSubscriptions: 0,
    insuranceLegal: 0,
    otherOperational: 0
  });

  const [revenueModel, setRevenueModel] = useState({
    pricingModel: '',
    pricePoint: 0,
    customersPerMonth: 0,
    conversionRate: 5, // Default 5%
    monthlyGrowthRate: 10, // Default 10%
    cogsPerCustomer: 0, // Cost of goods sold per customer
  });

  const [scenarios, setScenarios] = useState({
    costReduction: 0, // Percentage reduction
    revenueIncrease: 0, // Percentage increase
  });

  const [projections, setProjections] = useState<any[]>([]);
  const [biYearlyProjections, setBiYearlyProjections] = useState<any[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalStartupCosts: 0,
    monthlyBurn: 0,
    breakEvenMonth: 0,
    runway: 0,
    totalRevenue: 0,
    totalCosts: 0,
    netIncome: 0,
    profitMargin: 0,
    monthlyGrossProfit: 0,
    monthlyNetProfit: 0,
    grossMarginPercentage: 0,
    netMarginPercentage: 0,
    projectionPeriod: 0,
    totalPeriods: 0
  });

  const [city, setCity] = useState<string>("");
  const [isGeneratingProposal, setIsGeneratingProposal] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [financeVideoLink, setFinanceVideoLink] = useState('');

  const [activeCostSection, setActiveCostSection] = useState<'startup' | 'operational'>('startup');

  // Direct regenerate function that bypasses existing data check
  const regenerateFinancials = async () => {
    try {
      setIsGeneratingProposal(true);
      
      if (!city || !city.trim()) {
        alert('Please enter a city of operation first');
        return;
      }


      // Get current team ID
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      
      if (!teamId) {
        alert('No team found. Please ensure you are part of a team.');
        return;
      }

      // Get latest idea ID if available
      let ideaId: number | undefined;
      try {
        const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
        ideaId = (ideaResponse as any)?.data?.id;
      } catch (error) {
      }


      // Force regenerate - always generate new AI data
      const businessModel = previousData?.businessModel || previousData?.concept || 'SaaS Platform';
      const response = await apiClient.generateFinanceSetup(teamId, city, ideaId, businessModel);
      
      if (response.data && response.data.success) {
        const financeData = response.data.data;
        loadFinanceDataIntoForm(financeData);
        alert(`AI-generated finance setup regenerated for ${city}! The data has been loaded into the form.`);
      } else {
        // Fallback to local generation if AI fails
        console.log('AI generation failed, using local fallback');
        generateLocalFallback(city);
      }
    } catch (error) {
      console.error('Error regenerating finance setup:', error);
      alert('Failed to regenerate finance setup. Please try again.');
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const generateProposedFinancials = async () => {
    try {
      setIsGeneratingProposal(true);
      
      if (!city) {
        alert('Please enter a city of operation first');
        return;
      }

      // Get current team ID
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      
      if (!teamId) {
        alert('No team found. Please ensure you are part of a team.');
        return;
      }

      // Get latest idea ID if available
      let ideaId: number | undefined;
      try {
        const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
        ideaId = (ideaResponse as any)?.data?.id;
      } catch (error) {
      }

      // Always generate new AI-powered finance setup
      const businessModel = previousData?.businessModel || previousData?.concept || 'SaaS Platform';
      const response = await apiClient.generateFinanceSetup(teamId, city, ideaId, businessModel);
      
      if (response.data && response.data.success) {
        const financeData = response.data.data;
        loadFinanceDataIntoForm(financeData);
        alert(`AI-generated finance setup created for ${city}! The data has been loaded into the form.`);
      } else {
        // Fallback to local generation if AI fails
        console.log('AI generation failed, using local fallback');
        generateLocalFallback(city);
      }
    } catch (error) {
      console.error('Error generating finance setup:', error);
      alert('Failed to generate finance setup. Please try again.');
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleSubmitFinance = async () => {
    try {
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (!teamId) return;
      await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
        finance: { submission_completed: true, walkthrough_video_link: financeVideoLink }
      });
      setShowSubmissionDialog(false);
      onComplete({ financeSubmitted: true, walkthrough_video_link: financeVideoLink });
    } catch {
      alert('Failed to submit finance video');
    }
  };

  // Helper function to load finance data into form
  const loadFinanceDataIntoForm = (financeData: any) => {
    // Reset all projection states to ensure clean calculations
    setProjections([]);
    setBiYearlyProjections([]);
    setSummaryMetrics({
      totalStartupCosts: 0,
      monthlyBurn: 0,
      breakEvenMonth: 0,
      runway: 0,
      totalRevenue: 0,
      totalCosts: 0,
      netIncome: 0,
      profitMargin: 0,
      monthlyGrossProfit: 0,
      monthlyNetProfit: 0,
      grossMarginPercentage: 0,
      netMarginPercentage: 0,
      projectionPeriod: 0,
      totalPeriods: 0
    });

    setStartupCosts({
      productDevelopment: Number(financeData.product_development_cost) || 0,
      marketing: Number(financeData.marketing_customer_acquisition_cost) || 0,
      teamSalaries: Number(financeData.team_salaries_freelance_cost) || 0,
      toolsSubscriptions: Number(financeData.tools_subscriptions_cost) || 0,
      legalAdmin: Number(financeData.legal_admin_cost) || 0,
      other: Number(financeData.other_expenses_cost) || 0,
    });

    setMonthlyOperationalCosts({
      rentUtilities: Number(financeData.monthly_rent_utilities) || 0,
      salaries: Number(financeData.monthly_salaries) || 0,
      marketing: Number(financeData.monthly_marketing) || 0,
      toolsSubscriptions: Number(financeData.monthly_tools_subscriptions) || 0,
      insuranceLegal: Number(financeData.monthly_insurance_legal) || 0,
      otherOperational: Number(financeData.monthly_other_operational) || 0,
    });

    setRevenueModel(prev => ({
      ...prev,
      pricingModel: financeData.pricing_model || prev.pricingModel,
      pricePoint: Number(financeData.price_per_customer) || prev.pricePoint,
      customersPerMonth: Number(financeData.new_customers_per_month) || prev.customersPerMonth,
      conversionRate: Number(financeData.conversion_rate) || prev.conversionRate,
      monthlyGrowthRate: Number(financeData.monthly_growth_rate) || prev.monthlyGrowthRate,
      cogsPerCustomer: Number(financeData.cogs_per_customer) || prev.cogsPerCustomer,
    }));

    setScenarios(prev => ({
      ...prev,
      costReduction: Number(financeData.cost_reduction_percentage) || prev.costReduction,
      revenueIncrease: Number(financeData.revenue_increase_percentage) || prev.revenueIncrease,
    }));

    console.log('Finance data loaded, projections reset. New customersPerMonth:', Number(financeData.new_customers_per_month));
  };

  // Helper function for local fallback generation
  const generateLocalFallback = (cityName: string) => {
    const c = cityName.toLowerCase();
    const highCostCities = ['san francisco', 'sf', 'bay area', 'new york', 'nyc', 'boston', 'seattle', 'los angeles', 'la'];
    const midCostCities = ['austin', 'denver', 'chicago', 'miami', 'atlanta', 'dallas'];
    let costMultiplier = 1.0;
    if (highCostCities.some(x => c.includes(x))) costMultiplier = 1.25;
    else if (midCostCities.some(x => c.includes(x))) costMultiplier = 1.1;

    setStartupCosts(prev => {
      const baseTotal = Math.max(50000, Object.values(prev).reduce((s, v) => s + Number(v || 0), 0));
      const proposed = {
        productDevelopment: Math.round((baseTotal * 0.35) * costMultiplier),
        marketing: Math.round((baseTotal * 0.25) * costMultiplier),
        teamSalaries: Math.round((baseTotal * 0.25) * costMultiplier),
        toolsSubscriptions: Math.round((baseTotal * 0.08) * costMultiplier),
        legalAdmin: Math.round((baseTotal * 0.05) * costMultiplier),
        other: Math.round((baseTotal * 0.02) * costMultiplier),
      } as any;
      return proposed;
    });

    setMonthlyOperationalCosts({
      rentUtilities: Math.round(2000 * costMultiplier),
      salaries: Math.round(8000 * costMultiplier),
      marketing: Math.round(1500 * costMultiplier),
      toolsSubscriptions: Math.round(500 * costMultiplier),
      insuranceLegal: Math.round(800 * costMultiplier),
      otherOperational: Math.round(700 * costMultiplier),
    });

    setRevenueModel(prev => ({
      ...prev,
      pricePoint: prev.pricePoint && prev.pricePoint > 0 ? prev.pricePoint : (highCostCities.some(x => c.includes(x)) ? 49 : midCostCities.some(x => c.includes(x)) ? 39 : 29),
      customersPerMonth: prev.customersPerMonth && prev.customersPerMonth > 0 ? prev.customersPerMonth : (midCostCities.some(x => c.includes(x)) ? 120 : 100),
      conversionRate: prev.conversionRate || 5,
      monthlyGrowthRate: prev.monthlyGrowthRate || 8,
      cogsPerCustomer: prev.cogsPerCustomer || 15,
    }));


  };

  const calculateFinancials = () => {
    // Calculate total ONE-TIME startup costs (initial investment)
    const totalStartupCosts = Object.values(startupCosts).reduce((sum, cost) => sum + Number(cost), 0);
    
    // Calculate total MONTHLY operational costs (burn rate)
    const totalMonthlyOperationalCosts = Object.values(monthlyOperationalCosts).reduce((sum, cost) => sum + Number(cost), 0);
    
    // Calculate monthly revenue (gross, before COGS)
    // Revenue = actual customers * price per customer
    const monthlyRevenue = revenueModel.customersPerMonth * revenueModel.pricePoint;
    
    // Calculate monthly COGS (variable costs per customer)
    // COGS = actual customers * cost per customer
    const monthlyCOGS = revenueModel.customersPerMonth * revenueModel.cogsPerCustomer;
    
    // Calculate monthly gross profit (revenue - COGS)
    const monthlyGrossProfit = monthlyRevenue - monthlyCOGS;
    
    // Calculate monthly net profit (gross profit - operational costs)
    const monthlyNetProfit = monthlyGrossProfit - totalMonthlyOperationalCosts;
    
    // Generate extended projections (up to 5 years = 60 months) with proper cost structure
    const monthlyProjections = [];
    let cumulativeRevenue = 0;
    let cumulativeNetProfit = 0;
    let customers = revenueModel.customersPerMonth;
    let breakEvenMonth = 0;
    
    console.log('Starting calculation with customersPerMonth:', customers, 'monthlyGrowthRate:', revenueModel.monthlyGrowthRate);
    
    // First, calculate break-even month
    let tempCumulativeProfit = 0;
    let tempCustomers = revenueModel.customersPerMonth;
    
    for (let month = 1; month <= 60; month++) {
      const monthlyRevenueWithGrowth = tempCustomers * revenueModel.pricePoint;
      const adjustedRevenue = monthlyRevenueWithGrowth * (1 + scenarios.revenueIncrease / 100);
      const monthlyCOGSWithGrowth = tempCustomers * revenueModel.cogsPerCustomer;
      const adjustedOperationalCosts = totalMonthlyOperationalCosts * (1 - scenarios.costReduction / 100);
      const monthlyGrossProfit = adjustedRevenue - monthlyCOGSWithGrowth;
      const monthlyNetProfit = monthlyGrossProfit - adjustedOperationalCosts;
      
      tempCumulativeProfit += monthlyNetProfit;
      if (breakEvenMonth === 0 && tempCumulativeProfit >= totalStartupCosts) {
        breakEvenMonth = month;
      }
      
      const baseGrowthRate = Math.min(revenueModel.monthlyGrowthRate, 20) / 100;
      // Apply diminishing returns as customer base grows (market saturation effect)
      // Use a more gradual saturation curve that doesn't completely stop growth
      const saturationFactor = tempCustomers < 10000 
        ? Math.max(0.3, 1 - (tempCustomers / 15000)) // More gradual decline, minimum 30% growth
        : Math.max(0.05, 0.3 * Math.exp(-(tempCustomers - 10000) / 20000)); // Exponential decay after 10k, minimum 5%
      const adjustedGrowthRate = baseGrowthRate * saturationFactor;
      tempCustomers *= (1 + adjustedGrowthRate);
    }
    
    // Determine how many months to project
    let maxMonths = 12; // Default to 1 year
    if (breakEvenMonth > 0) {
      // Project up to break-even month
      maxMonths = Math.min(breakEvenMonth, 60);
    } else {
      // No break-even reached, extend to 5 years
      maxMonths = 60;
    }
    
    // Generate projections for the determined period
    // Reset customers to initial value for consistent calculation
    customers = revenueModel.customersPerMonth;
    
    // Ensure customers is always a valid number
    if (isNaN(customers) || customers < 0) {
      console.warn(`Invalid customers value, resetting to initial value: ${customers} -> ${revenueModel.customersPerMonth}`);
      customers = revenueModel.customersPerMonth;
    }
    
    console.log('Starting projection calculation with customers:', customers, 'maxMonths:', maxMonths);
    
    for (let month = 1; month <= maxMonths; month++) {
      // Calculate monthly revenue with growth (clamped for stability)
      const safeCustomers = Math.max(0, Number.isFinite(customers) ? customers : 0);
      const safePrice = Math.max(0, Number(revenueModel.pricePoint) || 0);
      const safeCogsPerCustomer = Math.max(0, Number(revenueModel.cogsPerCustomer) || 0);
      const safeOpCosts = Math.max(0, Number(totalMonthlyOperationalCosts) || 0);
      const monthlyRevenueWithGrowth = safeCustomers * safePrice;
      const adjustedRevenue = monthlyRevenueWithGrowth * (1 + scenarios.revenueIncrease / 100);
      
      // Calculate monthly COGS with growth
      const monthlyCOGSWithGrowth = safeCustomers * safeCogsPerCustomer;
      
      // Calculate monthly operational costs with potential reduction
      const adjustedOperationalCosts = Math.max(0, safeOpCosts * (1 - scenarios.costReduction / 100));
      
      // Calculate monthly gross profit
      const monthlyGrossProfit = adjustedRevenue - monthlyCOGSWithGrowth;
      
      // Calculate monthly net profit
      const monthlyNetProfit = monthlyGrossProfit - adjustedOperationalCosts;
      
      cumulativeRevenue = Math.max(0, cumulativeRevenue + adjustedRevenue);
      cumulativeNetProfit += monthlyNetProfit;
      
      monthlyProjections.push({
        month: `Month ${month}`,
        monthNumber: month,
        revenue: Math.max(0, Math.round(adjustedRevenue)),
        cogs: Math.max(0, Math.round(monthlyCOGSWithGrowth)),
        operationalCosts: Math.max(0, Math.round(adjustedOperationalCosts)),
        grossProfit: Math.round(monthlyGrossProfit),
        netProfit: Math.round(monthlyNetProfit),
        cumulativeRevenue: Math.max(0, Math.round(cumulativeRevenue)),
        cumulativeNetProfit: Math.round(cumulativeNetProfit),
        customers: Math.max(0, Math.round(safeCustomers)),
        // Add missing fields for cash flow visualization
        costs: Math.max(0, Math.round(monthlyCOGSWithGrowth + adjustedOperationalCosts)),
        netCashFlow: Math.round(adjustedRevenue - monthlyCOGSWithGrowth - adjustedOperationalCosts),
        // Add fields for proper break-even analysis
        cumulativeNetProfitAfterStartup: Math.round(cumulativeNetProfit - totalStartupCosts)
      });
      
      // Apply growth rate to customer base with market saturation
      const baseGrowthRate = Math.min(revenueModel.monthlyGrowthRate, 20) / 100;
      // Apply diminishing returns as customer base grows (market saturation effect)
      // Use a more gradual saturation curve that doesn't completely stop growth
      const saturationFactor = customers < 10000 
        ? Math.max(0.3, 1 - (customers / 15000)) // More gradual decline, minimum 30% growth
        : Math.max(0.05, 0.3 * Math.exp(-(customers - 10000) / 20000)); // Exponential decay after 10k, minimum 5%
      const adjustedGrowthRate = baseGrowthRate * saturationFactor;
      const oldCustomers = customers;
      customers *= (1 + adjustedGrowthRate);
      
      // Ensure customers doesn't become invalid
      if (isNaN(customers) || customers < 0 || !isFinite(customers)) {
        console.warn(`Invalid customers value at month ${month}: ${customers}, resetting to previous value`);
        customers = oldCustomers;
      }
      
      // Debug logging for growth pattern (remove in production)
      if (month % 12 === 0) { // Log every year
        console.log(`Year ${Math.ceil(month/12)}: ${oldCustomers.toFixed(0)} -> ${customers.toFixed(0)} customers (${(adjustedGrowthRate*100).toFixed(2)}% growth)`);
      }
    }
    
    // Generate bi-yearly (6-month) projections for charts
    const biYearlyProjections = [];
    const totalPeriods = Math.ceil(maxMonths / 6);
    
    for (let period = 0; period < totalPeriods; period++) {
      const startMonth = period * 6;
      const endMonth = Math.min(startMonth + 6, maxMonths);
      
      let periodRevenue = 0;
      let periodCOGS = 0;
      let periodOperationalCosts = 0;
      let periodGrossProfit = 0;
      let periodNetProfit = 0;
      let periodCustomers = 0;
      
      for (let month = startMonth; month < endMonth; month++) {
        // Convert to 0-based index for array access
        const arrayIndex = month;
        if (monthlyProjections[arrayIndex]) {
          periodRevenue += monthlyProjections[arrayIndex].revenue;
          periodCOGS += monthlyProjections[arrayIndex].cogs;
          periodOperationalCosts += monthlyProjections[arrayIndex].operationalCosts;
          periodGrossProfit += monthlyProjections[arrayIndex].grossProfit;
          periodNetProfit += monthlyProjections[arrayIndex].netProfit;
          periodCustomers += monthlyProjections[arrayIndex].customers;
        }
      }
      
      biYearlyProjections.push({
        period: `${period * 0.5}`,
        periodNumber: period + 1,
        months: `${startMonth + 1}-${endMonth}`,
        revenue: Math.round(periodRevenue),
        cogs: Math.round(periodCOGS),
        operationalCosts: Math.round(periodOperationalCosts),
        grossProfit: Math.round(periodGrossProfit),
        netProfit: Math.round(periodNetProfit),
        customers: Math.round(periodCustomers / Math.max(1, endMonth - startMonth)), // Average customers per month
        costs: Math.round(periodCOGS + periodOperationalCosts),
        netCashFlow: Math.round(periodRevenue - periodCOGS - periodOperationalCosts),
        cumulativeRevenue: monthlyProjections[endMonth - 1]?.cumulativeRevenue || 0,
        cumulativeNetProfit: monthlyProjections[endMonth - 1]?.cumulativeNetProfit || 0,
        cumulativeNetProfitAfterStartup: monthlyProjections[endMonth - 1]?.cumulativeNetProfitAfterStartup || 0
      });
      
    }
    
    setProjections(monthlyProjections);
    setBiYearlyProjections(biYearlyProjections);
    
    // Use the pre-calculated break-even month
    // If not reached within the projection period, set to 0 (not projected)
    if (breakEvenMonth === 0 && totalStartupCosts > 0) {
      breakEvenMonth = 0; // Not projected within the extended period
    }
    
    // Calculate runway (how long startup costs last with adjusted monthly burn)
    // This shows how many months the business can operate before running out of startup capital
    // Consider cost reduction scenarios for more realistic runway calculation
    const adjustedMonthlyBurn = totalMonthlyOperationalCosts * (1 - scenarios.costReduction / 100);
    const runway = adjustedMonthlyBurn > 0 ? Math.round(totalStartupCosts / adjustedMonthlyBurn * 10) / 10 : 0;
    
    // Calculate total costs from monthly projections
    const totalCosts = monthlyProjections.reduce((sum, p) => sum + (p.costs || 0), 0);
    
    setSummaryMetrics({
      totalStartupCosts,
      monthlyBurn: Math.round(adjustedMonthlyBurn), // Show adjusted monthly burn (with cost reduction)
      breakEvenMonth: breakEvenMonth || 0,
      runway: Math.max(0, runway),
      totalRevenue: cumulativeRevenue, // This now represents total revenue for the extended period
      totalCosts: totalCosts,
      netIncome: cumulativeRevenue - totalCosts,
      profitMargin: cumulativeRevenue > 0 ? Math.round(((cumulativeRevenue - totalCosts) / cumulativeRevenue) * 100) : 0,
      monthlyGrossProfit: Math.round(monthlyGrossProfit),
      monthlyNetProfit: Math.round(monthlyNetProfit),
      grossMarginPercentage: monthlyRevenue > 0 ? Math.round((monthlyGrossProfit / monthlyRevenue) * 100 * 100) / 100 : 0,
      netMarginPercentage: monthlyRevenue > 0 ? Math.round((monthlyNetProfit / monthlyRevenue) * 100 * 100) / 100 : 0,
      projectionPeriod: maxMonths,
      totalPeriods: totalPeriods
    });
  };

  useEffect(() => {
    calculateFinancials();
  }, [startupCosts, monthlyOperationalCosts, revenueModel, scenarios]);

  // Load existing finance setup data on component mount
  useEffect(() => {
    const loadExistingFinanceSetup = async () => {
      try {
        const status = await apiClient.get('/team-formation/status/');
        const teamId = (status as any)?.data?.current_team?.id;
        
        if (teamId) {
          const response = await apiClient.getTeamFinanceSetup(teamId);
          if (response.data) {
            const financeData = response.data;
            

            
            // Load city of operation
            setCity(financeData.city_of_operation || '');
            
            // Load startup costs if not already set
            if (Object.values(startupCosts).every(cost => cost === 0)) {
              setStartupCosts({
                productDevelopment: Number(financeData.product_development_cost) || 0,
                marketing: Number(financeData.marketing_customer_acquisition_cost) || 0,
                teamSalaries: Number(financeData.team_salaries_freelance_cost) || 0,
                toolsSubscriptions: Number(financeData.tools_subscriptions_cost) || 0,
                legalAdmin: Number(financeData.legal_admin_cost) || 0,
                other: Number(financeData.other_expenses_cost) || 0,
              });
            }

            // Load monthly operational costs if not already set
            if (Object.values(monthlyOperationalCosts).every(cost => cost === 0)) {
              setMonthlyOperationalCosts({
                rentUtilities: Number(financeData.monthly_rent_utilities) || 0,
                salaries: Number(financeData.monthly_salaries) || 0,
                marketing: Number(financeData.monthly_marketing) || 0,
                toolsSubscriptions: Number(financeData.monthly_tools_subscriptions) || 0,
                insuranceLegal: Number(financeData.monthly_insurance_legal) || 0,
                otherOperational: Number(financeData.monthly_other_operational) || 0,
              });
            }
            
            // Load revenue model if not already set
            if (!revenueModel.pricingModel && !revenueModel.pricePoint) {
              setRevenueModel(prev => ({
                ...prev,
                pricingModel: financeData.pricing_model || '',
                pricePoint: Number(financeData.price_per_customer) || 0,
                customersPerMonth: Number(financeData.new_customers_per_month) || 0,
                conversionRate: Number(financeData.conversion_rate) || 5,
                monthlyGrowthRate: Number(financeData.monthly_growth_rate) || 10,
                cogsPerCustomer: Number(financeData.cogs_per_customer) || 0,
              }));
            }
            
            // Load scenarios from AI-generated data
            setScenarios({
              costReduction: Number(financeData.cost_reduction_percentage) || 0,
              revenueIncrease: Number(financeData.revenue_increase_percentage) || 0,
            });
          }
        }
      } catch (error) {
        console.log('No existing finance setup found or error loading:', error);
      }
    };

    loadExistingFinanceSetup();
  }, []);



  // Auto-save function for all financial data
  const autoSaveFinancialData = async () => {
    try {
      if (!city || !city.trim()) {
        return; // Don't save if no city is set
      }

      // Don't auto-save if we're still loading data
      if (isGeneratingProposal) {
        return;
      }

      setIsAutoSaving(true);

      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      
      if (!teamId) {
        return; // Don't save if no team is found
      }

      // Get latest idea ID if available
      let ideaId: number | undefined;
      try {
        const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
        ideaId = (ideaResponse as any)?.data?.id;
      } catch (error) {
      }

      // Prepare finance data for auto-save
      const financeData = {
        team: teamId,
        idea: ideaId,
        city_of_operation: city,
        // ONE-TIME startup costs
        product_development_cost: startupCosts.productDevelopment,
        marketing_customer_acquisition_cost: startupCosts.marketing,
        team_salaries_freelance_cost: startupCosts.teamSalaries,
        tools_subscriptions_cost: startupCosts.toolsSubscriptions,
        legal_admin_cost: startupCosts.legalAdmin,
        other_expenses_cost: startupCosts.other,
        // MONTHLY operational costs
        monthly_rent_utilities: monthlyOperationalCosts.rentUtilities,
        monthly_salaries: monthlyOperationalCosts.salaries,
        monthly_marketing: monthlyOperationalCosts.marketing,
        monthly_tools_subscriptions: monthlyOperationalCosts.toolsSubscriptions,
        monthly_insurance_legal: monthlyOperationalCosts.insuranceLegal,
        monthly_other_operational: monthlyOperationalCosts.otherOperational,
        // Revenue model
        pricing_model: revenueModel.pricingModel,
        price_per_customer: revenueModel.pricePoint,
        new_customers_per_month: revenueModel.customersPerMonth,
        conversion_rate: revenueModel.conversionRate,
        monthly_growth_rate: revenueModel.monthlyGrowthRate,
        cogs_per_customer: revenueModel.cogsPerCustomer,
        // Scenario planning
        cost_reduction_percentage: scenarios.costReduction,
        revenue_increase_percentage: scenarios.revenueIncrease,
      };

      // Auto-save to backend
      await apiClient.createFinanceSetup(teamId, financeData);
      console.log('Financial data auto-saved successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't show error to user for auto-save failures
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleCostChange = (category: string, value: string) => {
    const numValue = Number(value) || 0;
    setStartupCosts(prev => ({
      ...prev,
      [category]: numValue
    }));
    // Auto-save after change (only if value actually changed)
    setTimeout(() => autoSaveFinancialData(), 2000); // 2 second delay
  };

  const handleMonthlyCostChange = (category: string, value: string) => {
    const numValue = Number(value) || 0;
    setMonthlyOperationalCosts(prev => ({
      ...prev,
      [category]: numValue
    }));
    // Auto-save after change (only if value actually changed)
    setTimeout(() => autoSaveFinancialData(), 2000); // 2 second delay
  };

  const handleRevenueChange = (field: string, value: string | number) => {
    const finalValue = typeof value === 'string' ? (Number(value) || 0) : value;
    setRevenueModel(prev => ({
      ...prev,
      [field]: finalValue
    }));
    // Auto-save after change (only if value actually changed)
    setTimeout(() => autoSaveFinancialData(), 2000); // 2 second delay
  };

  const handleScenarioChange = (field: 'costReduction' | 'revenueIncrease', value: number) => {
    setScenarios(prev => ({
      ...prev,
      [field]: value
    }));
    // Auto-save after change (only if value actually changed)
    setTimeout(() => autoSaveFinancialData(), 2000); // 2 second delay
  };

  const handleComplete = async () => {
    try {
      // Save to backend if city is provided
      if (city) {
        const status = await apiClient.get('/team-formation/status/');
        const teamId = (status as any)?.data?.current_team?.id;
        
        if (teamId) {
          // Get latest idea ID if available
          let ideaId: number | undefined;
          try {
            const ideaResponse = await apiClient.getTeamLatestIdeaId(teamId);
            ideaId = (ideaResponse as any)?.data?.id;
          } catch (error) {
          }

          // Create or update finance setup
          const financeData = {
            team: teamId,
            idea: ideaId,
            city_of_operation: city,
            // ONE-TIME startup costs
            product_development_cost: startupCosts.productDevelopment,
            marketing_customer_acquisition_cost: startupCosts.marketing,
            team_salaries_freelance_cost: startupCosts.teamSalaries,
            tools_subscriptions_cost: startupCosts.toolsSubscriptions,
            legal_admin_cost: startupCosts.legalAdmin,
            other_expenses_cost: startupCosts.other,
            // MONTHLY operational costs
            monthly_rent_utilities: monthlyOperationalCosts.rentUtilities,
            monthly_salaries: monthlyOperationalCosts.salaries,
            monthly_marketing: monthlyOperationalCosts.marketing,
            monthly_tools_subscriptions: monthlyOperationalCosts.toolsSubscriptions,
            monthly_insurance_legal: monthlyOperationalCosts.insuranceLegal,
            monthly_other_operational: monthlyOperationalCosts.otherOperational,
            // Revenue model
            pricing_model: revenueModel.pricingModel,
            price_per_customer: revenueModel.pricePoint,
            new_customers_per_month: revenueModel.customersPerMonth,
            conversion_rate: revenueModel.conversionRate,
            monthly_growth_rate: revenueModel.monthlyGrowthRate,
            cogs_per_customer: revenueModel.cogsPerCustomer,
            // Scenario planning
            cost_reduction_percentage: scenarios.costReduction,
            revenue_increase_percentage: scenarios.revenueIncrease,
          };

          await apiClient.createFinanceSetup(teamId, financeData);

          // Mark finance workshop as completed in the roadmap
          try {
            await apiClient.markFinanceWorkshopCompleted(teamId);
            console.log('Finance workshop marked as completed in roadmap');
          } catch (error) {
            console.error('Failed to mark finance workshop as completed:', error);
            // Continue with completion even if roadmap update fails
          }
        }
      }

    const financialData = {
      startupCosts,
        monthlyOperationalCosts,
      revenueModel,
      projections,
      summaryMetrics,
      scenarios,
        cityOfOperation: city,
      completedAt: new Date().toISOString()
    };

    if (!reviewMode) {
        StationFlowManager.saveStationOutput('financial', financialData, 15);
    }
    
    onComplete(financialData);
    } catch (error) {
      console.error('Error saving finance data:', error);
      // Continue with completion even if backend save fails
      const financialData = {
        startupCosts,
        monthlyOperationalCosts,
        revenueModel,
        projections,
        summaryMetrics,
        scenarios,
        cityOfOperation: city,
        completedAt: new Date().toISOString()
      };

      if (!reviewMode) {
        StationFlowManager.saveStationOutput('financial', financialData, 15);
      }
      
      onComplete(financialData);
    }
  };

  const downloadFinancialPlan = () => {
    const exportData = {
      keyAssumptions: {
        pricingModel: revenueModel.pricingModel,
        pricePoint: revenueModel.pricePoint,
        customersPerMonth: revenueModel.customersPerMonth,
        conversionRate: revenueModel.conversionRate,
        cogsPerCustomer: revenueModel.cogsPerCustomer
      },
      startupCosts,
      monthlyOperationalCosts,
      projections12Month: projections,
      breakEvenTimeline: summaryMetrics.breakEvenMonth,
      summaryMetrics,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial-plan.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary to-accent">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-foreground rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Financial Workshop</h1>
                <p className="text-sm text-primary-foreground/80">
                  Build comprehensive financial projections and business models
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onBack} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">Station 11/11</Badge>
              <Button onClick={downloadFinancialPlan} variant="outline" size="sm" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                <Download className="h-4 w-4 mr-2" />
                Export Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Model
            </TabsTrigger>
            <TabsTrigger value="runway" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Burn & Runway
            </TabsTrigger>
            <TabsTrigger value="statements" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Financial Reports
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Investor Summary
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Cost Analysis */}
          <TabsContent value="costs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Cost Analysis</CardTitle>
                    <InfoButton 
                      title="Cost Analysis 💸" 
                      content={`**TL;DR: This is where you figure out how much money you'll actually need to not go broke**

Think of this as your 'reality check' section. You'll list all the one-time costs to get started (like buying equipment, legal stuff, etc.) and then all the monthly bills you'll have to pay to keep the lights on. It's basically your 'how much money do I need to not be homeless' calculator.`} 
                    />
                    </div>
                <CardDescription>
                      Analyze your startup costs and ongoing operational expenses
                </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="city" className="text-xs text-muted-foreground">City of Operation</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Austin, TX"
                      value={city}
                      onChange={(e) => {
                        const newCity = e.target.value;
                        console.log('City changed from', city, 'to', newCity);
                        setCity(newCity);
                      }}
                      className="w-56"
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={generateProposedFinancials} 
                        disabled={!city || isGeneratingProposal}
                      >
                        {isGeneratingProposal ? 'Generating…' : 'Generate proposed financials'}
                      </Button>
                      {isAutoSaving && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                          <span>Auto-saving...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Cost Section Navigation */}
                <div className="flex justify-center mb-6">
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setActiveCostSection('startup')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeCostSection === 'startup'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Startup Costs
                    </button>
                    <button
                      onClick={() => setActiveCostSection('operational')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeCostSection === 'operational'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Operational Costs
                    </button>
                  </div>
                </div>

                {/* Startup Costs Subsection */}
                <div className={`mb-6 transition-all duration-300 ${activeCostSection === 'startup' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-primary">Startup Costs (One-time Investment)</h3>
                    <InfoButton 
                      title="Startup Costs 💸" 
                      content={`**TL;DR: All the money you need to spend ONCE to get your business started**

These are one-time expenses to get your business off the ground. Think of it as your "business setup fee" - things like buying equipment, legal fees, initial inventory, website development, etc. Once you pay these, you don't have to pay them again (hopefully). It's like buying a car - you pay once, then you own it.`} 
                    />
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="productDevelopment">Product Development ($)</Label>
                        <InfoButton 
                          title="Product Development 🛠️" 
                          content={`**TL;DR: Money spent on building/creating your actual product**

This covers all the costs of developing your product - whether it's software development, manufacturing, design, prototyping, testing, etc. If you're building an app, this includes coding, design, testing. If you're making physical products, this includes materials, manufacturing, prototypes. Basically, anything that goes into making the thing you're selling.`} 
                        />
                      </div>
                      <Input
                        id="productDevelopment"
                        type="number"
                        placeholder="Development, design, prototyping..."
                        value={startupCosts.productDevelopment || ''}
                        onChange={(e) => handleCostChange('productDevelopment', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marketing">Marketing & Customer Acquisition ($)</Label>
                        <InfoButton 
                          title="Marketing & Customer Acquisition 📢" 
                          content={`**TL;DR: Money spent to get people to know about and buy your stuff**

This covers all your marketing expenses - ads, social media, content creation, PR, events, etc. Basically, anything that helps people discover your business and convinces them to buy from you. It's like throwing a party and paying for invitations, decorations, and food to get people to show up.`} 
                        />
                      </div>
                      <Input
                        id="marketing"
                        type="number"
                        placeholder="Ads, content, branding..."
                        value={startupCosts.marketing || ''}
                        onChange={(e) => handleCostChange('marketing', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="teamSalaries">Team Salaries & Freelance Support ($)</Label>
                        <InfoButton 
                          title="Team Salaries & Freelance Support 👨‍💼" 
                          content={`**TL;DR: One-time costs for hiring people to help you get started**

This covers initial hiring costs, freelancer payments, consultant fees, etc. - basically any one-time payments to people who help you build your business. Think of it as your "hiring bonus" or "consultant fees" to get expert help when you're starting out.`} 
                        />
                      </div>
                      <Input
                        id="teamSalaries"
                        type="number"
                        placeholder="Salaries, contractors, freelancers..."
                        value={startupCosts.teamSalaries || ''}
                        onChange={(e) => handleCostChange('teamSalaries', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="toolsSubscriptions">Tools & Subscriptions ($)</Label>
                        <InfoButton 
                          title="Tools & Subscriptions 🛠️" 
                          content={`**TL;DR: One-time costs for software, tools, and equipment you need to buy**

This covers the initial purchase of software licenses, equipment, tools, and subscriptions you need to get started. Think Adobe Creative Suite, design software, hardware, etc. It's like buying all the tools you need for your workshop before you start building.`} 
                        />
                      </div>
                      <Input
                        id="toolsSubscriptions"
                        type="number"
                        placeholder="SaaS tools, domains, hosting..."
                        value={startupCosts.toolsSubscriptions || ''}
                        onChange={(e) => handleCostChange('toolsSubscriptions', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="legalAdmin">Legal & Admin ($)</Label>
                        <InfoButton 
                          title="Legal & Admin ⚖️" 
                          content={`**TL;DR: One-time legal and administrative setup costs**

This covers business registration, legal advice, trademark filing, compliance setup, accounting setup, etc. Basically all the boring but necessary legal and admin stuff you need to do once to get your business properly set up. It's like getting all your paperwork in order before you can start operating.`} 
                        />
                      </div>
                      <Input
                        id="legalAdmin"
                        type="number"
                        placeholder="Incorporation, legal fees, accounting..."
                        value={startupCosts.legalAdmin || ''}
                        onChange={(e) => handleCostChange('legalAdmin', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="other">Other Expenses ($)</Label>
                        <InfoButton 
                          title="Other Expenses 📦" 
                          content={`**TL;DR: Any other one-time startup costs that don't fit the other categories**

This is your "miscellaneous" startup costs - anything else you need to spend money on to get started that doesn't fit into the other categories. Think travel expenses, unexpected costs, contingency funds, etc. It's like having a "just in case" budget for stuff you didn't think of.`} 
                        />
                      </div>
                      <Input
                        id="other"
                        type="number"
                        placeholder="Office, equipment, miscellaneous..."
                        value={startupCosts.other || ''}
                        onChange={(e) => handleCostChange('other', e.target.value)}
                      />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Costs Subsection */}
                <div className={`mb-6 transition-all duration-300 ${activeCostSection === 'operational' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-green-600">Monthly Operational Costs (Ongoing Expenses)</h3>
                    <InfoButton 
                      title="Operational Costs 🔄" 
                      content={`**TL;DR: All the monthly bills you have to pay to keep your business running**

These are your recurring monthly expenses - the bills you have to pay every month to keep the lights on. Think rent, salaries, utilities, software subscriptions, marketing, etc. Unlike startup costs, these never stop (unless you go out of business). It's like your monthly phone bill - you pay it every month, forever.`} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="rentUtilities">Rent & Utilities ($/month)</Label>
                          <InfoButton 
                            title="Rent & Utilities 🏢" 
                            content={`**TL;DR: Your monthly office/workspace bills**

This covers your physical space costs - office rent, utilities (electricity, water, internet), maintenance, etc. If you're working from home, this might be a portion of your home expenses. It's basically your "where do I work" monthly bill.`} 
                          />
                        </div>
                        <Input
                          id="rentUtilities"
                          type="number"
                          placeholder="Office rent, utilities, internet..."
                          value={monthlyOperationalCosts.rentUtilities || ''}
                          onChange={(e) => handleMonthlyCostChange('rentUtilities', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="salaries">Salaries & Benefits ($/month)</Label>
                          <InfoButton 
                            title="Salaries & Benefits 👥" 
                            content={`**TL;DR: How much you pay your team (including yourself) each month**

This covers all employee costs - salaries, benefits, taxes, insurance, etc. If you're a solo founder, this might just be your own salary. If you have employees, this includes everyone's pay. It's basically your "people costs" - the money you spend to have humans work for you.`} 
                          />
                        </div>
                        <Input
                          id="salaries"
                          type="number"
                          placeholder="Ongoing salaries, benefits, payroll..."
                          value={monthlyOperationalCosts.salaries || ''}
                          onChange={(e) => handleMonthlyCostChange('salaries', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="marketing">Marketing & Advertising ($/month)</Label>
                          <InfoButton 
                            title="Marketing & Advertising 📢" 
                            content={`**TL;DR: Monthly money spent to get customers and keep them coming back**

This covers your ongoing marketing expenses - ads, social media management, content creation, PR, events, etc. Basically, all the monthly costs to keep your brand visible and attract new customers. It's like paying for ongoing advertising to keep your business in people's minds.`} 
                          />
                        </div>
                        <Input
                          id="marketing"
                          type="number"
                          placeholder="Ongoing marketing campaigns, ads..."
                          value={monthlyOperationalCosts.marketing || ''}
                          onChange={(e) => handleMonthlyCostChange('marketing', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="toolsSubscriptions">Tools & Subscriptions ($/month)</Label>
                          <InfoButton 
                            title="Tools & Subscriptions 🛠️" 
                            content={`**TL;DR: Monthly software and service subscriptions you need to run your business**

This covers all your recurring software costs - SaaS tools, cloud services, design software, analytics tools, etc. Think Netflix but for business tools. These are the monthly subscriptions that keep your business running smoothly.`} 
                          />
                        </div>
                        <Input
                          id="toolsSubscriptions"
                          type="number"
                          placeholder="SaaS subscriptions, software licenses..."
                          value={monthlyOperationalCosts.toolsSubscriptions || ''}
                          onChange={(e) => handleMonthlyCostChange('toolsSubscriptions', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="insuranceLegal">Insurance & Legal ($/month)</Label>
                          <InfoButton 
                            title="Insurance & Legal ⚖️" 
                            content={`**TL;DR: Monthly costs to keep your business protected and compliant**

This covers ongoing legal and insurance costs - business insurance, legal retainer fees, compliance monitoring, etc. Basically, the monthly cost of keeping your business legally protected and following all the rules. It's like having a monthly "protection plan" for your business.`} 
                          />
                        </div>
                        <Input
                          id="insuranceLegal"
                          type="number"
                          placeholder="Insurance, legal compliance, accounting..."
                          value={monthlyOperationalCosts.insuranceLegal || ''}
                          onChange={(e) => handleMonthlyCostChange('insuranceLegal', e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="otherOperational">Other Operational ($/month)</Label>
                          <InfoButton 
                            title="Other Operational 📦" 
                            content={`**TL;DR: Any other monthly business expenses that don't fit the other categories**

This is your "miscellaneous" monthly costs - anything else you need to spend money on each month to keep your business running that doesn't fit into the other categories. Think travel expenses, office supplies, unexpected costs, etc. It's like having a monthly "just in case" budget.`} 
                          />
                        </div>
                        <Input
                          id="otherOperational"
                          type="number"
                          placeholder="Office supplies, maintenance, misc..."
                          value={monthlyOperationalCosts.otherOperational || ''}
                          onChange={(e) => handleMonthlyCostChange('otherOperational', e.target.value)}
                        />
                      </div>
                      {/* COGS Field - Added here with coherent design */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="cogsPerCustomer">COGS per Customer ($/month)</Label>
                          <InfoButton 
                            title="COGS per Customer 🏭" 
                            content={`**TL;DR: How much does it actually cost you to serve one customer?**

COGS = Cost of Goods Sold. This is the direct cost of providing your product/service to one customer. If you're selling coffee, this includes the coffee beans, cup, labor to make it, etc. If you're running a SaaS app, this might be server costs per user. The key: this should be LESS than what you charge them, otherwise you're losing money on every sale (which is... not ideal).`} 
                          />
                        </div>
                        <Input
                          id="cogsPerCustomer"
                          type="number"
                          placeholder="Cost to deliver/support each customer"
                          value={revenueModel.cogsPerCustomer || ''}
                          onChange={(e) => handleRevenueChange('cogsPerCustomer', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Variable cost per customer (materials, delivery, support, etc.)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Analysis Summary */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                      <div className="text-sm text-blue-600 font-medium">Startup Investment</div>
                      <div className="text-2xl font-bold text-blue-800">
                      ${(summaryMetrics.totalStartupCosts || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">One-time costs</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-center">
                      <div className="text-sm text-green-600 font-medium">Monthly Burn</div>
                      <div className="text-2xl font-bold text-green-800">
                        ${(summaryMetrics.monthlyBurn || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 mt-1">Ongoing costs</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Revenue & Pricing Projection */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Revenue Model Setup</CardTitle>
                    <InfoButton 
                      title="Revenue Model Setup 💰" 
                      content={`**TL;DR: This is where you figure out how to actually make money (the whole point of a business)**

Here's where you decide how much to charge people, how many customers you think you can get each month, and how fast you'll grow. It's like setting up your 'money-making machine' - you need to know how much each customer pays you, how many you'll get, and how much it costs you to serve them. Pro tip: if your costs are higher than what you charge, you're basically running a charity (not a business).`} 
                    />
                  </div>
                  <CardDescription>
                    Define your pricing strategy and customer acquisition
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Pricing Model</Label>
                      <InfoButton 
                        title="Pricing Model 🏷️" 
                        content={`**TL;DR: How are you gonna charge people for your stuff?**

This is basically asking 'what's your business model?' Are you charging per month (subscription), per use (pay-as-you-go), or a one-time fee? Think of it like choosing between Netflix (monthly), Uber (per ride), or buying a video game (one-time). Each has different pros and cons for making money.`} 
                      />
                    </div>
                    <Select onValueChange={(value) => handleRevenueChange('pricingModel', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your pricing model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subscription">Monthly Subscription</SelectItem>
                        <SelectItem value="one-time">One-time Purchase</SelectItem>
                        <SelectItem value="freemium">Freemium with Upgrades</SelectItem>
                        <SelectItem value="usage">Usage-based Pricing</SelectItem>
                        <SelectItem value="marketplace">Marketplace Commission</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-recommended: {revenueModel.pricingModel || 'Not set'} - Based on {city} market analysis
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pricePoint">Price per Customer ($)</Label>
                      <InfoButton 
                        title="Price per Customer 💵" 
                        content={`**TL;DR: How much money do you get from each customer?**

This is literally how much you charge one person for your product/service. If you're selling coffee for $5, this is $5. If you're charging $50/month for a subscription, this is $50. Don't forget to consider what people will actually pay - charging $1000 for a cup of coffee might not work (unless it's made of gold).`} 
                      />
                    </div>
                    <Input
                      id="pricePoint"
                      type="number"
                      placeholder="Average revenue per customer"
                      value={revenueModel.pricePoint || ''}
                      onChange={(e) => handleRevenueChange('pricePoint', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: ${revenueModel.pricePoint?.toLocaleString() || '0'} - Optimized for {city} market conditions
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="customersPerMonth">New Customers per Month</Label>
                      <InfoButton 
                        title="New Customers per Month 👥" 
                        content={`**TL;DR: How many new people will buy from you each month?**

This is your customer acquisition target - how many new customers you think you can get each month. Be realistic here! If you're just starting, don't put 10,000 unless you have a really good plan. Start small and grow from there. Remember: it's better to have 10 paying customers than 1000 people who just 'like' your Instagram post.`} 
                      />
                    </div>
                    <Input
                      id="customersPerMonth"
                      type="number"
                      placeholder="Expected monthly customer acquisition"
                      value={revenueModel.customersPerMonth || ''}
                      onChange={(e) => handleRevenueChange('customersPerMonth', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: {revenueModel.customersPerMonth?.toLocaleString() || '0'} customers - Based on {city} market size and competition
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Conversion Rate: {revenueModel.conversionRate}%</Label>
                      <InfoButton 
                        title="Conversion Rate 🎯" 
                        content={`**TL;DR: What percentage of people who see your stuff actually buy it**

This is basically your "closing rate" - out of 100 people who check out your product/service, how many actually become paying customers? A 5% conversion rate means 5 out of 100 people buy. Higher is better, but 2-5% is pretty normal for most businesses.`} 
                      />
                    </div>
                    <Slider
                      value={[revenueModel.conversionRate]}
                      onValueChange={(value) => handleRevenueChange('conversionRate', value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: {revenueModel.conversionRate}% - Expected customer conversion from leads to paying customers
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Monthly Growth Rate: {revenueModel.monthlyGrowthRate}%</Label>
                      <InfoButton 
                        title="Monthly Growth Rate 📈" 
                        content={`**TL;DR: How fast do you think your customer base will grow each month?**

This is your growth assumption - how much more customers you'll get each month compared to the previous month. 10% means if you had 100 customers this month, you'll have 110 next month. Be careful not to be too optimistic - 50% monthly growth is basically impossible unless you're selling something really addictive (and legal).`} 
                      />
                    </div>
                    <Slider
                      value={[revenueModel.monthlyGrowthRate]}
                      onValueChange={(value) => handleRevenueChange('monthlyGrowthRate', value[0])}
                      max={50}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: {revenueModel.monthlyGrowthRate}% - Expected monthly growth in customer base
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{summaryMetrics.projectionPeriod}-Month Revenue Forecast</CardTitle>
                    <InfoButton 
                      title="Revenue Forecast 📊" 
                      content={`**TL;DR: This shows how much money you'll make over time (hopefully going up)**

This chart predicts your future revenue based on your assumptions. The green area shows monthly revenue (how much you make each month), and the lighter green shows cumulative revenue (total money made so far). If the line goes up, you're doing well. If it goes down... well, that's why we have this tool to help you plan better!`} 
                    />
                  </div>
                  <CardDescription>
                    Projected revenue based on your inputs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={biYearlyProjections}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            `$${Number(value).toLocaleString()}`, 
                            name === 'revenue' ? 'Period Revenue (6 months)' : 'Cumulative Revenue'
                          ]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="cumulativeRevenue" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">{summaryMetrics.projectionPeriod}-Month Total</div>
                      <div className="font-bold">${(summaryMetrics.totalRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground">Break-even Month</div>
                      <div className="font-bold">{summaryMetrics.breakEvenMonth || 'Not projected'}</div>
                    </div>
                  </div>

                  {/* AI-Generated Revenue Summary */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">🤖 AI-Generated Revenue Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-blue-600 font-medium">Pricing Strategy:</span>
                        <span className="ml-2">{revenueModel.pricingModel || 'Not set'} - Optimized for {city} market</span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Market Price:</span>
                        <span className="ml-2">${revenueModel.pricePoint?.toLocaleString() || '0'} per customer</span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Customer Acquisition:</span>
                        <span className="ml-2">{revenueModel.customersPerMonth?.toLocaleString() || '0'} new customers/month</span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Conversion Rate:</span>
                        <span className="ml-2">{revenueModel.conversionRate}% (industry benchmark)</span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Growth Trajectory:</span>
                        <span className="ml-2">{revenueModel.monthlyGrowthRate}% monthly growth</span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Market Potential:</span>
                        <span className="ml-2">Based on {city} demographics and competition</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Burn Rate & Runway Calculator */}
          <TabsContent value="runway" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Scenario Planning</CardTitle>
                    <InfoButton 
                      title="Scenario Planning 🎯" 
                      content={`**TL;DR: This is your 'what if' playground for business planning**

Ever wondered 'what if I charged more?' or 'what if I cut costs?' This is where you can test those scenarios without actually doing it. Slide the bars to see how different changes would affect your bottom line. It's like having a crystal ball for your business (but way more accurate than a Magic 8-ball).`} 
                    />
                  </div>
                  <CardDescription>
                    Simulate different scenarios with sliders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Cost Reduction: {scenarios.costReduction}%</Label>
                      <InfoButton 
                        title="Cost Reduction 💰" 
                        content={`**TL;DR: How much you can cut your monthly expenses through smart optimization**

This is your "efficiency slider" - how much can you reduce your monthly costs by being smarter about operations? Maybe you find cheaper suppliers, automate processes, or negotiate better deals. 20% cost reduction means you're spending 20% less each month.`} 
                      />
                    </div>
                    <Slider
                      value={[scenarios.costReduction]}
                      onValueChange={(value) => handleScenarioChange('costReduction', value[0])}
                      max={50}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: {scenarios.costReduction}% - Potential cost savings through operational optimization
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Revenue Increase: {scenarios.revenueIncrease}%</Label>
                      <InfoButton 
                        title="Revenue Increase 📈" 
                        content={`**TL;DR: How much you can boost your monthly income through better strategies**

This is your "growth slider" - how much can you increase your monthly revenue by improving your product, marketing, or pricing? Maybe you get better at converting leads, raise prices, or find new revenue streams. 30% revenue increase means you're making 30% more each month.`} 
                      />
                    </div>
                    <Slider
                      value={[scenarios.revenueIncrease]}
                      onValueChange={(value) => handleScenarioChange('revenueIncrease', value[0])}
                      max={100}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-proposed: {scenarios.revenueIncrease}% - Potential revenue growth through improved conversion and pricing
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-3 bg-destructive/10 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-sm text-muted-foreground">Monthly Burn</div>
                        <InfoButton 
                          title="Monthly Burn 🔥" 
                          content={`**TL;DR: How much money you're losing each month to keep the business running**

This is your "money drain" - the total amount you spend each month on all operational costs (salaries, rent, marketing, etc.). It's called "burn" because you're literally burning through your startup money. The lower this number, the longer your money lasts.`} 
                        />
                      </div>
                      <div className="text-xl font-bold text-destructive">
                        ${Math.round((summaryMetrics.monthlyBurn || 0) * (1 - scenarios.costReduction / 100)).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-success/10 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-sm text-muted-foreground">Runway</div>
                        <InfoButton 
                          title="Runway 🛫" 
                          content={`**TL;DR: How many months you can survive before running out of money**

This is your "survival time" - how long your startup money will last at your current spending rate. If you have $100k and burn $10k/month, your runway is 10 months. You need to either make money or raise more cash before your runway runs out!`} 
                        />
                      </div>
                      <div className="text-xl font-bold text-success">
                        {Math.round(summaryMetrics.runway / (1 - scenarios.costReduction / 100))} months
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Cash Flow Visualization</CardTitle>
                    <InfoButton 
                      title="Cash Flow Visualization 💸" 
                      content={`**TL;DR: This shows if you're making money or losing money each month**

Green line = money coming in (revenue), Red line = money going out (costs), Purple line = your actual profit/loss. When green is above red, you're making money (yay!). When red is above green, you're losing money (not yay). The goal is to get the green line above the red line and keep it there. It's like a financial game of 'red light, green light' but with your bank account.`} 
                    />
                  </div>
                  <CardDescription>
                    Revenue vs. Costs over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={biYearlyProjections}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Legend />
                        <Tooltip 
                          formatter={(value, name) => [
                            `$${Number(value).toLocaleString()}`, 
                            name === 'revenue' ? 'Revenue (6 months)' : name === 'costs' ? 'Costs (6 months)' : 'Net Cash Flow (6 months)'
                          ]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} name="Revenue" />
                        <Line type="monotone" dataKey="costs" stroke="#ff7c7c" strokeWidth={2} name="Total Costs" />
                        <Line type="monotone" dataKey="netCashFlow" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" name="Net Cash Flow" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-1 rounded bg-[#82ca9d]"></span>
                      <span>Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-1 rounded bg-[#ff7c7c]"></span>
                      <span>Costs (Burn)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-1 rounded bg-[#8884d8]"></span>
                      <span>Net Cash Flow</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: Financial Statements */}
          <TabsContent value="statements" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Income Statement (P&L)</CardTitle>
                    <InfoButton 
                      title="Income Statement (P&L) 📋" 
                      content={`**TL;DR: This is your business's report card - did you pass or fail?**

This is basically your business's financial report card. It shows total revenue (money made), total costs (money spent), net income (profit/loss), and profit margin (how much you keep). If net income is positive, you passed! If it's negative, you need to study harder (or adjust your business model). Think of it as your business's GPA, but instead of grades, it's dollars.`} 
                    />
                  </div>
                  <CardDescription>
                    {summaryMetrics.projectionPeriod}-month profit and loss projection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total Revenue ({summaryMetrics.projectionPeriod}M)</span>
                        <InfoButton 
                          title="Total Revenue 💰" 
                          content={`**TL;DR: All the money you made during this time period**

This is your total income from all customers over the projection period. It's the sum of all your monthly revenue. If you make $10k/month for 12 months, your total revenue is $120k. This is the "money in" side of your business.`} 
                        />
                      </div>
                      <span className="font-bold text-success">
                        ${(summaryMetrics.totalRevenue || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total Costs ({summaryMetrics.projectionPeriod}M)</span>
                        <InfoButton 
                          title="Total Costs 💸" 
                          content={`**TL;DR: All the money you spent during this time period**

This is your total expenses over the projection period - all your operational costs (salaries, rent, marketing) plus the cost of making your product (COGS). If you spend $8k/month for 12 months, your total costs are $96k. This is the "money out" side of your business.`} 
                        />
                      </div>
                      <span className="font-bold text-destructive">
                        ${(summaryMetrics.totalCosts || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Net Income ({summaryMetrics.projectionPeriod}M)</span>
                        <InfoButton 
                          title="Net Income 📊" 
                          content={`**TL;DR: Your actual profit (or loss) after all expenses**

This is what you actually made - total revenue minus total costs. If you made $120k in revenue but spent $96k in costs, your net income is $24k profit. If it's negative, you lost money. This is the "bottom line" that really matters.`} 
                        />
                      </div>
                      <span className={`font-bold ${(summaryMetrics.netIncome || 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                        ${(summaryMetrics.netIncome || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Profit Margin</span>
                        <InfoButton 
                          title="Profit Margin 📈" 
                          content={`**TL;DR: What percentage of your revenue you actually keep as profit**

This shows how efficient your business is at making money. If you make $100k in revenue and keep $20k as profit, your profit margin is 20%. Higher margins mean you're keeping more of what you earn. 10-20% is pretty good for most businesses.`} 
                        />
                      </div>
                      <span className="font-bold">
                        {summaryMetrics.profitMargin}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Break-even Analysis</CardTitle>
                    <InfoButton 
                      title="Break-even Analysis 🎯" 
                      content={`**TL;DR: When will you finally make back all the money you spent to start this thing?**

This shows when you'll 'break even' - meaning you've made back all the money you initially invested. The green line is revenue, red line is costs, and the purple dashed line shows if you're in the black or red overall. When the purple line crosses zero, you've officially made back your startup money (and can finally stop eating ramen for every meal).`} 
                    />
                  </div>
                  <CardDescription>
                    When will your startup become profitable? Revenue vs. Costs over time
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Projection period: {summaryMetrics.projectionPeriod} months ({summaryMetrics.totalPeriods} periods)
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Break-even Summary */}
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {summaryMetrics.breakEvenMonth > 0 ? `Month ${summaryMetrics.breakEvenMonth}` : 'Not projected'}
                      </div>
                      <div className="text-sm text-muted-foreground">Break-even Timeline</div>
                    </div>
                    
                    {summaryMetrics.breakEvenMonth > 0 && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-muted-foreground">Customers Needed</div>
                          <div className="font-bold">
                            {projections[summaryMetrics.breakEvenMonth - 1]?.customers.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-muted-foreground">Monthly Revenue</div>
                          <div className="font-bold">
                            ${projections[summaryMetrics.breakEvenMonth - 1]?.revenue.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>

                    {/* Break-even Chart */}
                    <div>
                      <h4 className="font-semibold mb-3 text-center">Revenue vs. Costs Over Time</h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={biYearlyProjections}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="period" 
                              label={{ value: 'Period (6 months)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                              label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              formatter={(value, name) => [
                                `$${Number(value).toLocaleString()}`, 
                                name === 'revenue' ? 'Revenue (6 months)' : name === 'costs' ? 'Total Costs (6 months)' : 'Cumulative Net Profit'
                              ]}
                            />
                            <Legend />
                            {/* Revenue line - shows 6-month periods */}
                            <Line 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#82ca9d" 
                              strokeWidth={3} 
                              name="Period Revenue (6 months)"
                              dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                            />
                            {/* Period costs line - operational + COGS for 6 months */}
                            <Line 
                              type="monotone" 
                              dataKey="costs" 
                              stroke="#ff7c7c" 
                              strokeWidth={3} 
                              name="Period Costs (6 months)"
                              dot={{ fill: '#ff7c7c', strokeWidth: 2, r: 4 }}
                            />
                            {/* Cumulative net profit AFTER startup costs - shows recovery of startup investment */}
                            <Line 
                              type="monotone" 
                              dataKey="cumulativeNetProfitAfterStartup" 
                              stroke="#8884d8" 
                              strokeWidth={2} 
                              strokeDasharray="5 5" 
                              name="Cumulative Net Profit (After Startup Costs)"
                              dot={{ fill: '#8884d8', strokeWidth: 2, r: 3 }}
                            />
                            {/* Break-even point marker - convert month to period */}
                            {summaryMetrics.breakEvenMonth > 0 && (
                              <ReferenceLine 
                                x={Math.ceil(summaryMetrics.breakEvenMonth / 6)} 
                                stroke="#ff6b6b" 
                                strokeDasharray="3 3"
                                label={{ 
                                  value: `Break-even: Period ${Math.ceil(summaryMetrics.breakEvenMonth / 6)}`, 
                                  position: 'top',
                                  fill: '#ff6b6b',
                                  fontSize: 12
                                }}
                              />
                            )}
                            {/* Zero line to show when startup investment is recovered */}
                            <ReferenceLine 
                              y={0} 
                              stroke="#666" 
                              strokeDasharray="2 2"
                              label={{ 
                                value: 'Startup Investment Recovered', 
                                position: 'right',
                                fill: '#666',
                                fontSize: 10
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Chart Legend */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-2 rounded bg-[#82ca9d]"></span>
                          <span>Monthly Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-2 rounded bg-[#ff7c7c]"></span>
                          <span>Monthly Costs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-2 rounded bg-[#8884d8]"></span>
                          <span>Net Profit After Startup</span>
                        </div>
                      </div>

                      {/* Chart Explanation */}
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground">
                          <strong>Chart Explanation:</strong> Period Revenue (green) shows 6-month revenue totals that increase over time based on your revenue model. 
                          Period Costs (red) are your ongoing operational expenses + COGS for each 6-month period - these are recurring costs, NOT your startup investment. 
                          Cumulative Net Profit After Startup Costs (purple, dashed) shows when you've recovered your one-time startup investment. 
                          Break-even occurs when this line crosses $0, meaning your cumulative profits have covered your initial startup costs.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 5: Investor Summary */}
          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Investor-Ready Financial Summary</CardTitle>
                  <InfoButton 
                    title="Investor Summary 💼" 
                    content={`**TL;DR: This is your elevator pitch in numbers - convince people to give you money**

This is basically your business's 'resume' for investors. It shows all the important numbers, assumptions, and projections in one place. Think of it as your 'why you should give me money' presentation, but with charts and graphs instead of PowerPoint slides. If you can't explain your business model here, investors probably won't understand it either.`} 
                  />
                </div>
                <CardDescription>
                  Key metrics and assumptions for investor presentations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Key Assumptions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Key Assumptions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Pricing Model:</span>
                        <span className="font-medium">{revenueModel.pricingModel || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price Point:</span>
                        <span className="font-medium">${revenueModel.pricePoint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversion Rate:</span>
                        <span className="font-medium">{revenueModel.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Growth Rate:</span>
                        <span className="font-medium">{revenueModel.monthlyGrowthRate}%/month</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Key Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Total Startup Costs:</span>
                          <InfoButton 
                            title="Total Startup Costs 💰" 
                            content={`**TL;DR: All the money you need to spend BEFORE you can even start your business**

This is your "entry fee" into entrepreneurship. It includes everything you need to buy or set up before you can make your first dollar: equipment, legal stuff, initial marketing, office setup, etc. Think of it as the down payment on your business dreams. The higher this number, the more money you need to raise or save before you can launch.`} 
                          />
                        </div>
                        <span className="font-medium">${(summaryMetrics.totalStartupCosts || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>{summaryMetrics.projectionPeriod}-Month Revenue:</span>
                          <InfoButton 
                            title={`${summaryMetrics.projectionPeriod}-Month Revenue 💵`} 
                            content={`**TL;DR: How much money you'll make in total over the projection period (hopefully a lot)**

This is your projected total income for the entire projection period. It's the sum of all your monthly revenue. If you make $10k/month for ${summaryMetrics.projectionPeriod} months, this would be $${(10000 * summaryMetrics.projectionPeriod).toLocaleString()}. This is the "money in" side of your business - the bigger this number, the more successful your business model is.`} 
                          />
                        </div>
                        <span className="font-medium">${(summaryMetrics.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Break-even Month:</span>
                          <InfoButton 
                            title="Break-even Month 🎯" 
                            content={`**TL;DR: The month when you finally stop losing money and start making profit**

This is the holy grail of startup metrics - the month when your total revenue finally covers all your costs (including startup costs). Before this month, you're losing money. After this month, you're making profit. The sooner this happens, the better. If it says "N/A", it means you won't break even within the projection period (which is... not great).`} 
                          />
                        </div>
                        <span className="font-medium">{summaryMetrics.breakEvenMonth || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Monthly Burn Rate:</span>
                          <InfoButton 
                            title="Monthly Burn Rate 🔥" 
                            content={`**TL;DR: How much money you spend every month to keep the lights on**

This is your "money drain" - the total amount you spend each month on all operational costs (salaries, rent, marketing, etc.). It's called "burn" because you're literally burning through your startup money. The lower this number, the longer your money lasts. If you burn $10k/month and have $100k in the bank, you have 10 months to figure things out.`} 
                          />
                        </div>
                        <span className="font-medium">${(summaryMetrics.monthlyBurn || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Monthly Gross Profit:</span>
                          <InfoButton 
                            title="Monthly Gross Profit 💚" 
                            content={`**TL;DR: How much money you make each month AFTER paying for the actual product/service costs**

This is your revenue minus the cost of goods sold (COGS). If you sell a $100 product that costs $30 to make, your gross profit is $70. This is the "good profit" - it shows you're making money on each sale. The higher this number, the more profitable each customer is.`} 
                          />
                        </div>
                        <span className="text-success font-medium">${(summaryMetrics.monthlyGrossProfit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Monthly Net Profit:</span>
                          <InfoButton 
                            title="Monthly Net Profit 💰" 
                            content={`**TL;DR: The REAL profit you make each month after ALL costs (the money you actually keep)**

This is your gross profit minus all operational costs (salaries, rent, marketing, etc.). This is the "true profit" - the actual money you get to keep or reinvest. If this is positive, you're making real money. If it's negative, you're still losing money each month (which is normal for early-stage startups).`} 
                          />
                        </div>
                        <span className={`font-medium ${(summaryMetrics.monthlyNetProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${(summaryMetrics.monthlyNetProfit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span>Gross Margin:</span>
                          <InfoButton 
                            title="Gross Margin 📊" 
                            content={`**TL;DR: What percentage of each sale is pure profit (before operational costs)**

This is your gross profit divided by revenue, expressed as a percentage. If you sell a $100 product that costs $30 to make, your gross margin is 70%. Higher margins = more profitable business. Software companies often have 80%+ margins, while restaurants might have 20-30% margins.`} 
                          />
                        </div>
                        <span className="text-success font-medium">{summaryMetrics.grossMarginPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <span>Net Margin:</span>
                          <InfoButton 
                            title="Net Margin 🎯" 
                            content={`**TL;DR: The REAL profit percentage after ALL costs (the ultimate measure of profitability)**

This is your net profit divided by revenue, expressed as a percentage. If you make $20 net profit on a $100 sale, your net margin is 20%. This is the "true profitability" of your business. Positive margins = profitable business. Negative margins = you're losing money (but that's normal for early startups).`} 
                          />
                        </div>
                        <span className={`font-medium ${summaryMetrics.netMarginPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {summaryMetrics.netMarginPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Export Actions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Export Options</h3>
                    <div className="space-y-2">
                      <Button onClick={downloadFinancialPlan} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON Report
                      </Button>
                      <Button className="w-full" variant="outline" disabled>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate PDF (Coming Soon)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Revenue vs Burn Chart */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold">Revenue vs. Burn Chart</h3>
                    <InfoButton 
                      title="Revenue vs. Burn Chart 📊" 
                      content={`**TL;DR: This shows if you're making money or burning through it like a bonfire**

This bar chart is like a financial scoreboard. Green bars = money coming in, Red bars = operational costs (fixed monthly bills), Orange bars = COGS (costs per customer). If green bars are taller than red+orange bars, you're winning! If not, you're basically burning money (which is not a sustainable business model, unless you're running a literal bonfire business).`} 
                    />
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={biYearlyProjections}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            `$${Number(value).toLocaleString()}`, 
                            name === 'revenue' ? 'Revenue (6 months)' : name === 'operationalCosts' ? 'Operational Costs (6 months)' : 'COGS (6 months)'
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#82ca9d" />
                        <Bar dataKey="operationalCosts" fill="#ff7c7c" />
                        <Bar dataKey="cogs" fill="#ffb347" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-2 rounded bg-[#82ca9d]"></span>
                      <span>Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-2 rounded bg-[#ff7c7c]"></span>
                      <span>Operational Costs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-2 rounded bg-[#ffb347]"></span>
                      <span>COGS</span>
                    </div>
                  </div>
                  
                  {/* Chart Explanation */}
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground">
                      <strong>Chart Explanation:</strong> Revenue (green) shows 6-month income totals, Operational Costs (red) are fixed 6-month expenses, 
                      and COGS (orange) are variable costs per customer for 6 months. Break-even occurs when cumulative net profit (revenue - COGS - operational costs) 
                      covers your total startup investment.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={() => {
            const tabs = ["costs", "revenue", "runway", "statements", "summary"];
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex > 0) {
              setActiveTab(tabs[currentIndex - 1]);
            }
          }} disabled={activeTab === "costs"}>
            Previous Step
          </Button>

          <div className="flex gap-3">
            {activeTab !== "summary" ? (
              <Button onClick={() => {
                const tabs = ["costs", "revenue", "runway", "statements", "summary"];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}>
                Next Step
                <Play className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => setShowSubmissionDialog(true)} size="lg">
                {reviewMode ? 'Update Financial Plan' : 'Complete Financial Workshop'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showSubmissionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Submit Finance Walkthrough Video</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSubmissionDialog(false)}>Close</Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">4-minute Video Link (Google Drive)</label>
                <input type="url" value={financeVideoLink} onChange={(e)=>setFinanceVideoLink(e.target.value)} className="w-full p-2 border rounded-md" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowSubmissionDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmitFinance} disabled={!financeVideoLink.trim()} className="flex-1">Submit</Button>
            </div>
          </div>
        </div>
      )}






      </div>
    </div>
  );
};