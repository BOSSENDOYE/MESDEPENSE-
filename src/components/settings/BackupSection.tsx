import { useRef, useState, type ChangeEvent } from 'react';
import { readAllData, replaceAllData } from '../../db/snapshot';
import { useAppData } from '../../hooks/useAppData';
import { useToast } from '../../hooks/useToast';
import type { AppDataSnapshot } from '../../types';
import { createBackup, parseBackup } from '../../utils/backup';
import { expensesToCsv } from '../../utils/csv';
import { formatShortDate, todayISO } from '../../utils/dates';
import { downloadFile } from '../../utils/download';
import { getLastBackupDate, setLastBackupDate } from '../../utils/storage';
import { pluralize } from '../../utils/text';
import { ConfirmDialog } from '../ConfirmDialog';
import { Button, Card, FieldError, mutedText } from '../ui';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function BackupSection() {
  const { expenses, categories, reload } = useAppData();
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppDataSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState(getLastBackupDate);

  function exportCsv() {
    if (expenses.length === 0) {
      showToast('Aucune dépense à exporter.', 'info');
      return;
    }
    // BOM UTF-8 : Excel affiche correctement les accents.
    downloadFile(`depenses-${todayISO()}.csv`, `﻿${expensesToCsv(expenses, categories)}`, 'text/csv;charset=utf-8');
    showToast('Export CSV téléchargé.');
  }

  async function exportJson() {
    try {
      const backup = createBackup(await readAllData());
      downloadFile(`sauvegarde-depenses-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json');
      setLastBackupDate(backup.exportedAt);
      setLastBackup(backup.exportedAt);
      showToast('Sauvegarde téléchargée.');
    } catch (err) {
      console.error(err);
      showToast('La sauvegarde a échoué. Réessayez.', 'error');
    }
  }

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux (20 Mo maximum).');
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setError("Ce fichier n'est pas un JSON valide. Choisissez un fichier « sauvegarde-depenses-….json ».");
      return;
    }
    const result = parseBackup(json);
    if (result.ok) setPending(result.value);
    else setError(result.error);
  }

  async function confirmImport() {
    if (!pending) return;
    await replaceAllData(pending);
    await reload();
    setPending(null);
    showToast('Données restaurées.');
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Sauvegarde et export</h2>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Vos données restent uniquement sur ce téléphone. Faites une sauvegarde régulièrement (et avant de changer de téléphone).
        {lastBackup ? ` Dernière sauvegarde : ${formatShortDate(lastBackup.slice(0, 10))}.` : ' Aucune sauvegarde pour le moment.'}
      </p>
      <div className="mt-3 grid gap-2">
        <Button onClick={() => void exportJson()}>Sauvegarder (JSON)</Button>
        <Button variant="secondary" onClick={exportCsv}>
          Exporter les dépenses (CSV)
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          Restaurer une sauvegarde…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onFileChosen(e)}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}

      {pending && (
        <ConfirmDialog
          title="Restaurer cette sauvegarde ?"
          message={`Elle contient ${pluralize(pending.expenses.length, 'dépense', 'dépenses')}, ${pluralize(pending.categories.length, 'catégorie', 'catégories')}, ${pluralize(pending.budgets.length, 'budget', 'budgets')} et ${pluralize(pending.recurring.length, 'récurrence', 'récurrences')}. Toutes les données actuelles de l'application seront remplacées.`}
          confirmLabel="Remplacer mes données"
          danger
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}
    </Card>
  );
}
