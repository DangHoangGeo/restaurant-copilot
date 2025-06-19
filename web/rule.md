**i18n Contribution Cheat-Sheet**

1. **Choose the right namespace**

   * Public: `landing`, `auth`, `legal`
   * Service-admin: `serviceAdmin/<feature>`
   * Restaurant owner: `owner/<page>`
   * Customer: `customer/<page>`
   * Global shared: `common`

2. **Don’t duplicate**

   * Search `/src/locales/**` first.
   * If it’s global (buttons/errors/weekdays), put it in `common.json`.

3. **File & key conventions**

   * Files: `/src/locales/en/<namespace>.json` (folders for sub-namespaces).
   * Keys: camelCase or nested objects, e.g.

     ```json
     { "titles": { "addItem": "Add Menu Item" } }
     ```

4. **Load it**

   * Add your `<namespace>.json` to `NAMESPACES` in `src/i18n.ts`.

5. **Use it**

   * No hard-coded text:

     ```ts
     const t = useTranslations('owner/menu');
     t('titles.addItem');
     ```
   * For globals: `useTranslations('common')`.

6. **New feature flow**

   1. Create `…/<namespace>.json`.
   2. Add to `NAMESPACES`.
   3. Move any truly shared strings to `common.json`.
   4. Use `useTranslations` in your component.
   5. Test all locales.
