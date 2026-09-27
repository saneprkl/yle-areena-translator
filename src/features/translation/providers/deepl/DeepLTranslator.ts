import { sendDeeplTranslate } from "../../../../protocol/messages";
import type { Translator } from "../../Translator";

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
