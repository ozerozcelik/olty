export interface CatchPoint {
  latitude: number | null;
  longitude: number | null;
}

const parsePointText = (value: string): CatchPoint | null => {
  const normalized = value.replace(/^SRID=\d+;/i, '');
  const match = normalized.match(/POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)/);

  if (!match) {
    return null;
  }

  return {
    longitude: Number(match[1]),
    latitude: Number(match[2]),
  };
};

const parseHexPoint = (value: string): CatchPoint | null => {
  const hex = value.startsWith('\\x') ? value.slice(2) : value;

  if (!/^[0-9a-f]+$/iu.test(hex) || hex.length < 42 || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const rawType = view.getUint32(1, littleEndian);
  const hasSrid = (rawType & 0x20000000) !== 0;
  const geometryType = rawType & 0x0fffffff;

  if (geometryType !== 1) {
    return null;
  }

  let offset = 5;

  if (hasSrid) {
    offset += 4;
  }

  if (bytes.byteLength < offset + 16) {
    return null;
  }

  return {
    longitude: view.getFloat64(offset, littleEndian),
    latitude: view.getFloat64(offset + 8, littleEndian),
  };
};

export const parseCatchPoint = (value: string | null): CatchPoint => {
  if (!value) {
    return { latitude: null, longitude: null };
  }

  const textPoint = parsePointText(value);

  if (textPoint) {
    return textPoint;
  }

  const hexPoint = parseHexPoint(value);

  if (hexPoint) {
    return hexPoint;
  }

  return { latitude: null, longitude: null };
};
