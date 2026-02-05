
export interface VideoAnalysis {
  title: string;
  duration: string;
  theme: string;
  contentSummary: string;
  visualStyle: string;
  animations: string[];
  keyTakeaways: string[];
  targetAudience: string;
  sceneBreakdown: { time: string; seconds: number; description: string; tag?: string }[];
  technicalDetails: {
    frameRate?: string;
    resolution?: string;
    editingStyle?: string;
    aiModelUsed?: string;
    visualComplexity?: number; // 0-100
    informationDensity?: number; // 0-100
  };
  sources: { title: string; uri: string }[];
  sentiment?: string;
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  data: VideoAnalysis | null;
  thinking: string;
}
