"use client";

import * as React from "react";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/atoms/primitives/dialog";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Input } from "@/presentation/components/atoms/forms/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { cn } from "@/shared/helpers";

const ROW_HEIGHT_CLASS = "h-11";

export interface AgentsNameEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current list of agent names */
  agentsName: string[];
  /** Called with the new list when user clicks Save */
  onSave: (agentsName: string[]) => void;
  readOnly?: boolean;
}

export function AgentsNameEditorModal({
  open,
  onOpenChange,
  agentsName,
  onSave,
  readOnly = false,
}: AgentsNameEditorModalProps) {
  const [list, setList] = React.useState<string[]>([]);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState("");

  // Sync local list when modal opens or props change
  React.useEffect(() => {
    if (open) {
      setList(Array.isArray(agentsName) ? [...agentsName] : []);
      setEditingIndex(null);
      setEditValue("");
    }
  }, [open, agentsName]);

  const onAdd = React.useCallback(() => {
    setList((prev) => [...prev, ""]);
    setEditingIndex(list.length);
    setEditValue("");
  }, [list.length]);

  const onDelete = React.useCallback((index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  }, []);

  const onStartEdit = React.useCallback((index: number) => {
    setEditingIndex(index);
    setEditValue(list[index] ?? "");
  }, [list]);

  const onCommitEdit = React.useCallback(() => {
    if (editingIndex === null) return;
    const trimmed = editValue.trim();
    setList((prev) => {
      const next = [...prev];
      if (trimmed) {
        next[editingIndex] = trimmed;
      } else {
        next.splice(editingIndex, 1);
      }
      return next;
    });
    setEditingIndex(null);
    setEditValue("");
  }, [editingIndex, editValue]);

  const onCancelEdit = React.useCallback(() => {
    setEditingIndex(null);
    setEditValue("");
  }, []);

  const onSaveClick = React.useCallback(() => {
    const filtered = list.filter((name) => name.trim() !== "");
    onSave(filtered);
    onOpenChange(false);
  }, [list, onSave, onOpenChange]);

  const onCancelClick = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-slot="agents-name-editor-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 shrink-0" aria-hidden />
            Edit agents name
          </DialogTitle>
          <p className="text-muted-foreground text-sm font-normal mt-1">
            Add, edit, or remove agent names for this license.
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <colgroup>
                <col style={{ width: "100%" }} />
                {!readOnly && <col style={{ width: 72 }} />}
              </colgroup>
              <TableHeader className="bg-muted/80">
                <TableRow className="border-muted">
                  <TableHead className="min-w-0 font-medium">Agent name</TableHead>
                  {!readOnly && (
                    <TableHead className="w-[72px] shrink-0 text-right font-medium">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && !readOnly && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-muted-foreground text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 py-8">
                        <Users className="h-8 w-8 opacity-50" aria-hidden />
                        <span>No agents yet.</span>
                        <span className="text-xs">Click &quot;Add agent&quot; below to add one.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {list.map((name, index) => (
                  <TableRow
                    key={`${index}-${name}`}
                    className={cn(
                      "even:bg-muted/20",
                      editingIndex === index && "bg-primary/5"
                    )}
                  >
                    <TableCell
                      className={cn(
                        "min-w-0 align-middle p-0",
                        ROW_HEIGHT_CLASS,
                        editingIndex !== index && "px-3"
                      )}
                    >
                      {editingIndex === index ? (
                        <div className="flex h-full w-full items-center min-w-0">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onCommitEdit();
                              if (e.key === "Escape") onCancelEdit();
                            }}
                            className="h-full w-0 min-w-0 flex-1 rounded-none border-0 border-r border-input bg-transparent py-0 pl-3 pr-2 shadow-none focus-visible:ring-0 focus-visible:border-primary"
                            autoFocus
                            data-slot="agent-name-edit-input"
                          />
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "truncate block text-sm",
                            !name && "text-muted-foreground italic"
                          )}
                        >
                          {name || "(empty)"}
                        </span>
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell
                        className={cn(
                          "text-right align-middle py-0",
                          ROW_HEIGHT_CLASS,
                          "w-[72px]",
                          editingIndex === index ? "pl-0 pr-0.5" : "px-1"
                        )}
                      >
                        <div className="flex items-center justify-end gap-0">
                          {editingIndex === index ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={onCommitEdit}
                                aria-label="Done"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md hover:bg-muted"
                                onClick={onCancelEdit}
                                aria-label="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md"
                                onClick={() => onStartEdit(index)}
                                aria-label="Edit agent name"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDelete(index)}
                                aria-label="Delete agent name"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAdd}
              className="w-full sm:w-fit border-dashed"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add agent
            </Button>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancelClick}>
            Cancel
          </Button>
          {!readOnly && (
            <Button type="button" onClick={onSaveClick}>
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
