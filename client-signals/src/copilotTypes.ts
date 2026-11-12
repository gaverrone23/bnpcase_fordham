export type AnswerKind =
  | "general_explanation"
  | "synthetic_evidence"
  | "external_information"
  | "analysis"
  | "hypothetical"
  | "workflow_rule";
export interface AnswerBlock {
  kind: AnswerKind;
  text: string;
  clientIds: string[];
  syntheticSourceIds: string[];
  webSourceUrls: string[];
}
export interface WebSource {
  url: string;
  title: string;
  publishedAt: string | null;
  retrievedAt: string;
}
export interface CopilotReply {
  blocks: AnswerBlock[];
  sources: WebSource[];
  workflow: {
    clientId: string;
    name: string;
    action: string;
    status: string;
  }[];
  model: string;
  responseId: string;
  generatedAt: string;
  searchedThisTurn: boolean;
}
