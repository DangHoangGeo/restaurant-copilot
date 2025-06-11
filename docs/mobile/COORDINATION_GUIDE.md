# LOCALIZATION COORDINATION GUIDE

## TASK DISTRIBUTION SUMMARY

### CODEX - Kitchen & Orders
**Files:** Kitchen views, Orders views, Status components, Order/Item detail views
**Prefixes:** `kitchen_`, `order_`, `status_`, `item_`

### JULES - Printer & Settings  
**Files:** Printer views, Settings, Connection status, Complete CheckoutView
**Prefixes:** `printer_`, `bluetooth_`, `connection_`, `settings_`, `checkout_`

## SHARED RESOURCES

### Localization Files (Both agents will modify):
- `localization/en.lproj/Localizable.strings`
- `localization/ja.lproj/Localizable.strings` 
- `localization/vi.lproj/Localizable.strings`

### Conflict Prevention:
1. **Use designated prefixes** - This prevents key naming conflicts
2. **Commit strings first** - Always add localization keys before updating Swift files
3. **Pull before push** - Always pull latest changes before committing
4. **Atomic commits** - One view per commit for easier conflict resolution

## WORK COORDINATION

### Phase 1: Setup (Both agents simultaneously)
- CODEX: Read and analyze all assigned files
- JULES: Read and analyze all assigned files
- Both: Identify all hardcoded strings in their domain

### Phase 2: Localization Keys (Coordinate timing)
- **CODEX commits first**: Add all kitchen/order related keys to .strings files
- **JULES commits second**: Add all printer/settings related keys to .strings files
- This prevents merge conflicts in the shared .strings files

### Phase 3: Swift File Updates (Parallel work)
- Both agents can work simultaneously on their assigned Swift files
- No file overlap means no conflicts

### Phase 4: Testing (Both agents)
- Test all assigned views in all three languages
- Verify no hardcoded strings remain
- Ensure UI layouts work with longer text

## COMMUNICATION PROTOCOL

### Before Starting:
- CODEX comments: "Starting kitchen/orders localization - will commit strings first"
- JULES waits for CODEX's string commit before adding their strings

### During Work:
- Use descriptive commit messages: "Add kitchen localization keys" or "Localize KitchenBoardView"
- Tag commits with agent identifier: "[CODEX] Add order status keys"

### If Conflicts Arise:
- The agent who encounters conflict should:
  1. Pull latest changes
  2. Resolve conflicts manually
  3. Commit resolution with message: "Resolve localization conflict in [filename]"

## KEY NAMING CONVENTIONS

### CODEX (Kitchen & Orders):
```
kitchen_order_ready
kitchen_prepare_item
order_status_new
order_details_title
status_completed
item_quantity
```

### JULES (Printer & Settings):
```
printer_connected
printer_add_new
bluetooth_pairing
connection_status_online
settings_language
checkout_complete
```

## QUALITY CHECKPOINTS

### Both Agents Must Verify:
1. ✅ No hardcoded English strings in assigned files
2. ✅ All new keys exist in all 3 language files
3. ✅ Translations are contextually appropriate
4. ✅ UI layouts accommodate longer text
5. ✅ Error messages are properly localized
6. ✅ Navigation titles are localized

## COMPLETION CRITERIA

### CODEX Complete When:
- All kitchen views show localized text
- All order management views show localized text  
- All status components show localized text
- No English hardcoded strings in assigned files

### JULES Complete When:
- All printer views show localized text
- All settings screens show localized text
- CheckoutView is fully localized
- Connection status shows localized text
- No English hardcoded strings in assigned files

### Project Complete When:
- Both agents have completed their tasks
- All .strings files have consistent key coverage
- App can switch between EN/JA/VI without any English fallbacks
- All UI layouts work properly in all languages

## FINAL VERIFICATION

After both agents complete:
1. Build and run the app
2. Test language switching from login screen
3. Navigate through all major features in each language
4. Verify no hardcoded strings appear anywhere
5. Check that longer Vietnamese text doesn't break layouts
6. Confirm Japanese characters display correctly

This coordinate approach ensures both agents can work efficiently without conflicts while maintaining code quality and consistency.
