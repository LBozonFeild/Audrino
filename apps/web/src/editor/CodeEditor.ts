/** Swappable code editor contract (PLAN patch: MonacoAdapter is one implementation). */
export interface CodeMarker {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
}

export interface CodeEditorProps {
  value: string;
  language?: string;
  markers: CodeMarker[];
  onChange: (value: string) => void;
}
