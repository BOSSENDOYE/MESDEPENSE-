interface AvatarProps {
  photo: string | null;
  name: string;
  /** Classes de taille et de bordure (ex. « h-11 w-11 text-lg »). */
  className?: string;
}

/** Photo de profil, ou initiale du prénom, ou silhouette. */
export function Avatar({ photo, name, className = 'h-11 w-11 text-lg' }: AvatarProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase('fr-FR');
  if (photo) {
    return <img src={photo} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 ${className}`}
    >
      {initial || '👤'}
    </span>
  );
}
