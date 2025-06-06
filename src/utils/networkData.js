export const nodes = Array.from({ length: 100 }, (_, i) => ({ index: i }));

export const links = Array.from({ length: 300 }, () => ({
  source: Math.floor(Math.random() * 100),
  target: Math.floor(Math.random() * 100),
}));