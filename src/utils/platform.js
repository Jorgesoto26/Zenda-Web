export const Platform = {
  OS: 'web',
  select: (obj) => (obj && typeof obj === 'object' ? obj.web || obj.ios || obj.default || Object.values(obj)[0] : obj),
};

