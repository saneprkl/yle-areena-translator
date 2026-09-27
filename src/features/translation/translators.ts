import type { TranslationProvider } from "../../global/types";
import { deeplTranslate } from "../../content/areena/deeplBridge";
import { googleTranslate } from "../../content/areena/googleBridge";
import type { Translator } from "./Translator";

const deeplTranslator: Translator = {
  translate: deeplTranslate,
};

const googleTranslator: Translator = {
  translate: googleTranslate,
};

export const getTranslator = (provider: TranslationProvider): Translator => {
  switch (provider) {
    case "deepl":
      return deeplTranslator;
    case "google":
      return googleTranslator;
  }
};
