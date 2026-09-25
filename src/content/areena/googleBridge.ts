import { sendGoogleTranslate } from "../../protocol/messages";

export const googleTranslate = async (
  texts: string[],
  targetLang: string,
): Promise<string[]> => {
  return sendGoogleTranslate({
    texts,
    targetLang,
  });
};
