import type { TranslationProvider } from "../../global/types";
import { deeplTranslator } from "./providers/deepl/DeepLTranslator";
import { googleTranslator } from "./providers/google/GoogleTranslator";
import type { Translator } from "./Translator";

export const getTranslator = (provider: TranslationProvider): Translator => {
  switch (provider) {
    case "deepl":
      return deeplTranslator;
    case "google":
      return googleTranslator;
  }
};
