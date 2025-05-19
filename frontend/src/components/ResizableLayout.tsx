import React from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number;
  defaultRightSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
}

export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftSize = 40,
  defaultRightSize = 60,
  minLeftSize = 30,
  minRightSize = 30,
}) => {
  return (
    <PanelGroup
      direction="horizontal"
      className="h-full w-full rounded-lg border overflow-hidden"
    >
      <Panel
        defaultSize={defaultLeftSize}
        minSize={minLeftSize}
        className="h-full"
      >
        {leftPanel}
      </Panel>

      <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 transition-colors" />

      <Panel
        defaultSize={defaultRightSize}
        minSize={minRightSize}
        className="h-full"
      >
        {rightPanel}
      </Panel>
    </PanelGroup>
  );
};
