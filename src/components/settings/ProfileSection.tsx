import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { greetingLine, useUserName, useUserPhoto } from '../../hooks/useUserName';
import { useToast } from '../../hooks/useToast';
import { photoToAvatarDataUrl } from '../../utils/image';
import { USER_NAME_MAX_LENGTH } from '../../utils/storage';
import { Avatar } from '../Avatar';
import { Button, Card, FieldError, inputClass, labelClass, mutedText } from '../ui';

export function ProfileSection() {
  const [userName, setUserName] = useUserName();
  const [photo, setPhoto] = useUserPhoto();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(userName);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const changed = draft.trim() !== userName;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUserName(draft);
    setDraft(draft.trim().replace(/\s+/g, ' '));
    showToast(draft.trim() ? `Enchanté, ${draft.trim()} !` : 'Prénom retiré.');
  }

  async function onPhotoChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    setProcessing(true);
    try {
      const dataUrl = await photoToAvatarDataUrl(file);
      if (setPhoto(dataUrl)) showToast('Photo de profil mise à jour.');
      else setPhotoError("Plus assez d'espace sur le téléphone pour enregistrer la photo.");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Impossible de lire cette photo.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Profil</h2>

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="relative rounded-full"
          aria-label={photo ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
          disabled={processing}
        >
          <Avatar photo={photo} name={draft || userName} className="h-20 w-20 text-3xl ring-4 ring-emerald-100 dark:ring-emerald-950" />
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm text-white ring-2 ring-white dark:bg-emerald-400 dark:text-slate-950 dark:ring-slate-900"
          >
            📷
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={processing}>
            {processing ? 'Traitement…' : photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          {photo && (
            <Button
              variant="ghost"
              onClick={() => {
                setPhoto(null);
                showToast('Photo retirée.');
              }}
            >
              Retirer la photo
            </Button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onPhotoChosen(e)}
        />
      </div>
      {photoError && <FieldError>{photoError}</FieldError>}
      <p className={`mt-2 text-xs ${mutedText}`}>Galerie ou appareil photo. La photo reste uniquement sur ce téléphone.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
