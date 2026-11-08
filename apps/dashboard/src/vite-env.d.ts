/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react';
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type Icon = React.FC<IconProps>;
  export const Rocket: Icon;
  export const ShieldCheck: Icon;
  export const Lock: Icon;
  export const Unlock: Icon;
  export const ExternalLink: Icon;
  export const Layers: Icon;
  export const Palette: Icon;
  export const Terminal: Icon;
  export const UploadCloud: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const Globe: Icon;
  export const GitBranch: Icon;
  export const Archive: Icon;
  export const ArrowRight: Icon;
  export const ArrowLeft: Icon;
  export const Sparkles: Icon;
  export const FolderCheck: Icon;
  export const Image: Icon;
  export const RefreshCw: Icon;
  export const Smartphone: Icon;
  export const ShieldAlert: Icon;
  export const AlertOctagon: Icon;
  export const AlertTriangle: Icon;
  export const Info: Icon;
  export const Check: Icon;
  export const Wrench: Icon;
  export const Zap: Icon;
  export const Play: Icon;
  export const Download: Icon;
  export const Cpu: Icon;
  export const Clock: Icon;
  export const Send: Icon;
}
