export interface Message {
  id: string;
  sender: "user" | "other";
  senderName: string;
  content: string;
  timestamp: number;
}

export interface AnalysisResult {
  effort_balance: {
    user_percentage: number;
    other_percentage: number;
  };
  power_dynamic: {
    user: number;
    other: number;
  };
  signals_detected: string[];
  ghosting_probability: number;
  manipulation_signals: "none" | "mild" | "moderate" | "high";
  recommendation: string;
  behavioral_patterns: string[];
  attachment_style: string;
}

export interface RoomState {
  roomId: string;
  messages: Message[];
  analysis: AnalysisResult | null;
  participants: string[];
  isAnalyzing: boolean;
}

export interface SocketMessage {
  type: "message" | "analysis" | "user_joined" | "user_left";
  payload: Message | AnalysisResult | { name: string };
}
