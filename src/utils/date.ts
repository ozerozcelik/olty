export const formatTimeAgo = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Simdi';
  if (diffMinutes < 60) return `${diffMinutes} dk once`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa once`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} g once`;
};

export const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

export const getTurkeyDateString = (value = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(value);
};
