import type messages from '../../messages/pt-BR.json';

/**
 * The shape of the message catalogs. pt-BR is the reference locale — the one
 * scripts/check-i18n-parity.mjs holds every other catalog to — so its keys are
 * the keys every locale has.
 *
 * Use it to type a key that is stored as data and looked up later:
 *
 *   type Step2Key = keyof Messages['calculator']['step2'];
 *   const OPTIONS: { labelKey: Step2Key }[] = [{ labelKey: 'swine' }];
 *   t(`step2.${option.labelKey}`); // checked against the catalog
 */
export type Messages = typeof messages;
