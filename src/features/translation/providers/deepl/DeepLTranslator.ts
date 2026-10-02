import type { Translator } from "../../Translator";
import { sendDeeplTranslate } from "./deeplMessages";

export const deeplTranslator: Translator = {
  translate: async (
    texts: string[],
    targetLanguage: string,
  ): Promise<string[]> => {
    return sendDeeplTranslate({
      texts,
      targetLang: targetLanguage,
    });
  },
};
