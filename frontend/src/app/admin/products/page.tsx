/*!
 * GymHolic Admin Products — the Blueprint store catalogue: category manager
 * (create / rename / toggle / reorder, delete blocked while referenced) and
 * the product table with create/edit form, cover + PDF uploads.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  adminFetch,
  adminUpload,
  type StoreCategoryRow,
  type StoreProductRow,
} from "@/lib/adminApi";
import { storeCoverUrl } from "@/lib/store";

type ProductForm = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  price: string;
  isFree: boolean;
  featured: boolean;
  active: boolean;
};

const EMPTY_PRODUCT: ProductForm = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  price: "0",
  isFree: false,
  featured: false,
  active: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<StoreCategoryRow[] | null>(null);
  const [products, setProducts] = useState<StoreProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Category form
  const [newCategory, setNewCategory] = useState("");

  // Product form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const formRef = useRef<HTMLDivElement | null>(null);
  // Bumped when the create/edit form opens; the effect below does the actual
  // ref read, keeping formRef out of render paths.
  const [formScrollToken, setFormScrollToken] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Product list filter
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  const load = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        adminFetch<StoreCategoryRow[]>("store/admin/categories"),
        adminFetch<StoreProductRow[]>("store/admin/products"),
      ]);
      setCategories(cats ?? []);
      setProducts(prods ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the store.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Brings the create/edit form into view when one opens.
  useEffect(() => {
    if (formScrollToken > 0) formRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [formScrollToken]);

  function flash(kind: "error" | "notice", message: string) {
    if (kind === "error") setError(message);
    else setNotice(message);
    window.setTimeout(() => {
      if (kind === "error") setError(null);
      else setNotice(null);
    }, 6000);
  }

  // ---- Categories ----

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setBusy(true);
    try {
      await adminFetch("store/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      setNewCategory("");
      flash("notice", "Category created.");
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not create the category.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCategory(category: StoreCategoryRow, patch: Partial<StoreCategoryRow>) {
    setBusy(true);
    try {
      await adminFetch(`store/admin/categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: patch.name ?? category.name,
          sortOrder: patch.sortOrder ?? category.sortOrder,
          active: patch.active ?? category.active,
        }),
      });
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not update the category.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(category: StoreCategoryRow) {
    setBusy(true);
    try {
      await adminFetch(`store/admin/categories/${category.id}`, { method: "DELETE" });
      flash("notice", "Category deleted.");
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not delete the category.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Products ----

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT, categoryId: categories?.[0] ? String(categories[0].id) : "" });
    setCoverFile(null);
    setPdfFile(null);
    setFormScrollToken((t) => t + 1);
  }

  async function startEdit(product: StoreProductRow) {
    setEditingId(product.id);
    setForm({
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription ?? "",
      description: "",
      categoryId: product.category ? String(findCategoryIdBySlug(product.category.slug)) : "",
      price: String(product.price),
      // Nullish fallbacks keep the checkboxes controlled even if the API
      // ever omits a flag (undefined would flip them to uncontrolled).
      isFree: product.isFree ?? false,
      featured: product.featured ?? false,
      active: product.active ?? true,
    });
    setCoverFile(null);
    setPdfFile(null);
    setFormScrollToken((t) => t + 1);
    // The list endpoint omits the long description — pull it from the public
    // detail so saving an edit can't silently blank it.
    try {
      const detail = await adminFetch<{ description: string | null }>(`store/products/${product.slug}`);
      setForm((f) => (f.slug === product.slug ? { ...f, description: detail.description ?? "" } : f));
    } catch {
      // best-effort — an unchanged save keeps an empty description only if this failed
    }
  }

  function findCategoryIdBySlug(slug: string): number | null {
    return categories?.find((c) => c.slug === slug)?.id ?? null;
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) {
      flash("error", "Pick a category first.");
      return;
    }
    setBusy(true);
    try {
      const body = JSON.stringify({
        title: form.title,
        slug: form.slug.trim() || undefined,
        shortDescription: form.shortDescription || null,
        description: form.description || null,
        categoryId: Number(form.categoryId),
        price: Number(form.price || 0),
        isFree: form.isFree,
        featured: form.featured,
        active: form.active,
      });
      const saved = editingId
        ? await adminFetch<{ id: number }>(`store/admin/products/${editingId}`, { method: "PUT", body })
        : await adminFetch<{ id: number }>("store/admin/products", { method: "POST", body });

      if (coverFile) {
        await adminUpload(`store/admin/products/${saved.id}/cover`, coverFile);
      }
      if (pdfFile) {
        await adminUpload(`store/admin/products/${saved.id}/pdf`, pdfFile);
      }
      flash("notice", editingId ? "Product updated." : "Product created.");
      setForm(EMPTY_PRODUCT);
      setEditingId(null);
      setCoverFile(null);
      setPdfFile(null);
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleProductActive(product: StoreProductRow) {
    setBusy(true);
    try {
      await adminFetch(`store/admin/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: product.title,
          categoryId: findCategoryIdBySlug(product.category?.slug ?? "") ?? categories?.[0]?.id,
          price: product.price,
          isFree: product.isFree,
          featured: product.featured,
          active: !product.active,
        }),
      });
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not update the product.");
    } finally {
      setBusy(false);
    }
  }

  /** Soft delete: hides the product from the store. Buyers keep their copies. */
  async function archiveProduct(product: StoreProductRow) {
    await toggleProductActive(product);
    flash("notice", product.active ? "Product archived — hidden from the store." : "Product restored to the store.");
  }

  /** Permanent delete: wipes the product and its files. Cannot be undone. */
  async function purgeProduct(product: StoreProductRow) {
    if (!window.confirm(
      `Permanently delete "${product.title}"?\n\nThis erases the product, its cover and its PDF. Past orders keep their records, but this cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      await adminFetch(`store/admin/products/${product.id}/purge`, { method: "DELETE" });
      flash("notice", "Product permanently deleted.");
      await load();
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Could not delete the product.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "field-input bg-void border border-paper/15 rounded-lg px-3 py-2 text-sm text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60";

  return (
    <AdminShell activeHref="/admin/products">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Products</h1>
      <p className="text-paper/60 text-sm mb-6 max-w-2xl">
        The Blueprint store: digital PDF products with a secure viewer. Prices are enforced
        server-side at checkout — the value here is what customers pay.
      </p>

      {error && <div className="mb-6 bg-red-950/50 border border-red-800 text-red-300 rounded-lg p-4">{error}</div>}
      {notice && <div className="mb-6 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg p-4">{notice}</div>}

      {/* Categories */}
      <div className="admin-card p-5 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/60 mb-4">Categories</h2>
        {categories === null ? (
          <p className="text-sm text-paper/50">Loading categories…</p>
        ) : (
          <div className="space-y-3 mb-5">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-wrap items-center gap-3 border border-paper/10 rounded-lg px-4 py-3"
              >
                <input
                  className={inputCls + " flex-1 min-w-40 bg-transparent border-transparent hover:border-paper/15 focus:border-orange"}
                  defaultValue={category.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== category.name) {
                      saveCategory(category, { name: e.target.value.trim() });
                    }
                  }}
                  aria-label={`Rename ${category.name}`}
                />
                <span className="text-xs text-paper/40">/{category.slug}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-xs text-paper/50 flex items-center gap-1">
                    Order
                    <input
                      type="number"
                      className={inputCls + " w-16"}
                      defaultValue={category.sortOrder}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isNaN(next) && next !== category.sortOrder) {
                          saveCategory(category, { sortOrder: next });
                        }
                      }}
                      aria-label={`${category.name} sort order`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => saveCategory(category, { active: !category.active })}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      category.active ? "bg-emerald-500/15 text-emerald-400" : "bg-paper/10 text-paper/50"
                    }`}
                  >
                    {category.active ? "Active" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category)}
                    className="text-xs text-red-400/80 hover:text-red-300 underline-offset-2 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={createCategory} className="flex gap-3 max-w-md">
          <input
            className={inputCls + " flex-1"}
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !newCategory.trim()}
            className="admin-btn admin-btn-primary"
          >
            Add
          </button>
        </form>
        <p className="text-xs text-paper/40 mt-3">
          Categories with products can&apos;t be deleted — move or remove the products first.
        </p>
      </div>

      {/* Products */}
      <div className="admin-card p-5 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/60">Products</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
              {(["all", "active", "archived"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`tab-chip !py-1.5 capitalize ${statusFilter === f ? "tab-chip-active" : ""}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button type="button" onClick={startCreate} className="admin-btn admin-btn-primary">
              + New Product
            </button>
          </div>
        </div>
        {products === null ? (
          <p className="text-sm text-paper/50">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-paper/50">No products yet — create the first Blueprint.</p>
        ) : (
          (() => {
            const filtered = products.filter((p) =>
              statusFilter === "all" ? true : statusFilter === "active" ? p.active : !p.active
            );
            if (filtered.length === 0) {
              return <p className="text-sm text-paper/50">No {statusFilter === "all" ? "" : statusFilter + " "}products.</p>;
            }
            return (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-paper/40 border-b border-paper/10">
                        <th className="py-2 pr-4 font-medium">Cover</th>
                        <th className="py-2 pr-4 font-medium">Title</th>
                        <th className="py-2 pr-4 font-medium">Category</th>
                        <th className="py-2 pr-4 font-medium">Price</th>
                        <th className="py-2 pr-4 font-medium">Flags</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((product) => (
                        <tr key={product.id} className="border-b border-paper/5">
                          <td className="py-2.5 pr-4">
                            {product.hasCover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={storeCoverUrl(product.slug)}
                                alt=""
                                className="w-9 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-9 h-12 rounded bg-paper/5 border border-paper/10" />
                            )}
                          </td>
                          <td className="py-2.5 pr-4">
                            <p className="font-medium">{product.title}</p>
                            <p className="text-xs text-paper/40">/{product.slug}</p>
                          </td>
                          <td className="py-2.5 pr-4 text-paper/70">{product.category?.name ?? "—"}</td>
                          <td className="py-2.5 pr-4">{product.isFree ? "Free" : `$${product.price}`}</td>
                          <td className="py-2.5 pr-4 text-xs space-x-1">
                            {product.featured && <span className="bg-orange/15 text-orange px-2 py-0.5 rounded-full">Featured</span>}
                            {product.hasPdf && <span className="bg-paper/10 text-paper/60 px-2 py-0.5 rounded-full">PDF</span>}
                            {!product.hasPdf && <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">No PDF</span>}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              product.active ? "bg-emerald-500/15 text-emerald-400" : "bg-paper/10 text-paper/50"
                            }`}>
                              {product.active ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <button type="button" onClick={() => startEdit(product)} className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs mr-2">
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveProduct(product)}
                              disabled={busy}
                              className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs mr-2"
                            >
                              {product.active ? "Archive" : "Restore"}
                            </button>
                            {!product.active && (
                              <button
                                type="button"
                                onClick={() => purgeProduct(product)}
                                disabled={busy}
                                className="admin-btn admin-btn-danger !px-3 !py-1.5 !text-xs"
                              >
                                Delete forever
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map((product) => (
                    <div key={product.id} className="border border-paper/10 rounded-xl p-4 flex gap-3">
                      {product.hasCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={storeCoverUrl(product.slug)} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                      ) : (
                        <div className="w-10 h-14 rounded bg-paper/5 border border-paper/10 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{product.title}</p>
                            <p className="text-xs text-paper/40">/{product.slug}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            product.active ? "bg-emerald-500/15 text-emerald-400" : "bg-paper/10 text-paper/50"
                          }`}>
                            {product.active ? "Active" : "Archived"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-paper/60">
                          <span>{product.isFree ? "Free" : `$${product.price}`}</span>
                          <span aria-hidden>·</span>
                          <span>{product.category?.name ?? "—"}</span>
                          {product.featured && <span className="bg-orange/15 text-orange px-2 py-0.5 rounded-full">Featured</span>}
                          {!product.hasPdf && <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">No PDF</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" onClick={() => startEdit(product)} className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveProduct(product)}
                            disabled={busy}
                            className="admin-btn admin-btn-ghost !px-3 !py-1.5 !text-xs"
                          >
                            {product.active ? "Archive" : "Restore"}
                          </button>
                          {!product.active && (
                            <button
                              type="button"
                              onClick={() => purgeProduct(product)}
                              disabled={busy}
                              className="admin-btn admin-btn-danger !px-3 !py-1.5 !text-xs"
                            >
                              Delete forever
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()
        )}
      </div>

      {/* Create / edit form */}
      <div ref={formRef} className="admin-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/60 mb-4">
          {editingId ? "Edit product" : "New product"}
        </h2>
        <form onSubmit={saveProduct} className="grid gap-4 md:grid-cols-2 max-w-3xl">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Title</label>
            <input
              className={inputCls + " w-full"}
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  title: e.target.value,
                  slug: editingId ? f.slug : slugify(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-paper/60">
              Slug (auto from title, editable)
            </label>
            <input
              className={inputCls + " w-full"}
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder={slugify(form.title)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Category</label>
            <select
              className={inputCls + " w-full"}
              required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="" disabled>
                Pick a category
              </option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Short description</label>
            <input
              className={inputCls + " w-full"}
              maxLength={300}
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Full description</label>
            <textarea
              className={inputCls + " w-full min-h-28"}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls + " w-full"}
              value={form.price}
              disabled={form.isFree}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-5 pb-2">
            <label className="flex items-center gap-2 text-sm text-paper/70">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
                className="accent-orange"
              />
              Free product
            </label>
            <label className="flex items-center gap-2 text-sm text-paper/70">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                className="accent-orange"
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-paper/70">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="accent-orange"
              />
              Active
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-paper/60">Cover image (≤5MB)</label>
            <div className="flex items-center gap-3">
              {coverFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(coverFile)} alt="Cover preview" className="w-9 h-12 object-cover rounded" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="text-xs text-paper/60 file:mr-3 file:rounded-full file:border-0 file:bg-paper/10 file:text-paper file:px-3 file:py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-paper/60">PDF file (≤25MB)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="text-xs text-paper/60 file:mr-3 file:rounded-full file:border-0 file:bg-paper/10 file:text-paper file:px-3 file:py-1.5 w-full"
            />
            {pdfFile && (
              <p className="text-xs text-paper/40 mt-1">
                {pdfFile.name} · {(pdfFile.size / (1024 * 1024)).toFixed(1)}MB — replaces the current PDF on save
              </p>
            )}
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="admin-btn admin-btn-primary !px-6 !py-2.5 disabled:opacity-50"
            >
              {busy ? "Saving…" : editingId ? "Save product" : "Create product"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_PRODUCT);
                  setCoverFile(null);
                  setPdfFile(null);
                }}
                className="text-sm text-paper/60 hover:text-paper px-4 py-2.5"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
