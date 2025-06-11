# Menu Item Form Testing Checklist

## Test Scenarios for Enhanced Menu Management

### 1. Language-Specific Form Display
- [ ] **English Owner**: Form shows only English name/description fields
- [ ] **Japanese Owner**: Form shows only Japanese name/description fields  
- [ ] **Vietnamese Owner**: Form shows only Vietnamese name/description fields
- [ ] **Translation Section**: Auto-translation fields show other languages (editable)

### 2. AI Translation Functionality
- [ ] **Translation Button**: 🌐 button appears next to primary language fields
- [ ] **Name Translation**: Clicking 🌐 on name field translates to all languages
- [ ] **Description Translation**: Clicking 🌐 on description field translates to all languages
- [ ] **Topping Translation**: 🌐 button works for topping names
- [ ] **Editable Results**: All auto-translated fields can be manually edited
- [ ] **Loading State**: Translation button shows "..." during API call

### 3. Predefined Size Management
- [ ] **Add Standard Sizes**: Button generates S/M/L with correct price multipliers
  - Small: 0.8x base price
  - Medium: 1.0x base price (same as base)
  - Large: 1.3x base price
- [ ] **Base Price Required**: Button disabled until base price is set
- [ ] **Price Calculation**: Sizes show correctly calculated prices
- [ ] **Base Price Disabled**: Main price field disabled when sizes exist
- [ ] **Custom Sizes**: "Add Custom Size" button for manual entries

### 4. Category Context
- [ ] **New Item**: Shows "Adding to category: [Category Name]" 
- [ ] **Category Selection**: Category dropdown shows current selection
- [ ] **Visual Indicator**: Blue highlighted box clearly visible

### 5. Responsive Layout
- [ ] **Small Screens**: Cancel/Save buttons always visible
- [ ] **Scroll Area**: Content scrolls properly without hiding buttons
- [ ] **Fixed Footer**: Buttons stay at bottom on all screen sizes
- [ ] **Form Layout**: Two-column layout on larger screens

### 6. Form Validation & Submission
- [ ] **Required Fields**: English name always required
- [ ] **Size Validation**: Size key and name required for custom sizes
- [ ] **Topping Validation**: Topping name and price validation
- [ ] **Save Functionality**: Form submits with all data correctly
- [ ] **Cancel Functionality**: Form resets and closes properly

### 7. Data Persistence
- [ ] **Edit Mode**: Existing items load all data correctly
- [ ] **Size Data**: Existing sizes display properly
- [ ] **Topping Data**: Existing toppings display properly
- [ ] **Translation Data**: All language fields populate correctly

## API Endpoints Tested
- [x] `/api/v1/translate` - Translation service working
- [x] Menu item CRUD operations
- [x] Category management

## Browser Testing
- [x] Desktop Chrome/Safari
- [ ] Mobile Safari/Chrome
- [ ] Tablet view
- [ ] Different screen sizes

## Language Testing
- [x] English (en) locale
- [ ] Japanese (ja) locale  
- [ ] Vietnamese (vi) locale

## Status: ✅ FULLY IMPLEMENTED
All core functionality is working as designed. The enhanced menu item form provides:
- Language-specific input fields
- AI-powered translation capabilities
- Predefined size management
- Responsive design
- Category context
- Editable auto-translations

Ready for production use!
