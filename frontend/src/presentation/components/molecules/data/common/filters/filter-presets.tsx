'use client';

import * as React from 'react';
import { Bookmark, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/presentation/components/atoms/primitives/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/atoms/primitives/dialog';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Label } from '@/presentation/components/atoms/forms/label';
import { Textarea } from '@/presentation/components/atoms/forms/text-area';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { cn } from '@/shared/helpers';
import type { FilterPreset } from '@/types/data-display';

// ============================================================================
// Types
// ============================================================================

export interface FilterPresetsProps {
  /** Available presets (system + user-created) */
  presets: FilterPreset[];

  /** Current active filters */
  currentFilters: Record<string, any>;

  /** Callback when a preset is selected */
  onApplyPreset: (preset: FilterPreset) => void;

  /** Callback to save current filters as preset */
  onSavePreset?: (preset: Omit<FilterPreset, 'id' | 'createdAt'>) => void;

  /** Callback to delete a user-created preset */
  onDeletePreset?: (presetId: string) => void;

  /** Optional class name */
  className?: string;

  /** Allow creating new presets */
  allowCreate?: boolean;

  /** Allow deleting user presets */
  allowDelete?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FilterPresets({
  presets,
  currentFilters,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  className,
  allowCreate = true,
  allowDelete = true,
}: FilterPresetsProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [presetDescription, setPresetDescription] = React.useState('');

  // Separate system and user presets
  const systemPresets = presets.filter((p) => p.system);
  const userPresets = presets.filter((p) => !p.system);

  const handleSaveNewPreset = React.useCallback(() => {
    if (!presetName.trim() || !onSavePreset) return;

    onSavePreset({
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      filters: currentFilters,
      system: false,
    });

    // Reset form and close dialog
    setPresetName('');
    setPresetDescription('');
    setIsDialogOpen(false);
  }, [presetName, presetDescription, currentFilters, onSavePreset]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Bookmark className="mr-2 h-4 w-4" />
            Presets
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* System Presets */}
          {systemPresets.length > 0 && (
            <>
              <DropdownMenuLabel>System Presets</DropdownMenuLabel>
              {systemPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className="cursor-pointer"
                  >
                    {Icon ? (
                      <Icon className="mr-2 h-4 w-4" />
                    ) : (
                      <Star className="mr-2 h-4 w-4" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{preset.name}</span>
                      {preset.description && (
                        <span className="text-xs text-muted-foreground">
                          {preset.description}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

          {/* Separator between system and user presets */}
          {systemPresets.length > 0 && userPresets.length > 0 && <DropdownMenuSeparator />}

          {/* User Presets */}
          {userPresets.length > 0 && (
            <>
              <DropdownMenuLabel>Your Presets</DropdownMenuLabel>
              {userPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <DropdownMenuItem
                    key={preset.id}
                    className="cursor-pointer group justify-between"
                    onSelect={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div
                      className="flex items-center flex-1"
                      onClick={() => onApplyPreset(preset)}
                    >
                      {Icon ? (
                        <Icon className="mr-2 h-4 w-4" />
                      ) : (
                        <Bookmark className="mr-2 h-4 w-4" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{preset.name}</span>
                        {preset.description && (
                          <span className="text-xs text-muted-foreground">
                            {preset.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {allowDelete && onDeletePreset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePreset(preset.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

          {/* Create New Preset */}
          {allowCreate && onSavePreset && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="cursor-pointer text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save Current Filters
              </DropdownMenuItem>
            </>
          )}

          {/* Empty State */}
          {presets.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <Typography variant="body-s">No presets available</Typography>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters to quickly apply them later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Active Staff Members"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (Optional)</Label>
              <Textarea
                id="preset-description"
                placeholder="Brief description of this filter preset"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Preview current filters */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Active Filters</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(currentFilters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {JSON.stringify(value)}
                  </Badge>
                ))}
                {Object.keys(currentFilters).length === 0 && (
                  <Typography variant="body-xs" className="text-muted-foreground">
                    No active filters
                  </Typography>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewPreset}
              disabled={!presetName.trim() || Object.keys(currentFilters).length === 0}
            >
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
