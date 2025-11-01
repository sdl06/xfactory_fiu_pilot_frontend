import axios from 'axios';
const API_BASE_URL = 'https://api.ivyfactory.io/api';
export const API_ORIGIN = (() => {
  try { return new URL(API_BASE_URL).origin; } catch { return 'https://api.ivyfactory.io'; }
})();

export const toAbsoluteMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
    return `${API_ORIGIN}/${url}`;
  } catch { return url; }
};

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get CSRF token from server
  async getCSRFToken(): Promise<string> {
    try {
      // First try to get from cookies
      const name = 'csrftoken';
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const token = parts.pop()?.split(';').shift();
        if (token) return token;
      }
      
      // If not in cookies, fetch from server
      const response = await fetch(`${this.baseUrl}/auth/csrf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken || '';
      }
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }
    return '';
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type') || '';
      let body: any = null;
      if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch {
          body = null;
        }
      } else {
        try {
          body = await response.text();
        } catch {
          body = null;
        }
      }

      if (response.ok) {
        return { data: body as T, status: response.status };
      } else {
        const errorMessage = (body && typeof body === 'object' && (body.error || body.message))
          ? (body.error || body.message)
          : (typeof body === 'string' && body ? body : `HTTP ${response.status}`);
        return { 
          error: errorMessage,
          data: body,
          status: response.status 
        };
      }
    } catch (error) {
      return { 
        error: 'Network error. Please check your connection.', 
        status: 0 
      };
    }
  }

  // Axios helpers (explicit separate field setters; useful when sending PST parts individually)
  async axiosSetTeamIdeaInputs(teamId: number, payload: { input_problem?: string; input_solution?: string; input_target_audience?: string; business_type?: string }) {
    const url = `${this.baseUrl}/ideation/teams/${teamId}/problem-solution/`;
    
    // For user input, use PUT directly to avoid AI generation
    try {
      const res = await axios.put(url, payload, { headers: this.getAuthHeaders() });
      return { data: res.data, status: res.status };
    } catch (e: any) {
      return { 
        data: e?.response?.data, 
        error: e?.message, 
        status: e?.response?.status || 0 
      };
    }
  }

  async axiosGenerateAIIdea(ideaId: number, businessType?: string) {
    const url = `${this.baseUrl}/ideation/ai-generated-idea/${ideaId}/generate/`;
    try {
      const res = await axios.post(url, businessType ? { business_type: businessType } : {}, { headers: this.getAuthHeaders() });
      return { data: res.data, status: res.status };
    } catch (e: any) {
      return { data: e?.response?.data, error: e?.message, status: e?.response?.status || 0 };
    }
  }

  async axiosGetAIIdea(ideaId: number) {
    const url = `${this.baseUrl}/ideation/ai-generated-idea/${ideaId}/`;
    try {
      const res = await axios.get(url, { headers: this.getAuthHeaders() });
      return { data: res.data, status: res.status };
    } catch (e: any) {
      return { data: e?.response?.data, error: e?.message, status: e?.response?.status || 0 };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    // First, get CSRF token
    const csrfToken = await this.getCSRFToken();
    console.log('🔍 API DEBUG: CSRF Token:', csrfToken);
    
    const url = `${this.baseUrl}/auth/login/`;
    const requestData = { email, password };
    
    console.log('🔍 API DEBUG: Login request:', { url, email, csrfToken: csrfToken ? 'Present' : 'Missing' });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include', // Include cookies for CSRF
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('🔍 API DEBUG: Response:', { status: response.status, ok: response.ok, data });

      if (response.ok) {
        return { data, status: response.status };
      } else {
        console.log('🔍 API DEBUG: Login failed:', { status: response.status, data });
        return { 
          error: data.error || data.message || 'Login failed',
          data: data,
          status: response.status 
        };
      }
    } catch (error) {
      return {
        error: 'Network error',
        status: 0
      };
    }
  }

  async logout() {
    return this.request('/auth/logout/', {
      method: 'POST',
    });
  }

  async register(userData: any) {
    // Register should NOT include auth headers since we're creating an account
    const url = `${this.baseUrl}/auth/register/`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { data, status: response.status };
      } else {
        return { 
          error: data.error || data.message || 'Registration failed',
          data: data,
          status: response.status 
        };
      }
    } catch (error) {
      return {
        error: 'Network error',
        status: 0
      };
    }
  }

  async getProfile() {
    return this.request('/auth/profile/');
  }

  async checkDeadlines() {
    return this.request('/auth/check-deadlines/');
  }

  async markSectionCompleted(section: string) {
    return this.request('/auth/mark-completed/', {
      method: 'POST',
      body: JSON.stringify({ section }),
    });
  }
  async resetProgress() {
    return this.post('/auth/reset-progress/', {});
  }

  // Helper: Mark mockup completion for team MVP stage
  async markMockupCompleted(teamId: number) {
    return this.put(`/ideation/teams/${teamId}/roadmap-completion/`, { mvp: { software_mockup: true } });
  }

  // Helper: Mark finance workshop completion for team
  async markFinanceWorkshopCompleted(teamId: number) {
    return this.put(`/ideation/teams/${teamId}/roadmap-completion/`, { 
      finance: { 
        budget_completed: true,
        completed_at: new Date().toISOString(),
        financial_data: {
          startup_costs: true,
          operational_costs: true,
          revenue_model: true,
          projections: true,
          break_even_analysis: true,
          cash_flow: true
        }
      } 
    });
  }

  // Service roadmap save
  async saveServiceRoadmap(ideaId: number, roadmap: any) {
    const payload: any = {
      idea_id: ideaId,
      title: roadmap?.title || 'Service Roadmap',
      description: roadmap?.description || '',
      journey_maps: roadmap?.journey_maps || {},
      timeline: roadmap?.timeline || {},
      milestones: roadmap?.milestones || [],
      phases: roadmap?.phases || [],
      service_flowchart: roadmap?.service_flowchart || {},
      status: 'completed',
    };
    return this.post('/service-roadmap/save/', payload);
  }

  async brainstormWithSolar(payload: { idea: string; focus_area?: string }) {
    try {
      // Prefer team-scoped brainstorming if team exists
      let teamId: number | null = null;
      try {
        const cached = localStorage.getItem('xfactoryTeamId');
        teamId = cached ? Number(cached) : null;
        if (!teamId) {
          const status = await this.get('/team-formation/status/');
          teamId = (status as any)?.data?.current_team?.id || null;
          if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
        }
      } catch {}
      if (teamId) {
        await this.post(`/ideation/teams/${teamId}/brainstorming-assistant/`, {});
        const res = await this.get(`/ideation/teams/${teamId}/brainstorming-assistant/`);
        return res;
      }
      // Fallback to idea-scoped
      let ideaId: number | null = null;
      try {
        const id = localStorage.getItem('xfactoryIdeaId');
        ideaId = id ? Number(id) : null;
      } catch {}
      if (ideaId) {
        await this.post(`/ideation/brainstorming-assistant/${ideaId}/generate/`, {});
        const res = await this.get(`/ideation/brainstorming-assistant/${ideaId}/`);
        return res;
      }
      return { error: 'No team or idea id to run brainstorming', status: 400 };
    } catch (e: any) {
      return { error: e?.message || 'Brainstorming failed', status: 500 };
    }
  }

  // New: AI-led brainstorming with problem/solution/target
  async brainstormingAI(payload: { problem: string; solution: string; target_market: string }) {
    try {
      // Prefer team-scoped brainstorming if team exists
      let teamId: number | null = null;
      try {
        const cached = localStorage.getItem('xfactoryTeamId');
        teamId = cached ? Number(cached) : null;
        if (!teamId) {
          const status = await this.get('/team-formation/status/');
          teamId = (status as any)?.data?.current_team?.id || null;
          if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
        }
      } catch {}
      if (teamId) {
        await this.post(`/ideation/teams/${teamId}/brainstorming-assistant/`, {});
        const res = await this.get(`/ideation/teams/${teamId}/brainstorming-assistant/`);
        return res;
      }
      // Fallback to idea-scoped
      let ideaId: number | null = null;
      try {
        const id = localStorage.getItem('xfactoryIdeaId');
        ideaId = id ? Number(id) : null;
      } catch {}
      if (ideaId) {
        await this.post(`/ideation/brainstorming-assistant/${ideaId}/generate/`, {});
        const res = await this.get(`/ideation/brainstorming-assistant/${ideaId}/`);
        return res;
      }
      return { error: 'No team or idea id to run brainstorming', status: 400 };
    } catch (e: any) {
      return { error: e?.message || 'Brainstorming failed', status: 500 };
    }
  }

  async generateOpportunityAnalysis(payload: { idea_description: string; target_audience?: string; market_context?: string }) {
    return this.post('/generate-opportunity-statement/', payload);
  }

  async classifyBusinessType(payload: { problem: string; solution: string; value_proposition: string; idea_id?: number }) {
    return this.post('/classify-business-type/', payload);
  }

  async findTeamByCode(code: string) {
    const q = encodeURIComponent(code);
    return this.get(`/team-formation/teams/lookup/?code=${q}`);
  }

  // New: Idea generation endpoints
  async generateTeamIdea(teamMembers: Array<{ name: string; abilities: string[]; interests: string[] }>) {
    return this.post('/generate-idea/', { team_members: teamMembers, bootstrap_only: true });
  }

  // Team-scoped idea generation (preferred)
  async createTeamProblemSolution(teamId: number, payload?: { abilities?: string[]; interests?: string[]; business_type?: string }) {
    return this.post(`/ideation/teams/${teamId}/problem-solution/`, payload || {});
  }
  async upsertTeamProblemSolution(teamId: number, payload?: { abilities?: string[]; interests?: string[] }) {
    // Use PUT to (re)generate when team already has a PST; backend handles create/update
    return this.put(`/ideation/teams/${teamId}/problem-solution/`, payload || {});
  }

  async getTeamProblemSolution(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/problem-solution/`);
  }

  async generateTeamBrainstorming(teamId: number) {
    return this.post(`/ideation/teams/${teamId}/brainstorming-assistant/`, {});
  }

  async getTeamBrainstorming(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/brainstorming-assistant/`);
  }

  async generateTeamConceptCard(teamId: number) {
    return this.post(`/ideation/teams/${teamId}/concept-card/`, {});
  }

  async getTeamConceptCard(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/concept-card/`);
  }

  async getTeamConceptCardVersions(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/concept-card/versions/`);
  }

  // Elevator Pitch (team-scoped deliverable)
  async getElevatorPitchSubmission(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/elevator-pitch-submission/`);
  }
  async submitElevatorPitch(teamId: number, googleDriveLink: string) {
    return this.post(`/ideation/teams/${teamId}/elevator-pitch-submission/`, { google_drive_link: googleDriveLink });
  }
  async updateElevatorPitch(teamId: number, payload: { google_drive_link?: string; submitted?: boolean }) {
    return this.put(`/ideation/teams/${teamId}/elevator-pitch-submission/`, payload);
  }

  async generateAIIdea(ideaId: number, businessType?: string) {
    return this.post(`/ideation/ai-generated-idea/${ideaId}/generate/`, businessType ? { business_type: businessType } : {});
  }

  async getAIIdea(ideaId: number) {
    return this.get(`/ideation/ai-generated-idea/${ideaId}/`);
  }

  async getIdea(ideaId: number) {
    return this.get(`/ideation/idea/${ideaId}/`);
  }

  // Brainstorming assistant (saved, legacy by idea id)
  async getBrainstormingAssistant(ideaId: number) { return this.get(`/ideation/brainstorming-assistant/${ideaId}/`); }
  async generateBrainstormingAssistant(ideaId: number) { return this.post(`/ideation/brainstorming-assistant/${ideaId}/generate/`, {}); }

  // Idea card (legacy by idea id)
  async generateIdeaCard(ideaId: number) { return this.post(`/ideation/idea-card/${ideaId}/generate/`, {}); }
  async getIdeaCard(ideaId: number) { return this.get(`/ideation/idea-card/${ideaId}/`); }

  // Physical mockups (products)
  async getPhysicalMockups(ideaId: number) { return this.get(`/physical-mockup/${ideaId}/`); }
  async getPhysicalMockupsTeam(teamId: number) { return this.get(`/ideation/teams/${teamId}/physical-mockup/`); }
  async generatePhysicalAgent(ideaId: number) { return this.post(`/physical-mockup/generate-agent/`, { idea_id: ideaId }); }
  async generateDalleMockup(ideaId: number, payload: { image_prompt: string; title?: string; description?: string; size?: string }) {
    return this.post(`/physical-mockup/generate-dalle/`, { idea_id: ideaId, ...payload });
  }
  async generatePhysicalPrompts(ideaId: number) {
    return this.post(`/physical-mockup/generate-prompts/`, { idea_id: ideaId });
  }
  // Team-scoped physical mockups
  async generatePhysicalPromptsTeam(teamId: number) {
    return this.post(`/ideation/teams/${teamId}/physical-mockup/generate-prompts/`, {});
  }
  async generateDalleMockupTeam(teamId: number, payload: { image_prompt: string; title?: string; description?: string; size?: string }) {
    return this.post(`/ideation/teams/${teamId}/physical-mockup/generate-image/`, payload);
  }
  async savePhysicalMockupTeam(teamId: number, payload: { image_url: string; image_prompt?: string; title?: string; description?: string }) {
    return this.post(`/ideation/teams/${teamId}/physical-mockup/save/`, payload);
  }

  // Service mockups (use roadmap for now)
  async generateServiceRoadmapTeam(teamId: number) { return this.post(`/ideation/teams/${teamId}/service-roadmap/generate/`, {}); }
  async getServiceRoadmapTeam(teamId: number) { return this.get(`/ideation/teams/${teamId}/service-roadmap/`); }
  
  // Service Flowchart Builder endpoints
  async getServiceFlowchart(ideaId: number) {
    return this.get(`/ideation/service-flowchart/${ideaId}/`);
  }
  async getServiceFlowchartTeam(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/service-flowchart/`);
  }
  async saveServiceFlowchart(ideaId: number, flowchartData: any) {
    return this.post(`/ideation/service-flowchart/${ideaId}/save/`, flowchartData);
  }
  async saveServiceFlowchartTeam(teamId: number, flowchartData: any) {
    return this.post(`/ideation/teams/${teamId}/service-flowchart/`, flowchartData);
  }
  async getFlowchartPersonas(ideaId: number) {
    return this.get(`/ideation/service-flowchart/${ideaId}/personas/`);
  }
  async getFlowchartPersonasTeam(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/service-flowchart/personas/`);
  }
  async generateProcesses(data: { idea_id: number; journey_type: 'entire' | 'specific'; selected_personas?: string[]; specific_description?: string }) {
    return this.post(`/ideation/service-flowchart/generate-processes/`, data);
  }
  async enhanceStakeholders(data: { idea_id: number; primary_customers: any; frontstage_data: any; backstage_data: any; external_partners: any }) {
    return this.post(`/ideation/service-flowchart/enhance-stakeholders/`, data);
  }
  async enhanceTimeline(data: { idea_id: number; phase_mappings: any; phase_durations: any; timeline_type: 'relative' | 'absolute'; program_duration_weeks?: number }) {
    return this.post(`/ideation/service-flowchart/enhance-timeline/`, data);
  }
  async generateFlowchart(data: { idea_id: number; section1_data: any; section2_data: any; section3_data: any }) {
    return this.post(`/ideation/service-flowchart/generate/`, data);
  }
  async validateFlowchart(data: { idea_id: number; flowchart_data: any }) {
    return this.post(`/ideation/service-flowchart/validate/`, data);
  }

  async generateFlowchartField(data: { idea_id: number; field_type: string; context?: any }) {
    return this.post(`/ideation/service-flowchart/generate-field/`, data);
  }
  
  async saveServiceRoadmapTeam(teamId: number, roadmap: any) {
    const payload: any = {
      title: roadmap?.title || 'Service Roadmap',
      description: roadmap?.description || '',
      journey_maps: roadmap?.journey_maps || {},
      timeline: roadmap?.timeline || {},
      milestones: roadmap?.milestones || [],
      phases: roadmap?.phases || [],
      service_flowchart: roadmap?.service_flowchart || {},
      status: 'completed',
    };
    return this.post(`/ideation/teams/${teamId}/service-roadmap/save/`, payload);
  }

  // Concept note (text-only)
  async getConceptNote(ideaId: number) { return this.get(`/concept-note/${ideaId}/`); }
  async getConceptNoteTeam(teamId: number) { return this.get(`/concept-note/teams/${teamId}/`); }

  // Validation: Deep Research (secondary)
  async generateDeepResearchTeam(teamId: number) { return this.post(`/validation/teams/${teamId}/deep-research/`, {}); }
  async getDeepResearchStatusTeam(teamId: number) { return this.get(`/validation/teams/${teamId}/deep-research/status/`); }
  async getDeepResearchReportTeam(teamId: number) { return this.get(`/validation/teams/${teamId}/deep-research/`); }

  // Validation: User Personas & Interview Kit (team-scoped)
  async generateUserPersonasTeam(teamId: number) { return this.post(`/validation/teams/${teamId}/user-personas/generate/`, {}); }
  async getUserPersonasTeam(teamId: number) { return this.get(`/validation/teams/${teamId}/user-personas/`); }

  // Validation: Interview Analysis
  async analyzeInterview(ideaId: number, payload: { interview_transcript: string; interview_source?: string; interview_date?: string; participant_count?: number; interview_duration?: string; interviewer_name?: string; }) {
    return this.post(`/validation/interview-analysis/${ideaId}/analyze/`, payload);
  }
  async getInterviewAnalysis(ideaId: number) { return this.get(`/validation/interview-analysis/${ideaId}/`); }
  async getInterviewAnalysisStatus(ideaId: number) { return this.get(`/validation/interview-analysis/${ideaId}/status/`); }

  // Validation: Qualitative Insights (per question)
  async saveQualInsights(ideaId: number, insights: Array<{ section: string; question: string; insight: string }>) {
    return this.post(`/validation/qual-insights/${ideaId}/`, insights);
  }
  async saveQualInsightsTeam(teamId: number, insights: Array<{ section: string; question: string; insight: string }>) {
    return this.post(`/validation/teams/${teamId}/qual-insights/`, insights);
  }
  async saveQualInsightsOnlyTeam(teamId: number, insights: Array<{ section: string; question: string; insight: string }>, interviewId?: number) {
    const qp = interviewId ? `?interview_id=${interviewId}` : '';
    return this.post(`/validation/teams/${teamId}/qual-insights/save-only/${qp}`, insights);
  }
  async getQualInsightsTeam(teamId: number, interviewId?: number) {
    const qp = interviewId ? `?interview_id=${interviewId}` : '';
    return this.get(`/validation/teams/${teamId}/qual-insights/${qp}`);
  }
  async getFocusGroupInsightsTeam(teamId: number) {
    return this.get(`/validation/teams/${teamId}/focus-group-insights/`);
  }
  async saveFocusGroupInsightsTeam(teamId: number, insights: Array<{ section: string; question: string; insight: string }>) {
    // Mirror interview save shape: send array directly
    return this.post(`/validation/teams/${teamId}/focus-group-insights/`, insights);
  }
  async saveFocusGroupInsightsOnlyTeam(teamId: number, insights: Array<{ section: string; question: string; insight: string }>) {
    // Mirror interview save-only shape: send array directly
    return this.post(`/validation/teams/${teamId}/focus-group-insights/save-only/`, insights);
  }
  async getTeamQuantPrompt(teamId: number) {
    return this.get(`/validation/teams/${teamId}/quant-prompt/`);
  }

  // Team-scoped Quant Prompt
  async setTeamQuantPrompt(teamId: number, prompt?: string) {
    return this.post(`/validation/teams/${teamId}/quant-prompt/`, prompt ? { prompt } : {});
  }

  // Validation: AI survey generator + DIY link submission
  async getAISurvey(ideaId: number) { return this.get(`/validation/ai-survey/${ideaId}/`); }
  async getAISurveyTeam(teamId: number) { return this.get(`/validation/teams/${teamId}/ai-survey/`); }
  async generateAISurvey(ideaId: number) { return this.post(`/validation/generate-ai-survey/${ideaId}/`, {}); }
  async generateAISurveyTeam(teamId: number) { return this.post(`/validation/teams/${teamId}/generate-ai-survey/`, {}); }
  async saveSurveyInsights(ideaId: number, questions: any[]) { return this.post(`/validation/save-survey-insights/${ideaId}/`, { questions }); }
  async saveSurveyInsightsTeam(teamId: number, questions: any[]) { return this.post(`/validation/teams/${teamId}/save-survey-insights/`, { questions }); }
  async getQuantitativeScore(ideaId: number) { return this.get(`/validation/quantitative-score/${ideaId}/`); }
  async getQuantitativeScoreTeam(teamId: number) { return this.get(`/validation/teams/${teamId}/quantitative-score/`); }
  async computeQuantitativeScore(ideaId: number, surveyInsights: any, responseVolume: number) { return this.post(`/validation/compute-quantitative-score/${ideaId}/`, { survey_insights: surveyInsights, response_volume: responseVolume }); }
  async computeQuantitativeScoreTeam(teamId: number, surveyInsights: any, responseVolume: number) { return this.post(`/validation/teams/${teamId}/compute-quantitative-score/`, { survey_insights: surveyInsights, response_volume: responseVolume }); }
  async submitDIYSurveyLink(ideaId: number) { return this.post(`/validation/diy-survey-upload/${ideaId}/`, {}); }
  async obtainQuantResults(ideaId: number) { return this.post(`/validation/obtain-results/${ideaId}/`, {}); }
  async downloadQuantResults(ideaId: number, asBase64 = false) { return this.get(`/validation/download-results/${ideaId}/?as_base64=${asBase64 ? '1' : '0'}`); }

  // Validation deliverable: qualitative evidence folder link (team-scoped)
  async getValidationSubmission(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/validation-submission/`);
  }
  async submitValidation(teamId: number, googleDriveLink: string) {
    return this.post(`/ideation/teams/${teamId}/validation-submission/`, { google_drive_link: googleDriveLink });
  }
  async updateValidation(teamId: number, payload: { google_drive_link?: string; submitted?: boolean }) {
    return this.put(`/ideation/teams/${teamId}/validation-submission/`, payload);
  }

  // Validation evidence (team-scoped): qual folder and quant video links
  async getValidationEvidence(teamId: number) {
    return this.get(`/validation/teams/${teamId}/evidence/`);
  }
  async submitValidationEvidence(teamId: number, type: 'qual_folder'|'qual_interview'|'qual_focus_group'|'qual_transcript'|'quant_video'|'quant_form'|'response_volume', link: string) {
    return this.post(`/validation/teams/${teamId}/evidence/`, { type, link });
  }

  // Admin: teams list and roadmap controls
  async getAdminTeams() { return this.get(`/ideation/admin/teams/`); }
  async getTeamRoadmap(teamId: number) { return this.get(`/ideation/teams/${teamId}/roadmap-completion/`); }
  async updateTeamRoadmap(teamId: number, payload: any) { return this.put(`/ideation/teams/${teamId}/roadmap-completion/`, payload); }

  // Team roadmap completion (validation)
  async markValidationCompleted(teamId: number, payload: Partial<{ secondary: boolean; qualitative: boolean; quantitative: boolean }>) {
    return this.put(`/ideation/teams/${teamId}/roadmap-completion/`, { validation: payload });
  }

  // Pitch Deck: Guidelines & Coaching (team-scoped)
  async generatePitchGuidelinesTeam(teamId: number) { return this.post(`/pitch-deck/teams/${teamId}/guidelines/generate/`, {}); }
  async getPitchGuidelinesTeam(teamId: number) { return this.get(`/pitch-deck/teams/${teamId}/guidelines/`); }
  async generatePitchCoachingTeam(teamId: number) { return this.post(`/pitch-deck/teams/${teamId}/coaching/generate/`, {}); }
  async getPitchCoachingTeam(teamId: number) { return this.get(`/pitch-deck/teams/${teamId}/coaching/`); }
  
  // Pitch Deck: Submission (team-scoped)
  async submitPitchDeckTeam(teamId: number, payload: { pdf_link: string; video_link: string }) { 
    return this.post(`/pitch-deck/teams/${teamId}/submission/`, payload); 
  }
  async getPitchDeckSubmissionTeam(teamId: number) { 
    return this.get(`/pitch-deck/teams/${teamId}/submission/`); 
  }

  // Pitch Deck: Gamma queue (team-scoped, production)
  async enqueueGammaTeam(teamId: number, forceRegenerate = false) {
    return this.post(`/pitch-deck/teams/${teamId}/gamma/enqueue/`, { force_regenerate: forceRegenerate });
  }
  async getLatestGammaTeam(teamId: number) {
    return this.get(`/pitch-deck/teams/${teamId}/gamma/latest/`);
  }

  // Marketing (team-scoped)
  async generateMarketingTeam(teamId: number) {
    return this.post(`/marketing/teams/${teamId}/generate/`, {});
  }

  async getMarketingTeam(teamId: number) {
    return this.get(`/marketing/teams/${teamId}/`);
  }

  async generateMarketingCalendarTeam(teamId: number, payload: Record<string, any>) {
    return this.post(`/marketing/teams/${teamId}/campaign-calendar/generate/`, payload);
  }

  async getMarketingCalendarTeam(teamId: number) {
    return this.get(`/marketing/teams/${teamId}/campaign-calendar/`);
  }
  async generateBrandingTeam(teamId: number) {
    return this.post(`/marketing/teams/${teamId}/branding/generate/`, {});
  }

  async generateTargetAudienceTeam(teamId: number) {
    return this.post(`/marketing/teams/${teamId}/target-audience/generate/`, {});
  }

  async instagramScheduleTeam(teamId: number, days = 30) {
    return this.post(`/marketing/teams/${teamId}/instagram/schedule/`, { days });
  }

  async getMarketingCampaignImagesTeam(teamId: number, entries?: string[]) {
    const query = entries && entries.length ? `?${entries.map((key) => `entry=${encodeURIComponent(key)}`).join('&')}` : '';
    return this.get(`/marketing/teams/${teamId}/campaign-images/${query}`);
  }

  async generateMarketingCampaignImagesTeam(teamId: number, payload: { entries: string[]; variantCount?: number; size?: string; abTesting?: boolean; imagePrompt?: string; campaignEntry?: any; usePipeline?: boolean }) {
    return this.post(`/marketing/teams/${teamId}/campaign-images/generate/`, payload);
  }

  async getMarketingCampaignImagesListTeam(teamId: number) {
    return this.get(`/marketing/teams/${teamId}/campaign-images/list/`);
  }

  async generateMarketingPreferencesTeam(teamId: number) {
    return this.post(`/marketing/teams/${teamId}/preferences/generate/`, {});
  }

  // Finance (team-scoped)
  async financeGenerateInsightsTeam(teamId: number) {
    return this.post(`/finance/teams/${teamId}/insights/`, {});
  }
  async financeGetInsightsTeam(teamId: number) {
    return this.get(`/finance/teams/${teamId}/insights/`);
  }
  async financeGetPlanTeam(teamId: number) {
    return this.get(`/finance/teams/${teamId}/plan/`);
  }
  async financeCreatePlanTeam(teamId: number) {
    return this.post(`/finance/teams/${teamId}/plan/`, {});
  }
  async financeRiskAnalysisTeam(teamId: number) {
    return this.post(`/finance/teams/${teamId}/risk-analysis/`, {});
  }
  async financeFundingStrategyTeam(teamId: number) {
    return this.get(`/finance/teams/${teamId}/funding-strategy/`);
  }

  // Legal (team-scoped)
  async legalGetStrategyTeam(teamId: number) {
    return this.get(`/legal/teams/${teamId}/strategy/`);
  }
  async legalGenerateInsightsTeam(teamId: number, payload: any = {}) {
    return this.post(`/legal/teams/${teamId}/insights/`, payload);
  }
  async legalSaveImplementationGuideTeam(teamId: number, payload: any) {
    return this.post(`/legal/teams/${teamId}/implementation/save/`, payload);
  }
  async legalGenerateFeasibilityTeam(teamId: number) {
    return this.post(`/legal/teams/${teamId}/feasibility/generate/`, {});
  }
  async legalGetFeasibilityStatusTeam(teamId: number) {
    return this.get(`/legal/teams/${teamId}/feasibility/status/`);
  }
  async legalGetFeasibilityReportTeam(teamId: number) {
    return this.get(`/legal/teams/${teamId}/feasibility/report/`);
  }
  async legalUpdateTaskStatusTeam(teamId: number, taskId: string, status: string) {
    return this.put(`/legal/teams/${teamId}/tasks/${taskId}/status/`, {
      status: status
    });
  }
  async legalTrademarkCheckTeam(teamId: number, businessName: string) {
    return this.post(`/legal/teams/${teamId}/trademark/check/`, { business_name: businessName });
  }

  // Mentorship
  async mentorRegister(payload: any) {
    // Requires admin licensing (AllowedUser with user_type='mentor' and status='active')
    return this.post('/mentorship/register/', payload);
  }
  async getMentorProfile(email?: string) {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.get(`/mentorship/profile/${q}`);
  }
  async uploadMentorPhoto(file: File) {
    const url = `${this.baseUrl}/mentorship/upload-photo/`;
    const form = new FormData();
    form.append('photo', file);
    const token = localStorage.getItem('authToken');
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Token ${token}` } as any : undefined,
      body: form
    });
    const data = await res.json();
    return { data, status: res.status };
  }

  // Mentor: get my teams
  async getMentorTeams(email: string) {
    return this.get(`/mentorship/my-teams/?email=${encodeURIComponent(email)}`);
  }

  // Mentor: get detailed team data
  async getMentorTeamDetails(teamId: number, email: string) {
    return this.get(`/mentorship/teams/${teamId}/details/?email=${encodeURIComponent(email)}`);
  }

  async getMentorRequests(email: string) {
    return this.get(`/mentorship/requests/?email=${encodeURIComponent(email)}`);
  }

  async getTeamMentorRequests(teamId: number) {
    return this.get(`/mentorship/teams/${teamId}/requests/`);
  }

  async respondMentorRequest(requestId: number, action: 'approve' | 'decline' | 'cancel', message?: string) {
    const payload: any = { action };
    if (message) payload.message = message;
    return this.post(`/mentorship/requests/${requestId}/respond/`, payload);
  }

  // Software mockups (team-scoped only)
  async createSoftwareMockupIdea(ideaId: number, payload: { title?: string; description?: string; v0_prompt?: string; v0_project_id?: string; v0_chat_id?: string; v0_latest_version_id?: string; v0_demo_url?: string; status?: string }) {
    // Prefer team-scoped persistence; fallback to idea-scoped (backup behavior)
    try {
      const status = await this.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
      if (teamId) {
        return this.post(`/ideation/teams/${teamId}/software-mockup/save/`, payload);
      }
    } catch {}
    // Backup flow: idea-scoped endpoint for first version persistence
    return this.post(`/mockups/software/${ideaId}/`, payload);
  }
  async getSoftwareMockupIdea(ideaId: number) {
    // Prefer team-scoped when available; fallback to idea-scoped (backup)
    try {
      const status = await this.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
      if (teamId) {
        return this.get(`/ideation/teams/${teamId}/software-mockup/`);
      }
    } catch {}
    return this.get(`/mockups/software/${ideaId}/`);
  }
  async createSoftwareMockupTeam(teamId: number, payload: { title?: string; description?: string; v0_prompt?: string; v0_project_id?: string; v0_chat_id?: string; v0_latest_version_id?: string; v0_demo_url?: string; status?: string }) {
    // Use ideation app routes (loaded for sure) to resolve team -> latest idea
    return this.post(`/ideation/teams/${teamId}/software-mockup/save/`, payload);
  }
  async getSoftwareMockupTeam(teamId: number) {
    return this.get(`/ideation/teams/${teamId}/software-mockup/`);
  }

  // MVP: Software (idea- and team-scoped)
  async generateSoftwareMvpPrompt(ideaId: number) {
    return this.post(`/mvp/software/generate-prompt/`, { idea_id: ideaId });
  }
  async createSoftwareMvpIdea(ideaId: number, payload: { title?: string; description?: string; v0_prompt?: string; v0_project_id?: string; v0_chat_id?: string; v0_latest_version_id?: string; v0_demo_url?: string; status?: string }) {
    return this.post(`/mvp/software/${ideaId}/`, payload);
  }
  async getSoftwareMvpIdea(ideaId: number) {
    return this.get(`/mvp/software/${ideaId}/`);
  }
  async createSoftwareMvpTeam(teamId: number, payload: { title?: string; description?: string; v0_prompt?: string; v0_project_id?: string; v0_chat_id?: string; v0_latest_version_id?: string; v0_demo_url?: string; status?: string }) {
    return this.post(`/mvp/software/team/${teamId}/`, payload);
  }
  async getSoftwareMvpTeam(teamId: number) {
    return this.get(`/mvp/software/team/${teamId}/`);
  }

  // Secondary validation scoring (team-scoped)
  async computeSecondaryScoreTeam(teamId: number) {
    return this.post(`/validation/teams/${teamId}/secondary-score/`, {});
  }
  async getSecondaryScoreTeam(teamId: number) {
    return this.get(`/validation/teams/${teamId}/secondary-score/`);
  }

  // MVP: Tasks and Bottlenecks
  async getMvpTasksIdea(ideaId: number) {
    return this.get(`/mvp/tasks/${ideaId}/`);
  }
  async generateMvpGoals(ideaId: number, prompt?: string, mvpType?: 'software' | 'non_software') {
    const payload: any = { idea_id: ideaId };
    if (prompt) payload.prompt = prompt;
    if (mvpType) payload.mvp_type = mvpType;
    return this.post(`/mvp/tasks/goals/generate/`, payload);
  }
  async generateMvpTasks(ideaId: number) {
    return this.post(`/mvp/tasks/generate/`, { idea_id: ideaId });
  }

  // Unified MVP endpoints
  async generateUnifiedMvp(teamId: number) {
    return this.post(`/mvp/unified/generate/`, { team_id: teamId });
  }
  async getUnifiedMvp(teamId: number) {
    return this.get(`/mvp/unified/team/${teamId}/`);
  }
  async analyzeMvpBottlenecks(taskManagementId: number) {
    return this.post(`/mvp/tasks/analyze-bottlenecks/`, { task_management_id: taskManagementId });
  }
  async getMvpTaskAnalytics(taskManagementId: number) {
    return this.get(`/mvp/tasks/analytics/${taskManagementId}/`);
  }

  // MVP Submission endpoints
  async submitMvp(teamId: number, videoLink: string, videoDescription: string, submissionNotes: string) {
    return this.post(`/mvp/submission/team/${teamId}/`, {
      video_link: videoLink,
      video_description: videoDescription,
      submission_notes: submissionNotes
    });
  }
  async getMvpSubmission(teamId: number) {
    return this.get(`/mvp/submission/team/${teamId}/get/`);
  }
  async updateTaskStatus(teamId: number, taskId: number, status: string) {
    return this.put(`/mvp/tasks/team/${teamId}/update-status/`, {
      task_id: taskId,
      status: status
    });
  }
  // Team-scoped proxies
  async getMvpTasksTeam(teamId: number) {
    return this.get(`/mvp/tasks/team/${teamId}/`);
  }
  async generateMvpGoalsTeam(teamId: number, prompt?: string, mvpType?: 'software' | 'non_software') {
    const payload: any = {};
    if (prompt) payload.prompt = prompt;
    if (mvpType) payload.mvp_type = mvpType;
    return this.post(`/mvp/tasks/team/${teamId}/goals/generate/`, payload);
  }
  async generateMvpTasksTeam(teamId: number) {
    return this.post(`/mvp/tasks/team/${teamId}/generate/`, {});
  }

  // MVP: Product (physical) generation
  async generateProductMvp(ideaId: number, size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024', skipImages = false) {
    return this.post(`/mvp/product/generate/`, { idea_id: ideaId, size, skip_images: skipImages });
  }
  async getTeamProductMvp(teamId: number) {
    return this.get(`/mvp/product/team/${teamId}/`);
  }
  // Service MVP
  async getTeamServiceMvp(teamId: number) {
    return this.get(`/mvp/service/team/${teamId}/`);
  }
  async generateServiceMvp(ideaId: number, size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024', skipImages = false) {
    return this.post(`/mvp/service/generate/`, { idea_id: ideaId, size, skip_images: skipImages });
  }

  // MVP tasks: team-scoped status update
  async updateTaskStatusTeam(teamId: number, taskId: number, status: 'pending' | 'in_progress' | 'completed' | string) {
    return this.post(`/mvp/tasks/team/${teamId}/update-status/`, { task_id: taskId, status });
  }

  // Finance Setup: Team-scoped endpoints
  async generateFinanceSetup(teamId: number, cityOfOperation: string, ideaId?: number, businessModel?: string) {
    const payload: any = { city_of_operation: cityOfOperation };
    if (ideaId) payload.idea_id = ideaId;
    if (businessModel) payload.business_model = businessModel;
    return this.post(`/finance/teams/${teamId}/finance-setups/generate/`, payload);
  }
  
  async getTeamFinanceSetup(teamId: number) {
    return this.get(`/finance/teams/${teamId}/finance-setups/latest/`);
  }
  
  async createFinanceSetup(teamId: number, data: any) {
    return this.post(`/finance/teams/${teamId}/finance-setups/`, data);
  }
  
  async updateFinanceSetup(teamId: number, setupId: number, data: any) {
    return this.put(`/finance/teams/${teamId}/finance-setups/${setupId}/`, data);
  }
  
  async getTeamFinanceSetupHistory(teamId: number) {
    return this.get(`/finance/teams/${teamId}/finance-setups/`);
  }

  // Generic GET request
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // Generic POST request
  async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Generic PUT request
  async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Generic DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getTeamLatestIdeaId(teamId: number) { return this.get(`/ideation/teams/${teamId}/latest-idea/`); }
  // Ivie assistant chat
  async assistantChatTeam(teamId: number, payload: { message: string; history?: Array<{ role: 'user'|'assistant'; content: string }>; station?: number; user_data?: any; }) {
    return this.post(`/ideation/teams/${teamId}/assistant/chat/`, payload);
  }
  // Interviews
  async getTeamInterviews(teamId: number) {
    return this.get(`/validation/teams/${teamId}/interviews/`);
  }
  async createTeamInterview(teamId: number, title?: string, interviewee?: { name?: string; persona_target?: string }) {
    const payload: any = { title: title || 'Interview Session' };
    if (interviewee && (interviewee.name || interviewee.persona_target)) {
      payload.interviewee = interviewee;
    }
    return this.post(`/validation/teams/${teamId}/interviews/`, payload);
  }
  // Qualitative score (team-scoped)
  async getQualitativeScoreTeam(teamId: number, interviewId?: number) {
    const qp = interviewId ? `?interview_id=${interviewId}` : '';
    return this.get(`/validation/teams/${teamId}/qualitative-score/${qp}`);
  }

  // Team Member Addition Requests
  async createTeamMemberAdditionRequest(teamId: number, payload: { invited_user_email: string; message?: string }) {
    return this.post(`/team-formation/teams/${teamId}/addition-requests/`, payload);
  }

  async getTeamMemberAdditionRequests(teamId: number) {
    return this.get(`/team-formation/teams/${teamId}/addition-requests/`);
  }

  async getUserAdditionRequests() {
    return this.get('/team-formation/addition-requests/');
  }

  async respondToAdditionRequest(requestId: number, payload: { action: 'accept' | 'reject'; response_message?: string }) {
    return this.post(`/team-formation/addition-requests/${requestId}/respond/`, payload);
  }

  async cancelAdditionRequest(requestId: number) {
    return this.post(`/team-formation/addition-requests/${requestId}/cancel/`, {});
  }

  async getEligibleUsersForInvitation(teamId?: number) {
    const endpoint = teamId 
      ? `/team-formation/eligible-users/?team_id=${teamId}`
      : '/team-formation/eligible-users/';
    return this.get(endpoint);
  }

  async debugAllowedUsers() {
    return this.get('/team-formation/debug-allowed-users/');
  }

  async debugAllUsers() {
    return this.get('/team-formation/debug-all-users/');
  }

  // Launch Prep endpoints
  async generatePressRelease(teamId: number, variant: 'product_launch' | 'feature_announcement' = 'product_launch') {
    return this.post(`/launch-prep/teams/${teamId}/press-release/generate/`, { variant });
  }

  async getPressReleases(teamId: number) {
    return this.get(`/launch-prep/teams/${teamId}/press-releases/`);
  }

  // Admin: Mentor and Investor Assignment
  async getTeamAssignments(teamId: number) {
    return this.get(`/admin/teams/${teamId}/assignments/`);
  }

  async assignMentorToTeam(teamId: number, mentorId: number) {
    return this.post(`/admin/teams/${teamId}/assign-mentor/`, { mentor_id: mentorId });
  }

  async assignInvestorToTeam(teamId: number, investorId: number) {
    return this.post(`/admin/teams/${teamId}/assign-investor/`, { investor_id: investorId });
  }

  async removeMentorFromTeam(teamId: number, mentorId: number) {
    return this.delete(`/admin/teams/${teamId}/remove-mentor/${mentorId}/`);
  }

  async removeInvestorFromTeam(teamId: number, investorId: number) {
    return this.delete(`/admin/teams/${teamId}/remove-investor/${investorId}/`);
  }

  async getAvailableMentors() {
    return this.get('/admin/mentors/');
  }

  async getAvailableInvestors() {
    return this.get('/admin/investors/');
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// Helper: Build team PDF serve URL (iframe-friendly)
export const getGammaPdfUrlTeam = (teamId: number): string => `${API_ORIGIN}/api/pitch-deck/teams/${teamId}/gamma/pdf/`;







