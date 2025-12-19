/**
 * Domain entity representing sidebar configuration and state
 */
export interface SidebarConfig {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;

  /** Whether the current viewport is mobile */
  isMobile: boolean;
}

export interface SidebarConstraints {
  /** Width when collapsed in pixels */
  collapsedWidth: number;

  /** Default width in pixels */
  defaultWidth: number;

  /** Mobile breakpoint in pixels */
  mobileBreakpoint: number;
}

export interface SidebarState {
  /** Current configuration */
  config: SidebarConfig;

  /** Constraints for the sidebar */
  constraints: SidebarConstraints;
}