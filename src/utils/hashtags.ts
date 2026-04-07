export interface HashtagSegment {
  text: string;
  hashtag: string | null;
}

const HASHTAG_PATTERN = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]+)/gu;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s]+/giu;

export interface InteractiveTextSegment {
  text: string;
  hashtag: string | null;
  url: string | null;
}

const getSingleValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
};

export const getHashtagSearchQuery = (value: string): string => {
  const normalizedTag = value.trim().replace(/^#+/, '');
  return normalizedTag ? `#${normalizedTag}` : '#';
};

export const getHashtagSearchTerm = (
  value: string | string[] | undefined,
): string | null => {
  const normalizedValue = getSingleValue(value).trim();

  if (!normalizedValue.startsWith('#')) {
    return null;
  }

  const normalizedTag = normalizedValue.replace(/^#+/, '').trim();
  return normalizedTag || null;
};

export const parseHashtagSegments = (value: string): HashtagSegment[] => {
  if (!value) {
    return [{ text: '', hashtag: null }];
  }

  const segments: HashtagSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(HASHTAG_PATTERN)) {
    const fullStart = match.index ?? 0;
    const prefix = match[1] ?? '';
    const tag = match[2] ?? '';
    const hashtagStart = fullStart + prefix.length;
    const hashtagText = `#${tag}`;

    if (hashtagStart > cursor) {
      segments.push({
        text: value.slice(cursor, hashtagStart),
        hashtag: null,
      });
    }

    segments.push({
      text: hashtagText,
      hashtag: tag,
    });
    cursor = hashtagStart + hashtagText.length;
  }

  if (cursor < value.length) {
    segments.push({
      text: value.slice(cursor),
      hashtag: null,
    });
  }

  return segments.length ? segments : [{ text: value, hashtag: null }];
};

const trimTrailingUrlPunctuation = (value: string): {
  cleanedUrl: string;
  trailingText: string;
} => {
  const match = value.match(/[),.!?]+$/u);

  if (!match) {
    return {
      cleanedUrl: value,
      trailingText: '',
    };
  }

  return {
    cleanedUrl: value.slice(0, -match[0].length),
    trailingText: match[0],
  };
};

const normalizeUrl = (value: string): string =>
  value.startsWith('www.') ? `https://${value}` : value;

export const parseInteractiveTextSegments = (
  value: string,
): InteractiveTextSegment[] => {
  if (!value) {
    return [{ text: '', hashtag: null, url: null }];
  }

  const urlMatches = Array.from(value.matchAll(URL_PATTERN)).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    text: match[0],
  }));

  const segments: InteractiveTextSegment[] = [];
  let cursor = 0;

  for (const urlMatch of urlMatches) {
    if (urlMatch.start > cursor) {
      const plainText = value.slice(cursor, urlMatch.start);

      for (const hashtagSegment of parseHashtagSegments(plainText)) {
        segments.push({
          text: hashtagSegment.text,
          hashtag: hashtagSegment.hashtag,
          url: null,
        });
      }
    }

    const { cleanedUrl, trailingText } = trimTrailingUrlPunctuation(urlMatch.text);

    segments.push({
      text: cleanedUrl,
      hashtag: null,
      url: normalizeUrl(cleanedUrl),
    });

    if (trailingText) {
      segments.push({
        text: trailingText,
        hashtag: null,
        url: null,
      });
    }

    cursor = urlMatch.end;
  }

  if (cursor < value.length) {
    for (const hashtagSegment of parseHashtagSegments(value.slice(cursor))) {
      segments.push({
        text: hashtagSegment.text,
        hashtag: hashtagSegment.hashtag,
        url: null,
      });
    }
  }

  return segments.length ? segments : [{ text: value, hashtag: null, url: null }];
};
