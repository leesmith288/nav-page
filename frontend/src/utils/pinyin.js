import pinyin from 'pinyin';

// Convert Chinese to Pinyin for search
export const toPinyin = (text) => {
  try {
    const py = pinyin(text, {
      style: pinyin.STYLE_NORMAL,
      heteronym: false
    });
    return py.flat().join('');
  } catch {
    return text;
  }
};
