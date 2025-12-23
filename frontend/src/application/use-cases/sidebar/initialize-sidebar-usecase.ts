import { SidebarState, SidebarConstraints } from '@/domain/entities/sidebar-entity';

export interface InitializeSidebarUseCase {
  execute(): Promise<void>;
  updateMobileState(isMobile: boolean): Promise<void>;
}

export class InitializeSidebarUseCaseImpl implements InitializeSidebarUseCase {
  constructor(
    private readonly constraints: SidebarConstraints,
    private readonly getSidebarState: () => SidebarState,
    private readonly updateSidebarState: (updates: Partial<SidebarState>) => void
  ) {}

  async execute(): Promise<void> {
    // Initialize mobile state based on current viewport
    const isMobile = window.innerWidth < this.constraints.mobileBreakpoint;

    const currentState = this.getSidebarState();
    this.updateSidebarState({
      ...currentState,
      config: {
        ...currentState.config,
        isMobile,
      },
    });

    // Listen for window resize to update mobile state
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  async updateMobileState(isMobile: boolean): Promise<void> {
    const currentState = this.getSidebarState();
    this.updateSidebarState({
      ...currentState,
      config: {
        ...currentState.config,
        isMobile,
      },
    });
  }

  private handleResize(): void {
    const isMobile = window.innerWidth < this.constraints.mobileBreakpoint;
    this.updateMobileState(isMobile);
  }
}