import { sendDeeplTranslate } from "../../protocol/messages";

export const deeplTranslate = async (
  texts: string[],
  targetLang: string,
): Promise<string[]> => {
  return sendDeeplTranslate({ texts, targetLang });
};
