import { useState, type FormEvent } from 'react';
import { deleteCategory, saveCategory } from '../../db/categories';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { Category, Subcategory } from '../../types';
import { fallbackCategoryFor, nextCategoryOrder, validateCategoryName } from '../../utils/categories';
import { COLOR_CHOICES, ICON_CHOICES } from '../../utils/constants';
import { createId } from '../../utils/id';
import { normalizeText, pluralize } from '../../utils/text';
import { CategoryIcon } from '../CategoryIcon';
import { ConfirmDialog } from '../ConfirmDialog';
import { PlusIcon, TrashIcon } from '../Icons';
import { Modal } from '../Modal';
import { Button, Card, FieldError, IconButton, inputClass, labelClass, mutedText } from '../ui';

type Editing = { mode: 'new' } | { mode: 'edit'; category: Category };

export function CategoryManager() {
  const { categories, expenses } = useAppData();
  const [editing, setEditing] = useState<Editing | null>(null);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Catégories</h2>
        <Button variant="ghost" onClick={() => setEditing({ mode: 'new' })}>
          <PlusIcon width={20} height={20} /> Ajouter
        </Button>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {categories.map((c) => {
          const count = expenses.filter((e) => e.categoryId === c.id).length;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setEditing({ mode: 'edit', category: c })}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`Modifier la catégorie ${c.name}`}
              >
                <CategoryIcon category={c} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <span className={`text-sm ${mutedText}`}>{pluralize(count, 'dépense', 'dépenses')}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {editing && (
        <CategoryEditor category={editing.mode === 'edit' ? editing.category : null} onClose={() => setEditing(null)} />
      )}
    </Card>
  );
}

