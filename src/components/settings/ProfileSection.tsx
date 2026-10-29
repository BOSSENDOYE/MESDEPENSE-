import { useState, type FormEvent } from 'react';
import { greetingLine, useUserName } from '../../hooks/useUserName';
import { useToast } from '../../hooks/useToast';
import { USER_NAME_MAX_LENGTH } from '../../utils/storage';
import { Button, Card, inputClass, labelClass, mutedText } from '../ui';

export function ProfileSection() {
  const [userName, setUserName] = useUserName();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(userName);
  const changed = draft.trim() !== userName;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUserName(draft);
    setDraft(draft.trim().replace(/\s+/g, ' '));
    showToast(draft.trim() ? `Enchanté, ${draft.trim()} !` : 'Prénom retiré.');
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Profil</h2>
      <form onSubmit={handleSubmit} className="mt-2 space-y-3">
        <div>
          <label htmlFor="prenom" className={labelClass}>
            Votre prénom
          </label>
          <input
            id="prenom"
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={USER_NAME_MAX_LENGTH}
            placeholder="Ex. : Omar"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={`${inputClass} mt-1`}
          />
          <p className={`mt-1 text-sm ${mutedText}`}>
            Aperçu : <span className="font-medium">{greetingLine(draft.trim())}</span>
          </p>
        </div>
        <Button type="submit" block disabled={!changed}>
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
