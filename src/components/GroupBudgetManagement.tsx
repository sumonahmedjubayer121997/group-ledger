import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetStore, type Budget } from "@/stores/budgetStore";
import { useCategoryStore } from "@/stores/categoryStore";
import type { Group } from "@/stores/expenseStore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toCurrencyCode } from "@/lib/money";

interface GroupBudgetManagementProps {
  group: Group;
  /** The button that opens the form. */
  children: React.ReactNode;
  /** Open straight away to edit this budget. */
  editBudget?: Budget | null;
  onBudgetEdited?: () => void;
}

type Period = Budget["period"];
type Errors = { name?: string; limit?: string };

const WHOLE_GROUP = "overall";
const empty = { name: "", category: WHOLE_GROUP, limit: "", period: "monthly" as Period, alertThreshold: "80" };

/** Add or edit one group budget. The list of budgets lives in GroupBudgetsPanel. */
export const GroupBudgetManagement: React.FC<GroupBudgetManagementProps> = ({ group, children, editBudget, onBudgetEdited }) => {
  const addBudget = useBudgetStore((s) => s.addBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);
  const getAllAvailableCategories = useCategoryStore((s) => s.getAllAvailableCategories);
  const { user } = useAuth();
  const { toast } = useToast();
  const currency = toCurrencyCode(group.settings?.currency);
  const categories = useMemo(() => [...new Set(user ? getAllAvailableCategories(user.uid) : [])], [user, getAllAvailableCategories]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editBudget) return;
    setForm({
      name: editBudget.name,
      category: editBudget.type === "group_category" && editBudget.category ? editBudget.category : WHOLE_GROUP,
      limit: String(editBudget.limit),
      period: editBudget.period,
      alertThreshold: String(editBudget.alertThreshold ?? 80),
    });
    setErrors({});
    setOpen(true);
  }, [editBudget]);

  const close = () => {
    setOpen(false);
    setForm(empty);
    setErrors({});
    onBudgetEdited?.();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !user) return;
    const limit = parseFloat(form.limit.replace(",", "."));
    const problems: Errors = {};
    if (!form.name.trim()) problems.name = "Give the budget a name.";
    if (!(limit > 0)) problems.limit = "Set a limit above zero.";
    setErrors(problems);
    if (problems.name || problems.limit) return;

    const wholeGroup = form.category === WHOLE_GROUP;
    const data = {
      name: form.name.trim(),
      type: wholeGroup ? ("group_overall" as const) : ("group_category" as const),
      category: wholeGroup ? "" : form.category,
      limit,
      period: form.period,
      alertThreshold: Math.min(100, Math.max(1, parseInt(form.alertThreshold, 10) || 80)),
    };
    setSaving(true);
    try {
      if (editBudget) await updateBudget(editBudget.id, data, user.uid, group.id);
      else await addBudget({ ...data, groupId: group.id, isActive: true }, user.uid, group.id);
      toast({ title: editBudget ? `Saved "${data.name}"` : `Added the "${data.name}" budget` });
      close();
    } catch {
      toast({ title: "Couldn't save the budget", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editBudget ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>A spending limit for everyone in {group.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="gb-name">Name</Label>
            <Input
              id="gb-name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setErrors((er) => ({ ...er, name: undefined }));
              }}
              placeholder="e.g. Groceries"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "gb-name-error" : undefined}
            />
            {errors.name && (
              <p id="gb-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gb-category">Counts</Label>
              <Select value={form.category} onValueChange={(category) => category && setForm({ ...form, category })}>
                <SelectTrigger id="gb-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WHOLE_GROUP}>All spending</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gb-limit">Limit ({currency})</Label>
              <Input
                id="gb-limit"
                inputMode="decimal"
                className="money"
                value={form.limit}
                onChange={(e) => {
                  setForm({ ...form, limit: e.target.value.replace(/[^\d.,]/g, "") });
                  setErrors((er) => ({ ...er, limit: undefined }));
                }}
                aria-invalid={!!errors.limit}
                aria-describedby={errors.limit ? "gb-limit-error" : undefined}
              />
              {errors.limit && (
                <p id="gb-limit-error" className="text-sm text-destructive">
                  {errors.limit}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="gb-period">Period</Label>
              <Select value={form.period} onValueChange={(period) => period && setForm({ ...form, period: period as Period })}>
                <SelectTrigger id="gb-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (last 7 days)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gb-alert">Warn at (%)</Label>
              <Input
                id="gb-alert"
                inputMode="numeric"
                value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editBudget ? "Save changes" : "Add budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
