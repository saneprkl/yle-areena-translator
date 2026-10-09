import type { Translator } from "../../Translator";
import { sendGoogleTranslate } from "./googleMessages";

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
