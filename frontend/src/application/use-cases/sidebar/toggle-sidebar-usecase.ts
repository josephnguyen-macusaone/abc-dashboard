import { SidebarState } from '@/domain/entities/sidebar-entity';

export interface ToggleSidebarUseCase {
  execute(): Promise<void>;
}

export class ToggleSidebarUseCaseImpl implements ToggleSidebarUseCase {
  constructor(
    private readonly getSidebarState: () => SidebarState,
    private readonly updateSidebarState: (updates: Partial<SidebarState>) => void
  ) {}

  async execute(): Promise<void> {
    const currentState = this.getSidebarState();
    this.updateSidebarState({
      ...currentState,
      config: {
        ...currentState.config,
        isCollapsed: !currentState.config.isCollapsed,
      },
    });
  }
}