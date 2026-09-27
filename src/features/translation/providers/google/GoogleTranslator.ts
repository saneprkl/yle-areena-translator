import { sendGoogleTranslate } from "../../../../protocol/messages";
import type { Translator } from "../../Translator";

export const googleTranslator: Translator = {
  translate: async (
    texts: string[],
    targetLanguage: string,
  ): Promise<string[]> => {
    return sendGoogleTranslate({
      texts,
      targetLang: targetLanguage,
    });
  },
};
