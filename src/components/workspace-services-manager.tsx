"use client";

import { useState } from "react";
import {
  createServiceItemAction,
  deleteServiceItemAction,
  updateServiceItemAction,
} from "@/actions/service-items";
import { centsToDollars, dollarsToCents, formatMoney } from "@/lib/money";
import { SaveButton, useSaveButton } from "@/components/save-button";

export type SavedService = {
  id: string;
  description: string;
  unitPriceCents: number;
  taxable: boolean;
};

function toFormData(workspaceId: string, fields: { description: string; rate: string; taxable: boolean }, itemId?: string) {
  const data = new FormData();
  data.set("workspaceId", workspaceId);
  if (itemId) data.set("itemId", itemId);
  data.set("description", fields.description);
  data.set("unitPriceCents", String(dollarsToCents(fields.rate)));
  data.set("taxable", fields.taxable ? "1" : "0");
  return data;
}

export function WorkspaceServicesManager({
  workspaceId,
  initialItems,
}: {
  workspaceId: string;
  initialItems: SavedService[];
}) {
  const [items, setItems] = useState(initialItems);
  const [notice, setNotice] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");
  const [taxable, setTaxable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ description: "", rate: "", taxable: false });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editSaveResult, setEditSaveResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const editSave = useSaveButton(editSaveResult);

  async function addItem() {
    if (!description.trim() || !rate.trim()) return;
    setBusy(true);
    const result = await createServiceItemAction(null, toFormData(workspaceId, { description, rate, taxable }));
    setBusy(false);
    if ("error" in result) {
      setNotice(result.error);
      return;
    }
    setItems((current) => [...current, result.item]);
    setDescription("");
    setRate("");
    setTaxable(false);
    setNotice(result.message);
  }

  function startEdit(item: SavedService) {
    setEditSaveResult(null);
    editSave.reset();
    setEditingId(item.id);
    setConfirmingId(null);
    setEditFields({
      description: item.description,
      rate: centsToDollars(item.unitPriceCents),
      taxable: item.taxable,
    });
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const result = await updateServiceItemAction(null, toFormData(workspaceId, editFields, id));
    setBusy(false);
    if (!result || "error" in result) {
      const error = result?.error ?? "Could not save the service.";
      setEditSaveResult({ error });
      setNotice(error);
      return;
    }
    setEditSaveResult({ ok: true });
    setItems((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              description: editFields.description.trim(),
              unitPriceCents: dollarsToCents(editFields.rate),
              taxable: editFields.taxable,
            }
          : entry,
      ),
    );
    setNotice(result.message ?? "Service saved.");
  }

  async function removeItem(id: string) {
    const data = new FormData();
    data.set("workspaceId", workspaceId);
    data.set("itemId", id);
    setBusy(true);
    const result = await deleteServiceItemAction(null, data);
    setBusy(false);
    if (!result || "error" in result) {
      setNotice(result?.error ?? "Could not delete the service.");
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== id));
    setConfirmingId(null);
    setNotice(result.message ?? "Service deleted.");
  }

  return (
    <section className="paper space-y-4 rounded-3xl p-6">
      <div>
        <h3 className="text-xl">Services</h3>
        <p className="mt-1 text-sm text-muted">
          Saved per client. Pick them straight onto new invoices.
        </p>
      </div>
      {notice ? (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <div className="field">
          <label htmlFor="new-service-description">Description</label>
          <input
            id="new-service-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Unit cleaning — South Loop"
          />
        </div>
        <div className="field">
          <label htmlFor="new-service-rate">Rate</label>
          <input
            id="new-service-rate"
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="0.00"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={taxable}
            onChange={(event) => setTaxable(event.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Tax
        </label>
      </div>
      <button type="button" className="btn btn-secondary" disabled={busy || !description.trim() || !rate.trim()} onClick={addItem}>
        Add service
      </button>
      {items.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="space-y-2 py-3">
                <div className="field">
                  <label htmlFor={`edit-service-${item.id}`}>Description</label>
                  <input
                    id={`edit-service-${item.id}`}
                    value={editFields.description}
                    onChange={(event) => { setEditFields((f) => ({ ...f, description: event.target.value })); editSave.markDirty(); }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="field flex-1">
                    <label htmlFor={`edit-rate-${item.id}`}>Rate</label>
                    <input
                      id={`edit-rate-${item.id}`}
                      inputMode="decimal"
                      value={editFields.rate}
                      onChange={(event) => { setEditFields((f) => ({ ...f, rate: event.target.value })); editSave.markDirty(); }}
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editFields.taxable}
                      onChange={(event) => { setEditFields((f) => ({ ...f, taxable: event.target.checked })); editSave.markDirty(); }}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Tax
                  </label>
                </div>
                <div className="flex gap-2">
                  <SaveButton type="button" pending={busy} save={editSave} onClick={() => saveEdit(item.id)} />
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate">{item.description}</p>
                  <p className="text-sm text-muted tabular-nums">
                    {formatMoney(item.unitPriceCents)}
                    {item.taxable ? " · Tax" : ""}
                  </p>
                </div>
                {confirmingId === item.id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => removeItem(item.id)}>
                      Delete
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmingId(null)}>
                      Keep
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmingId(item.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted">No saved services yet.</p>
      )}
    </section>
  );
}