function CategoryEditor({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { categories, expenses, reload } = useAppData();
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? ICON_CHOICES[0] ?? '📦');
  const [color, setColor] = useState(category?.color ?? COLOR_CHOICES[0] ?? '#16a34a');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(() => category?.subcategories.map((s) => ({ ...s })) ?? []);
  const [newSubName, setNewSubName] = useState('');

  const nameError = validateCategoryName(name, categories, category?.id ?? null);
  // Types renseignés (les lignes vidées sont retirées à l'enregistrement).
  const keptSubcategories = subcategories
    .map((s) => ({ ...s, name: s.name.trim() }))
    .filter((s) => s.name !== '');
  const duplicateSub = keptSubcategories.find(
    (s, i) => keptSubcategories.findIndex((o) => normalizeText(o.name) === normalizeText(s.name)) !== i,
  );
  const subError = duplicateSub ? `Le type « ${duplicateSub.name} » apparaît deux fois.` : null;

  function addSubcategoryRow() {
    const trimmed = newSubName.trim();
    if (trimmed === '') return;
    setSubcategories((list) => [...list, { id: createId(), name: trimmed }]);
    setNewSubName('');
  }
  const fallback = category ? fallbackCategoryFor(categories, category.id) : null;
  const usage = category ? expenses.filter((e) => e.categoryId === category.id).length : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || subError || icon.trim() === '') return;
    // Un type tapé mais pas encore ajouté est pris en compte.
    const pending = newSubName.trim();
    const finalSubs =
      pending !== '' && !keptSubcategories.some((s) => normalizeText(s.name) === normalizeText(pending))
        ? [...keptSubcategories, { id: createId(), name: pending }]
        : keptSubcategories;
    const next: Category = {
      id: category?.id ?? createId(),
      name: name.trim(),
      icon: icon.trim(),
      color,
      order: category?.order ?? nextCategoryOrder(categories),
      subcategories: finalSubs,
    };
    try {
      await saveCategory(next);
      await reload();
      showToast(category ? 'Catégorie modifiée.' : `Catégorie « ${next.name} » ajoutée.`);
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Réessayez.");
    }
  }

  async function handleDelete() {
    if (!category || !fallback) return;
    const moved = await deleteCategory(category.id, fallback.id);
    await reload();
    showToast(
      moved > 0
        ? `Catégorie supprimée, ${pluralize(moved, 'dépense déplacée', 'dépenses déplacées')} vers « ${fallback.name} ».`
        : 'Catégorie supprimée.',
    );
    onClose();
  }

  const preview: Category = { id: 'apercu', name, icon: icon || '❔', color, order: 0, subcategories: [] };

  return (
    <>
      <Modal
        title={category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            {category && fallback && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                Supprimer
              </Button>
            )}
            <Button type="submit" form="formulaire-categorie" block>
              Enregistrer
            </Button>
          </div>
        }
      >
        <form id="formulaire-categorie" onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          <div className="flex items-center gap-3">
            <CategoryIcon category={preview} />
            <div className="flex-1">
              <label htmlFor="nom-categorie" className={labelClass}>
                Nom
              </label>
              <input
                id="nom-categorie"
                type="text"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} mt-1`}
                aria-invalid={submitted && nameError ? true : undefined}
              />
            </div>
          </div>
          {submitted && nameError && <FieldError>{nameError}</FieldError>}

          <fieldset>
            <legend className={labelClass}>Types de dépense écrits</legend>
            <p className={`text-sm ${mutedText}`}>
              Les types que vous écrivez lors de la saisie (ex. Taxi pour Transport) apparaissent ici. Vous pouvez les
              corriger ou les supprimer.
            </p>
            {subcategories.length > 0 && (
              <ul className="mt-2 space-y-2">
                {subcategories.map((s, index) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <label htmlFor={`type-${s.id}`} className="sr-only">
                      Nom du type {index + 1}
                    </label>
                    <input
                      id={`type-${s.id}`}
                      type="text"
                      maxLength={40}
                      value={s.name}
                      onChange={(e) =>
                        setSubcategories((list) => list.map((o) => (o.id === s.id ? { ...o, name: e.target.value } : o)))
                      }
                      className={`${inputClass} flex-1`}
                    />
                    <IconButton
                      label={`Supprimer le type ${s.name}`}
                      onClick={() => setSubcategories((list) => list.filter((o) => o.id !== s.id))}
                    >
                      <TrashIcon width={20} height={20} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <label htmlFor="nouveau-type" className="sr-only">
                Nouveau type
              </label>
              <input
                id="nouveau-type"
                type="text"
                maxLength={40}
                placeholder="Nouveau type…"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubcategoryRow();
                  }
                }}
                className={`${inputClass} flex-1`}
              />
              <Button variant="secondary" onClick={addSubcategoryRow} disabled={newSubName.trim() === ''}>
                Ajouter
              </Button>
            </div>
            {subError && <FieldError>{subError}</FieldError>}
            {category && (
              <p className={`mt-1 text-xs ${mutedText}`}>
                Supprimer un type ne supprime pas les dépenses : elles restent dans la catégorie, sans type.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Icône</legend>
            <div className="mt-1 grid grid-cols-8 gap-1">
              {ICON_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={choice === icon}
                  aria-label={`Icône ${choice}`}
                  onClick={() => setIcon(choice)}
                  className={`flex h-11 items-center justify-center rounded-xl text-xl ${
                    choice === icon ? 'bg-emerald-100 ring-2 ring-emerald-700 dark:bg-emerald-950 dark:ring-emerald-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
            <label htmlFor="icone-libre" className={`mt-2 block text-sm ${mutedText}`}>
              Ou tapez un emoji :
            </label>
            <input id="icone-libre" type="text" maxLength={8} value={icon} onChange={(e) => setIcon(e.target.value)} className={`${inputClass} mt-1 w-24 text-center text-xl`} />
            {submitted && icon.trim() === '' && <FieldError>Choisissez une icône.</FieldError>}
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Couleur</legend>
            <div className="mt-1 grid grid-cols-8 gap-1">
              {COLOR_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={choice === color}
                  aria-label={`Couleur ${choice}`}
                  onClick={() => setColor(choice)}
                  className="flex h-11 items-center justify-center rounded-xl"
                >
                  <span
                    className={`h-8 w-8 rounded-full ${choice === color ? 'ring-4 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''}`}
                    style={{ backgroundColor: choice }}
                  />
                </button>
              ))}
            </div>
            <label className={`mt-2 flex items-center gap-2 text-sm ${mutedText}`}>
              Couleur personnalisée :
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-16 cursor-pointer rounded-lg bg-transparent" />
            </label>
          </fieldset>
          {error && <FieldError>{error}</FieldError>}
        </form>
      </Modal>

      {confirmDelete && category && fallback && (
        <ConfirmDialog
          title={`Supprimer « ${category.name} » ?`}
          message={
            usage > 0
              ? `${pluralize(usage, 'dépense sera déplacée', 'dépenses seront déplacées')} vers « ${fallback.name} ». Le budget de cette catégorie sera supprimé.`
              : 'Cette catégorie n’est utilisée par aucune dépense. Son budget éventuel sera supprimé.'
          }
          confirmLabel="Supprimer"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
