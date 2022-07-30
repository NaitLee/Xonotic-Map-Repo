
type DictOf<T> = { [key: string]: T };
type Conditions = DictOf<string>;
type ConditionsOf<K extends Languages> = AllConditions[K];
type LanguageData = DictOf<Conditions | string>;
type Things = { [index: number | string]: number | string | boolean | null } | Array<number | string>;
interface Extension {
    (things: Things, conditions: Conditions): string;
}
interface ExtensionOf<K extends Languages> {
    (things: Things, conditions: ConditionsOf<K> | string): string;
}
type Languages = keyof AllConditions;

/**
 * All known possible condition keys, per language
 × These are what will be used in langauge files
 * Please add more as you do in extensions
 */
type AllConditions = {
    'en-US': {
        'single': string,
        'multiple': string,
        'nth': string,
        'a': string,
        'an': string
    },
    'zh-CN': {
    }
};

interface I18nCallable extends I18n {
    (text: string, things: Things, can_change_things: boolean): string;
}

declare var i18n: I18nCallable;
