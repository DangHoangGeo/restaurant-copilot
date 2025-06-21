## Restaurant Homepage (with Optional Owner Story, Gallery, Google Reviews)

---

### **I. Backend/Data Model Requirements (Recap)**

1. **User Table**

   * Add optional `photo_url` for user avatar.
   * Owners are fetched from `users` table (`role='owner'`, `restaurant_id=?`).
   * Each user can own multiple restaurants.

2. **Restaurant Table**

   * Add optional fields:
     `owner_story_en`, `owner_story_ja`, `owner_story_vi` (short about/biography in 3 languages).

3. **Gallery Table**

   * Create `restaurant_gallery_images` with:

     * `restaurant_id`, `image_url`, `caption`, `alt_text`, `sort_order`

4. **API**

   * Restaurant profile endpoint should return:

     * Restaurant info
     * All owner users for that restaurant (name, avatar)
     * Owner story (multi-language)
     * Gallery images (with captions/alt text)
   * Use Google Maps API for rating/review info **(do not store reviews locally!)**

---

### **II. Home Page UI/UX Specification**

#### **General Principles**

* **Responsive**: Looks great on both mobile and desktop (no empty space on desktop).
* **Story-driven**: Not just “data”—let the restaurant’s personality shine.
* **Action-oriented**: Users can quickly view menu, reserve, or call.
* **Optionality**: If a field is empty, gracefully skip that block.

---

#### **A. Hero Section**

* **Logo** (avatar), **Restaurant Name**, and a **one-line tagline or description**.

  * Use `description_[lang]` or a separate tagline field.
* **Large hero image or carousel** (use first gallery image, or fallback to a preset if none).
* **Key Actions**:

  * “View Menu” (primary button, colored)
  * “Reserve Table” (secondary button)
  * “Call” (call icon on mobile, button on desktop)
* Show **Google rating** and review count near the top (badge or pill).

---

#### **B. About/Story Section**

* Title: “Meet the Owner” or “Our Story”
* For each owner (`role=owner`):

  * **Photo/avatar** (use `photo_url`, fallback to initial)
  * **Name**
* Display **owner story** in user’s language, fallback to restaurant’s default language.
* Encourage warmth, authenticity (show chef/owner’s passion or philosophy).

---

#### **C. Gallery Section**

* Show a **carousel** (mobile) or **grid** (desktop) of uploaded images.

  * Image, caption, and alt text.
  * If no images, skip this section.

---

#### **D. Signature Dishes/Highlights**

* Show 2–4 recommended dishes with images, short description, and price.
* “Browse Full Menu” button at end.
* Pull “most popular” dishes by sales data, owner flag, or let owner select in admin UI.

---

#### **E. Reviews/Google Map**

* Show **Google rating**, review count, and 1–2 highlighted reviews (with reviewer photo if available).
* **Google Map embed**: centered and clear, “Get Directions” and “View on Google Maps” buttons.
* If possible, show a photo from Google reviews.

---

#### **F. Opening Hours / Contact / Social**

* “Open Now” or “Closed”, today’s hours, and a toggle/dropdown for full schedule.
* Address, phone, website, and social links—**displayed once, not repeated**.
* “Call” button floats on mobile or is sticky at the top/bottom for fast access.

---

#### **G. Design/Interaction Details**

* **Visual hierarchy**:

  * Large, bold headings for name/story
  * Key actions stand out in color
  * Muted tones for secondary info
* **Spacing**:

  * Ample, but avoid empty zones (esp. on desktop)
* **Graceful fallback**:

  * If owner or gallery info is missing, just skip those blocks.
* **Encouragement**:

  * If the admin/owner is logged in and a section is empty, display a gentle nudge:
    “Add your story or photos to help customers know you!”

---

#### **H. Responsive Layout Examples**

**Mobile:**

```
[ Logo ] [ Name ] [ Tagline ]
[ Hero Image Carousel ]
[ ★ 4.8 (211) | View Menu | Reserve | Call ]
----------------------------
[ Meet the Owner ]
[ Owner photo + name + story ]
----------------------------
[ Gallery carousel ]
----------------------------
[ Signature dishes (cards, scrollable) ]
----------------------------
[ Google reviews | Google Map | Directions ]
[ Hours | Address | Social ]
```

**Desktop:**

* 2-column or grid layout, hero/owner/story on left, gallery/menu/reviews/map on right.

---

#### **I. Accessibility**

* All images must have `alt` text (from gallery table).
* Buttons should have clear `aria-label`s (“Reserve table at Cooder Test”).
* Support keyboard navigation.

---

#### **J. Admin Panel UI**

* Add/manage owner photo (edit user profile)
* Add/edit “Our Story” per language
* Add/manage gallery images (drag to reorder, add caption/alt text)
* Select signature dishes for highlights section

---

### **Deliverables**

* [ ] Database migration scripts for new fields/tables
* [ ] API updates to provide all data needed for new homepage
* [ ] Responsive, polished React (or Next.js) components per above spec
* [ ] Admin UI to manage new fields/tables, with helpful copy to encourage richer profiles
* [ ] All sections hidden gracefully if optional info is missing
